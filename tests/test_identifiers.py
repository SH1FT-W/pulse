"""Device identifiers are not always pairs: core hvv_departures registers 4-element tuples (issue #6)."""

from __future__ import annotations

from homeassistant.core import HomeAssistant
from homeassistant.helpers import device_registry as dr

from common import add_device, source_entry
from custom_components.pulse.discovery import discover, ieee_of


async def test_discovery_survives_long_identifiers(hass: HomeAssistant) -> None:
    # Shape as registered by hvv_departures: (domain, station id, station type, entry id)
    odd = dr.async_get(hass).async_get_or_create(
        config_entry_id=source_entry(hass).entry_id,
        identifiers={("hvv_departures", "Master:10950", "STATION", "abc123")},
        name="Hauptbahnhof",
    )
    assert ieee_of(odd) is None
    thermo = add_device(hass, "thermo", "Thermometer", [("sensor", "battery", "battery")], ieee="0x00124b0001")
    found = discover(hass)
    assert thermo.device_id in found
    assert found[thermo.device_id].ieee == "0x00124b0001"
