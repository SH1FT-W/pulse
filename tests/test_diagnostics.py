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
