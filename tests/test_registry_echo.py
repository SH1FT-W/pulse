"""Umbenennen und andere Register-Änderungen: HA schreibt die Zustände neu, das ist kein Lebenszeichen."""

from __future__ import annotations

from datetime import timedelta
import time

from homeassistant import config_entries
from homeassistant.core import HomeAssistant
from homeassistant.helpers import device_registry as dr, entity_registry as er
from pytest_homeassistant_custom_component.common import MockEntity, MockEntityPlatform
from test_z2m_history import start_pulse

from common import SOURCE, source_entry, standard_devices
from custom_components.pulse.const import DOMAIN
from custom_components.pulse.monitor import PulseMonitor


class Sensor(MockEntity):
    """Echte Entität: HA schreibt ihren Zustand selbst neu, wenn sich Gerät oder Register ändern."""

    def __init__(self, value: str, **values) -> None:
        super().__init__(should_poll=False, **values)
        self._attr_state = value


async def aquarium(hass: HomeAssistant) -> tuple[PulseMonitor, str, list[str]]:
    """Ein Thermometer mit drei echten Entitäten: mit Gerätenamen, mit eigenem Namen, Batterie."""
    entry = source_entry(hass)
    platform = MockEntityPlatform(hass, domain="sensor", platform_name=SOURCE)
    platform.config_entry = entry
    info = {"identifiers": {(SOURCE, "aqua")}, "name": "Aquarium temperature", "manufacturer": "Tuya"}
    entities = [
        Sensor("25.0", unique_id="aqua_t", name="Temperatur", has_entity_name=True, device_info=info),
        Sensor("25.0", unique_id="aqua_t2", name="Wasser", has_entity_name=False, device_info=info),
        Sensor("80", unique_id="aqua_b", name="Akku", has_entity_name=True, device_class="battery", device_info=info),
    ]
    await platform.async_add_entities(entities)
    await hass.async_block_till_done()
    device_id = er.async_get(hass).async_get(entities[0].entity_id or "").device_id  # type: ignore[union-attr]
    assert device_id is not None
    result = await hass.config_entries.flow.async_init(DOMAIN, context={"source": config_entries.SOURCE_USER})
    await hass.config_entries.flow.async_configure(result["flow_id"], {})
    await hass.async_block_till_done()
    monitor: PulseMonitor = hass.config_entries.async_entries(DOMAIN)[0].runtime_data
    return monitor, device_id, [e.entity_id for e in entities if e.entity_id]


async def test_rename_is_no_sign_of_life(hass: HomeAssistant, freezer):
    freezer.move_to("2026-10-03 10:00:00+00:00")
    monitor, device_id, entity_ids = await aquarium(hass)
    device = monitor.devices[device_id]
    assert set(entity_ids) <= set(device.spec.entities)
    # Fünf Tage still
    freezer.tick(timedelta(days=5))
    before = list(device.record["events"])
    names = [hass.states.get(e).attributes.get("friendly_name") for e in entity_ids]  # type: ignore[union-attr]

    # Gerät umbenennen: HA schreibt alle Entitäten neu (friendly_name geändert bzw. gleich → state_reported)
    dr.async_get(hass).async_update_device(device_id, name_by_user="Aquarium Becken")
    await hass.async_block_till_done()
    assert hass.states.get(entity_ids[0]).attributes["friendly_name"] != names[0]  # type: ignore[union-attr]
    assert device.record["events"] == before

    # Entität umbenennen, Symbol ändern, Bereich zuweisen: ebenso nur Register
    freezer.tick(timedelta(minutes=1))
    reg = er.async_get(hass)
    reg.async_update_entity(entity_ids[0], name="Wassertemperatur")
    reg.async_update_entity(entity_ids[1], icon="mdi:fish")
    reg.async_update_entity(entity_ids[2], aliases={"Akku"})
    await hass.async_block_till_done()
    assert device.record["events"] == before

    # Nur der Anzeigename ändert sich ohne Register (customize): auch kein Lebenszeichen
    freezer.tick(timedelta(minutes=5))
    attrs = dict(hass.states.get(entity_ids[1]).attributes)  # type: ignore[union-attr]
    hass.states.async_set(entity_ids[1], "25.0", attrs | {"friendly_name": "Becken"})
    await hass.async_block_till_done()
    assert device.record["events"] == before

    # Echte Meldungen zählen weiter: neuer Wert und gleicher Wert erneut gemeldet (Abstand > THIN_SECONDS)
    freezer.tick(timedelta(minutes=5))
    hass.states.async_set(entity_ids[0], "25.5", hass.states.get(entity_ids[0]).attributes)  # type: ignore[union-attr]
    await hass.async_block_till_done()
    assert device.record["events"][-1] == time.time()
    freezer.tick(timedelta(minutes=5))
    hass.states.async_set(entity_ids[0], "25.5", hass.states.get(entity_ids[0]).attributes)  # type: ignore[union-attr]
    await hass.async_block_till_done()
    assert device.record["events"][-1] == time.time()


async def test_rename_rows_in_recorder_are_no_sign_of_life(hass: HomeAssistant, recorder_mock, freezer):
    from homeassistant.components.recorder import get_instance

    freezer.move_to("2026-10-03 10:00:00+00:00")
    devices = standard_devices(hass)
    temperature = devices["thermo"].entities["temperature"]
    contact = devices["door"].entities["contact"]
    hass.states.async_set(temperature, "20.0", {"friendly_name": "Aquarium Temperatur"})
    hass.states.async_set(contact, "off", {"friendly_name": "Tür", "linkquality": 80})
    leak = devices["leak"].entities["leak"]
    hass.states.async_set(leak, "off", {"friendly_name": "Leck"})
    freezer.tick(timedelta(minutes=30))
    hass.states.async_set(temperature, "20.1", {"friendly_name": "Aquarium Temperatur"})
    last = time.time()
    freezer.tick(timedelta(days=2))
    # Umbenannt: neue Recorder-Zeile mit gleichem Wert, nur der Name anders
    hass.states.async_set(temperature, "20.1", {"friendly_name": "Aquarium Becken"})
    # Echte Meldung mit gleichem Wert, aber neuen Daten in den Attributen: zählt
    hass.states.async_set(contact, "off", {"friendly_name": "Tür", "linkquality": 60})
    reported = time.time()
    # force_update (Z-Wave, ESPHome): gleicher Wert, gleiche Attribute, neuer Zustand – eine echte Meldung
    hass.states.async_set(leak, "off", {"friendly_name": "Leck"}, force_update=True)
    await hass.async_block_till_done()
    await get_instance(hass).async_block_till_done()
    freezer.tick(timedelta(minutes=5))
    monitor = await start_pulse(hass)
    await hass.async_block_till_done()
    await get_instance(hass).async_block_till_done()
    await hass.async_block_till_done()
    assert monitor.bootstrapped
    assert monitor.devices[devices["thermo"].device_id].record["events"][-1] == last
    assert monitor.devices[devices["door"].device_id].record["events"][-1] == reported
    assert monitor.devices[devices["leak"].device_id].record["events"][-1] == reported


def test_restart_row_needs_no_attributes():
    """Die Zeile, die HA beim Start schreibt, ist ein neuer Zustand: kein zweites Lesen mit Attributen."""
    from datetime import UTC, datetime

    from homeassistant.core import State

    from custom_components.pulse.history import same_value_rows

    t0 = datetime(2026, 10, 3, 10, tzinfo=UTC)
    t1 = t0 + timedelta(hours=1)
    first = State("sensor.a", "20.1", last_changed=t0, last_updated=t0)
    restart = State("sensor.a", "20.1", last_changed=t1, last_updated=t1)
    renamed = State("sensor.a", "20.1", last_changed=t0, last_updated=t1)
    assert not same_value_rows([first, restart])
    assert same_value_rows([first, renamed])
    assert not same_value_rows([first, State("sensor.a", "unavailable"), renamed])


async def test_force_update_and_data_attributes_live(hass: HomeAssistant, freezer):
    freezer.move_to("2026-10-03 10:00:00+00:00")
    monitor, device_id, entity_ids = await aquarium(hass)
    device = monitor.devices[device_id]
    freezer.tick(timedelta(days=1))
    before = list(device.record["events"])
    reg = er.async_get(hass)
    # force_update: HA schreibt nach der Registeränderung gleichen Wert und gleiche Attribute als state_changed
    attrs = dict(hass.states.get(entity_ids[1]).attributes)  # type: ignore[union-attr]
    reg.async_update_entity(entity_ids[1], aliases={"Becken"})
    hass.states.async_set(entity_ids[1], "25.0", attrs, force_update=True)
    await hass.async_block_till_done()
    assert device.record["events"] == before
    # Mehr als REGISTRY_ECHO später: gleicher Wert mit force_update zählt wieder
    freezer.tick(timedelta(seconds=3))
    hass.states.async_set(entity_ids[1], "25.0", attrs, force_update=True)
    await hass.async_block_till_done()
    assert device.record["events"][-1] == time.time()
    # Gleicher Wert mit neuen Daten in den Attributen zählt
    freezer.tick(timedelta(minutes=5))
    hass.states.async_set(entity_ids[1], "25.0", attrs | {"linkquality": 40})
    await hass.async_block_till_done()
    assert device.record["events"][-1] == time.time()


def test_many_attribute_rows_are_not_read_again():
    from datetime import UTC, datetime

    from homeassistant.core import State

    from custom_components.pulse.history import ATTRIBUTE_READ_MAX, ATTRIBUTE_ROWS, same_value_rows

    t0 = datetime(2026, 10, 3, 10, tzinfo=UTC)
    rows = [State("sensor.a", "1", last_changed=t0, last_updated=t0 + timedelta(minutes=i)) for i in range(40)]
    assert same_value_rows(rows[: ATTRIBUTE_ROWS + 1])
    assert not same_value_rows(rows)
    # Ein gesprächiger Sensor mit einer einzigen Umbenennen-Zeile: nicht noch einmal mit Attributen lesen
    chatty = [
        State("sensor.a", str(i), last_changed=t0 + timedelta(seconds=i), last_updated=t0 + timedelta(seconds=i))
        for i in range(ATTRIBUTE_READ_MAX)
    ]
    last = chatty[-1]
    renamed = State("sensor.a", last.state, last_changed=last.last_changed, last_updated=t0 + timedelta(days=1))
    assert same_value_rows([*chatty[-5:], renamed])
    assert not same_value_rows([*chatty, renamed])
