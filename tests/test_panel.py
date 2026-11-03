"""Panel registration: no blocking file access on the event loop (HACS review hacs/default#13079)."""

from __future__ import annotations

from pathlib import Path
import threading
from unittest.mock import AsyncMock, MagicMock, patch

from homeassistant.core import HomeAssistant

from custom_components.pulse import panel


async def test_panel_file_checks_run_off_the_event_loop(hass: HomeAssistant):
    """Path.exists()/stat() on the panel file must run in the executor, not in the loop thread."""
    loop_thread = threading.get_ident()
    calls: list[tuple[str, bool]] = []
    real_exists, real_stat = Path.exists, Path.stat

    def exists(self, *args, **kwargs):
        if self.name == panel.PANEL_FILE:
            calls.append(("exists", threading.get_ident() == loop_thread))
        return real_exists(self, *args, **kwargs)

    def stat(self, *args, **kwargs):
        if self.name == panel.PANEL_FILE:
            calls.append(("stat", threading.get_ident() == loop_thread))
        return real_stat(self, *args, **kwargs)

    hass.config.components.add("frontend")
    hass.http = MagicMock(async_register_static_paths=AsyncMock())
    with (
        patch.object(Path, "exists", exists),
        patch.object(Path, "stat", stat),
        patch.object(panel.panel_custom, "async_register_panel", AsyncMock()) as register,
    ):
        await panel.async_register_panel(hass)

    assert register.await_count == 1
    assert {name for name, _ in calls} >= {"exists", "stat"}
    assert not [name for name, on_loop in calls if on_loop], calls
