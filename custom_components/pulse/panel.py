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


def _panel_version(path: Path) -> int | None:
    """Modification time of the built panel as cache buster, None if it was not built."""
    if not path.exists():
        return None
    return int(path.stat().st_mtime)


async def async_register_panel(hass: HomeAssistant) -> None:
    """Panel nur registrieren, wenn das Frontend läuft (in Tests nicht)."""
    if "frontend" not in hass.config.components or hass.http is None:
        return
    www = Path(__file__).parent / "www"
    # File system access runs in the executor, never on the event loop.
    version = await hass.async_add_executor_job(_panel_version, www / PANEL_FILE)
    if version is None:
        return
    if not hass.data.get(DATA_STATIC):
        await hass.http.async_register_static_paths([StaticPathConfig(STATIC_URL, str(www), False)])
        hass.data[DATA_STATIC] = True
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
    if DOMAIN in hass.data.get(frontend.DATA_PANELS, {}):
        frontend.async_remove_panel(hass, DOMAIN)
