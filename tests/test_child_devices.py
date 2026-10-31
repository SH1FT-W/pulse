"""Child devices (lens, channel, endpoint; used by Tuya, Z-Wave, ESPHome … from HA 2026.11) belong to their parent."""

from __future__ import annotations

from homeassistant.core import HomeAssistant
from homeassistant.helpers import device_registry as dr, entity_registry as er

from common import add_device, source_entry
from custom_components.pulse.discovery import discover


def _child_entity(hass: HomeAssistant, child_id: str, domain: str, key: str, device_class: str | None) -> str:
    return (
        er.async_get(hass)
        .async_get_or_create(
            domain,
            "fakezigbee",
            key,
            device_id=child_id,
            config_entry=source_entry(hass),
            suggested_object_id=key,
            original_device_class=device_class,
        )
        .entity_id
    )


async def test_child_device_entities_count_for_the_parent(hass: HomeAssistant) -> None:
    devices = dr.async_get(hass)
    entry = source_entry(hass)
    # Battery device whose contact sits on a child device (e.g. a Z-Wave endpoint)
    sensor = add_device(hass, "multi", "Multisensor", [("sensor", "battery", "battery")])
    endpoint = devices.async_get_or_create_child(
        config_entry_id=entry.entry_id,
        identifiers={("fakezigbee", "multi_ep1")},
        name="Kontakt",
        parent_device_id=sensor.device_id,
    )
    contact = _child_entity(hass, endpoint.id, "binary_sensor", "multi_contact", "door")
    # Mains power strip whose sockets are channels on child devices (e.g. Tuya), the parent only has diagnostics
    strip = add_device(hass, "strip", "Steckdosenleiste", [])
    sockets = []
    for n in (1, 2):
        channel = devices.async_get_or_create_child(
            config_entry_id=entry.entry_id,
            identifiers={("fakezigbee", f"strip_ch{n}")},
            name=f"Steckdose {n}",
            parent_device_id=strip.device_id,
        )
        sockets.append(_child_entity(hass, channel.id, "switch", f"strip_socket{n}", None))
    # A disabled child device does not count
    off = devices.async_get_or_create_child(
        config_entry_id=entry.entry_id,
        identifiers={("fakezigbee", "strip_ch3")},
        name="Steckdose 3",
        parent_device_id=strip.device_id,
    )
    _child_entity(hass, off.id, "switch", "strip_socket3", None)
    devices.async_update_child_device(off.id, disabled_by=dr.DeviceEntryDisabler.USER)

    found = discover(hass, mains=True)

    assert contact in found[sensor.device_id].entities
    assert found[sensor.device_id].actions == [contact]
    assert found[sensor.device_id].icon == "mdi:door"
    assert sorted(found[strip.device_id].main_entities) == sorted(sockets)
    assert found[strip.device_id].mains
    # Child devices never become devices of their own
    assert set(found) == {sensor.device_id, strip.device_id}
