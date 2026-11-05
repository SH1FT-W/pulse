"""Umbenennen und andere Register-Änderungen: HA schreibt die Zustände neu, das ist kein Lebenszeichen."""

from __future__ import annotations

from datetime import timedelta
import time

from homeassistant import config_entries
from homeassistant.components.sensor import SensorDeviceClass, SensorEntity
from homeassistant.const import UnitOfTemperature
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
    """Die Zeile, die HA beim Start schreibt, zählt nie: dafür kein zweites Lesen mit Attributen."""
    from datetime import UTC, datetime

    from homeassistant.core import State

    from custom_components.pulse.history import attribute_window

    t0 = datetime(2026, 10, 3, 10, tzinfo=UTC)
    t1 = t0 + timedelta(hours=1)
    first = State("sensor.a", "20.1", last_changed=t0, last_updated=t0)
    restart = State("sensor.a", "20.1", last_changed=t1, last_updated=t1)
    renamed = State("sensor.a", "20.1", last_changed=t0, last_updated=t1)
    assert attribute_window([first, restart], [t1.timestamp()]) is None
    # force_update: auch ein neuer Zustand mit gleichem Wert kann ein Umbenennen sein
    assert attribute_window([first, restart]) == 0
    assert attribute_window([first, renamed]) == 0
    assert attribute_window([first, State("sensor.a", "unavailable"), renamed]) is None
    assert attribute_window([first, State("sensor.a", "20.2", last_changed=t1, last_updated=t1)]) is None


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


def test_only_the_last_rows_are_read_with_attributes():
    """Viele Zeilen (gesprächiger Sensor, Thermostat): nur die letzten ATTRIBUTE_ROWS, die entscheiden die letzte
    Meldung – egal, wie viele Attribut-Zeilen davor liegen."""
    from datetime import UTC, datetime

    from homeassistant.core import State

    from custom_components.pulse.history import ATTRIBUTE_ROWS, attribute_window, real_reports

    t0 = datetime(2026, 10, 3, 10, tzinfo=UTC)
    rows = [
        State("climate.a", "heat", {"friendly_name": "Bad", "valve": i}, t0, t0 + timedelta(minutes=10 * i))
        for i in range(5000)
    ]
    renamed = State("climate.a", "heat", {"friendly_name": "Bad oben", "valve": 4999}, t0, t0 + timedelta(days=40))
    first = attribute_window([*rows, renamed])
    assert first == len(rows) - ATTRIBUTE_ROWS
    # Was Pulse daraus zusammensetzt: vorn ohne Attribute, ab `first` mit
    bare = [State("climate.a", "heat", None, s.last_changed, s.last_updated) for s in rows]
    reports, actions = real_reports([*bare[:first], *rows[first:], renamed], compare_from=first)
    assert reports[-1] == rows[-1].last_updated.timestamp()
    assert not actions
    # Ohne Attribute wäre die Umbenennung die letzte Meldung
    assert real_reports([*bare, renamed])[0][-1] == renamed.last_updated.timestamp()
    # Die Zeile an der Grenze hat keinen Vorgänger mit Attributen: nicht vergleichen (sie zählt)
    named = [State("binary_sensor.b", "off", {"friendly_name": "Leck"}, t0, t0 + timedelta(hours=h)) for h in (1, 2)]
    bare_first = State("binary_sensor.b", "off", None, t0, t0)
    assert real_reports([bare_first, *named], compare_from=1)[0] == [t.last_updated.timestamp() for t in named]


def test_registry_echo_and_unit_rewrite():
    from datetime import UTC, datetime

    from homeassistant.core import State

    from custom_components.pulse.history import Registry, attribute_window, real_reports, registry_echo

    t0 = datetime(2026, 10, 3, 10, tzinfo=UTC)
    t1 = t0 + timedelta(days=5)
    ts = t1.timestamp()
    assert registry_echo(ts + 1, Registry(entity=ts))
    assert registry_echo(ts + 1, Registry(device=ts))
    assert not registry_echo(ts + 1, Registry(device=ts), device=False)
    assert not registry_echo(ts + 3, Registry(ts, ts))
    assert not registry_echo(ts - 1, Registry(ts, ts))  # vor der Änderung
    # Ein neuer Wert direkt nach der Änderung der Entität: mit Attributen lesen (Einheit?)
    first = State("sensor.w", "25.0", None, t0, t0)
    assert attribute_window([first, State("sensor.w", "77.0", None, t1, t1)], (), Registry(entity=ts)) == 0
    assert attribute_window([first, State("sensor.w", "77.0", None, t1, t1)], (), Registry(device=ts)) is None
    t2 = t1 + timedelta(hours=1)
    # Früherer Einheitenwechsel (umgerechneter Wert, nur Einheit anders) zählt nicht, ein neuer Wert schon
    attrs = {"friendly_name": "Wasser", "unit_of_measurement": "°C", "device_class": "temperature"}
    rows = [
        State("sensor.w", "25.0", attrs, t0, t0),
        State("sensor.w", "77.0", attrs | {"unit_of_measurement": "°F"}, t1, t1),
        State("sensor.w", "77.5", attrs | {"unit_of_measurement": "°F"}, t2, t2),
    ]
    assert real_reports(rows) == ([rows[2].last_updated.timestamp()], [rows[2].last_changed.timestamp()])
    # Eine Einheit, die nur dazukommt, ist keine Umrechnung
    bare = {"friendly_name": "Spannung"}
    volts = [
        State("sensor.v", "3000", bare, t0, t0),
        State("sensor.v", "1.2", bare | {"unit_of_measurement": "V"}, t1, t1),
    ]
    assert real_reports(volts)[0] == [t1.timestamp()]


# ── Echte Registeränderungen mit Recorder: live und nach Neustart ─────────────


class Leak(MockEntity):
    """Lecksensor mit force_update (Z-Wave, ESPHome, MQTT): jede Meldung ist ein neuer Zustand."""

    _attr_force_update = True

    def __init__(self, **values) -> None:
        super().__init__(should_poll=False, **values)
        self._attr_state = "off"


class Water(SensorEntity):
    """Echter Temperatursensor: die Einheit in den Entitätsoptionen rechnet den Wert um."""

    _attr_should_poll = False
    _attr_has_entity_name = True
    _attr_device_class = SensorDeviceClass.TEMPERATURE
    _attr_native_unit_of_measurement = UnitOfTemperature.CELSIUS
    _attr_native_value = 25.0

    def __init__(self, info: dict) -> None:
        self._attr_unique_id = "cellar_water"
        self._attr_name = "Wasser"
        self._attr_device_info = info  # type: ignore[assignment]


async def cellar(hass: HomeAssistant) -> dict:
    """Ein Batteriegerät mit echten Entitäten, Recorder läuft; Pulse startet danach."""
    from homeassistant.components.recorder import get_instance

    entry = source_entry(hass)
    info = {"identifiers": {(SOURCE, "cellar")}, "name": "Keller", "manufacturer": "Aqara"}
    binary = MockEntityPlatform(hass, domain="binary_sensor", platform_name=SOURCE)
    binary.config_entry = entry
    sensor = MockEntityPlatform(hass, domain="sensor", platform_name=SOURCE)
    sensor.config_entry = entry
    leak = Leak(unique_id="cellar_leak", name="Leck", has_entity_name=True, device_class="moisture", device_info=info)
    valve = Sensor("heat", unique_id="cellar_valve", name="Ventil", has_entity_name=True, device_info=info)
    chatty = Sensor("0", unique_id="cellar_chatty", name="Signal", has_entity_name=True, device_info=info)
    water = Water(info)
    battery = Sensor(
        "80", unique_id="cellar_b", name="Akku", has_entity_name=True, device_class="battery", device_info=info
    )
    await binary.async_add_entities([leak])
    await sensor.async_add_entities([valve, chatty, water, battery])
    await hass.async_block_till_done()
    device_id = er.async_get(hass).async_get(leak.entity_id or "").device_id  # type: ignore[union-attr]
    assert device_id is not None
    await get_instance(hass).async_block_till_done()
    monitor = await start_pulse(hass)
    await hass.async_block_till_done()
    return {"monitor": monitor, "device_id": device_id, "leak": leak, "valve": valve, "chatty": chatty, "water": water}


async def restart(hass: HomeAssistant, setup: dict) -> list[float]:
    """Recorder schreiben lassen, Pulse neu laden (liest die Historie), Meldungen des Geräts."""
    from homeassistant.components.recorder import get_instance

    await hass.async_block_till_done()
    await get_instance(hass).async_block_till_done()
    entry = hass.config_entries.async_entries(DOMAIN)[0]
    assert await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()
    await get_instance(hass).async_block_till_done()
    await hass.async_block_till_done()
    monitor: PulseMonitor = entry.runtime_data
    assert monitor.bootstrapped
    return list(monitor.devices[setup["device_id"]].record["events"])


async def test_force_update_rename_after_restart(hass: HomeAssistant, recorder_mock, freezer):
    """Fund 1: force_update setzt auch beim Umbenennen ein neues last_changed (last_changed == last_updated)."""
    freezer.move_to("2026-10-03 10:00:00+00:00")
    setup = await cellar(hass)
    device = setup["monitor"].devices[setup["device_id"]]
    leak = setup["leak"]
    freezer.tick(timedelta(minutes=10))
    leak.async_write_ha_state()  # echte Meldung, gleicher Wert (force_update)
    await hass.async_block_till_done()
    real = time.time()
    assert device.record["events"][-1] == real
    freezer.tick(timedelta(days=5))
    reg = er.async_get(hass)
    reg.async_update_entity(leak.entity_id, name="Leck Bad")
    await hass.async_block_till_done()
    freezer.tick(timedelta(minutes=1))
    reg.async_update_entity(leak.entity_id, icon="mdi:water")
    await hass.async_block_till_done()
    assert hass.states.get(leak.entity_id).attributes["icon"] == "mdi:water"  # type: ignore[union-attr]
    assert device.record["events"][-1] == real  # live
    freezer.tick(timedelta(minutes=10))
    assert (await restart(hass, setup))[-1] == real
    # Echte Meldungen mit force_update zählen weiter, auch nach dem Neustart
    freezer.tick(timedelta(minutes=10))
    leak.async_write_ha_state()
    await hass.async_block_till_done()
    reported = time.time()
    freezer.tick(timedelta(minutes=10))
    assert (await restart(hass, setup))[-1] == reported


async def test_many_attribute_rows_then_rename_after_restart(hass: HomeAssistant, recorder_mock, freezer):
    """Fund 2: mehr als 30 reine Attribut-Zeilen (Thermostat bleibt „heat“), dann still und umbenannt."""
    freezer.move_to("2026-10-03 10:00:00+00:00")
    setup = await cellar(hass)
    device = setup["monitor"].devices[setup["device_id"]]
    valve = setup["valve"]
    for i in range(40):
        freezer.tick(timedelta(minutes=10))
        valve._values["extra_state_attributes"] = {"valve": i}
        valve.async_write_ha_state()
        await hass.async_block_till_done()
    real = time.time()
    assert device.record["events"][-1] == real
    freezer.tick(timedelta(days=5))
    reg = er.async_get(hass)
    reg.async_update_entity(valve.entity_id, name="Heizkörper")
    await hass.async_block_till_done()
    freezer.tick(timedelta(minutes=1))
    reg.async_update_entity(valve.entity_id, icon="mdi:radiator")
    await hass.async_block_till_done()
    assert device.record["events"][-1] == real  # live
    freezer.tick(timedelta(minutes=10))
    assert (await restart(hass, setup))[-1] == real


async def test_chatty_sensor_rename_after_restart(hass: HomeAssistant, recorder_mock, freezer):
    """Fund 3: gesprächiger Sensor (mehr als 2000 Zeilen), 4 Tage still, umbenannt."""
    from homeassistant.components.recorder import get_instance

    freezer.move_to("2026-10-03 10:00:00+00:00")
    setup = await cellar(hass)
    device = setup["monitor"].devices[setup["device_id"]]
    chatty = setup["chatty"]
    for i in range(2100):
        freezer.tick(timedelta(seconds=30))
        chatty._attr_state = str(i % 7)
        chatty.async_write_ha_state()
        if i % 100 == 0:
            await hass.async_block_till_done()
            await get_instance(hass).async_block_till_done()
    await hass.async_block_till_done()
    real = device.record["events"][-1]  # dicht beieinander: eine Meldung je THIN_SECONDS
    assert time.time() - real < 120
    freezer.tick(timedelta(days=4))
    reg = er.async_get(hass)
    reg.async_update_entity(chatty.entity_id, name="Funk")
    await hass.async_block_till_done()
    freezer.tick(timedelta(minutes=1))
    reg.async_update_entity(chatty.entity_id, icon="mdi:radio")
    await hass.async_block_till_done()
    assert device.record["events"][-1] == real  # live
    freezer.tick(timedelta(minutes=10))
    assert (await restart(hass, setup))[-1] == real


async def test_unit_change_is_no_report(hass: HomeAssistant, recorder_mock, freezer):
    """Fund 4: Einheit in den Entitätsoptionen: HA schreibt den umgerechneten Wert (alter ≠ neuer Wert)."""
    freezer.move_to("2026-10-03 10:00:00+00:00")
    setup = await cellar(hass)
    monitor: PulseMonitor = setup["monitor"]
    device = monitor.devices[setup["device_id"]]
    water = setup["water"]
    freezer.tick(timedelta(minutes=10))
    water._attr_native_value = 25.5
    water.async_write_ha_state()
    await hass.async_block_till_done()
    real = time.time()
    assert device.record["events"][-1] == real
    freezer.tick(timedelta(days=5))
    reg = er.async_get(hass)
    reg.async_update_entity_options(water.entity_id, "sensor", {"unit_of_measurement": "°F"})
    await hass.async_block_till_done()
    assert hass.states.get(water.entity_id).state == "77.9"  # type: ignore[union-attr]
    freezer.tick(timedelta(minutes=1))
    reg.async_update_entity(water.entity_id, name="Wasser Becken")  # danach noch umbenannt
    await hass.async_block_till_done()
    assert device.record["events"][-1] == real  # live
    freezer.tick(timedelta(minutes=10))
    assert (await restart(hass, setup))[-1] == real
    # Ein echter neuer Wert in °F zählt weiter
    freezer.tick(timedelta(minutes=10))
    water._attr_native_value = 26.0
    water.async_write_ha_state()
    await hass.async_block_till_done()
    reported = time.time()
    monitor = hass.config_entries.async_entries(DOMAIN)[0].runtime_data  # nach dem Neuladen ein neuer Wächter
    assert monitor.devices[setup["device_id"]].record["events"][-1] == reported
    freezer.tick(timedelta(minutes=10))
    assert (await restart(hass, setup))[-1] == reported


async def test_unit_change_is_no_action(hass: HomeAssistant, recorder_mock, freezer):
    """Fund 4 bei einer Aktions-Entität: der umgerechnete Wert ist auch keine Aktion."""
    freezer.move_to("2026-10-03 10:00:00+00:00")
    setup = await cellar(hass)
    monitor: PulseMonitor = setup["monitor"]
    device = monitor.devices[setup["device_id"]]
    water = setup["water"]
    device.spec.actions.append(water.entity_id)  # wie ein Sensor, dessen Wert eine Handlung ist
    freezer.tick(timedelta(days=5))
    before = (list(device.record["events"]), list(device.record["actions"]))
    er.async_get(hass).async_update_entity_options(water.entity_id, "sensor", {"unit_of_measurement": "°F"})
    await hass.async_block_till_done()
    assert (device.record["events"], device.record["actions"]) == before


async def test_new_entity_id_after_restart(hass: HomeAssistant, recorder_mock, freezer):
    """Fund 5: neue Entity-ID – die Zeile der neu angelegten Entität ist keine Meldung, auch nach Neustart."""
    freezer.move_to("2026-10-03 10:00:00+00:00")
    setup = await cellar(hass)
    device = setup["monitor"].devices[setup["device_id"]]
    leak = setup["leak"]
    freezer.tick(timedelta(minutes=10))
    leak.async_write_ha_state()
    await hass.async_block_till_done()
    real = time.time()
    freezer.tick(timedelta(days=5))
    er.async_get(hass).async_update_entity(leak.entity_id, new_entity_id="binary_sensor.keller_leck_bad")
    await hass.async_block_till_done()
    assert hass.states.get("binary_sensor.keller_leck_bad") is not None
    assert device.record["events"][-1] == real  # live
    freezer.tick(timedelta(minutes=10))
    events = await restart(hass, setup)
    monitor = hass.config_entries.async_entries(DOMAIN)[0].runtime_data
    assert "binary_sensor.keller_leck_bad" in monitor.devices[setup["device_id"]].spec.entities
    assert events[-1] == real
