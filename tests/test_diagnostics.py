"""Diagnose-Download: Zustand ohne Empfänger, Personen und Gerätenamen."""

from __future__ import annotations

from pathlib import Path

from homeassistant.core import HomeAssistant
import yaml

from custom_components.pulse.const import SNOOZE_MAX_HOURS
from custom_components.pulse.diagnostics import async_get_config_entry_diagnostics

SERVICES_YAML = Path(__file__).parents[1] / "custom_components" / "pulse" / "services.yaml"


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


async def test_diagnostics_names_source_of_signs(hass: HomeAssistant, setup):
    """Woher ein Strich kam: Art der Entität und Auslöser, auch wenn sich die Batterie-Entität nicht ändert (#5)."""
    monitor = setup["monitor"]
    thermo = setup["devices"]["thermo"]
    temperature = thermo.entities["temperature"]
    hass.states.async_set(temperature, "30.1", hass.states.get(temperature).attributes)
    await hass.async_block_till_done()
    data = await async_get_config_entry_diagnostics(hass, setup["entry"])
    device = monitor.devices[thermo.device_id]
    entry = data["devices"][list(monitor.devices).index(thermo.device_id)]
    assert entry["recent_signs"][-1]["trigger"] == "changed"
    assert entry["recent_signs"][-1]["entity"].startswith("sensor")
    assert entry["recent_signs"][-1]["at"] == entry["recent_events"][-1]
    assert sum(entry["sign_counts"].values()) == 1
    assert sum(entry["entity_kinds"].values()) == len(device.spec.entities)
    battery = hass.states.get(device.spec.battery)
    assert entry["battery_state"]["last_changed"] == battery.last_changed.isoformat()
    # Same value again: counted with its own trigger, the stored mark (thinned) keeps the first source
    hass.states.async_set(temperature, "30.1", hass.states.get(temperature).attributes)
    await hass.async_block_till_done()
    data = await async_get_config_entry_diagnostics(hass, setup["entry"])
    entry = data["devices"][list(monitor.devices).index(thermo.device_id)]
    assert any(key.endswith(":reported") for key in entry["sign_counts"])
    assert len(entry["recent_signs"]) == 1
    text = str(data)
    assert temperature not in text
    assert all(d.name not in text for d in monitor.devices.values())


async def test_diagnostics_hides_partner_device_ids(hass: HomeAssistant, setup):
    """Partner und verworfene Vorschläge sind Geräte-IDs und bleiben draußen."""
    monitor = setup["monitor"]
    door, lock = setup["devices"]["door"].device_id, setup["devices"]["lock"].device_id
    monitor.devices[door].record["partner"] = lock
    monitor.devices[door].record["partner_dismissed"] = [setup["devices"]["thermo"].device_id]
    data = await async_get_config_entry_diagnostics(hass, setup["entry"])
    text = str(data)
    assert all(device_id not in text for device_id in monitor.devices)
    record = next(d for d in data["devices"] if d["record"]["partner"] is True)["record"]
    assert record["partner_dismissed"] == 1


def test_snooze_limit_matches_services_yaml():
    """Die Grenze im Dienst-Schema und die im Dienste-Formular sind dieselbe (ein Jahr)."""
    services = yaml.safe_load(SERVICES_YAML.read_text(encoding="utf-8"))
    assert services["snooze"]["fields"]["hours"]["selector"]["number"]["max"] == SNOOZE_MAX_HOURS
