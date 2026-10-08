"""Nur Import aus configuration.yaml (`pulse_fake:`)."""

from __future__ import annotations

from typing import Any

from homeassistant.config_entries import ConfigFlow, ConfigFlowResult

from . import DOMAIN


class FakeFlow(ConfigFlow, domain=DOMAIN):
    VERSION = 1

    async def async_step_import(self, _data: dict[str, Any]) -> ConfigFlowResult:
        await self.async_set_unique_id(DOMAIN)
        self._abort_if_unique_id_configured()
        return self.async_create_entry(title="Pulse Fake-Geräte", data={})

    async def async_step_user(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        return await self.async_step_import({})
