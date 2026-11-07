"""Persisted data: reports, per-device settings, notification settings."""

from __future__ import annotations

from collections.abc import Iterable
import copy
import math
import time
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store

from .const import (
    DEFAULT_SETTINGS,
    HISTORY_DAYS,
    REGISTRY_CHANGES_MAX,
    STORE_KEY,
    STORE_MINOR,
    STORE_VERSION,
)
from .rhythm import DAY, restart_echoes

SAVE_DELAY = 60
# Reports arrive constantly: they may wait longer (on stop everything is saved immediately anyway)
SAVE_DELAY_EVENTS = 600


def default_record() -> dict[str, Any]:
    return {
        "events": [],
        "actions": [],
        "ignored": False,
        "critical": None,  # None = automatic
        "battery_type": None,
        "battery_count": None,
        "chemistry": None,
        "partner": None,
        "replaced": [],
        "replaced_source": [],  # per change: manual / auto / announce
        "pending_jump": None,  # battery jump that must be confirmed by the next real report
        "pending_drop": None,  # big fall that must be confirmed before it becomes the reference value
        "snooze_until": None,
        "last_level": None,
        "last_voltage": None,
        "notified": None,
        "notified_before_replace": None,  # for "Rückgängig" (undo) after "Batterie gewechselt" (battery changed)
        "told": False,  # a problem notification was actually delivered (not just queued)
        "first_seen": None,
        "partner_dismissed": [],  # dismissed partner suggestions (device IDs)
        "battery_missing_since": None,  # battery entity without a value since
        "problem_since": None,  # since when the current problem is reported (`monitor._track_problem`)
        "problem_of": None,  # "<status>|<reason_key>" of that problem
        "outages": [],  # mains devices: [start, end] of past "unavailable" spans that ended by themselves
    }


def merge_settings(base: dict[str, Any], update: dict[str, Any]) -> dict[str, Any]:
    """Merge a partial update into the settings (one level deep for sub-objects)."""
    result = copy.deepcopy(base)
    for key, value in update.items():
        if key not in DEFAULT_SETTINGS:
            continue
        default = DEFAULT_SETTINGS[key]
        if isinstance(value, dict) and isinstance(result.get(key), dict) and isinstance(default, dict):
            result[key] = {**result[key], **{k: v for k, v in value.items() if k in default}}
        else:
            result[key] = value
    return result


class _VersionedStore(Store[dict[str, Any]]):
    async def _async_migrate_func(
        self, old_major_version: int, old_minor_version: int, old_data: dict[str, Any]
    ) -> dict[str, Any]:
        return migrate(old_minor_version, old_data)


def migrate(old_minor: int, data: dict[str, Any]) -> dict[str, Any]:
    """Bring the store up to date (minor versions only, backward readable)."""
    if old_minor < 3:
        # Up to 1.2 the source of a change was not stored, and after restarts changes were detected
        # wrongly. Drop old entries; from now on with source.
        for record in data.get("devices", {}).values():
            record["replaced"] = []
            record["replaced_source"] = []
            record["pending_jump"] = None
    if old_minor < 4:
        # Up to 1.3 volt sensors (e.g. ZHA) were stored as volts; from now on always mV
        for record in data.get("devices", {}).values():
            if (volt := record.get("last_voltage")) is not None and volt < 100:
                record["last_voltage"] = volt * 1000
        # Arrive home: one person → list
        arrive = data.get("settings", {}).get("arrive_home")
        if isinstance(arrive, dict) and "person" in arrive:
            person = arrive.pop("person")
            arrive["persons"] = [person] if person else []
    if old_minor < 6:
        # 1.1: dismissed partner suggestions, battery missing since, reported cloud outages
        for record in data.get("devices", {}).values():
            record.setdefault("partner_dismissed", [])
            record.setdefault("battery_missing_since", None)
        data.setdefault("cloud_notified", {})
        data.setdefault("z2m_health_at", None)
    if old_minor < 7:
        # Up to 26.10.4 the state rows HA rewrites on start were read back from the recorder as reports, and
        # before 1.1 every cloud poll counted. Drop the restart echoes; cloud devices are rebuilt from history.
        starts = [float(span[0]) for span in data.get("uptime", []) if len(span) == 2]
        for record in data.get("devices", {}).values():
            for key in ("events", "actions"):
                stamps = record.get(key) or []
                echoes = restart_echoes(stamps, starts)
                record[key] = [ts for ts in stamps if ts not in echoes]
            record["rebuild_events"] = True
    if old_minor < 8:
        # 26.10.9: learned availability of mains devices (filled live and from the recorder on start); watching
        # mains devices is on by default from now on, also where it was only off as the old default
        for record in data.get("devices", {}).values():
            record.setdefault("outages", [])
        data.setdefault("settings", {})["mains_beta"] = True
    if old_minor < 9:
        # 26.11.5: registry changes per entity (HA rewrites the state then; that row is no report)
        data.setdefault("registry_changes", {})
    if old_minor < 10:
        # 26.11.5: which of them gave the entity a new ID (HA adds it again, its first row may come later)
        data.setdefault("entity_id_changes", {})
    if old_minor < 11:
        # 26.11.6: a big fall only becomes the reference once confirmed (single outliers, issue #5)
        for record in data.get("devices", {}).values():
            record.setdefault("pending_drop", None)
    return data


def _stamps(stamps: Any, keep: float) -> list[float]:
    """Valid times from `keep` on, sorted, the latest REGISTRY_CHANGES_MAX (anything else in the store is dropped)."""
    if not isinstance(stamps, list):
        return []
    valid = [
        float(ts)
        for ts in stamps
        if isinstance(ts, int | float) and not isinstance(ts, bool) and math.isfinite(ts) and ts >= keep
    ]
    return sorted(valid)[-REGISTRY_CHANGES_MAX:]


def _recent(changes: Any, keep: float) -> dict[str, list[float]]:
    """Registry changes from `keep` on, entities without any left (and broken entries) dropped."""
    if not isinstance(changes, dict):
        return {}
    result: dict[str, list[float]] = {}
    for entity_id, stamps in changes.items():
        if isinstance(entity_id, str) and (recent := _stamps(stamps, keep)):
            result[entity_id] = recent
    return result


class PulseStore:
    def __init__(self, hass: HomeAssistant) -> None:
        self._hass = hass
        self._store: Store[dict[str, Any]] = _VersionedStore(hass, STORE_VERSION, STORE_KEY, minor_version=STORE_MINOR)
        self.devices: dict[str, dict[str, Any]] = {}
        self.settings: dict[str, Any] = copy.deepcopy(DEFAULT_SETTINGS)
        self.z2m_enabled_at: float | None = None
        # Own uptime: [start, last seen] per run; shows in the panel when Pulse had no data
        self.uptime: list[list[float]] = []
        # Day (ISO) of the last sent daily summary, and of one still held back
        self.summary_sent: str | None = None
        self.summary_pending: str | None = None
        # Cloud integrations whose outage was already reported (integration → since)
        self.cloud_notified: dict[str, float] = {}
        self.z2m_health_at: float | None = None
        # Entity → times of its registry changes (rename, icon, unit, new entity ID, device renamed) within the
        # history window: HA rewrites the state right after, that row is no report (live and from the recorder)
        # Kept for every entity with a device (not only watched ones): a device added later, or an entity ID that
        # changes twice before Pulse searches again, still knows its changes
        self.registry_changes: dict[str, list[float]] = {}
        # The subset that gave the entity a new ID (`history.ENTITY_ID_ECHO`)
        self.entity_id_changes: dict[str, list[float]] = {}
        # A delayed save is pending; do not schedule again (HA would otherwise keep pushing it back)
        self._save_pending = False
        self._save_due: float | None = None

    async def async_load(self) -> None:
        data = await self._store.async_load()
        if not data:
            return
        for device_id, record in data.get("devices", {}).items():
            self.devices[device_id] = {**default_record(), **record}
        self.settings = merge_settings(copy.deepcopy(DEFAULT_SETTINGS), data.get("settings", {}))
        self.z2m_enabled_at = data.get("z2m_enabled_at")
        self.uptime = [list(span) for span in data.get("uptime", []) if len(span) == 2]
        self.summary_sent = data.get("summary_sent")
        self.summary_pending = data.get("summary_pending")
        self.cloud_notified = dict(data.get("cloud_notified") or {})
        self.z2m_health_at = data.get("z2m_health_at")
        keep = time.time() - HISTORY_DAYS * DAY
        self.registry_changes = _recent(data.get("registry_changes"), keep)
        self.entity_id_changes = _recent(data.get("entity_id_changes"), keep)

    def remember_registry_change(self, entity_ids: Iterable[str], ts: float, moved_from: str | None = None) -> None:
        """Registry change of these entities at `ts`; `moved_from`: their old entity ID, whose changes move along
        (the recorder hangs the old rows on the new ID), also along a chain A → B → C.

        Changes the lists in place and only prunes the touched entities (a device renamed with many entities, or
        many integrations updating their entries while HA starts, must not rebuild everything each time); the rest
        is pruned when saving. A history read gets its own copy (`registry_snapshot`)."""
        keep = ts - HISTORY_DAYS * DAY
        for entity_id in entity_ids:
            for changes in (self.registry_changes, self.entity_id_changes):
                if moved_from is not None and (old := changes.pop(moved_from, None)):
                    changes[entity_id] = [*old, *changes.get(entity_id, ())]
            self.registry_changes[entity_id] = _stamps([*self.registry_changes.get(entity_id, ()), ts], keep)
            if moved_from is not None:
                self.entity_id_changes[entity_id] = _stamps([*self.entity_id_changes.get(entity_id, ()), ts], keep)
        self.async_delay_save()

    def registry_snapshot(self) -> tuple[dict[str, list[float]], dict[str, list[float]]]:
        """Copies of (registry changes, entity ID changes) for a history read in the executor."""
        return (
            {e: list(v) for e, v in self.registry_changes.items()},
            {e: list(v) for e, v in self.entity_id_changes.items()},
        )

    def record(self, device_id: str) -> dict[str, Any]:
        if device_id not in self.devices:
            self.devices[device_id] = default_record()
        return self.devices[device_id]

    def async_delay_save(self, delay: float = SAVE_DELAY) -> None:
        """Save after `delay` seconds at the latest.

        HA's `Store.async_delay_save` pushes a pending save back on every call; Pulse calls it on
        every report, so in operation it would never save. Hence only reschedule if nothing is pending
        or the pending save would come later than now wanted; the state is only read when writing.
        Reports wait longer (SAVE_DELAY_EVENTS), settings briefly (SAVE_DELAY).
        """
        due = self._hass.loop.time() + delay
        if self._save_pending and self._save_due is not None and self._save_due <= due:
            return
        self._save_pending = True
        self._save_due = due
        self._store.async_delay_save(self._write_data, delay)

    def _write_data(self) -> dict[str, Any]:
        self._save_pending = False
        self._save_due = None
        return self._data()

    async def async_save(self) -> None:
        self._save_pending = False
        self._save_due = None
        await self._store.async_save(self._data())

    def _data(self) -> dict[str, Any]:
        keep = time.time() - HISTORY_DAYS * DAY
        self.registry_changes = _recent(self.registry_changes, keep)
        self.entity_id_changes = _recent(self.entity_id_changes, keep)
        return {
            "devices": self.devices,
            "settings": self.settings,
            "z2m_enabled_at": self.z2m_enabled_at,
            "uptime": self.uptime,
            "summary_sent": self.summary_sent,
            "summary_pending": self.summary_pending,
            "cloud_notified": self.cloud_notified,
            "z2m_health_at": self.z2m_health_at,
            "registry_changes": self.registry_changes,
            "entity_id_changes": self.entity_id_changes,
        }

    async def async_remove(self) -> None:
        """Integration removed: leave nothing behind (reports, settings, change history)."""
        await self._store.async_remove()
