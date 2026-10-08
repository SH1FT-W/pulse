"""Geräte ohne MQTT (wie Matter): Türschloss und Präsenzmelder."""

from __future__ import annotations

import random
from typing import Any

from homeassistant.core import callback
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.entity import Entity
from homeassistant.helpers.event import async_call_later

DOMAIN = "pulse_fake"

LOCK_INFO = DeviceInfo(identifiers={(DOMAIN, "lock")}, name="Türschloss", manufacturer="Nuki", model="Smart Lock Pro")
PRESENCE_INFO = DeviceInfo(
    identifiers={(DOMAIN, "presence")},
    name="Präsenzmelder Büro",
    manufacturer="Aqara",
    model="Presence Multi-Sensor FP300",
)


class Ticker(Entity):
    """Ändert sich in zufälligen Abständen."""

    _attr_should_poll = False
    _attr_has_entity_name = True
    interval: tuple[float, float] = (60, 120)

    async def async_added_to_hass(self) -> None:
        self._schedule()

    def _schedule(self) -> None:
        @callback
        def fire(_now: Any) -> None:
            self.tick()
            self.async_write_ha_state()
            self._schedule()

        self.async_on_remove(async_call_later(self.hass, random.uniform(*self.interval), fire))

    def tick(self) -> None:
        raise NotImplementedError
