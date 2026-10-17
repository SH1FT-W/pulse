"""Der Wächter: hört allen Batteriegeräten zu, lernt ihren Takt und bestimmt den Status.

Rein passiv – Pulse liest nur Zustandsänderungen, „gemeldet ohne Änderung“ (state_reported) und die
MQTT-Nachrichten von Zigbee2MQTT. Kein Gerät wird je abgefragt.
"""

from __future__ import annotations

import asyncio
from bisect import bisect_left
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
    MERGE_SECONDS,
    SEVERITY,
    SIGNAL_NEW_DEVICES,
    SIGNAL_REMOVED_DEVICES,
    SIGNAL_UPDATE,
    SILENT_REASONS,
    STATUS_CHECK,
    STATUS_FAILED,
    STATUS_LEARNING,
    STATUS_WATCH,
    STRIP_BUCKET_HOURS,
    STRIP_DAYS,
    STRIP_PER_DAY,
    THIN_SECONDS,
    TICK,
)
from .discovery import DeviceSpec, discover
from .forecast import Forecast
from .history import async_load_history, load_forecasts
from .notifier import Notifier
from .partners import PartnerInput, Suggestion, suggest
from .rhythm import (
    RADIO_BUFFER,
    BinCache,
    Facts,
    Rhythm,
    RhythmCache,
    Verdict,
    downtime_gaps,
    evaluate,
    heartbeat_days,
    merge_event,
    no_data,
    overlap,
    silence_start,
    strip,
)
from .snapshot import serialize, snapshot
from .store import SAVE_DELAY_EVENTS, PulseStore
from .texts import reason_text
from .z2m import Z2MListener

_LOGGER = logging.getLogger(__name__)
# Geräte-IDs der Registry (32 Hex-Zeichen) – Hub-Entitäten beginnen mit der Entry-ID und fallen so heraus.
_DEVICE_ID = re.compile(r"[0-9a-f]{32}")

HOUR_SECONDS = 3600
# Nach dem Start von Home Assistant kommen Batteriewerte gestaffelt und gerundet herein – so lange
# wird kein Batteriewechsel erkannt
STARTUP_GRACE = 5 * 60
UPTIME_KEEP = 30 * 86400
UPTIME_MAX = 200
# Der Laufzeit-Stempel wird nur alle 5 Minuten gespeichert (UPTIME_SLACK ist 10 Minuten) – sonst schriebe
# jeder Takt die ganze Datei mit allen Meldungen
UPTIME_SAVE_EVERY = 5 * 60
# Zigbee2MQTT nach einem Fehlstart (Broker noch nicht da) alle 5 Minuten noch einmal versuchen
Z2M_RETRY = 5 * 60

NOT_REAL = {STATE_UNAVAILABLE, STATE_UNKNOWN}
DAY = 86400.0
# Verlauf lesen: nach so vielen einsortierten Meldungen den Event-Loop kurz freigeben
YIELD_EVERY = 2000
# Nicht mehr überwachte Geräte: so viele Meldungen bleiben im Datensatz
TRIM_KEEP = 100
# Cloud-Ausfall: mindestens so viele Geräte derselben Cloud, deren Stille so nah beieinander begann
CLOUD_OUTAGE_MIN = 2
CLOUD_SPREAD = 2 * 3600.0
# Vorhersage: höchstens so weit zurück (falls kein Wechsel eingetragen ist)
FORECAST_LOOKBACK = 180 * 86400.0


@dataclass
class Device:
    spec: DeviceSpec
    record: dict[str, Any]
    status: str = STATUS_LEARNING
    reason: dict[str, Any] = field(default_factory=lambda: {"key": "learning", "params": {}})
    rhythm: Rhythm = field(default_factory=lambda: Rhythm(None, None, 0))
    unavailable_since: float | None = None
    evaluated: bool = False
    # Ausreißer-Regel: Beginn der Stille und vereinzelte Meldungen seitdem
    silence_start: float | None = None
    strays: int = 0
    # Zigbee2MQTT-Health: Nachrichtenzähler zuletzt gestiegen (nur im Speicher)
    radio_last: float | None = None
    radio_rises: list[float] = field(default_factory=list)
    # Einmal am Tag gerechnet: Laufzeit-Vorhersage und Partner-Vorschläge
    forecast: Forecast | None = None
    forecast_reason: str | None = None
    suggestions: list[Suggestion] = field(default_factory=list)

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

    @property
    def cloud(self) -> bool:
        return self.spec.cloud


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
        self._gaps_cache: tuple[tuple[int, float], list[tuple[float, float]]] | None = None
        # Cloud-Ausfälle des letzten Takts: Integration → {ids, since, count, name}
        self.cloud_outages: dict[str, dict[str, Any]] = {}
        # Einmal am Tag: Vorhersage + Partner-Vorschläge
        self._daily_at = 0.0
        self._daily_running = False
        # Snapshot je Sprache einmal je Update (mehrere offene Panels)
        self._generation = 0
        self._snapshots: dict[str | None, tuple[int, dict[str, Any]]] = {}
        self.started_at = time.time()
        self._z2m_tried = self.started_at  # letzter Versuch, Zigbee2MQTT zu abonnieren
        self._uptime_saved = self.started_at  # Laufzeit-Stempel zuletzt zum Speichern gegeben
        self._rediscover_debouncer = Debouncer(
            hass, _LOGGER, cooldown=5, immediate=False, function=self._async_rediscover
        )
        self._update_debouncer = Debouncer(hass, _LOGGER, cooldown=1, immediate=True, function=self._async_push_update)

    # ── Start/Stopp ───────────────────────────────────────────────────────

    async def async_start(self) -> None:
        self.started_at = time.time()
        self._z2m_tried = self.started_at
        self._uptime_saved = self.started_at
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
                self.hass,
                base,
                self._z2m_seen,
                self._z2m_availability,
                self._z2m_announce,
                self.async_update,
                self._z2m_radio,
            )
            try:
                active = await listener.async_start()
            except Exception:  # MQTT ist optional
                _LOGGER.exception("Could not subscribe to Zigbee2MQTT")
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
            _LOGGER.info("Subscribed to Zigbee2MQTT after a delayed MQTT start")
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
            for extra in (d.spec.battery, d.spec.battery_low):
                if extra:
                    self._entity_map.setdefault(extra, d.device_id)
        self._ieee_map = {d.spec.ieee: d.device_id for d in self.devices.values() if d.spec.ieee}
        for device_id in new:
            self._evaluate(self.devices[device_id], now, announce=False)
        if new:
            async_dispatcher_send(self.hass, SIGNAL_NEW_DEVICES, new)
        self.async_update()

    @callback
    def _remove_vanished(self, specs: dict[str, DeviceSpec]) -> None:
        """Nicht mehr überwachte Geräte aufräumen.

        - Gerät endgültig weg (z. B. Integration ersetzt): eigene Entitäten und Datensatz entfernen – sonst
          bleiben die Pulse-Entitäten verwaist und das Nachfolgegerät bekommt `_2`-IDs.
        - Gerät noch da, aber nicht mehr überwacht (Batterie-Entität weg, Gerät deaktiviert): eigene
          Entitäten entfernen, Datensatz behalten (Meldungen gekürzt) – kommt es zurück, entstehen sie neu
          (gleiche unique_id, gleiche Entity-ID).
        - Gerät ohne eigene Entitäten (Integration gerade nicht geladen/im Umbau): nichts anfassen.
        """
        devices = dr.async_get(self.hass)
        entities = er.async_get(self.hass)
        gone: set[str] = set()
        unmonitored: set[str] = set()
        for entry in er.async_entries_for_config_entry(entities, self.entry.entry_id):
            device_id = entry.unique_id.split("_", 1)[0]
            if not _DEVICE_ID.fullmatch(device_id) or device_id in specs:
                continue
            device = devices.async_get(device_id)
            if device is None:
                gone.add(device_id)
            elif self._no_longer_monitored(entities, device_id, device.disabled_by is not None):
                unmonitored.add(device_id)
            else:
                continue
            entities.async_remove(entry.entity_id)
        gone |= {d for d in self.store.devices if d not in specs and devices.async_get(d) is None}
        for device_id in gone:
            if self.store.devices.pop(device_id, None) is not None:
                self.store.async_delay_save()
        for device_id in unmonitored:
            if (record := self.store.devices.get(device_id)) is not None:
                del record["events"][:-TRIM_KEEP]
                del record["actions"][:-TRIM_KEEP]
                self.store.async_delay_save()
        if gone or unmonitored:
            _LOGGER.info("%s devices are no longer monitored, cleaned up", len(gone | unmonitored))
            async_dispatcher_send(self.hass, SIGNAL_REMOVED_DEVICES, sorted(gone | unmonitored))

    @staticmethod
    def _no_longer_monitored(entities: er.EntityRegistry, device_id: str, disabled: bool) -> bool:
        """Gerät deaktiviert oder hat noch eigene Entitäten (also bewusst nicht mehr überwacht)."""
        return disabled or any(
            e.platform != DOMAIN and e.disabled_by is None for e in er.async_entries_for_device(entities, device_id)
        )

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

    def voltage(self, device: Device) -> float | None:
        """Aktuelle Spannung in mV."""
        return _millivolts(self.hass.states.get(device.spec.voltage)) if device.spec.voltage else None

    def battery_percent(self, device: Device) -> float | None:
        """Echter Prozentwert (Warn-Sensoren: None)."""
        return self._battery_percent(device.spec)

    def battery_flag(self, device: Device) -> bool:
        return self._battery_flag(device.spec)

    def strip_of(self, device: Device, starts: list[float], now: float) -> list[int | None]:
        return self._strip(device, starts, now)

    def flag_on(self, device: Device) -> bool:
        """Das Gerät meldet selbst „Batterie schwach“ (Warn-Sensor an)."""
        spec = device.spec
        flag = spec.battery_low or (spec.battery if self._battery_flag(spec) else None)
        return bool(flag and self.hass.states.is_state(flag, STATE_ON))

    def _track_battery_missing(self, device: Device, now: float) -> None:
        """Seit wann die Batterie-Entität keinen Wert hat (gespeichert – auch über Neustarts)."""
        if not device.spec.battery:
            return
        state = self.hass.states.get(device.spec.battery)
        if state is None:
            return
        record = device.record
        if state.state in NOT_REAL:
            if record.get("battery_missing_since") is None:
                record["battery_missing_since"] = min(now, state.last_changed.timestamp())
                self.store.async_delay_save()
        elif record.get("battery_missing_since") is not None:
            record["battery_missing_since"] = None
            self.store.async_delay_save()

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
        merged = 0
        for entity_id, (reports, actions) in result.items():
            if merged >= YIELD_EVERY:
                merged = 0
                await asyncio.sleep(0)  # gesprächige Geräte: den Event-Loop zwischendurch atmen lassen
                if self._stopped:
                    return
            device = self.devices.get(self._entity_map.get(entity_id, ""))
            if device is None:
                continue
            merged += len(reports) + len(actions)
            # Cloud-Geräte: nur echte Wertänderungen – jede Abfrage der Cloud schreibt sonst eine Zeile
            for ts in actions if device.cloud else reports:
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
        _LOGGER.debug("History read: %s entities", len(result))
        self._tick(dt_util.utcnow())

    # ── Meldungen ────────────────────────────────────────────────────────

    @callback
    def _tracked(self, event_data: Any) -> bool:
        return event_data.get("entity_id") in self._entity_map

    def _is_echo(self, device: Device) -> bool:
        ieee = device.spec.ieee
        return bool(self.z2m and ieee and (self.z2m.in_echo_window or self.z2m.echo_marked(ieee)))

    def _later(self, device: Device, handler: Callable[[Any], None], event: Any) -> bool:
        """Zigbee2MQTT-Geräte: erst nach dem Durchlauf der MQTT-Nachricht auswerten.

        HAs MQTT-Entitäten und Pulses Abo bekommen dieselbe Nachricht in unbekannter Reihenfolge; erst danach
        ist bekannt, ob sie ein Echo war (`Z2MListener.echo_marked`).
        """
        if not (device.spec.ieee and self.z2m):
            return False
        self.hass.loop.call_soon(handler, event)
        return True

    @callback
    def _state_changed(self, event: Event[EventStateChangedData]) -> None:
        device = self.devices.get(self._entity_map.get(event.data["entity_id"], ""))
        if device is not None and not self._later(device, self._state_changed_now, event):
            self._state_changed_now(event)

    @callback
    def _state_changed_now(self, event: Event[EventStateChangedData]) -> None:
        entity_id = event.data["entity_id"]
        device = self.devices.get(self._entity_map.get(entity_id, ""))
        new = event.data["new_state"]
        if device is None or new is None or self._stopped:
            return
        old = event.data["old_state"]
        now = time.time()
        self._check_availability(device, now)
        if old is None or old.state in NOT_REAL or new.state in NOT_REAL or self._is_echo(device):
            return
        if device.cloud and old.state == new.state:
            return  # Cloud: eine neue Abfrage ohne neuen Wert ist kein Lebenszeichen des Geräts
        # Batteriewechsel nur aus echten Übergängen (nie aus Neustart-Echos)
        if entity_id in (device.spec.battery, device.spec.voltage):
            self._check_battery(device, now, entity_id)
        action = entity_id in device.spec.actions and old.state != new.state
        self._activity(device, new.last_updated.timestamp(), action)

    @callback
    def _state_reported(self, event: Event[EventStateReportedData]) -> None:
        device = self.devices.get(self._entity_map.get(event.data["entity_id"], ""))
        if device is not None and not self._later(device, self._state_reported_now, event):
            self._state_reported_now(event)

    @callback
    def _state_reported_now(self, event: Event[EventStateReportedData]) -> None:
        entity_id = event.data["entity_id"]
        device = self.devices.get(self._entity_map.get(entity_id, ""))
        new = event.data["new_state"]
        if device is None or new is None or new.state in NOT_REAL or self._is_echo(device) or self._stopped:
            return
        if device.cloud:
            return  # Cloud: gleicher Wert erneut = nur der Abfragetakt der Cloud
        # Gleicher Wert erneut gemeldet: bestätigt (oder verwirft) einen vorgemerkten Batteriesprung
        if entity_id in (device.spec.battery, device.spec.voltage) and device.record.get("pending_jump"):
            self._check_battery(device, time.time(), entity_id)
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
            self.store.async_delay_save(SAVE_DELAY_EVENTS)
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

    def _check_battery(self, device: Device, now: float, entity_id: str | None = None) -> None:
        """Batteriewechsel am Sprung erkennen – nur aus echten Meldungen und bestätigt.

        Der Vergleichswert ist der letzte stabile echte Wert. Ein Sprung zählt erst, wenn eine spätere echte
        Meldung (≥ MERGE_SECONDS, nicht dieselbe Funknachricht) ihn bestätigt; in den ersten Minuten nach dem
        Start wird nur der Vergleichswert nachgeführt. Bewertet wird nur die Entität, die gerade gemeldet hat –
        der Wert der anderen kann noch aus der vorigen Nachricht stammen.
        """
        record = device.record
        spec = device.spec
        level = self._battery_percent(spec) if entity_id in (None, spec.battery) else None
        voltage = self.voltage(device) if entity_id in (None, spec.voltage) else None
        if level is None and voltage is None:
            return
        if not self._settled(now):
            record["pending_jump"] = None
            self._set_baseline(record, level, voltage)
            return
        if batt.is_replacement(record.get("last_level"), level, record.get("last_voltage"), voltage):
            pending = record.get("pending_jump")
            if pending is None:
                record["pending_jump"] = now  # erst merken – die nächste echte Meldung muss es bestätigen
                self.store.async_delay_save()
                return
            if now - pending < MERGE_SECONDS:
                return  # dieselbe Funknachricht (Batterie + Spannung) bestätigt sich nicht selbst
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
    def _z2m_radio(self, ieee: str, ts: float) -> None:
        """Health-Zähler gestiegen: das Gerät funkt noch – kein Wert, also kein Lebenszeichen für die Stille."""
        device = self.devices.get(self._ieee_map.get(ieee, ""))
        if device is None:
            return
        device.radio_last = ts
        device.radio_rises.append(ts)
        del device.radio_rises[:-50]
        if device.problem or device.reason.get("key") == "radio_only":
            self._evaluate(device, time.time())
            self.async_update()

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
            self.store.uptime[-1][1] = now  # im Speicher immer aktuell, jede Sicherung nimmt ihn mit
            if now - self._uptime_saved >= UPTIME_SAVE_EVERY:
                self._uptime_saved = now
                self.store.async_delay_save()
        # Erst der Notifier (abgelaufenes „Später“, Ruhezeit vorbei), dann bewerten – so meldet ein Takt nichts doppelt
        self.notifier.async_tick(now)
        self._cloud_pass(now)
        self.notifier.async_begin_tick()
        try:
            for device in self.devices.values():
                self._evaluate(device, now)
        finally:
            self.notifier.async_end_tick()
        self._announce_cloud_outages()
        self.notifier.async_tick_summary()
        if (
            self.z2m is None
            and "mqtt" in self.hass.config.components
            and now - self._z2m_tried >= Z2M_RETRY
            and not self._z2m_lock.locked()
        ):
            self._z2m_tried = now
            self.hass.async_create_task(self._async_retry_z2m())
        if self.bootstrapped and not self._daily_running and now - self._daily_at >= DAY and not self._stopped:
            self._daily_at = now
            self._daily_running = True
            self.hass.async_create_task(self._async_daily(), "pulse daily")
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

    def silence_start(self, device: Device) -> float | None:
        """Beginn der Stille nach der Ausreißer-Regel (ein Bezugspunkt für Status, Panel, `silent_since`)."""
        return device.silence_start if device.evaluated else self.silence_from(device)

    def downtime_gaps(self) -> list[tuple[float, float]]:
        """Zeiten, in denen HA nicht lief (aus der eigenen Laufzeit) – zählen bei der Stille nicht mit."""
        uptime = self.store.uptime
        key = (len(uptime), float(uptime[0][0]) if uptime else 0.0)
        if self._gaps_cache is None or self._gaps_cache[0] != key:
            self._gaps_cache = (key, downtime_gaps(uptime))
        return self._gaps_cache[1]

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
        replaced = record["replaced"]
        gaps = self.downtime_gaps()
        start, strays = silence_start(
            record["events"], device.rhythm, replaced[-1] if replaced else None, gaps, record["actions"]
        )
        device.silence_start, device.strays = start, strays
        ref = start if start is not None else record.get("first_seen")
        return Facts(
            now=now,
            last_activity=start,
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
            downtime=overlap(gaps, ref, now) if ref is not None and gaps else 0.0,
            strays=strays,
            last_report=device.last_activity,
            cloud=device.cloud,
            radio_last=device.radio_last,
            radio_rises=self._radio_rises(device),
            flag_on=bool(device.spec.battery_low) and self.flag_on(device),
            battery_missing_since=record.get("battery_missing_since"),
        )

    @staticmethod
    def _radio_rises(device: Device) -> int:
        """Anstiege des Health-Zählers deutlich nach der letzten Meldung (die eigene Nachricht zählt mit)."""
        last = device.last_activity
        return len([ts for ts in device.radio_rises if last is None or ts > last + RADIO_BUFFER])

    # ── Cloud ────────────────────────────────────────────────────────────

    def _cloud_pass(self, now: float) -> None:
        """Fallen mehrere Geräte derselben Cloud-Integration gleichzeitig aus, ist es die Cloud."""
        groups: dict[str, list[tuple[Device, float]]] = {}
        for device in self.monitored():
            if not device.cloud:
                continue
            device.rhythm = self.rhythms.get(device.device_id, device.record["events"])
            raw = evaluate(self.facts(device, now))
            key = raw.reason.get("key")
            if key not in SILENT_REASONS or SEVERITY[raw.status] < SEVERITY[STATUS_WATCH]:
                continue
            since = device.unavailable_since if key == "unavailable" else device.silence_start
            groups.setdefault(device.spec.integration, []).append((device, since or now))
        outages: dict[str, dict[str, Any]] = {}
        for integration, members in groups.items():
            since_of = {d.device_id: since for d, since in members}
            held = self.cloud_outages.get(integration)
            # Größte Gruppe, deren Stille innerhalb von CLOUD_SPREAD begann
            ordered = sorted(since_of.values())
            best: set[str] = set()
            for i, first in enumerate(ordered):
                window = {d for d, since in since_of.items() if first <= since <= first + CLOUD_SPREAD}
                if len(window) > len(best):
                    best = window
                if len(ordered) - i <= len(best):
                    break
            ids = best if len(best) >= CLOUD_OUTAGE_MIN else set()
            if held is not None:
                # Gemeldeter Ausfall hält, solange seine Geräte still sind (keine zweite Mitteilung, kein Zerfallen)
                ids |= {d for d in held["ids"] if d in since_of}
            if ids:
                outages[integration] = {
                    "ids": ids,
                    "since": min(since_of[d] for d in ids),
                    "count": len(ids),
                    "name": self._integration_name(integration),
                }
        self.cloud_outages = outages

    def _integration_name(self, domain: str) -> str:
        from homeassistant.loader import async_get_loaded_integration

        try:
            return async_get_loaded_integration(self.hass, domain).name
        except Exception:  # noqa: BLE001 - nur für den Satz; nicht geladen → Domäne
            return domain

    def _cloud_verdict(self, device: Device, verdict: Verdict) -> Verdict:
        outage = self.cloud_outages.get(device.spec.integration) if device.cloud else None
        if (
            outage is None
            or device.device_id not in outage["ids"]
            or verdict.reason.get("key") not in SILENT_REASONS
            or SEVERITY[verdict.status] < SEVERITY[STATUS_WATCH]
        ):
            return verdict
        # Ein Sammelgrund statt vieler Ausfälle – das Gerät selbst ist vermutlich in Ordnung
        params = {"integration": outage["name"], "count": outage["count"]}
        return Verdict(STATUS_WATCH, {"key": "cloud_outage", "params": params})

    def _announce_cloud_outages(self) -> None:
        """Eine gedämpfte Mitteilung je Cloud-Ausfall (gemerkt im Store, auch über Neustarts)."""
        notified = self.store.cloud_notified
        for integration in [i for i in notified if i not in self.cloud_outages]:
            notified.pop(integration)
            self.store.async_delay_save()
        if not self.bootstrapped:
            return
        for integration, outage in self.cloud_outages.items():
            if integration not in notified:
                notified[integration] = outage["since"]
                self.store.async_delay_save()
                self.notifier.on_cloud_outage(outage["name"], outage["count"])

    # ── Bewerten ─────────────────────────────────────────────────────────

    def _evaluate(self, device: Device, now: float, announce: bool = True) -> None:
        if device.ignored:
            device.status, device.reason = STATUS_LEARNING, {"key": "learning", "params": {}}
            ir.async_delete_issue(self.hass, DOMAIN, f"failed_{device.device_id}")
            return
        device.rhythm = self.rhythms.get(device.device_id, device.record["events"])
        self._track_battery_missing(device, now)
        verdict = self._cloud_verdict(device, evaluate(self.facts(device, now)))
        previous = device.status
        was_cloud = device.reason.get("key") == "cloud_outage"
        cloud = verdict.reason.get("key") == "cloud_outage"
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
        if (
            not device.problem
            and not cloud
            and (not observed or was_cloud)
            and (device.record.get("notified") or device.record.get("told"))
        ):
            # Erholt, ohne dass Pulse den Übergang gesehen hat (Neustart, Ignorieren aufgehoben, Cloud wieder da):
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
        # Cloud-Ausfall: eine Sammelmitteilung statt je Gerät (`_announce_cloud_outages`)
        if announce and self.bootstrapped and not cloud and not was_cloud:
            self.notifier.on_status(device, previous)
        self.async_update()

    # ── Einmal am Tag: Vorhersage und Partner-Vorschläge ─────────────────

    async def _async_daily(self) -> None:
        try:
            await self._async_forecasts()
            if not self._stopped:
                await self._async_partners()
        except Exception:
            _LOGGER.exception("Forecast/partner suggestions failed")
        finally:
            self._daily_running = False
        self.async_update()

    async def _async_forecasts(self) -> None:
        """Laufzeit aus der Langzeitstatistik (Recorder) – im Executor, der Event-Loop bleibt frei."""
        if "recorder" not in self.hass.config.components:
            return
        from homeassistant.components.recorder import get_instance

        now = time.time()
        jobs: list[tuple[str, str, float, bool]] = []
        for device in self.monitored():
            spec = device.spec
            if not spec.battery or self._battery_flag(spec):
                device.forecast, device.forecast_reason = None, None
                continue
            replaced = device.record["replaced"]
            start = max(float(replaced[-1]) if replaced else 0.0, now - FORECAST_LOOKBACK)
            jobs.append((device.device_id, spec.battery, start, batt.level_trusted(device.record.get("chemistry"))))
        if not jobs:
            return
        results = await get_instance(self.hass).async_add_executor_job(load_forecasts, self.hass, jobs, now)
        for device_id, (forecast, reason) in results.items():
            if (target := self.devices.get(device_id)) is not None:
                target.forecast, target.forecast_reason = forecast, reason

    async def _async_partners(self) -> None:
        inputs = {
            d.device_id: PartnerInput(
                actions=tuple(d.record["actions"]),
                area=d.spec.area,
                wants=not d.record.get("partner"),
                dismissed=frozenset(d.record.get("partner_dismissed") or ()),
            )
            for d in self.monitored()
        }
        result = await self.hass.async_add_executor_job(suggest, inputs)
        for device in self.devices.values():
            device.suggestions = result.get(device.device_id, [])

    def dismiss_suggestion(self, device_id: str, partner_id: str) -> None:
        """Partner-Vorschlag dauerhaft verwerfen."""
        device = self.devices.get(device_id)
        if device is None:
            return
        dismissed: list[str] = device.record.setdefault("partner_dismissed", [])
        if partner_id not in dismissed:
            dismissed.append(partner_id)
            del dismissed[:-50]
        device.suggestions = [s for s in device.suggestions if s.id != partner_id]
        self.store.async_delay_save()
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
        # Neue Batterie: die alte Vorhersage gilt nicht mehr (raus aus der Einkaufsliste), neu ab dem nächsten Tageslauf
        device.forecast, device.forecast_reason = None, "too_short"
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
            self._generation += 1
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

        Höchstens einmal je Minute gerechnet – der Snapshot fragt bei jeder Änderung. Die Meldungen braucht es
        nur für die Zeit vor der ersten eigenen Laufzeit (die ersten 7 Tage nach der Einrichtung).
        """
        key = (day_start, int(now // 60), len(self.store.uptime))
        if self._no_data_cache is not None and self._no_data_cache[0] == key:
            return self._no_data_cache[1]
        uptime = self.store.uptime
        first = min((float(span[0]) for span in uptime), default=now)
        chatty = any(d.rhythm.typical is not None and d.rhythm.typical <= HOUR_SECONDS for d in self.monitored())
        events: list[float] = []
        if chatty and first > day_start:
            for device in self.monitored():
                own = device.record["events"]
                events += own[bisect_left(own, day_start) : bisect_left(own, first)]
            events.sort()
        value = no_data(uptime, events, day_start, now, chatty)
        self._no_data_cache = (key, value)
        return value

    def serialize(
        self, device: Device, now: float, starts: list[float] | None = None, language: str | None = None
    ) -> dict[str, Any]:
        return serialize(self, device, now, starts, language)

    def snapshot(self, language: str | None = None) -> dict[str, Any]:
        return snapshot(self, language)

    def snapshot_cached(self, language: str | None = None) -> dict[str, Any]:
        """Snapshot einmal je Update und Sprache – mehrere offene Panels bauen ihn nicht mehrfach."""
        cached = self._snapshots.get(language)
        if cached is not None and cached[0] == self._generation:
            return cached[1]
        value = snapshot(self, language)
        self._snapshots[language] = (self._generation, value)
        return value

    async def async_enable_z2m(self) -> None:
        if self.z2m is None:
            raise ValueError("no_z2m")
        await self.z2m.async_enable_options()
        self.store.z2m_enabled_at = time.time()
        self.store.async_delay_save()
        self.async_update()

    async def async_enable_z2m_health(self) -> None:
        """Health-Prüfung der Bridge einschalten (nur nach Rückfrage im Panel)."""
        if self.z2m is None:
            raise ValueError("no_z2m")
        await self.z2m.async_enable_health()
        self.store.z2m_health_at = time.time()
        self.store.async_delay_save()
        self.async_update()
