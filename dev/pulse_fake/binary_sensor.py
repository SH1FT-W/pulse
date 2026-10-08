from __future__ import annotations

from homeassistant.components.binary_sensor import BinarySensorDeviceClass, BinarySensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

from .local import PRESENCE_INFO, Ticker


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry, add: AddConfigEntryEntitiesCallback) -> None:
    add([Presence()])


class Presence(Ticker, BinarySensorEntity):
    _attr_device_class = BinarySensorDeviceClass.OCCUPANCY
    _attr_unique_id = "pulse_fake_presence"
    _attr_device_info = PRESENCE_INFO
    _attr_name = "Belegung"
    interval = (60, 240)

    def __init__(self) -> None:
        self._attr_is_on = False

    def tick(self) -> None:
        self._attr_is_on = not self._attr_is_on
