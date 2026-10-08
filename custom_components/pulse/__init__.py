"""Pulse – merkt, wenn ein Batteriesensor still wird. Rein passiv, kostet keine Batterie."""

from __future__ import annotations

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers import config_validation as cv, issue_registry as ir
from homeassistant.helpers.typing import ConfigType

from . import ws
from .const import DOMAIN, PLATFORMS
from .monitor import PulseMonitor
from .panel import async_register_panel, async_unregister_panel
from .services import async_register_services
from .store import PulseStore

CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)

type PulseConfigEntry = ConfigEntry[PulseMonitor]


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    async_register_services(hass)
    ws.async_register(hass)
    return True


async def async_setup_entry(hass: HomeAssistant, entry: PulseConfigEntry) -> bool:
    store = PulseStore(hass)
    await store.async_load()
    monitor = PulseMonitor(hass, entry, store)
    entry.runtime_data = monitor
    await monitor.async_start()
    entry.async_on_unload(monitor.async_stop)
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    await async_register_panel(hass)
    return True


async def async_unload_entry(hass: HomeAssistant, entry: PulseConfigEntry) -> bool:
    unloaded = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if unloaded:
        # Erst stoppen (kein Takt plant danach noch ein Speichern mit altem Stand), dann sichern
        entry.runtime_data.async_stop()
        await entry.runtime_data.store.async_save()
        async_unregister_panel(hass)
    return unloaded


async def async_remove_entry(hass: HomeAssistant, entry: PulseConfigEntry) -> None:
    await PulseStore(hass).async_remove()
    issues = ir.async_get(hass)
    for domain, issue_id in list(issues.issues):
        if domain == DOMAIN:
            ir.async_delete_issue(hass, DOMAIN, issue_id)
