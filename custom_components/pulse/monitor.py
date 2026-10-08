"""Der Wächter: hört allen Batteriegeräten zu, lernt ihren Takt und bestimmt den Status.

Rein passiv – Pulse liest nur Zustandsänderungen, „gemeldet ohne Änderung“ (state_reported) und die
MQTT-Nachrichten von Zigbee2MQTT. Kein Gerät wird je abgefragt.
"""

from __future__ import annotations

import asyncio
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from functools import partial
import logging
import re
import time
from typing import Any

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import (
    EVENT_STATE_CHANGED,
    EVENT_STATE_REPORTED,
    STATE_ON,
    STATE_UNAVAILABLE,
    STATE_UNKNOWN,
)
from homeassistant.core import (
    Event,
    EventStateChangedData,
    EventStateReportedData,
    HomeAssistant,
    State,
    callback,
)
from homeassistant.helpers import (
    device_registry as dr,
    entity_registry as er,
    issue_registry as ir,
)
from homeassistant.helpers.debounce import Debouncer
from homeassistant.helpers.dispatcher import async_dispatcher_send
from homeassistant.helpers.event import async_track_time_interval
from homeassistant.helpers.start import async_at_started
from homeassistant.util import dt as dt_util

from . import battery as batt
from .const import (
    DOMAIN,
    EVENT_BATTERY_REPLACED,
    EVENT_STATUS_CHANGED,
    HEARTBEAT_MINUTES,
    HISTORY_DAYS,
    KEEP_DAYS,
    MAX_EVENTS,
    SEVERITY,
    SIGNAL_NEW_DEVICES,
    SIGNAL_UPDATE,
    STATUS_CHECK,
    STATUS_FAILED,
    STATUS_LEARNING,
    STRIP_BUCKET_HOURS,
    STRIP_DAYS,
    STRIP_PER_DAY,
    THIN_SECONDS,
    TICK,
)
from .discovery import DeviceSpec, discover
from .history import async_load_history
from .notifier import Notifier
from .rhythm import BinCache, Facts, Rhythm, RhythmCache, evaluate, heartbeat_days, merge_event, no_data, strip
from .store import PulseStore
from .texts import reason_text
from .z2m import Z2MListener

_LOGGER = logging.getLogger(__name__)
# Geräte-IDs der Registry (32 Hex-Zeichen) – Hub-Entitäten beginnen mit der Entry-ID und fallen so heraus.
_DEVICE_ID = re.compile(r"[0-9a-f]{32}")

HOUR_SECONDS = 3600
# Nach dem Start von Home Assistant kommen Batteriewerte gestaffelt und gerundet herein – so lange
# wird kein Batteriewechsel erkannt
STARTUP_GRACE = 5 * 60
# Gründe, aus denen eine Neuanmeldung als Batteriewechsel gilt: das Gerät war wirklich still/weg
SILENT_REASONS = {"silent", "silent_new", "unavailable"}
UPTIME_KEEP = 30 * 86400
UPTIME_MAX = 200
# Zigbee2MQTT nach einem Fehlstart (Broker noch nicht da) alle 5 Minuten noch einmal versuchen
Z2M_RETRY = 5 * 60

NOT_REAL = {STATE_UNAVAILABLE, STATE_UNKNOWN}
DAY = 86400.0


@dataclass
class Device:
    spec: DeviceSpec
    record: dict[str, Any]
    status: str = STATUS_LEARNING
    reason: dict[str, Any] = field(default_factory=lambda: {"key": "learning", "params": {}})
    rhythm: Rhythm = field(default_factory=lambda: Rhythm(None, None, 0))
    unavailable_since: float | None = None
    evaluated: bool = False

    @property
    def device_id(self) -> str:
        return self.spec.device_id

    @property
    def name(self) -> str:
        return self.spec.name

    @property
    def ignored(self) -> bool:
        return bool(self.record.get("ignored"))

    @property
    def critical(self) -> bool:
        manual = self.record.get("critical")
        return self.spec.critical if manual is None else bool(manual)

    @property
    def last_activity(self) -> float | None:
        events = self.record["events"]
        return events[-1] if events else None

    @property
    def battery_info(self) -> batt.BatteryInfo | None:
        kind = self.record.get("battery_type")
        if not kind:
            return None
        return batt.BatteryInfo(kind, int(self.record.get("battery_count") or 1), self.record.get("chemistry"))

    @property
    def problem(self) -> bool:
        return SEVERITY[self.status] >= SEVERITY[STATUS_CHECK]


def _millivolts(state: State | None) -> float | None:
    """Spannung immer in mV – ZHA und andere melden Volt."""
    value = _float(state)
    if value is None or state is None:
        return None
    unit = state.attributes.get("unit_of_measurement")
    # Unter 100 kann keine Batteriespannung in mV sein
    return value * 1000 if unit == "V" or (unit != "mV" and value < 100) else value


def _float(state: State | None) -> float | None:
    if state is None or state.state in NOT_REAL:
        return None
    try:
        return float(state.state)
    except ValueError:
        return None


class PulseMonitor:
    def __init__(self, hass: HomeAssistant, entry: ConfigEntry, store: PulseStore) -> None:
        self.hass = hass
        self.entry = entry
        self.store = store
        self.devices: dict[str, Device] = {}
        self._entity_map: dict[str, str] = {}
        self._ieee_map: dict[str, str] = {}
        self._unsubs: list[Callable[[], None]] = []
        self.notifier = Notifier(hass, self)
        self.z2m: Z2MListener | None = None
        self.z2m_active = False
        self.bootstrapped = False
        # Leisten und Herzschlag-Kalender werden nur neu gerechnet, wenn sich etwas geändert hat
        self.bins = BinCache()
        self.rhythms = RhythmCache()
        # Nach dem Stoppen (Neuladen/Entladen) darf ein noch laufender Start nichts mehr anfangen
        self._stopped = False
        self._z2m_lock = asyncio.Lock()
        self._no_data_cache: tuple[tuple[float, int, int], list[list[float]]] | None = None
        self.started_at = time.time()
        self._z2m_tried = self.started_at  # letzter Versuch, Zigbee2MQTT zu abonnieren
        self._rediscover_debouncer = Debouncer(
            hass, _LOGGER, cooldown=5, immediate=False, function=self._async_rediscover
        )
        self._update_debouncer = Debouncer(hass, _LOGGER, cooldown=1, immediate=True, function=self._async_push_update)

    # ── Start/Stopp ───────────────────────────────────────────────────────

    async def async_start(self) -> None:
        self.started_at = time.time()
        self._z2m_tried = self.started_at
        self._start_uptime(self.started_at)
        self._rediscover()
        self._unsubs.append(
            self.hass.bus.async_listen(EVENT_STATE_CHANGED, self._state_changed, event_filter=self._tracked)
        )
        self._unsubs.append(
            self.hass.bus.async_listen(EVENT_STATE_REPORTED, self._state_reported, event_filter=self._tracked)
        )
        self._unsubs.append(self.hass.bus.async_listen(dr.EVENT_DEVICE_REGISTRY_UPDATED, self._registry_changed))
        self._unsubs.append(self.hass.bus.async_listen(er.EVENT_ENTITY_REGISTRY_UPDATED, self._registry_changed))
        self._unsubs.append(async_track_time_interval(self.hass, self._tick, TICK))
        self._unsubs.append(async_at_started(self.hass, self._started))
        self.notifier.async_start()

    async def _started(self, _hass: HomeAssistant) -> None:
        await self._async_start_z2m()
        if not self._stopped:
            await self.async_bootstrap()

    async def _async_start_z2m(self) -> None:
        """Zigbee2MQTT (neu) abonnieren – nie zwei Listener gleichzeitig, auch bei schnellen Wechseln."""
        async with self._z2m_lock:
            if self.z2m:
                self.z2m.async_stop()
                self.z2m, self.z2m_active = None, False
            if self._stopped:
                return
            base = str(self.store.settings.get("z2m_base") or "zigbee2mqtt")
            listener = Z2MListener(
                self.hass, base, self._z2m_seen, self._z2m_availability, self._z2m_announce, self.async_update
            )
            try:
                active = await listener.async_start()
            except Exception:  # MQTT ist optional
                _LOGGER.exception("Zigbee2MQTT konnte nicht abonniert werden")
                active = False
            if not active or self._stopped:
                listener.async_stop()  # auch halb gestartete Abos wieder abmelden
                return
            self.z2m, self.z2m_active = listener, True

    async def async_restart_z2m(self) -> None:
        """Anderes Basis-Thema: neu abonnieren."""
        await self._async_start_z2m()
        self.async_update()

    async def _async_retry_z2m(self) -> None:
        """MQTT war beim Start noch nicht da (Broker brauchte länger): später noch einmal abonnieren."""
        await self._async_start_z2m()
        if self.z2m is not None:
            _LOGGER.info("Zigbee2MQTT nachträglich abonniert")
            self.async_update()

    @callback
    def async_stop(self) -> None:
        self._stopped = True
        while self._unsubs:
            self._unsubs.pop()()
        if self.z2m:
            self.z2m.async_stop()
        self.notifier.async_stop()
        self._rediscover_debouncer.async_shutdown()
        self._update_debouncer.async_shutdown()

    # ── Geräte finden ────────────────────────────────────────────────────

    @callback
    def _registry_changed(self, _event: Event[Any]) -> None:
        self.hass.async_create_task(self._rediscover_debouncer.async_call())

    async def _async_rediscover(self) -> None:
        if not self._stopped:
            self._rediscover()

    @callback
    def _rediscover(self) -> None:
        specs = discover(self.hass)
        now = time.time()
        new: list[str] = []
        for device_id, spec in specs.items():
            if device_id in self.devices:
                self.devices[device_id].spec = spec
                continue
            record = self.store.record(device_id)
            if record.get("first_seen") is None:
                record["first_seen"] = now
            if not record.get("battery_type") and (info := batt.lookup(spec.manufacturer, spec.model)):
                record["battery_type"] = info.type
                record["battery_count"] = info.count
                record["chemistry"] = record.get("chemistry") or info.chemistry
            device = Device(spec, record)
            if record.get("last_level") is None and spec.battery:
                record["last_level"] = self._battery_percent(spec)
            if record.get("last_voltage") is None and spec.voltage:
                record["last_voltage"] = _millivolts(self.hass.states.get(spec.voltage))
            self.devices[device_id] = device
            self._check_availability(device, now)
            new.append(device_id)
        for device_id in [d for d in self.devices if d not in specs]:
            self.devices.pop(device_id)
            self.bins.forget(device_id)
            self.rhythms.forget(device_id)
            ir.async_delete_issue(self.hass, DOMAIN, f"failed_{device_id}")
        self._remove_vanished(specs)
        self._entity_map = {e: d.device_id for d in self.devices.values() for e in d.spec.entities}
        for d in self.devices.values():
            if d.spec.battery:
                self._entity_map.setdefault(d.spec.battery, d.device_id)
        self._ieee_map = {d.spec.ieee: d.device_id for d in self.devices.values() if d.spec.ieee}
        for device_id in new:
            self._evaluate(self.devices[device_id], now, announce=False)
        if new:
            async_dispatcher_send(self.hass, SIGNAL_NEW_DEVICES, new)
        self.async_update()

    @callback
    def _remove_vanished(self, specs: dict[str, DeviceSpec]) -> None:
        """Gerät endgültig weg (z. B. Integration ersetzt) → eigene Entitäten und Datensatz entfernen.

        Sonst bleiben die Pulse-Entitäten verwaist in der Registry und das Nachfolgegerät bekommt `_2`-IDs.
        Nur wenn das Gerät auch in HAs Geräte-Registry fehlt – eine gerade nicht geladene Integration behält
        ihre Geräte, deren Pulse-Entitäten bleiben also stehen.
        """
        devices = dr.async_get(self.hass)
        entities = er.async_get(self.hass)
        gone: set[str] = set()
        for entry in er.async_entries_for_config_entry(entities, self.entry.entry_id):
            device_id = entry.unique_id.split("_", 1)[0]
            if not _DEVICE_ID.fullmatch(device_id) or device_id in specs or devices.async_get(device_id):
                continue
            entities.async_remove(entry.entity_id)
            gone.add(device_id)
        gone |= {d for d in self.store.devices if d not in specs and devices.async_get(d) is None}
        for device_id in gone:
            if self.store.devices.pop(device_id, None) is not None:
                self.store.async_delay_save()
        if gone:
            _LOGGER.info("Pulse: %s verschwundene Geräte aufgeräumt", len(gone))

    def battery_level(self, device: Device) -> float | None:
        """Aktueller Batteriewert (Prozent, bei Warn-Sensoren 5 = schwach)."""
        return self._battery_level(device.spec)

    @staticmethod
    def _battery_flag(spec: DeviceSpec) -> bool:
        """Nur ein Warn-Sensor („Batterie schwach“ an/aus) – kein Prozentwert."""
        return bool(spec.battery and spec.battery.startswith("binary_sensor."))

    def _battery_percent(self, spec: DeviceSpec) -> float | None:
        """Echter Prozentwert (Warn-Sensoren: None)."""
        return None if self._battery_flag(spec) else self._battery_level(spec)

    def _battery_level(self, spec: DeviceSpec) -> float | None:
        if not spec.battery:
            return None
        state = self.hass.states.get(spec.battery)
        if spec.battery.startswith("binary_sensor."):
            if state is None or state.state in NOT_REAL:
                return None
            return 5.0 if state.state == STATE_ON else None
        return _float(state)

    # ── Verlauf ──────────────────────────────────────────────────────────

    async def async_bootstrap(self) -> None:
        """Die letzten Tage aus dem Verlauf lernen – Pulse kennt den Takt dann sofort."""
        entity_ids = sorted(self._entity_map)
        result = await async_load_history(self.hass, entity_ids, HISTORY_DAYS)
        if self._stopped:
            return
        keep_from = time.time() - KEEP_DAYS * DAY
        for n, (entity_id, (reports, actions)) in enumerate(result.items()):
            if n % 5 == 4:
                await asyncio.sleep(0)  # gesprächige Geräte: den Event-Loop zwischendurch atmen lassen
                if self._stopped:
                    return
            device = self.devices.get(self._entity_map.get(entity_id, ""))
            if device is None:
                continue
            for ts in reports:
                merge_event(device.record["events"], ts, keep_from, MAX_EVENTS, THIN_SECONDS)
            if entity_id in device.spec.actions:
                for ts in actions:
                    merge_event(device.record["actions"], ts, keep_from, MAX_EVENTS)
        for device in self.devices.values():
            if device.record["events"] and (
                device.record.get("first_seen") is None or device.record["events"][0] < device.record["first_seen"]
            ):
                device.record["first_seen"] = device.record["events"][0]
        self.bootstrapped = True
        _LOGGER.debug("Verlauf gelesen: %s Entitäten", len(result))
        self._tick(dt_util.utcnow())

    # ── Meldungen ────────────────────────────────────────────────────────

    @callback
    def _tracked(self, event_data: Any) -> bool:
        return event_data.get("entity_id") in self._entity_map

    def _is_echo(self, device: Device) -> bool:
        return bool(self.z2m and device.spec.ieee and self.z2m.in_echo_window)

    @callback
    def _state_changed(self, event: Event[EventStateChangedData]) -> None:
        entity_id = event.data["entity_id"]
        device = self.devices.get(self._entity_map.get(entity_id, ""))
        new = event.data["new_state"]
        if device is None or new is None:
            return
        old = event.data["old_state"]
        now = time.time()
        self._check_availability(device, now)
        if old is None or old.state in NOT_REAL or new.state in NOT_REAL or self._is_echo(device):
            return
        # Batteriewechsel nur aus echten Übergängen (nie aus Neustart-Echos)
        if entity_id in (device.spec.battery, device.spec.voltage):
            self._check_battery(device, now)
        action = entity_id in device.spec.actions and old.state != new.state
        self._activity(device, new.last_updated.timestamp(), action)

    @callback
    def _state_reported(self, event: Event[EventStateReportedData]) -> None:
        entity_id = event.data["entity_id"]
        device = self.devices.get(self._entity_map.get(entity_id, ""))
        new = event.data["new_state"]
        if device is None or new is None or new.state in NOT_REAL or self._is_echo(device):
            return
        # Gleicher Wert erneut gemeldet: bestätigt (oder verwirft) einen vorgemerkten Batteriesprung
        if entity_id in (device.spec.battery, device.spec.voltage) and device.record.get("pending_jump"):
            self._check_battery(device, time.time())
        self._activity(device, new.last_reported.timestamp(), False)

    def _activity(self, device: Device, ts: float, action: bool) -> None:
        keep_from = time.time() - KEEP_DAYS * DAY
        # Sehr gesprächige Geräte (BLE alle paar Sekunden) ausdünnen, damit 7 Tage in den Speicher passen
        added = merge_event(device.record["events"], ts, keep_from, MAX_EVENTS, THIN_SECONDS)
        if action:
            merge_event(device.record["actions"], ts, keep_from, MAX_EVENTS)
        if device.unavailable_since is not None:
            device.unavailable_since = None
        if added or action:
            self.store.async_delay_save()
            if device.problem or action:
                self._evaluate(device, time.time())
            self.async_update()

    def _check_availability(self, device: Device, now: float) -> None:
        if device.spec.ieee and self.z2m and self.z2m.availability_enabled:
            return  # Zigbee2MQTT meldet Verfügbarkeit selbst
        states = [self.hass.states.get(e) for e in device.spec.entities]
        known = [s for s in states if s is not None]
        if known and all(s.state == STATE_UNAVAILABLE for s in known):
            if device.unavailable_since is None:
                device.unavailable_since = now
        else:
            device.unavailable_since = None

    def _settled(self, now: float) -> bool:
        """Home Assistant läuft lange genug, dass Batteriewerte keine Start-Echos mehr sind."""
        return now - self.started_at >= STARTUP_GRACE

    def _check_battery(self, device: Device, now: float) -> None:
        """Batteriewechsel am Sprung erkennen – nur aus echten Meldungen und bestätigt.

        Der Vergleichswert ist der letzte stabile echte Wert. Ein Sprung zählt erst, wenn die nächste
        echte Meldung ihn bestätigt; in den ersten Minuten nach dem Start wird nur der Vergleichswert
        nachgeführt.
        """
        record = device.record
        level = self._battery_percent(device.spec)
        voltage = _millivolts(self.hass.states.get(device.spec.voltage)) if device.spec.voltage else None
        if level is None and voltage is None:
            return
        if not self._settled(now):
            record["pending_jump"] = None
            self._set_baseline(record, level, voltage)
            return
        if batt.is_replacement(record.get("last_level"), level, record.get("last_voltage"), voltage):
            if record.get("pending_jump") is None:
                record["pending_jump"] = now  # erst merken – die nächste echte Meldung muss es bestätigen
                self.store.async_delay_save()
                return
            record["pending_jump"] = None
            self.mark_replaced(device.device_id, "auto")
        else:
            record["pending_jump"] = None
        self._set_baseline(record, level, voltage)
        self.store.async_delay_save()

    @staticmethod
    def _set_baseline(record: dict[str, Any], level: float | None, voltage: float | None) -> None:
        if level is not None:
            record["last_level"] = level
        if voltage is not None:
            record["last_voltage"] = voltage

    # Zigbee2MQTT
    @callback
    def _z2m_seen(self, ieee: str, ts: float, _exact: bool) -> None:
        device = self.devices.get(self._ieee_map.get(ieee, ""))
        if device is not None:
            self._activity(device, min(ts, time.time()), False)

    @callback
    def _z2m_availability(self, ieee: str, online: bool) -> None:
        device = self.devices.get(self._ieee_map.get(ieee, ""))
        if device is None:
            return
        if online:
            device.unavailable_since = None
        elif device.unavailable_since is None:
            device.unavailable_since = time.time()
        self._evaluate(device, time.time())
        self.async_update()

    @callback
    def _z2m_announce(self, ieee: str) -> None:
        device = self.devices.get(self._ieee_map.get(ieee, ""))
        if device is None or not device.problem or device.reason.get("key") not in SILENT_REASONS:
            return
        # Ein Bridge-Neustart oder HA-Start lässt viele Geräte sich neu anmelden – das ist kein Wechsel
        if (self.z2m and self.z2m.in_echo_window) or not self._settled(time.time()):
            return
        # Neuanmeldung nach echter Stille: fast immer eine neue Batterie
        self.mark_replaced(device.device_id, "announce")

    # ── Bewerten ─────────────────────────────────────────────────────────

    def _start_uptime(self, now: float) -> None:
        """Neuer Lauf: eigene Laufzeit beginnt (alte Läufe älter als 30 Tage fallen weg)."""
        keep = now - UPTIME_KEEP
        self.store.uptime = [span for span in self.store.uptime if span[1] >= keep][-UPTIME_MAX:]
        self.store.uptime.append([now, now])
        self.store.async_delay_save()

    @callback
    def _tick(self, _now: datetime) -> None:
        now = time.time()
        if self.store.uptime:
            self.store.uptime[-1][1] = now
            self.store.async_delay_save()
        # Erst der Notifier (abgelaufenes „Später“, Ruhezeit vorbei), dann bewerten – so meldet ein Takt nichts doppelt
        self.notifier.async_tick(now)
        self.notifier.async_begin_tick()
        try:
            for device in self.devices.values():
                self._evaluate(device, now)
        finally:
            self.notifier.async_end_tick()
        self.notifier.async_tick_summary()
        if (
            self.z2m is None
            and "mqtt" in self.hass.config.components
            and now - self._z2m_tried >= Z2M_RETRY
            and not self._z2m_lock.locked()
        ):
            self._z2m_tried = now
            self.hass.async_create_task(self._async_retry_z2m())
        self.async_update()

    @staticmethod
    def silence_from(device: Device) -> float | None:
        """Ab wann Stille zählt: letzte Meldung – oder ein späterer „Batterie gewechselt“ (sonst käme sofort
        wieder „antwortet nicht“; bis zur ersten Meldung „wartet auf die erste Meldung“)."""
        last = device.last_activity
        replaced = device.record["replaced"]
        if replaced and (last is None or replaced[-1] > last):
            return float(replaced[-1])
        return last

    def facts(self, device: Device, now: float) -> Facts:
        record = device.record
        partner = self.devices.get(record.get("partner") or "")
        own_actions = record["actions"]
        own_last_action = own_actions[-1] if own_actions else device.last_activity
        partner_actions = 0
        if partner is not None:
            since = own_last_action or (now - 2 * DAY)
            partner_actions = sum(1 for ts in partner.record["actions"] if ts > since)
        level = self._battery_level(device.spec)
        silence_from = self.silence_from(device)
        return Facts(
            now=now,
            last_activity=silence_from,
            waiting_first=silence_from is not None and silence_from != device.last_activity,
            rhythm=device.rhythm,
            critical=device.critical,
            observed_since=record.get("first_seen"),
            unavailable_since=device.unavailable_since,
            battery_level=level,
            battery_trusted=batt.level_trusted(record.get("chemistry")),
            battery_flag=self._battery_flag(device.spec),
            partner_name=partner.name if partner else None,
            partner_actions=partner_actions,
            own_last_action=own_last_action,
            name=device.name,
        )

    def _evaluate(self, device: Device, now: float, announce: bool = True) -> None:
        if device.ignored:
            device.status, device.reason = STATUS_LEARNING, {"key": "learning", "params": {}}
            ir.async_delete_issue(self.hass, DOMAIN, f"failed_{device.device_id}")
            return
        device.rhythm = self.rhythms.get(device.device_id, device.record["events"])
        verdict = evaluate(self.facts(device, now))
        previous = device.status
        changed = verdict.status != previous or verdict.reason.get("key") != device.reason.get("key")
        device.status, device.reason = verdict.status, verdict.reason
        first = not device.evaluated
        device.evaluated = True
        if device.status == STATUS_FAILED:
            ir.async_create_issue(
                self.hass,
                DOMAIN,
                f"failed_{device.device_id}",
                is_fixable=False,
                is_persistent=False,
                severity=ir.IssueSeverity.WARNING,
                translation_key="device_failed",
                translation_placeholders={"name": device.name, "reason": self.reason(device)},
            )
        else:
            ir.async_delete_issue(self.hass, DOMAIN, f"failed_{device.device_id}")
        if self.bootstrapped and device.problem:
            # Bekanntes einmal melden (der Notifier merkt sich, was gesagt ist – auch über Neustarts)
            self.notifier.maybe_notify(device)
        observed = announce and self.bootstrapped and changed and verdict.status != previous
        if not device.problem and not observed and (device.record.get("notified") or device.record.get("told")):
            # Erholt, ohne dass Pulse den Übergang gesehen hat (Neustart, Ignorieren aufgehoben):
            # Merker löschen, sonst bliebe der nächste Ausfall stumm. „Läuft wieder“ nur bei beobachtetem Übergang.
            self.notifier.forget(device)
        if not changed or verdict.status == previous:
            if changed:
                self.async_update()
            return
        if not first:
            self.hass.bus.async_fire(
                EVENT_STATUS_CHANGED,
                {
                    "device_id": device.device_id,
                    "name": device.name,
                    "status": device.status,
                    "previous": previous,
                    "reason": self.reason(device),
                    "reason_key": device.reason.get("key"),
                },
            )
        # Erste Bewertung nach dem Start: keine Mitteilung für Bekanntes (der Notifier merkt sich Gemeldetes)
        if announce and self.bootstrapped:
            self.notifier.on_status(device, previous)
        self.async_update()

    def reason(self, device: Device, language: str | None = None) -> str:
        return reason_text(language or self.hass.config.language, device.reason)

    # ── Aktionen ─────────────────────────────────────────────────────────

    def mark_replaced(self, device_id: str, source: str = "manual") -> None:
        device = self.devices.get(device_id)
        if device is None:
            return
        now = time.time()
        record = device.record
        replaced: list[float] = record["replaced"]
        if replaced and now - replaced[-1] < 6 * 3600 and source != "manual":
            return  # derselbe Wechsel meldet sich über mehrere Werte
        # Mitteilung nur, wenn der Wechsel etwas behoben hat: Problem oder schwache Batterie vorher
        last_level = record.get("last_level")
        worth_push = device.problem or (last_level is not None and last_level <= batt.LEVEL_SOON)
        sources: list[str] = record.setdefault("replaced_source", [])
        while len(sources) < len(replaced):
            sources.insert(0, "manual")
        replaced.append(now)
        sources.append(source)
        del replaced[:-20]
        del sources[:-20]
        device.record["snooze_until"] = None
        # Für „Rückgängig“: was schon gemeldet war, sonst käme nach dem Zurücknehmen dieselbe Mitteilung
        record["notified_before_replace"] = record.get("notified")
        if source != "manual":
            merge_event(device.record["events"], now, None, MAX_EVENTS)
        device.unavailable_since = None
        self.hass.bus.async_fire(
            EVENT_BATTERY_REPLACED, {"device_id": device_id, "name": device.name, "source": source}
        )
        self.notifier.on_replaced(device, worth_push, source)
        self._evaluate(device, now)
        self.store.async_delay_save()
        self.async_update()

    def undo_replaced(self, device_id: str) -> bool:
        """Letzten Wechsel zurücknehmen (Rückgängig im Panel) – nur einen frischen (< 1 Std.)."""
        device = self.devices.get(device_id)
        if device is None:
            return False
        replaced: list[float] = device.record["replaced"]
        if not replaced or time.time() - replaced[-1] > 3600:
            return False
        replaced.pop()
        sources: list[str] = device.record.get("replaced_source") or []
        if sources:
            sources.pop()
        device.record["notified"] = device.record.get("notified_before_replace")
        self._evaluate(device, time.time(), announce=False)
        self.store.async_delay_save()
        self.async_update()
        return True

    def snooze(self, device_id: str, hours: float) -> None:
        device = self.devices.get(device_id)
        if device is None:
            return
        device.record["snooze_until"] = time.time() + hours * 3600 if hours > 0 else None
        self.store.async_delay_save()
        self.async_update()

    def set_ignored(self, device_id: str, ignored: bool) -> None:
        device = self.devices.get(device_id)
        if device is None:
            return
        device.record["ignored"] = ignored
        device.evaluated = False
        self._evaluate(device, time.time(), announce=False)
        self.store.async_delay_save()
        async_dispatcher_send(self.hass, SIGNAL_NEW_DEVICES, [device_id])
        self.async_update()

    def update_device(self, device_id: str, changes: dict[str, Any]) -> None:
        device = self.devices.get(device_id)
        if device is None:
            return
        for key in ("critical", "battery_type", "battery_count", "chemistry", "partner"):
            if key in changes:
                device.record[key] = changes[key]
        if "ignored" in changes:
            self.set_ignored(device_id, bool(changes["ignored"]))
            return
        self._evaluate(device, time.time())
        self.store.async_delay_save()
        self.async_update()

    # ── Für Panel und Entitäten ──────────────────────────────────────────

    @callback
    def async_update(self) -> None:
        self.hass.async_create_task(self._update_debouncer.async_call())

    async def _async_push_update(self) -> None:
        if not self._stopped:
            async_dispatcher_send(self.hass, SIGNAL_UPDATE)

    def monitored(self) -> list[Device]:
        return [d for d in self.devices.values() if not d.ignored]

    def problems(self) -> list[Device]:
        return [d for d in self.monitored() if d.problem]

    @staticmethod
    def day_starts() -> list[float]:
        """Lokale Mitternächte des Fensters plus Ende von heute (Tage mit Zeitumstellung sind kürzer/länger)."""
        today = dt_util.now().date()
        return [
            dt_util.start_of_local_day(today - timedelta(days=STRIP_DAYS - 1 - i)).timestamp()
            for i in range(STRIP_DAYS + 1)
        ]

    def _strip(self, device: Device, starts: list[float], now: float) -> list[int | None]:
        events = device.record["events"]
        return self.bins.get(
            "strip",
            device.device_id,
            events,
            starts[0],
            STRIP_BUCKET_HOURS * 3600,
            now,
            partial(strip, events, starts, STRIP_PER_DAY, now),
        )

    def heartbeats(self, device_ids: list[str]) -> dict[str, Any]:
        """Herzschlag-Kalender (Meldungen je 15 min, 7 Tage) für die angefragten Geräte."""
        now = time.time()
        starts = self.day_starts()
        day_start = starts[0]
        result: dict[str, list[list[int | None]]] = {}
        for device_id in device_ids:
            device = self.devices.get(device_id)
            if device is None:
                continue
            events = device.record["events"]
            result[device_id] = self.bins.get(
                "heartbeat",
                device_id,
                events,
                day_start,
                HEARTBEAT_MINUTES * 60,
                now,
                partial(heartbeat_days, events, starts, HEARTBEAT_MINUTES, now),
            )
        return {
            "start": day_start,
            "days": STRIP_DAYS,
            "day_starts": starts,
            "bin_minutes": HEARTBEAT_MINUTES,
            "devices": result,
            "no_data": self.no_data(day_start, now),
        }

    def no_data(self, day_start: float, now: float) -> list[list[float]]:
        """Zeiten im 7-Tage-Fenster, in denen Pulse keine Daten hatte (HA lief nicht).

        Höchstens einmal je Minute gerechnet – der Snapshot fragt bei jeder Änderung.
        """
        key = (day_start, int(now // 60), len(self.store.uptime))
        if self._no_data_cache is not None and self._no_data_cache[0] == key:
            return self._no_data_cache[1]
        events = sorted(ts for device in self.monitored() for ts in device.record["events"] if ts >= day_start)
        chatty = any(d.rhythm.typical is not None and d.rhythm.typical <= HOUR_SECONDS for d in self.monitored())
        value = no_data(self.store.uptime, events, day_start, now, chatty)
        self._no_data_cache = (key, value)
        return value

    def serialize(
        self, device: Device, now: float, starts: list[float] | None = None, language: str | None = None
    ) -> dict[str, Any]:
        record = device.record
        if starts is None:
            starts = self.day_starts()
        info = device.battery_info
        partner = self.devices.get(record.get("partner") or "")
        return {
            "id": device.device_id,
            "name": device.name,
            "area": device.spec.area,
            "manufacturer": device.spec.manufacturer,
            "model": device.spec.model,
            "integration": device.spec.integration,
            "icon": device.spec.icon,
            "status": device.status,
            "reason": self.reason(device, language),
            "reason_key": device.reason.get("key"),
            "critical": device.critical,
            "critical_auto": device.spec.critical,
            "critical_manual": record.get("critical"),
            "ignored": device.ignored,
            "last_activity": device.last_activity,
            "silence_from": self.silence_from(device),
            "typical": device.rhythm.typical,
            "samples": device.rhythm.samples,
            "unavailable_since": device.unavailable_since,
            "battery": {
                "level": self._battery_percent(device.spec),
                "flag": self._battery_flag(device.spec),
                "low": self._battery_flag(device.spec) and self._battery_level(device.spec) is not None,
                "voltage": _millivolts(self.hass.states.get(device.spec.voltage)) if device.spec.voltage else None,
                "type": info.type if info else None,
                "count": info.count if info else None,
                "chemistry": record.get("chemistry"),
                "trusted": batt.level_trusted(record.get("chemistry")),
                "replaced": list(record["replaced"]),
                "entity": device.spec.battery,
            },
            "partner": partner.device_id if partner else None,
            "partner_name": partner.name if partner else None,
            "snooze_until": record.get("snooze_until"),
            "strip": self._strip(device, starts, now),
            "zigbee": bool(device.spec.ieee),
            "exact": bool(device.spec.ieee and self.z2m and self.z2m.last_seen_enabled),
        }

    def snapshot(self, language: str | None = None) -> dict[str, Any]:
        now = time.time()
        starts = self.day_starts()
        day_start = starts[0]
        devices = [self.serialize(d, now, starts, language) for d in self.devices.values()]
        devices.sort(key=lambda d: (-SEVERITY[d["status"]], d["area"] or "~", d["name"].lower()))
        monitored = self.monitored()
        z2m = self.z2m
        return {
            "now": now,
            "strip_start": day_start,
            "day_starts": starts,
            "strip_per_day": STRIP_PER_DAY,
            "strip_days": STRIP_DAYS,
            "bucket_hours": STRIP_BUCKET_HOURS,
            "no_data": self.no_data(day_start, now),
            "language": language or self.hass.config.language,
            "bootstrapped": self.bootstrapped,
            "devices": devices,
            "summary": {
                "total": len(monitored),
                "problems": len([d for d in monitored if d.problem]),
                "watch": len([d for d in monitored if SEVERITY[d.status] == 1]),
                "learning": len([d for d in monitored if d.status == STATUS_LEARNING]),
                "next_battery": self.notifier.battery_due_text(),
                "low_batteries": [d.name for d in self.notifier.due_batteries()],
            },
            "settings": self.store.settings,
            "targets": self.notifier.available_targets(),
            "persons": sorted(self.hass.states.async_entity_ids("person")),
            "z2m": {
                "present": bool(z2m and z2m.present),
                "last_seen": bool(z2m and z2m.last_seen_enabled),
                "availability": bool(z2m and z2m.availability_enabled),
                "version": z2m.version if z2m else None,
                "devices": len([d for d in self.devices.values() if d.spec.ieee]),
                "requested_at": self.store.z2m_enabled_at,
            },
        }

    async def async_enable_z2m(self) -> None:
        if self.z2m is None:
            raise ValueError("no_z2m")
        await self.z2m.async_enable_options()
        self.store.z2m_enabled_at = time.time()
        self.store.async_delay_save()
        self.async_update()
