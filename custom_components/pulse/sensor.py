"""Pro Gerät: Status und „zuletzt gemeldet“. Gesamt: Probleme und überwachte Geräte."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Any

from homeassistant.components.sensor import SensorDeviceClass, SensorEntity
from homeassistant.const import EntityCategory
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback
from homeassistant.util import dt as dt_util

from .const import SIGNAL_NEW_DEVICES, STATUSES
from .entity import PulseDeviceEntity, PulseHubEntity

if TYPE_CHECKING:
    from . import PulseConfigEntry


async def async_setup_entry(
    hass: HomeAssistant, entry: PulseConfigEntry, async_add_entities: AddConfigEntryEntitiesCallback
) -> None:
    monitor = entry.runtime_data
    known: set[str] = set()

    @callback
    def add(device_ids: list[str]) -> None:
        fresh = [d for d in device_ids if d not in known and d in monitor.devices]
        known.update(fresh)
        entities: list[SensorEntity] = []
        for device_id in fresh:
            entities += [StatusSensor(monitor, device_id), LastReportSensor(monitor, device_id)]
        async_add_entities(entities)

    async_add_entities([ProblemsSensor(monitor), MonitoredSensor(monitor)])
    add(list(monitor.devices))
    entry.async_on_unload(async_dispatcher_connect(hass, SIGNAL_NEW_DEVICES, add))


class StatusSensor(PulseDeviceEntity, SensorEntity):
    # Stabile Werte für Automationen (kein laufend wechselnder Satz); nicht in den Verlauf
    _unrecorded_attributes = frozenset({"reason_key", "silent_since", "typical_interval", "snoozed_until"})
    _attr_device_class = SensorDeviceClass.ENUM
    _attr_options = STATUSES
    _attr_entity_category = EntityCategory.DIAGNOSTIC

    def __init__(self, monitor: Any, device_id: str) -> None:
        super().__init__(monitor, device_id, "status")

    @property
    def native_value(self) -> str | None:
        device = self.device
        return None if device is None else device.status

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        device = self.device
        if device is None:
            return {}
        since = self.monitor.silence_from(device)
        snooze = device.record.get("snooze_until")
        return {
            "reason_key": device.reason.get("key"),
            "silent_since": dt_util.utc_from_timestamp(since).isoformat() if since else None,
            "typical_interval": round(device.rhythm.typical) if device.rhythm.typical else None,
            "critical": device.critical,
            "snoozed_until": dt_util.utc_from_timestamp(snooze).isoformat() if snooze else None,
        }


class LastReportSensor(PulseDeviceEntity, SensorEntity):
    _attr_device_class = SensorDeviceClass.TIMESTAMP
    _attr_entity_category = EntityCategory.DIAGNOSTIC

    def __init__(self, monitor: Any, device_id: str) -> None:
        super().__init__(monitor, device_id, "last_report")

    @property
    def native_value(self) -> datetime | None:
        device = self.device
        if device is None or device.last_activity is None:
            return None
        return dt_util.utc_from_timestamp(device.last_activity)


class ProblemsSensor(PulseHubEntity, SensorEntity):
    _unrecorded_attributes = frozenset({"devices"})

    def __init__(self, monitor: Any) -> None:
        super().__init__(monitor, "problems")

    @property
    def native_value(self) -> int:
        return len(self.monitor.problems())

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        return {
            "devices": [
                {
                    "device_id": d.device_id,
                    "name": d.name,
                    "status": d.status,
                    "reason_key": d.reason.get("key"),
                    "reason": self.monitor.reason(d),
                }
                for d in self.monitor.problems()
            ]
        }


class MonitoredSensor(PulseHubEntity, SensorEntity):
    def __init__(self, monitor: Any) -> None:
        super().__init__(monitor, "monitored")

    @property
    def native_value(self) -> int:
        return len(self.monitor.monitored())
