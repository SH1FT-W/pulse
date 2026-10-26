"""The watcher: listens to all battery devices, learns their rhythm and determines the status.

Purely passive: Pulse only reads state changes, "reported without change" (state_reported) and the
MQTT messages from Zigbee2MQTT. No device is ever polled.
"""

from __future__ import annotations

import asyncio
from bisect import bisect_left, bisect_right
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
    STATE_OFF,
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
    OUTAGE_MIN,
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
from .history import async_load_history, async_load_outages, load_forecasts
from .notifier import Notifier
from .partners import PartnerInput, Suggestion, suggest
from .rhythm import (
    RADIO_BUFFER,
    BinCache,
    Facts,
    Rhythm,
    RhythmCache,
    Verdict,
    device_outages,
    downtime_gaps,
    evaluate,
    heartbeat_days,
    merge_event,
    merge_outages,
    near_start,
    no_data,
    overlap,
    silence_start,
    strip,
    usual_outage,
    without_spans,
)
from .snapshot import serialize, snapshot
from .store import SAVE_DELAY_EVENTS, PulseStore
from .texts import reason_text
from .z2m import Z2MListener

_LOGGER = logging.getLogger(__name__)
# Registry device IDs (32 hex chars); hub entities start with the entry ID and are thus left out.
_DEVICE_ID = re.compile(r"[0-9a-f]{32}")

HOUR_SECONDS = 3600
# After Home Assistant starts, battery values come in staggered and rounded; during that time
# no battery change is detected
STARTUP_GRACE = 5 * 60
UPTIME_KEEP = 30 * 86400
UPTIME_MAX = 200
# The uptime stamp is only saved every 5 minutes (UPTIME_SLACK is 10 minutes), otherwise every
# tick would write the whole file with all reports
UPTIME_SAVE_EVERY = 5 * 60
# After a failed start (broker not there yet) retry Zigbee2MQTT every 5 minutes
Z2M_RETRY = 5 * 60

NOT_REAL = {STATE_UNAVAILABLE, STATE_UNKNOWN}
DAY = 86400.0
# Reading history: briefly yield the event loop after this many inserted reports
YIELD_EVERY = 2000
# Devices no longer monitored: this many reports stay in the record
TRIM_KEEP = 100
# Cloud outage: at least this many devices of the same cloud whose silence began this close together
CLOUD_OUTAGE_MIN = 2
CLOUD_SPREAD = 2 * 3600.0
# Forecast: at most this far back (if no change is recorded)
FORECAST_LOOKBACK = 180 * 86400.0
# Registry changes that can affect the device list; an entity's name, icon or options do not
DEVICE_CHANGES = frozenset(
    {
        "name",
        "name_by_user",
        "area_id",
        "disabled_by",
        "identifiers",
        "manufacturer",
        "model",
        "via_device_id",
        "labels",
    }
)
ENTITY_CHANGES = frozenset(
    {
        "device_id",
        "disabled_by",
        "device_class",
        "original_device_class",
        "entity_category",
        "platform",
        "entity_id",
        "labels",
    }
)


@dataclass
class Device:
    spec: DeviceSpec
    record: dict[str, Any]
    status: str = STATUS_LEARNING
    reason: dict[str, Any] = field(default_factory=lambda: {"key": "learning", "params": {}})
    rhythm: Rhythm = field(default_factory=lambda: Rhythm(None, None, 0))
    unavailable_since: float | None = None
    evaluated: bool = False
    # The first evaluation after reading history is the baseline: only after it are there status events
    baseline: bool = False
    # Stray rule: start of the silence and sporadic reports since
    silence_start: float | None = None
    strays: int = 0
    # Zigbee2MQTT health: message counter last increased (in memory only)
    radio_last: float | None = None
    radio_rises: list[float] = field(default_factory=list)
    # Calculated once a day: runtime forecast and partner suggestions
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
        if self.spec.label == "ignore":
            return True
        return bool(self.record.get("ignored"))

    @property
    def critical(self) -> bool:
        if self.spec.label == "important":
            return True
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
    """Voltage always in mV; ZHA and others report volts."""
    value = _float(state)
    if value is None or state is None:
        return None
    unit = state.attributes.get("unit_of_measurement")
    # Below 100 it cannot be a battery voltage in mV
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
        # All observed entities → device; signs of life are only those in `spec.entities` (`_alive`),
        # battery/warning entities of other platforms are only included for battery values
        self._entity_map: dict[str, str] = {}
        self._alive: set[str] = set()
        self._ieee_map: dict[str, str] = {}
        self._unsubs: list[Callable[[], None]] = []
        self.notifier = Notifier(hass, self)
        self.z2m: Z2MListener | None = None
        self.z2m_active = False
        self.bootstrapped = False
        # Bars and heartbeat calendar are only recalculated when something changed
        self.bins = BinCache()
        self.rhythms = RhythmCache()
        # After stopping (reload/unload) a still running start must not begin anything
        self._stopped = False
        self._z2m_lock = asyncio.Lock()
        self._no_data_cache: tuple[tuple[float, int, int], list[list[float]]] | None = None
        self._gaps_cache: tuple[tuple[int, float], list[tuple[float, float]]] | None = None
        # Cloud outages of the last tick: integration → {ids, since, count, name}
        self.cloud_outages: dict[str, dict[str, Any]] = {}
        # From the recorder at start: device ID → since when it has really been gone (outage running over the restart)
        self._gone_before: dict[str, float] = {}
        # Once a day: forecast + partner suggestions
        self._daily_at = 0.0
        self._daily_running = False
        # Snapshot per language once per update (several open panels)
        self._generation = 0
        self._snapshots: dict[str | None, tuple[int, dict[str, Any]]] = {}
        self.started_at = time.time()
        self._z2m_tried = self.started_at  # last attempt to subscribe to Zigbee2MQTT
        self._uptime_saved = self.started_at  # uptime stamp last handed over for saving
        self._rediscover_debouncer = Debouncer(
            hass, _LOGGER, cooldown=5, immediate=False, function=self._async_rediscover
        )
        self._update_debouncer = Debouncer(hass, _LOGGER, cooldown=1, immediate=True, function=self._async_push_update)

    # ── Start/stop ───────────────────────────────────────────────────────

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
        self._unsubs.append(
            self.hass.bus.async_listen(
                dr.EVENT_DEVICE_REGISTRY_UPDATED, self._registry_changed, event_filter=self._device_relevant
            )
        )
        self._unsubs.append(
            self.hass.bus.async_listen(
                er.EVENT_ENTITY_REGISTRY_UPDATED, self._registry_changed, event_filter=self._entity_relevant
            )
        )
        self._unsubs.append(async_track_time_interval(self.hass, self._tick, TICK))
        self._unsubs.append(async_at_started(self.hass, self._started))
        self.notifier.async_start()

    async def _started(self, _hass: HomeAssistant) -> None:
        await self._async_start_z2m()
        if not self._stopped:
            await self.async_bootstrap()

    async def _async_start_z2m(self) -> None:
        """(Re)subscribe to Zigbee2MQTT; never two listeners at once, even with quick changes."""
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
            except Exception:  # MQTT is optional
                _LOGGER.exception("Could not subscribe to Zigbee2MQTT")
                active = False
            if not active or self._stopped:
                listener.async_stop()  # also unsubscribe half-started subscriptions
                return
            self.z2m, self.z2m_active = listener, True

    async def async_restart_z2m(self) -> None:
        """Different base topic: resubscribe."""
        await self._async_start_z2m()
        self.async_update()

    async def _async_retry_z2m(self) -> None:
        """MQTT was not there yet at start (broker took longer): subscribe again later."""
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

    # ── Find devices ─────────────────────────────────────────────────────

    @callback
    def _registry_changed(self, _event: Event[Any]) -> None:
        self.hass.async_create_task(self._rediscover_debouncer.async_call())

    @staticmethod
    @callback
    def _device_relevant(event_data: Any) -> bool:
        """Only device changes that affect discovery (not manufacturer URL, firmware); labels do (pulse_*)."""
        return event_data["action"] != "update" or bool(DEVICE_CHANGES & set(event_data.get("changes") or ()))

    @callback
    def _entity_relevant(self, event_data: Any) -> bool:
        """Own entities (three per device, except for labels) and cosmetic changes do not trigger a new discovery."""
        action = event_data["action"]
        if action == "remove":
            return True  # the entry is already gone, own entities can no longer be recognized here
        entry = er.async_get(self.hass).async_get(event_data["entity_id"])
        if entry is not None and entry.platform == DOMAIN:
            return action == "update" and "labels" in (event_data.get("changes") or ())
        return action != "update" or bool(ENTITY_CHANGES & set(event_data.get("changes") or ()))

    @callback
    def async_rediscover(self) -> None:
        """Find devices again now (setting `mains_beta` switched)."""
        if not self._stopped:
            self._rediscover()

    async def _async_rediscover(self) -> None:
        if not self._stopped:
            self._rediscover()

    @callback
    def _rediscover(self) -> None:
        specs = discover(self.hass, mains=bool(self.store.settings.get("mains_beta")))
        now = time.time()
        new: list[str] = []
        relabeled: list[str] = []
        for device_id, spec in specs.items():
            if device_id in self.devices:
                device = self.devices[device_id]
                was_ignored = device.ignored
                device.spec = spec
                if device.ignored != was_ignored:
                    relabeled.append(device_id)
                continue
            record = self.store.record(device_id)
            if record.get("first_seen") is None:
                record["first_seen"] = now
            if not record.get("battery_type") and (info := batt.lookup(spec.manufacturer, spec.model)):
                record["battery_type"] = info.type
                record["battery_count"] = info.count
                record["chemistry"] = record.get("chemistry") or info.chemistry
            if record.pop("rebuild_events", False) and spec.cloud:
                # Before 1.1 every cloud poll counted as a report: history refills them right away with value changes
                record["events"] = []
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
        self._alive = set(self._entity_map)
        for d in self.devices.values():
            for extra in (d.spec.battery, d.spec.battery_low, d.spec.connectivity):
                if extra:
                    self._entity_map.setdefault(extra, d.device_id)
        self._ieee_map = {d.spec.ieee: d.device_id for d in self.devices.values() if d.spec.ieee}
        for device_id in new:
            self._evaluate(self.devices[device_id], now, announce=False)
        for device_id in relabeled:
            self._reobserve(self.devices[device_id], now)
        if new or relabeled:
            async_dispatcher_send(self.hass, SIGNAL_NEW_DEVICES, new + relabeled)
        self.async_update()

    @callback
    def _remove_vanished(self, specs: dict[str, DeviceSpec]) -> None:
        """Clean up devices that are no longer monitored.

        - Device gone for good (e.g. integration replaced): remove own entities and record; otherwise
          the Pulse entities stay orphaned and the successor device gets `_2` IDs.
        - Device still there but no longer monitored (battery entity gone, device disabled): remove own
          entities, keep the record (reports trimmed); if it comes back they are recreated
          (same unique_id, same entity ID).
        - Device without own entities (integration currently not loaded/being rebuilt): touch nothing.
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
        """Device disabled or still has its own entities (so deliberately no longer monitored)."""
        return disabled or any(
            e.platform != DOMAIN and e.disabled_by is None for e in er.async_entries_for_device(entities, device_id)
        )

    def battery_level(self, device: Device) -> float | None:
        """Current battery value (percent, for warning sensors 5 = low)."""
        return self._battery_level(device.spec)

    @staticmethod
    def _battery_flag(spec: DeviceSpec) -> bool:
        """Only a warning sensor ("battery low" on/off), no percentage."""
        return bool(spec.battery and spec.battery.startswith("binary_sensor."))

    def _battery_percent(self, spec: DeviceSpec) -> float | None:
        """Real percentage (warning sensors: None)."""
        return None if self._battery_flag(spec) else self._battery_level(spec)

    def voltage(self, device: Device) -> float | None:
        """Current voltage in mV."""
        return _millivolts(self.hass.states.get(device.spec.voltage)) if device.spec.voltage else None

    def battery_percent(self, device: Device) -> float | None:
        """Real percentage (warning sensors: None)."""
        return self._battery_percent(device.spec)

    def battery_flag(self, device: Device) -> bool:
        return self._battery_flag(device.spec)

    def strip_of(self, device: Device, starts: list[float], now: float) -> list[int | None]:
        return self._strip(device, starts, now)

    def flag_on(self, device: Device) -> bool:
        """The device itself reports "battery low" (warning sensor on)."""
        spec = device.spec
        flag = spec.battery_low or (spec.battery if self._battery_flag(spec) else None)
        return bool(flag and self.hass.states.is_state(flag, STATE_ON))

    def _track_battery_missing(self, device: Device, now: float) -> None:
        """Since when the battery entity has had no value (stored, also across restarts)."""
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

    # ── History ──────────────────────────────────────────────────────────

    async def async_bootstrap(self) -> None:
        """Learn the last days from history; Pulse then knows the rhythm right away."""
        entity_ids = sorted(self._alive)
        starts = [float(span[0]) for span in self.store.uptime]
        result = await async_load_history(self.hass, entity_ids, HISTORY_DAYS, starts)
        if self._stopped:
            return
        keep_from = time.time() - KEEP_DAYS * DAY
        merged = 0
        for entity_id, (reports, actions) in result.items():
            if merged >= YIELD_EVERY:
                merged = 0
                await asyncio.sleep(0)  # chatty devices: let the event loop breathe in between
                if self._stopped:
                    return
            device = self.devices.get(self._entity_map.get(entity_id, ""))
            if device is None:
                continue
            merged += len(reports) + len(actions)
            # Cloud devices: only real value changes; otherwise every cloud poll writes a row
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
        await self._async_learn_outages()
        if self._stopped:
            return
        self.bootstrapped = True
        _LOGGER.debug("History read: %s entities", len(result))
        self._tick(dt_util.utcnow())

    async def _async_learn_outages(self) -> None:
        """From the recorder: past outages of mains devices, and for every device that is gone right now since
        when it really is (after an HA start only "unavailable since the start" is known).

        A device counts as gone only while all of its deciding entities were unavailable at the same time
        (`device_outages`): the lamp/plug entities of a mains device, else the integration's reachability flag,
        else all its entities. One entity alone (a siren that is often unavailable) says nothing.
        """
        watch: dict[str, list[str]] = {}
        offline: dict[str, str] = {}
        for device in self.devices.values():
            spec = device.spec
            if not spec.mains and not self._gone_now(device):
                continue
            if spec.mains and spec.main_entities:
                entity_ids = list(spec.main_entities)
            elif spec.connectivity:
                entity_ids = [spec.connectivity]
                offline[spec.connectivity] = STATE_OFF
            else:
                entity_ids = list(spec.entities)
            if entity_ids:
                watch[spec.device_id] = entity_ids
        wanted = sorted({e for ids in watch.values() for e in ids})
        result = await async_load_outages(self.hass, wanted, HISTORY_DAYS, offline)
        now = time.time()
        keep_from = now - KEEP_DAYS * DAY
        starts = self._starts()
        for device_id, entity_ids in watch.items():
            owner = self.devices.get(device_id)
            if owner is None or any(e not in result for e in entity_ids):
                continue  # no history for one of them: unknown, so nothing is assumed
            spans, running = device_outages([result[e] for e in entity_ids], now)
            spans = [(a, b) for a, b in spans if b - a >= OUTAGE_MIN and not near_start(a, starts)]
            if running is not None and near_start(running, starts):
                running = None  # only gone since the integration was loading at this start
            gone_now = owner.unavailable_since is not None
            if owner.spec.mains:
                if spans:
                    owner.record["outages"] = merge_outages(owner.record.get("outages", []), spans, keep_from)
                # Reports stored while the device itself was gone were only its other entities being rewritten
                gone = [*spans, *([(running, now)] if running is not None and gone_now else [])]
                if gone:
                    owner.record["events"] = without_spans(owner.record["events"], gone)
            # Gone since before the restart
            if running is not None:
                self._gone_before[device_id] = running
                if gone_now and owner.unavailable_since is not None and running < owner.unavailable_since:
                    owner.unavailable_since = running

    def _gone_now(self, device: Device) -> bool:
        """Unreachable at the moment: marked so, or all its entities unavailable / the integration says offline."""
        if device.unavailable_since is not None:
            return True
        via = device.spec.connectivity
        if via is not None and self.hass.states.is_state(via, STATE_OFF):
            return True
        states = [self.hass.states.get(e) for e in device.spec.entities]
        known = [s for s in states if s is not None]
        return bool(known) and all(s.state == STATE_UNAVAILABLE for s in known)

    def _mark_unavailable(self, device: Device, since: float) -> None:
        """Unreachable from `since` on; if the recorder knows it was gone already before the restart, from then."""
        if device.unavailable_since is not None:
            return
        before = self._gone_before.get(device.spec.device_id)
        device.unavailable_since = before if before is not None and before < since else since

    # ── Reports ──────────────────────────────────────────────────────────

    @callback
    def _tracked(self, event_data: Any) -> bool:
        return event_data.get("entity_id") in self._entity_map

    def _is_echo(self, device: Device) -> bool:
        ieee = device.spec.ieee
        return bool(self.z2m and ieee and (self.z2m.in_echo_window or self.z2m.echo_marked(ieee)))

    def _later(self, device: Device, handler: Callable[[Any], None], event: Any) -> bool:
        """Zigbee2MQTT devices: evaluate only after the MQTT message has been processed.

        HA's MQTT entities and Pulse's subscription get the same message in unknown order; only afterwards
        is it known whether it was an echo (`Z2MListener.echo_marked`).
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
        if entity_id == device.spec.connectivity:
            self._evaluate(device, now)  # reachability changed, no sign of life
            return
        if old is None or old.state in NOT_REAL or new.state in NOT_REAL or self._is_echo(device):
            return
        if device.cloud and old.state == new.state:
            return  # Cloud: a new poll without a new value is no sign of life of the device
        # Battery changes only from real transitions (never from restart echoes)
        if entity_id in (device.spec.battery, device.spec.voltage):
            self._check_battery(device, now, entity_id)
        if entity_id not in self._alive:
            return  # Battery/warning entity of another platform: no sign of life of the device
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
            return  # Cloud: same value again = only the cloud's polling rhythm
        # Same value reported again: confirms (or discards) a pending battery jump
        if entity_id in (device.spec.battery, device.spec.voltage) and device.record.get("pending_jump"):
            self._check_battery(device, time.time(), entity_id)
        if entity_id in self._alive:
            self._activity(device, new.last_reported.timestamp(), False)

    def _activity(self, device: Device, ts: float, action: bool) -> None:
        if device.spec.mains and device.unavailable_since is not None:
            # The lamp/plug itself is gone: what its other entities still report (a diagnostic sensor rewritten on
            # every poll of the integration) is no sign of life of the device
            return
        keep_from = time.time() - KEEP_DAYS * DAY
        # Thin out very chatty devices (BLE every few seconds) so 7 days fit into the store
        added = merge_event(device.record["events"], ts, keep_from, MAX_EVENTS, THIN_SECONDS)
        if action:
            merge_event(device.record["actions"], ts, keep_from, MAX_EVENTS)
        if not device.spec.mains:
            # Mains devices: `_check_availability` decides from the lamp/plug itself
            self._reachable_again(device, ts)
        if added or action:
            self.store.async_delay_save(SAVE_DELAY_EVENTS)
            if device.problem or action:
                self._evaluate(device, time.time())
            self.async_update()

    def _check_availability(self, device: Device, now: float) -> None:
        if device.spec.ieee and self.z2m and self.z2m.availability_enabled:
            return  # Zigbee2MQTT reports availability itself
        states = [self.hass.states.get(e) for e in device.spec.entities]
        known = [s for s in states if s is not None]
        if device.spec.mains:
            # The lamp/plug itself counts, not its diagnostic sensors or config switches (they stay available while
            # the lamp is gone)
            known = [s for s in known if s.entity_id in device.spec.main_entities] or known
        via = device.spec.connectivity
        offline = via is not None and self.hass.states.is_state(via, STATE_OFF)
        gone = bool(known) and all(s.state == STATE_UNAVAILABLE for s in known)
        if offline or gone:
            # Since the last of them went (after an HA restart: since the start, or earlier from the recorder)
            self._mark_unavailable(device, min(now, max(s.last_changed.timestamp() for s in known)) if gone else now)
        else:
            self._reachable_again(device, now)

    def _starts(self) -> list[float]:
        """Own HA starts (from `store.uptime`)."""
        return [float(span[0]) for span in self.store.uptime]

    def _reachable_again(self, device: Device, now: float) -> None:
        """Back after "unavailable": mains devices remember the outage (learned availability, `usual_outage`)."""
        self._gone_before.pop(device.spec.device_id, None)  # back: the outage before the restart is over
        since = device.unavailable_since
        if since is None:
            return
        device.unavailable_since = None
        # Not when it was gone since an HA start: then the integration was loading (or the outage was already
        # running before the restart, which the recorder knows with its real start)
        if device.spec.mains and now - since >= OUTAGE_MIN and not near_start(since, self._starts()):
            outages = device.record.get("outages", [])
            device.record["outages"] = merge_outages(outages, [(since, now)], now - KEEP_DAYS * DAY)
            self.store.async_delay_save(SAVE_DELAY_EVENTS)

    def _settled(self, now: float) -> bool:
        """Home Assistant has been running long enough that battery values are no longer start echoes."""
        return now - self.started_at >= STARTUP_GRACE

    def _check_battery(self, device: Device, now: float, entity_id: str | None = None) -> None:
        """Detect a battery change by its jump: only from real reports and confirmed.

        The reference value is the last stable real value. A jump only counts once a later real report
        (≥ MERGE_SECONDS, not the same radio message) confirms it; in the first minutes after start only
        the reference value is tracked. Only the entity that just reported is evaluated; the other's
        value may still come from the previous message.
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
                record["pending_jump"] = now  # remember first; the next real report must confirm it
                self.store.async_delay_save()
                return
            if now - pending < MERGE_SECONDS:
                return  # the same radio message (battery + voltage) does not confirm itself
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
        """Health counter increased: the device still transmits; no value, so no sign of life for the silence."""
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
            self._reachable_again(device, time.time())
        else:
            self._mark_unavailable(device, time.time())
        self._evaluate(device, time.time())
        self.async_update()

    @callback
    def _z2m_announce(self, ieee: str) -> None:
        device = self.devices.get(self._ieee_map.get(ieee, ""))
        if device is None or not device.problem or device.reason.get("key") not in SILENT_REASONS:
            return
        # A bridge restart or HA start makes many devices re-announce; that is no change
        if (self.z2m and self.z2m.in_echo_window) or not self._settled(time.time()):
            return
        # Re-announce after real silence: almost always a new battery
        self.mark_replaced(device.device_id, "announce")

    # ── Evaluate ─────────────────────────────────────────────────────────

    def _start_uptime(self, now: float) -> None:
        """New run: own uptime begins (runs older than 30 days are dropped)."""
        keep = now - UPTIME_KEEP
        self.store.uptime = [span for span in self.store.uptime if span[1] >= keep][-UPTIME_MAX:]
        self.store.uptime.append([now, now])
        self.store.async_delay_save()

    @callback
    def _tick(self, _now: datetime) -> None:
        now = time.time()
        if self.store.uptime:
            self.store.uptime[-1][1] = now  # always current in memory, every save takes it along
            if now - self._uptime_saved >= UPTIME_SAVE_EVERY:
                self._uptime_saved = now
                self.store.async_delay_save()
        # Notifier first (expired "Später" (later), quiet time over), then evaluate; so a tick reports nothing twice
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
        """When silence starts counting: last report, or a later "Batterie gewechselt" (battery changed) (otherwise
        "antwortet nicht" (not responding) would return at once; until the first report "wartet auf die erste
        Meldung" (waiting for the first report))."""
        last = device.last_activity
        replaced = device.record["replaced"]
        if replaced and (last is None or replaced[-1] > last):
            return float(replaced[-1])
        return last

    def silence_start(self, device: Device) -> float | None:
        """Start of the silence by the stray rule (one reference point for status, panel, `silent_since`)."""
        return device.silence_start if device.evaluated else self.silence_from(device)

    def downtime_gaps(self) -> list[tuple[float, float]]:
        """Times when HA was not running (from the own uptime); they do not count toward the silence."""
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
            actions = partner.record["actions"]
            partner_actions = len(actions) - bisect_right(actions, since)
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
            reachable=self._reachable(device),
            mains=device.spec.mains,
            usual_outage=usual_outage(record.get("outages", ()), now, gaps, KEEP_DAYS, self._starts())
            if device.spec.mains
            else None,
        )

    def _reachable(self, device: Device) -> str | None:
        """Name of the integration if it currently lists the device as reachable itself (Matter sub, cloud flag)."""
        via = device.spec.reachable_via
        if via is None or device.unavailable_since is not None:
            return None
        if via == "matter":
            states = [self.hass.states.get(e) for e in device.spec.entities]
            reachable = any(s is not None and s.state not in NOT_REAL for s in states)
        else:
            reachable = self.hass.states.is_state(via, STATE_ON)
        return self._integration_name(device.spec.integration) if reachable else None

    @staticmethod
    def _radio_rises(device: Device) -> int:
        """Health counter increases clearly after the last report (the own message counts too)."""
        last = device.last_activity
        return len([ts for ts in device.radio_rises if last is None or ts > last + RADIO_BUFFER])

    # ── Cloud ────────────────────────────────────────────────────────────

    def _cloud_pass(self, now: float) -> None:
        """If several devices of the same cloud integration drop out at once, it is the cloud."""
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
            # Largest group whose silence began within CLOUD_SPREAD
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
                # A reported outage holds as long as its devices are silent (no second notification, no breaking apart)
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
        except Exception:  # noqa: BLE001 - only for the sentence; not loaded → domain
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
        # One collective reason instead of many outages; the device itself is probably fine
        params = {"integration": outage["name"], "count": outage["count"]}
        return Verdict(STATUS_WATCH, {"key": "cloud_outage", "params": params})

    def _announce_cloud_outages(self) -> None:
        """One muted notification per cloud outage (remembered in the store, also across restarts)."""
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

    # ── Evaluate ─────────────────────────────────────────────────────────

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
        device.evaluated = True
        # Before history the status is provisional; the first evaluation afterwards sets the baseline
        first = not device.baseline
        if self.bootstrapped:
            device.baseline = True
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
            # Report known issues once (the notifier remembers what was said, also across restarts)
            self.notifier.maybe_notify(device)
        observed = announce and self.bootstrapped and changed and verdict.status != previous
        if (
            not device.problem
            and not cloud
            and (not observed or was_cloud)
            and (device.record.get("notified") or device.record.get("told"))
        ):
            # Recovered without Pulse seeing the transition (restart, ignore lifted, cloud back): clear the flag,
            # otherwise the next outage would stay silent. "Läuft wieder" (running again) only on a seen transition.
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
        # First evaluation after start: no notification for known issues (the notifier remembers what was reported)
        # Cloud outage: one collective notification instead of one per device (`_announce_cloud_outages`)
        if announce and self.bootstrapped and not cloud and not was_cloud:
            self.notifier.on_status(device, previous)
        self.async_update()

    # ── Once a day: forecast and partner suggestions ─────────────────────

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
        """Runtime from long-term statistics (recorder), in the executor so the event loop stays free."""
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
        """Permanently dismiss a partner suggestion."""
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

    # ── Actions ──────────────────────────────────────────────────────────

    def mark_replaced(self, device_id: str, source: str = "manual") -> None:
        device = self.devices.get(device_id)
        if device is None:
            return
        now = time.time()
        record = device.record
        replaced: list[float] = record["replaced"]
        if replaced and now - replaced[-1] < 6 * 3600 and source != "manual":
            return  # the same change reports through several values
        # Notification only if the change fixed something: problem or low battery before
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
        # New battery: the old forecast no longer applies (off the shopping list), new from the next daily run
        device.forecast, device.forecast_reason = None, "too_short"
        # For "Rückgängig" (undo): what was already reported, otherwise undoing would bring the same notification
        record["notified_before_replace"] = record.get("notified")
        if source != "manual":
            merge_event(device.record["events"], now, None, MAX_EVENTS)
        device.unavailable_since = None
        self._gone_before.pop(device_id, None)
        self.hass.bus.async_fire(
            EVENT_BATTERY_REPLACED, {"device_id": device_id, "name": device.name, "source": source}
        )
        self.notifier.on_replaced(device, worth_push, source)
        self._evaluate(device, now)
        self.store.async_delay_save()
        self.async_update()

    def undo_replaced(self, device_id: str) -> bool:
        """Undo the last change ("Rückgängig" in the panel); only a recent one (< 1 h)."""
        device = self.devices.get(device_id)
        if device is None:
            return False
        replaced: list[float] = device.record["replaced"]
        if not replaced or time.time() - replaced[-1] > 3600:
            return False
        ts = replaced.pop()
        sources: list[str] = device.record.get("replaced_source") or []
        source = sources.pop() if sources else "manual"
        if source != "manual":
            # Automatically detected changes recorded the time as a report (`mark_replaced`); remove that too
            events: list[float] = device.record["events"]
            idx = bisect_left(events, ts)
            if idx < len(events) and events[idx] == ts:
                del events[idx]
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
        self._reobserve(device, time.time())
        self.store.async_delay_save()
        async_dispatcher_send(self.hass, SIGNAL_NEW_DEVICES, [device_id])
        self.async_update()

    def _reobserve(self, device: Device, now: float) -> None:
        """Ignored or watched again (switch or label): the first status after that is no transition."""
        device.evaluated = False
        device.baseline = False
        self._evaluate(device, now, announce=False)

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

    # ── For panel and entities ───────────────────────────────────────────

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
        """Local midnights of the window plus end of today (days with a DST change are shorter/longer)."""
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
        """Heartbeat calendar (reports per 15 min, 7 days) for the requested devices."""
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
        """Times in the 7-day window when Pulse had no data (HA was not running).

        Calculated at most once per minute; the snapshot asks on every change. The reports are only
        needed for the time before the first own uptime (the first 7 days after setup).
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
        """Snapshot once per update and language, so several open panels do not build it repeatedly."""
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
        """Enable the bridge health check (only after confirmation in the panel)."""
        if self.z2m is None:
            raise ValueError("no_z2m")
        await self.z2m.async_enable_health()
        self.store.z2m_health_at = time.time()
        self.store.async_delay_save()
        self.async_update()
