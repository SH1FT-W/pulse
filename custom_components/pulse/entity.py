"""Gemeinsame Basis: Pulse-Entitäten hängen am überwachten Gerät selbst."""

from __future__ import annotations

import asyncio
from typing import Any

from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers.device_registry import DeviceEntryType, DeviceInfo
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from homeassistant.helpers.entity import Entity
from homeassistant.helpers.entity_platform import EntityPlatform
from homeassistant.util import slugify

from .const import DOMAIN, SIGNAL_UPDATE
from .monitor import Device, PulseMonitor


class PulseEntity(Entity):
    _attr_has_entity_name = True
    _attr_should_poll = False

    def __init__(self, monitor: PulseMonitor, key: str) -> None:
        self.monitor = monitor
        self._key = key
        self._written: tuple[Any, ...] | None = None

    async def async_added_to_hass(self) -> None:
        self.async_on_remove(async_dispatcher_connect(self.hass, SIGNAL_UPDATE, self._handle_update))

    @callback
    def _handle_update(self) -> None:
        # Nur schreiben, wenn sich etwas geändert hat – Pulse sendet bis zu einmal je Sekunde ein Update
        current = (self.available, self.state, self.extra_state_attributes)
        if current != self._written:
            self._written = current
            self.async_write_ha_state()


class PulseDeviceEntity(PulseEntity):
    """Entität am Gerät, das Pulse überwacht (Gerät gehört der jeweiligen Integration)."""

    def __init__(self, monitor: PulseMonitor, device_id: str, key: str) -> None:
        super().__init__(monitor, key)
        self.device_id = device_id
        self._attr_unique_id = f"{device_id}_{key}"
        self._attr_translation_key = key
        # Am Gerät der anderen Integration einhängen (wie HAs Helfer) – ohne eigenes Gerät anzulegen
        self.device_entry = dr.async_get(monitor.hass).async_get(device_id)

    def add_to_platform_start(
        self, hass: HomeAssistant, platform: EntityPlatform, parallel_updates: asyncio.Semaphore | None
    ) -> None:
        """Entity-ID nach dem Gerät vorschlagen: binary_sensor.turkontakt_wohnungstur_pulse_problem.

        Ohne eigenes Gerät (die Entität hängt am Gerät der anderen Integration) nähme HA sonst nur den
        Namen → binary_sensor.pulse_pulse_problem_4. Schon registrierte Entitäten behalten ihre ID.
        """
        super().add_to_platform_start(hass, platform, parallel_updates)
        entry = self.device_entry
        device_name = (entry.name_by_user or entry.name) if entry else None
        name = self.suggested_object_id or self._key
        if not slugify(name).startswith("pulse"):
            name = f"pulse {name}"
        self.entity_id = f"{platform.domain}.{slugify(' '.join(p for p in (device_name, name) if p))}"

    @property
    def device(self) -> Device | None:
        return self.monitor.devices.get(self.device_id)

    @property
    def available(self) -> bool:
        device = self.device
        return device is not None and not device.ignored


class PulseHubEntity(PulseEntity):
    """Gesamt-Entität am Gerät „Pulse“."""

    def __init__(self, monitor: PulseMonitor, key: str) -> None:
        super().__init__(monitor, key)
        self._attr_unique_id = f"{monitor.entry.entry_id}_{key}"
        self._attr_translation_key = key
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, monitor.entry.entry_id)},
            name="Pulse",
            manufacturer="SH1FT-W",
            entry_type=DeviceEntryType.SERVICE,
        )
