"""Found by itself (follow-up to #2): voice satellites of local hardware, SMLIGHT coordinators, link sensors."""

from __future__ import annotations

from homeassistant.const import EntityCategory
from homeassistant.core import HomeAssistant
from homeassistant.helpers import device_registry as dr, entity_registry as er
from pytest_homeassistant_custom_component.common import MockConfigEntry

from common import TestDevice as Device
from custom_components.pulse.discovery import discover

CONFIG = EntityCategory.CONFIG
DIAG = EntityCategory.DIAGNOSTIC


def _device(hass: HomeAssistant, domain: str, slug: str, entities) -> Device:
    """A device in a config entry of its own, like ESPHome and SMLIGHT create them."""
    entry = MockConfigEntry(domain=domain, title=slug)
    entry.add_to_hass(hass)
    device = dr.async_get(hass).async_get_or_create(
        config_entry_id=entry.entry_id, identifiers={(domain, slug)}, name=slug
    )
    reg = er.async_get(hass)
    result = Device(device.id)
    for e_domain, key, device_class, category in entities:
        entity = reg.async_get_or_create(
            e_domain,
            domain,
            f"{slug}_{key}",
            device_id=device.id,
            config_entry=entry,
            suggested_object_id=f"{slug}_{key}",
            original_device_class=device_class,
            entity_category=category,
        )
        result.entities[key] = entity.entity_id
    return result


def _voice(hass: HomeAssistant, slug: str = "voice", domain: str = "esphome", battery: bool = False) -> Device:
    entities = [
        ("media_player", "player", None, None),
        ("assist_satellite", "assist", None, None),
        ("switch", "mute", None, CONFIG),
        ("sensor", "wifi_signal", "signal_strength", DIAG),
    ]
    if battery:
        entities.append(("sensor", "battery", "battery", DIAG))
    return _device(hass, domain, slug, entities)


async def test_voice_satellite_of_local_hardware_is_a_mains_device(hass: HomeAssistant) -> None:
    voice = _voice(hass)
    spec = discover(hass, mains=True)[voice.device_id]
    assert spec.mains and spec.integration == "esphome"
    # The media player decides whether it is there, not the mute switch (a config entity)
    assert spec.main_entities == [voice.entities["player"]]
    assert spec.icon == "mdi:speaker"
    # Only with mains-powered devices switched on
    assert voice.device_id not in discover(hass, mains=False)


async def test_other_media_players_stay_out(hass: HomeAssistant) -> None:
    cloud = _voice(hass, "echo", domain="alexa_media")
    battery = _voice(hass, "portable", battery=True)
    found = discover(hass, mains=True)
    assert cloud.device_id not in found  # a cloud speaker is no local hardware
    assert battery.device_id not in found  # battery device with a media player: no battery sensor
    assert battery.device_id not in discover(hass, mains=False)


async def test_smlight_coordinator_on_wifi(hass: HomeAssistant) -> None:
    slzb = _device(
        hass,
        "smlight",
        "slzb",
        [
            ("binary_sensor", "ethernet", "connectivity", DIAG),
            ("binary_sensor", "wifi", "connectivity", DIAG),
            ("binary_sensor", "internet", "connectivity", DIAG),
            ("sensor", "core_temperature", "temperature", DIAG),
            ("switch", "disable_led", None, CONFIG),
        ],
    )
    spec = discover(hass, mains=True)[slzb.device_id]
    assert spec.mains and spec.integration == "smlight"
    # Which link it uses says nothing about being reachable: Ethernet off on Wi-Fi is no outage
    assert spec.connectivity is None
    assert slzb.entities["core_temperature"] in spec.entities
    assert slzb.entities["ethernet"] not in spec.entities


async def test_link_sensors_are_no_reachability_when_added_by_hand(hass: HomeAssistant) -> None:
    nas = _device(
        hass,
        "synology_dsm",
        "nas",
        [
            ("binary_sensor", "ethernet", "connectivity", DIAG),
            ("binary_sensor", "vpn", "connectivity", DIAG),
            ("sensor", "cpu", None, DIAG),
        ],
    )
    spec = discover(hass, mains=True, manual=[nas.device_id])[nas.device_id]
    assert spec.manual and spec.connectivity is None
