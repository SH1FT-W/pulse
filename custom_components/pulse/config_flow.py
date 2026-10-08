"""Einrichtung: ein Klick. Pulse findet die Batteriegeräte selbst."""

from __future__ import annotations

from typing import Any

from homeassistant.config_entries import ConfigFlow, ConfigFlowResult

from .const import DOMAIN
from .discovery import discover


class PulseConfigFlow(ConfigFlow, domain=DOMAIN):
    VERSION = 1
    MINOR_VERSION = 1

    async def async_step_user(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        if user_input is not None:
            return self.async_create_entry(title="Pulse", data={})
        count = len(discover(self.hass))
        return self.async_show_form(step_id="user", description_placeholders={"count": str(count)})
