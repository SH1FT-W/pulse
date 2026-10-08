"""Seitenleisten-Panel „Pulse“."""

from __future__ import annotations

from pathlib import Path

from homeassistant.components import frontend, panel_custom
from homeassistant.components.http import StaticPathConfig
from homeassistant.core import HomeAssistant

from .const import DOMAIN

STATIC_URL = "/pulse-static"
PANEL_FILE = "pulse-panel.js"
DATA_STATIC = "pulse_static_registered"


async def async_register_panel(hass: HomeAssistant) -> None:
    """Panel nur registrieren, wenn das Frontend läuft (in Tests nicht)."""
    if "frontend" not in hass.config.components or hass.http is None:
        return
    www = Path(__file__).parent / "www"
    if not (www / PANEL_FILE).exists():
        return
    if not hass.data.get(DATA_STATIC):
        await hass.http.async_register_static_paths([StaticPathConfig(STATIC_URL, str(www), False)])
        hass.data[DATA_STATIC] = True
    version = int((www / PANEL_FILE).stat().st_mtime)
    await panel_custom.async_register_panel(
        hass,
        webcomponent_name="pulse-panel",
        frontend_url_path=DOMAIN,
        module_url=f"{STATIC_URL}/{PANEL_FILE}?v={version}",
        sidebar_title="Pulse",
        sidebar_icon="mdi:pulse",
        require_admin=False,  # lesen dürfen alle, ändern nur Admins (WebSocket prüft)
        config={},
    )


def async_unregister_panel(hass: HomeAssistant) -> None:
    if DOMAIN in hass.data.get("frontend_panels", {}):
        frontend.async_remove_panel(hass, DOMAIN)
