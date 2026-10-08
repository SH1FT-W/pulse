"""Pro Gerät: „Pulse-Problem“ (an = prüfen oder ausgefallen)."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from homeassistant.components.binary_sensor import BinarySensorDeviceClass, BinarySensorEntity
from homeassistant.const import EntityCategory
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

from .const import SIGNAL_NEW_DEVICES
from .entity import PulseDeviceEntity

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
        async_add_entities(ProblemSensor(monitor, d) for d in fresh)

    add(list(monitor.devices))
    entry.async_on_unload(async_dispatcher_connect(hass, SIGNAL_NEW_DEVICES, add))


class ProblemSensor(PulseDeviceEntity, BinarySensorEntity):
    _unrecorded_attributes = frozenset({"reason_key"})
    _attr_device_class = BinarySensorDeviceClass.PROBLEM
    _attr_entity_category = EntityCategory.DIAGNOSTIC

    def __init__(self, monitor: Any, device_id: str) -> None:
        super().__init__(monitor, device_id, "problem")

    @property
    def is_on(self) -> bool | None:
        device = self.device
        return None if device is None else device.problem

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        device = self.device
        if device is None:
            return {}
        return {"status": device.status, "reason_key": device.reason.get("key")}
