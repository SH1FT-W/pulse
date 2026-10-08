"""Aktionen: Wechsel eintragen, später erinnern, ignorieren, Testmitteilung."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from homeassistant.core import HomeAssistant, ServiceCall, ServiceResponse, SupportsResponse, callback
from homeassistant.exceptions import ServiceValidationError
from homeassistant.helpers import config_validation as cv
import voluptuous as vol

from .const import DOMAIN, SNOOZE_MAX_HOURS

if TYPE_CHECKING:
    from .monitor import PulseMonitor

DEVICE_SCHEMA = vol.Schema({vol.Required("device_id"): cv.string})
SNOOZE_SCHEMA = DEVICE_SCHEMA.extend(
    {vol.Optional("hours", default=24): vol.All(vol.Coerce(float), vol.Range(min=0, max=SNOOZE_MAX_HOURS))}
)
IGNORE_SCHEMA = DEVICE_SCHEMA.extend({vol.Optional("ignored", default=True): cv.boolean})


def get_monitor(hass: HomeAssistant) -> PulseMonitor:
    entries = hass.config_entries.async_loaded_entries(DOMAIN)
    if not entries:
        raise ServiceValidationError(translation_domain=DOMAIN, translation_key="not_loaded")
    monitor: PulseMonitor = entries[0].runtime_data
    return monitor


def _device(hass: HomeAssistant, call: ServiceCall) -> tuple[PulseMonitor, str]:
    monitor = get_monitor(hass)
    device_id = call.data["device_id"]
    if device_id not in monitor.devices:
        raise ServiceValidationError(translation_domain=DOMAIN, translation_key="unknown_device")
    return monitor, device_id


@callback
def async_register_services(hass: HomeAssistant) -> None:
    async def mark_replaced(call: ServiceCall) -> None:
        monitor, device_id = _device(hass, call)
        monitor.mark_replaced(device_id, "manual")

    async def snooze(call: ServiceCall) -> None:
        monitor, device_id = _device(hass, call)
        monitor.snooze(device_id, call.data["hours"])

    async def ignore(call: ServiceCall) -> None:
        monitor, device_id = _device(hass, call)
        monitor.set_ignored(device_id, call.data["ignored"])

    async def send_test(call: ServiceCall) -> ServiceResponse:
        targets: list[Any] = list(get_monitor(hass).notifier.send_test())
        return {"targets": targets}

    hass.services.async_register(DOMAIN, "mark_replaced", mark_replaced, schema=DEVICE_SCHEMA)
    hass.services.async_register(DOMAIN, "snooze", snooze, schema=SNOOZE_SCHEMA)
    hass.services.async_register(DOMAIN, "ignore", ignore, schema=IGNORE_SCHEMA)
    hass.services.async_register(
        DOMAIN, "send_test", send_test, schema=vol.Schema({}), supports_response=SupportsResponse.OPTIONAL
    )
