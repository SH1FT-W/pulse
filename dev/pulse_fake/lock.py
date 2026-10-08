from __future__ import annotations

from homeassistant.components.lock import LockEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

from .local import LOCK_INFO, Ticker


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry, add: AddConfigEntryEntitiesCallback) -> None:
    add([FakeLock()])


class FakeLock(Ticker, LockEntity):
    _attr_name = None
    _attr_unique_id = "pulse_fake_lock"
    _attr_device_info = LOCK_INFO
    interval = (90, 180)

    def __init__(self) -> None:
        self._attr_is_locked = True

    def tick(self) -> None:
        self._attr_is_locked = not self._attr_is_locked

    async def async_lock(self, **kwargs: object) -> None:
        self._attr_is_locked = True
        self.async_write_ha_state()

    async def async_unlock(self, **kwargs: object) -> None:
        self._attr_is_locked = False
        self.async_write_ha_state()
