"""Mitteilungen aufs Handy: sofort, einmal am Tag oder gar nicht – mit Ruhezeit und ohne Wiederholungen."""

from __future__ import annotations

from collections.abc import Callable
import logging
import time
from typing import TYPE_CHECKING, Any

from homeassistant.const import STATE_HOME
from homeassistant.core import Event, HomeAssistant, callback
from homeassistant.util import dt as dt_util

from . import battery as batt
from .const import (
    ACTION_LATER,
    ACTION_REPLACED,
    BATTERY_REASONS,
    NOTIFY_DAILY,
    NOTIFY_NOW,
    NOTIFY_OFF,
    SEVERITY,
    STATUS_CHECK,
    STATUS_FAILED,
)
from .texts import text

if TYPE_CHECKING:
    from .monitor import Device, PulseMonitor

_LOGGER = logging.getLogger(__name__)

SEP = "::"


def _minutes(value: str | None, fallback: int) -> int:
    try:
        hours, minutes = str(value).split(":")[:2]
        return int(hours) * 60 + int(minutes)
    except (ValueError, AttributeError):
        return fallback


def in_window(now_minutes: int, start: int, end: int) -> bool:
    """Liegt die Uhrzeit im Fenster? Über Mitternacht (22:00–07:30) eingeschlossen."""
    if start == end:
        return False
    if start < end:
        return start <= now_minutes < end
    return now_minutes >= start or now_minutes < end


# Automatisch erkannte Batteriewechsel: kurz sammeln; viele auf einmal sind ein Neustart-Artefakt
REPLACED_HOLD = 3 * 60
REPLACED_BURST_WINDOW = 10 * 60
REPLACED_BURST_MAX = 3
# Problem-Mitteilungen, die in einem Takt zusammenkommen (Koordinator oder Bridge weg): ab dieser Zahl
# eine gemeinsame statt vieler einzelner – und nie kritisch, denn dann fehlt die Infrastruktur, nicht das Gerät
PROBLEM_BURST_MIN = 3
# Zusammenfassung nachholen, wenn Home Assistant zur eingestellten Zeit nicht lief (Minuten)
SUMMARY_WINDOW = 120


class Notifier:
    def __init__(self, hass: HomeAssistant, monitor: PulseMonitor) -> None:
        self.hass = hass
        self.monitor = monitor
        self.queue: list[dict[str, Any]] = []
        self.sent: list[dict[str, Any]] = []  # die letzten Mitteilungen (Diagnose, Panel)
        self._unsubs: list[Callable[[], None]] = []
        # Automatisch erkannte Wechsel (Zeitpunkte) und solche, die noch auf ihre Mitteilung warten
        self._auto_replaced: list[float] = []
        self._pending_replaced: list[tuple[str, float]] = []
        # Problem-Mitteilungen des laufenden Takts (werden am Ende gemeinsam oder einzeln verschickt)
        self._pending_problems: list[dict[str, Any]] = []
        self._collecting = False

    @property
    def settings(self) -> dict[str, Any]:
        return self.monitor.store.settings

    @property
    def language(self) -> str:
        return self.hass.config.language

    @callback
    def async_start(self) -> None:
        self._unsubs.append(self.hass.bus.async_listen("mobile_app_notification_action", self._action))

    @callback
    def async_stop(self) -> None:
        while self._unsubs:
            self._unsubs.pop()()

    # ── Empfänger ────────────────────────────────────────────────────────

    def available_targets(self) -> list[str]:
        services = self.hass.services.async_services_for_domain("notify")
        return sorted(name for name in services if name.startswith("mobile_app_"))

    def targets(self) -> list[str]:
        chosen = self.settings.get("targets")
        available = self.available_targets()
        if chosen is None:
            return available
        return [t for t in chosen if t in available]

    # ── Wann darf zugestellt werden ──────────────────────────────────────

    def quiet_now(self) -> bool:
        quiet = self.settings.get("quiet") or {}
        if not quiet.get("enabled"):
            return False
        local = dt_util.now()
        return in_window(
            local.hour * 60 + local.minute, _minutes(quiet.get("start"), 22 * 60), _minutes(quiet.get("end"), 450)
        )

    def away(self) -> bool:
        """„Erst beim Heimkommen“: unterwegs, solange keine der gewählten Personen zu Hause ist."""
        arrive = self.settings.get("arrive_home") or {}
        persons = [p for p in arrive.get("persons") or [] if self.hass.states.get(p) is not None]
        if not arrive.get("enabled") or not persons:
            return False
        return not any(self.hass.states.is_state(p, STATE_HOME) for p in persons)

    # ── Auslöser ─────────────────────────────────────────────────────────

    def level_for(self, device: Device) -> str:
        levels = self.settings.get("levels") or {}
        if device.status == STATUS_FAILED:
            return str(levels.get("failed", NOTIFY_NOW))
        if device.reason.get("key") in BATTERY_REASONS:
            return str(levels.get("battery", NOTIFY_DAILY))
        if device.critical and levels.get("check", NOTIFY_DAILY) != NOTIFY_OFF:
            return NOTIFY_NOW  # wichtige Geräte: „Prüfen“ kommt sofort
        return str(levels.get("check", NOTIFY_DAILY))

    def snoozed(self, device: Device) -> bool:
        until = device.record.get("snooze_until")
        return bool(until and until > time.time())

    def on_status(self, device: Device, previous: str) -> None:
        record = device.record
        if not device.problem:
            if record.get("notified") and SEVERITY[previous] >= SEVERITY[STATUS_CHECK]:
                # Wartete die Problem-Mitteilung noch (Ruhezeit) und kam vorher keine an, ist auch
                # „läuft wieder“ überflüssig
                silent = self._drop_queued(device) and not record.get("told")
                if not silent and self.settings.get("recovered", True):
                    self._send(
                        device,
                        text(self.language, "push_recovered", name=device.name),
                        text(self.language, "push_recovered_msg"),
                        critical=False,
                        actions=False,
                    )
                record["notified"] = None
                record["told"] = False
            return
        self.maybe_notify(device)

    def maybe_notify(self, device: Device) -> None:
        if device.ignored or not device.problem or self.snoozed(device):
            return
        if self.level_for(device) != NOTIFY_NOW:
            return
        if not self.targets():
            return  # niemand zum Benachrichtigen – merken erst, wenn es einen Empfänger gibt
        notified = device.record.get("notified")
        # Schon gesagt – keine Wiederholung. Gemerkt, aber weder zugestellt noch wartend (die
        # Warteschlange überlebt keinen Neustart): noch einmal einreihen
        if (
            notified
            and SEVERITY.get(notified, 0) >= SEVERITY[device.status]
            and (device.record.get("told") or self._waiting(device))
        ):
            return
        device.record["notified"] = device.status
        key = "push_failed" if device.status == STATUS_FAILED else "push_check"
        if device.reason.get("key") in BATTERY_REASONS:
            key = "push_battery"
        # Kritisch (durchbricht „Nicht stören“) nur bei Ausfall eines wichtigen Geräts, nie für Batterie/Prüfen
        critical = (
            device.critical and device.status == STATUS_FAILED and bool(self.settings.get("critical_alerts", True))
        )
        self._send(device, text(self.language, key, name=device.name), self.monitor.reason(device), critical, True)
        self.monitor.store.async_delay_save()

    def forget(self, device: Device) -> None:
        """Erholung ohne beobachteten Übergang (Neustart, Ignorieren aufgehoben): Merker und Wartendes weg.

        Sonst bliebe `notified` stehen und der nächste Ausfall würde nie gemeldet.
        """
        self._drop_queued(device)
        device.record["notified"] = None
        device.record["told"] = False
        self.monitor.store.async_delay_save()

    def on_replaced(self, device: Device, worth_push: bool, source: str) -> None:
        """Batteriewechsel: still im Panel – eine Mitteilung nur, wenn er ein Problem behoben hat.

        Automatisch erkannte Wechsel warten kurz (REPLACED_HOLD): Kommen viele auf einmal, ist das fast
        sicher ein Neustart-Artefakt – dann höchstens eine gemeinsame Mitteilung, ab vier gar keine.
        """
        device.record["notified"] = None
        if source == "manual":
            return
        now = time.time()
        self._auto_replaced = [ts for ts in self._auto_replaced if now - ts < REPLACED_BURST_WINDOW]
        self._auto_replaced.append(now)
        if worth_push and self.settings.get("recovered", True):
            self._pending_replaced.append((device.device_id, now))

    def _flush_replaced(self, now: float) -> None:
        if not self._pending_replaced or now - self._pending_replaced[0][1] < REPLACED_HOLD:
            return
        pending, self._pending_replaced = self._pending_replaced, []
        recent = len([ts for ts in self._auto_replaced if now - ts < REPLACED_BURST_WINDOW])
        devices = [d for d in (self.monitor.devices.get(i) for i, _ in pending) if d is not None]
        if not devices or recent > REPLACED_BURST_MAX:
            _LOGGER.info("Batteriewechsel ohne Mitteilung: %s auf einmal (vermutlich Neustart)", recent)
            return
        if recent > 2:
            names = ", ".join(d.name for d in devices)
            self._deliver(
                {
                    "title": text(self.language, "push_replaced_many", count=len(devices)),
                    "message": names,
                    "data": {"group": "pulse", "url": "/pulse"},
                }
            )
            return
        for device in devices:
            self._send(
                device,
                text(self.language, "push_replaced"),
                text(self.language, "push_replaced_msg", name=device.name),
                critical=False,
                actions=False,
            )

    # ── Takt (jede Minute) ───────────────────────────────────────────────

    @callback
    def async_begin_tick(self) -> None:
        """Bis `async_end_tick` werden Problem-Mitteilungen gesammelt statt sofort verschickt."""
        self._collecting = True

    @callback
    def async_end_tick(self) -> None:
        """Gesammelte Problem-Mitteilungen: wenige einzeln, viele als eine gemeinsame (Sturm-Bremse)."""
        self._collecting = False
        pending, self._pending_problems = self._pending_problems, []
        if len(pending) < PROBLEM_BURST_MIN:
            for msg in pending:
                self._route(msg)
            return
        _LOGGER.info("Pulse: %s Geräte auf einmal auffällig – eine gemeinsame Mitteilung", len(pending))
        self._route(
            {
                "title": text(self.language, "push_burst", count=len(pending)),
                "message": text(self.language, "push_burst_msg", names=", ".join(m["name"] for m in pending)),
                "data": {
                    "group": "pulse",
                    "url": "/pulse",
                    "clickAction": "/pulse",
                    "push": {"interruption-level": "time-sensitive"},
                    "priority": "high",
                    "ttl": 0,
                },
                "critical": False,
                "problem": True,
                "device_ids": [m["device_id"] for m in pending],
            }
        )

    @callback
    def async_tick(self, now: float) -> None:
        self._flush_replaced(now)
        for device in self.monitor.monitored():
            until = device.record.get("snooze_until")
            if until and until <= now:
                device.record["snooze_until"] = None
                device.record["notified"] = None  # nach „Später“ einmal erinnern
                self.maybe_notify(device)
        if self.queue and not self.quiet_now() and not self.away():
            pending, self.queue = self.queue, []
            for message in pending:
                self._deliver(message)

    @callback
    def async_tick_summary(self) -> None:
        """Nach dem Bewerten: einmal am Tag zur eingestellten Zeit die Zusammenfassung."""
        local = dt_util.now()
        today = local.date().isoformat()
        summary_at = _minutes(self.settings.get("summary_time"), 18 * 60)
        store = self.monitor.store
        minutes = local.hour * 60 + local.minute
        # Der Tag wird gespeichert – ein Neustart kurz nach der Uhrzeit schickt sie nicht noch einmal
        if store.summary_sent != today and minutes >= summary_at:
            store.summary_sent = today
            store.async_delay_save()
            if minutes - summary_at <= SUMMARY_WINDOW:
                self.send_summary(defer=True)
        elif store.summary_pending == today:
            # Zurückgehalten (Ruhezeit/unterwegs) und beim Neustart aus der Warteschlange gefallen → nachholen
            if any(m.get("summary") for m in self.queue) or self.quiet_now() or self.away():
                return
            if not self.send_summary():
                store.summary_pending = None
                store.async_delay_save()
        elif store.summary_pending is not None:
            store.summary_pending = None
            store.async_delay_save()

    def summary_devices(self) -> list[Device]:
        return [
            d
            for d in self.monitor.monitored()
            if d.problem and not self.snoozed(d) and self.level_for(d) == NOTIFY_DAILY
        ]

    def due_batteries(self) -> list[Device]:
        """Geräte, deren Batterie bald fällig ist (nur wo der Prozentwert etwas sagt)."""
        due: list[Device] = []
        for device in self.monitor.monitored():
            level = self.monitor.battery_level(device)
            if level is not None and level <= batt.LEVEL_SOON and batt.level_trusted(device.record.get("chemistry")):
                due.append(device)
        return due

    def battery_due_text(self) -> str | None:
        infos = [d.battery_info for d in self.due_batteries()]
        known = [i for i in infos if i is not None]
        return batt.shopping_list(known) or None

    def send_summary(self, defer: bool = False) -> bool:
        """Zusammenfassung schicken; `defer`: in Ruhezeit/unterwegs bis danach zurückhalten."""
        devices = self.summary_devices()
        levels = self.settings.get("levels") or {}
        battery = self.battery_due_text() if levels.get("battery") == NOTIFY_DAILY else None
        if not devices and not battery:
            return False
        count = len(devices)
        title_key = "push_summary" if count == 1 else "push_summary_many"
        lines = [f"{d.name}: {self.monitor.reason(d)}" for d in devices[:4]]
        if count > 4:
            lines.append(text(self.language, "push_summary_more", count=count - 4))
        if battery:
            lines.append(text(self.language, "push_summary_battery", list=battery))
        title = text(self.language, title_key, count=count) if count else text(self.language, "push_batteries")
        msg = {"title": title, "message": "\n".join(lines), "data": {"group": "pulse", "url": "/pulse"}}
        if defer and (self.quiet_now() or self.away()):
            self.queue = [m for m in self.queue if not m.get("summary")]
            self.queue.append({**msg, "summary": True})
            self.monitor.store.summary_pending = dt_util.now().date().isoformat()
            self.monitor.store.async_delay_save()
        else:
            self._deliver({**msg, "summary": True})
        return True

    # ── Zustellen ────────────────────────────────────────────────────────

    def _send(self, device: Device, title: str, message: str, critical: bool, actions: bool) -> None:
        data: dict[str, Any] = {
            "group": "pulse",
            "tag": f"pulse-{device.device_id}",
            "url": f"/pulse?device={device.device_id}",
            "clickAction": f"/pulse?device={device.device_id}",
        }
        if actions:
            data["actions"] = [
                {
                    "action": f"{ACTION_REPLACED}{SEP}{device.device_id}",
                    "title": text(self.language, "action_replaced"),
                },
                {"action": f"{ACTION_LATER}{SEP}{device.device_id}", "title": text(self.language, "action_later")},
            ]
        if critical:
            data["push"] = {"sound": {"name": "default", "critical": 1, "volume": 1.0}}
            data["channel"] = "alarm_stream"  # Android: klingelt auch bei „Nicht stören“
        else:
            data["push"] = {"interruption-level": "time-sensitive" if device.problem else "active"}
        if device.problem:
            data["priority"] = "high"  # Android: sofort zustellen
            data["ttl"] = 0
        msg = {
            "title": title,
            "message": message,
            "data": data,
            "critical": critical,
            "device_id": device.device_id,
            "name": device.name,
            "problem": actions,
        }
        if actions and self._collecting:
            self._pending_problems.append(msg)  # am Ende des Takts: einzeln oder gemeinsam
            return
        self._route(msg)

    def _route(self, msg: dict[str, Any]) -> None:
        """Sofort zustellen – oder in Ruhezeit/unterwegs zurückhalten (kritische nie)."""
        if not msg.get("critical") and (self.quiet_now() or self.away()):
            # Je Gerät zählt nur die neueste wartende Mitteilung
            if device := self.monitor.devices.get(msg.get("device_id") or ""):
                self._drop_queued(device)
            self.queue.append(msg)
            _LOGGER.debug("Mitteilung zurückgehalten (Ruhezeit/unterwegs): %s", msg["title"])
            return
        self._deliver(msg)

    def _waiting(self, device: Device) -> bool:
        """Liegt für das Gerät schon eine Mitteilung bereit (Warteschlange oder laufender Takt)?"""
        tag = f"pulse-{device.device_id}"
        return any(m["data"].get("tag") == tag for m in (*self.queue, *self._pending_problems))

    def _drop_queued(self, device: Device) -> bool:
        """Wartende Mitteilungen zu diesem Gerät verwerfen. True = es lag eine bereit."""
        tag = f"pulse-{device.device_id}"
        kept = [m for m in self.queue if m["data"].get("tag") != tag]
        dropped = len(kept) != len(self.queue)
        self.queue = kept
        self._pending_problems = [m for m in self._pending_problems if m["data"].get("tag") != tag]
        return dropped

    def _deliver(self, msg: dict[str, Any]) -> None:
        targets = self.targets()
        payload = {"title": msg["title"], "message": msg["message"], "data": msg.get("data", {})}
        if msg.get("problem"):
            ids = msg.get("device_ids") or [msg.get("device_id") or ""]
            for device in (self.monitor.devices.get(i) for i in ids):
                if device is not None:
                    device.record["told"] = True
        if msg.get("summary"):
            self.monitor.store.summary_pending = None
        self.sent.append({**payload, "at": time.time(), "targets": targets})
        del self.sent[:-20]
        _LOGGER.info("Pulse-Mitteilung an %s: %s – %s", targets or "niemanden", msg["title"], msg["message"])
        for target in targets:
            self.hass.async_create_task(self._async_call(target, payload), eager_start=True)

    async def _async_call(self, target: str, payload: dict[str, Any]) -> None:
        try:
            await self.hass.services.async_call("notify", target, payload, blocking=True)
        except Exception:  # Ein Empfänger, der gerade nicht geht, darf die anderen nicht stören
            _LOGGER.warning("Mitteilung an %s fehlgeschlagen", target, exc_info=True)

    def send_test(self) -> list[str]:
        self._deliver(
            {
                "title": text(self.language, "push_test"),
                "message": text(self.language, "push_test_msg"),
                "data": {"group": "pulse", "url": "/pulse"},
            }
        )
        return self.targets()

    @callback
    def _action(self, event: Event[Any]) -> None:
        action = str(event.data.get("action", ""))
        if SEP not in action:
            return
        kind, device_id = action.split(SEP, 1)
        if kind == ACTION_REPLACED:
            self.monitor.mark_replaced(device_id, "manual")
        elif kind == ACTION_LATER:
            self.monitor.snooze(device_id, 24)
