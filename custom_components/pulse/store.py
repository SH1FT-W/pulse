"""Persisted data: reports, per-device settings, notification settings."""

from __future__ import annotations

import copy
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store

from .const import DEFAULT_SETTINGS, STORE_KEY, STORE_MINOR, STORE_VERSION
from .rhythm import restart_echoes

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
        "snooze_until": None,
        "last_level": None,
        "last_voltage": None,
        "notified": None,
        "notified_before_replace": None,  # for "Rückgängig" (undo) after "Batterie gewechselt" (battery changed)
        "told": False,  # a problem notification was actually delivered (not just queued)
        "first_seen": None,
        "partner_dismissed": [],  # dismissed partner suggestions (device IDs)
        "battery_missing_since": None,  # battery entity without a value since
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
    return data


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
        return {
            "devices": self.devices,
            "settings": self.settings,
            "z2m_enabled_at": self.z2m_enabled_at,
            "uptime": self.uptime,
            "summary_sent": self.summary_sent,
            "summary_pending": self.summary_pending,
            "cloud_notified": self.cloud_notified,
            "z2m_health_at": self.z2m_health_at,
        }

    async def async_remove(self) -> None:
        """Integration removed: leave nothing behind (reports, settings, change history)."""
        await self._store.async_remove()
