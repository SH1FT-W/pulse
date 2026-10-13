"""Diagnose-Download: Zustand ohne Empfänger, Personen und Gerätenamen."""

from __future__ import annotations

from homeassistant.core import HomeAssistant

from custom_components.pulse.diagnostics import async_get_config_entry_diagnostics


async def test_diagnostics(hass: HomeAssistant, setup):
    monitor = setup["monitor"]
    monitor.store.settings["targets"] = ["mobile_app_alex"]
    monitor.store.settings["arrive_home"]["persons"] = ["person.alex"]
    data = await async_get_config_entry_diagnostics(hass, setup["entry"])
    assert data["settings"]["targets"] == "**REDACTED**"
    assert data["settings"]["arrive_home"]["persons"] == "**REDACTED**"
    assert data["zigbee2mqtt"]["active"] is False
    assert len(data["devices"]) == 4
    door = next(d for d in data["devices"] if d["record"]["battery_type"] == "AAA")
    assert door["status"] == "learning"
    assert "events" not in door["record"]
    assert isinstance(door["events"], int)
    text = str(data)
    assert "mobile_app_alex" not in text
    assert all(d.name not in text for d in monitor.devices.values())
