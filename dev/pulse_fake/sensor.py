from __future__ import annotations

import random

from homeassistant.components.sensor import SensorDeviceClass, SensorEntity, SensorStateClass
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import PERCENTAGE, EntityCategory
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

from .local import LOCK_INFO, PRESENCE_INFO, Ticker


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry, add: AddConfigEntryEntitiesCallback) -> None:
    add([Battery("lock", LOCK_INFO, 81), Battery("presence", PRESENCE_INFO, 64), Lux()])


class Battery(Ticker, SensorEntity):
    _attr_device_class = SensorDeviceClass.BATTERY
    _attr_native_unit_of_measurement = PERCENTAGE
    _attr_entity_category = EntityCategory.DIAGNOSTIC
    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_translation_key = None
    _attr_name = "Batterie"
    interval = (3000, 4000)

    def __init__(self, key: str, info: object, level: int) -> None:
        self._attr_unique_id = f"pulse_fake_{key}_battery"
        self._attr_device_info = info  # type: ignore[assignment]
        self._attr_native_value = level

    def tick(self) -> None:
        return


class Lux(Ticker, SensorEntity):
    _attr_device_class = SensorDeviceClass.ILLUMINANCE
    _attr_native_unit_of_measurement = "lx"
    _attr_unique_id = "pulse_fake_presence_lux"
    _attr_device_info = PRESENCE_INFO
    _attr_name = "Beleuchtungsstärke"
    interval = (30, 90)

    def __init__(self) -> None:
        self._attr_native_value = 120

    def tick(self) -> None:
        self._attr_native_value = max(0, int(self._attr_native_value or 0) + random.randint(-15, 15))
