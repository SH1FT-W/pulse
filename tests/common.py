"""Testgeräte: ein Thermometer, ein Türkontakt, ein Lecksensor, ein Schloss – typische Batteriegeräte."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import timedelta
from typing import TYPE_CHECKING

from homeassistant.core import HomeAssistant
from homeassistant.helpers import device_registry as dr, entity_registry as er
from homeassistant.util import dt as dt_util
from pytest_homeassistant_custom_component.common import MockConfigEntry, async_fire_time_changed

if TYPE_CHECKING:
    from custom_components.pulse.monitor import PulseMonitor

SOURCE = "fakezigbee"


@dataclass
class TestDevice:
    device_id: str
    entities: dict[str, str] = field(default_factory=dict)  # Schlüssel → entity_id


def source_entry(hass: HomeAssistant) -> MockConfigEntry:
    existing = hass.config_entries.async_entries(SOURCE)
    if existing:
        entry = existing[0]
        assert isinstance(entry, MockConfigEntry)
        return entry
    entry = MockConfigEntry(domain=SOURCE, title="Fake Zigbee")
    entry.add_to_hass(hass)
    return entry


def add_device(
    hass: HomeAssistant,
    slug: str,
    name: str,
    entities: list[tuple[str, str, str | None]],
    manufacturer: str = "IKEA",
    model: str = "PARASOLL door/window sensor",
    ieee: str | None = None,
    platform: str = SOURCE,
) -> TestDevice:
    """entities: (Domäne, Schlüssel, Geräteklasse)."""
    entry = source_entry(hass)
    identifiers = {("mqtt", f"zigbee2mqtt_{ieee}")} if ieee else {(SOURCE, slug)}
    device = dr.async_get(hass).async_get_or_create(
        config_entry_id=entry.entry_id, identifiers=identifiers, name=name, manufacturer=manufacturer, model=model
    )
    reg = er.async_get(hass)
    result = TestDevice(device.id)
    for domain, key, device_class in entities:
        entity = reg.async_get_or_create(
            domain,
            platform,
            f"{slug}_{key}",
            device_id=device.id,
            config_entry=entry,
            suggested_object_id=f"{slug}_{key}",
            original_device_class=device_class,
        )
        result.entities[key] = entity.entity_id
    return result


def standard_devices(hass: HomeAssistant) -> dict[str, TestDevice]:
    thermo = add_device(
        hass,
        "thermo",
        "Aquarium Temperatur",
        [("sensor", "temperature", "temperature"), ("sensor", "battery", "battery")],
        manufacturer="Tuya",
        model="Waterproof temperature sensor",
        ieee="0x0001",
    )
    door = add_device(
        hass,
        "door",
        "Türkontakt Wohnungstür",
        [("binary_sensor", "contact", "door"), ("sensor", "battery", "battery"), ("sensor", "voltage", "voltage")],
        ieee="0x0002",
    )
    leak = add_device(
        hass,
        "leak",
        "Lecksensor Bad",
        [("binary_sensor", "leak", "moisture"), ("sensor", "battery", "battery")],
        model="BADRING water leakage sensor",
        ieee="0x0003",
    )
    lock = add_device(
        hass,
        "lock",
        "Türschloss",
        [("lock", "lock", None), ("sensor", "battery", "battery")],
        manufacturer="Nuki",
        model="Smart Lock Pro",
    )
    return {"thermo": thermo, "door": door, "leak": leak, "lock": lock}


def set_states(hass: HomeAssistant, devices: dict[str, TestDevice]) -> None:
    hass.states.async_set(devices["thermo"].entities["temperature"], "25.0")
    hass.states.async_set(devices["thermo"].entities["battery"], "80")
    hass.states.async_set(devices["door"].entities["contact"], "off")
    hass.states.async_set(devices["door"].entities["battery"], "94")
    hass.states.async_set(devices["door"].entities["voltage"], "1200")
    hass.states.async_set(devices["leak"].entities["leak"], "off")
    hass.states.async_set(devices["leak"].entities["battery"], "30")
    hass.states.async_set(devices["lock"].entities["lock"], "locked")
    hass.states.async_set(devices["lock"].entities["battery"], "81")


def seed(monitor: PulseMonitor, device_id: str, every: float, count: int, end: float) -> None:
    record = monitor.devices[device_id].record
    record["events"] = [end - every * i for i in range(count - 1, -1, -1)]
    record["first_seen"] = record["events"][0]


async def tick(hass: HomeAssistant, freezer, delta: timedelta) -> None:
    freezer.tick(delta)
    async_fire_time_changed(hass, dt_util.utcnow())
    await hass.async_block_till_done()
