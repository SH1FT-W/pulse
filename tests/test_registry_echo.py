"""Umbenennen und andere Registeränderungen: HA schreibt die Zustände neu, das ist kein Lebenszeichen.

Pulse merkt sich jede Registeränderung einer überwachten Entität (Zeitpunkt, im eigenen Speicher); eine Zeile bis
`REGISTRY_ECHO` danach zählt nicht, live wie beim Nachlesen nach einem Neustart. Die Neustarts hier sind nachgebaut
wie in HA: Pulse stoppt, HA startet (Startzeilen der Entitäten, „unavailable“ → Wert oder gleicher Wert neu),
Pulse lädt beim Start (eigener Start in `store.uptime`) und liest die Historie, sobald HA läuft.
"""

from __future__ import annotations

from datetime import timedelta
import time
from typing import Any

from homeassistant.components.sensor import SensorDeviceClass, SensorEntity
from homeassistant.const import EVENT_HOMEASSISTANT_STARTED, UnitOfTemperature
from homeassistant.core import CoreState, HomeAssistant
from homeassistant.helpers import device_registry as dr, entity_registry as er
from pytest_homeassistant_custom_component.common import MockEntity, MockEntityPlatform
from test_z2m_history import start_pulse

from common import SOURCE, source_entry
from custom_components.pulse.const import DOMAIN
from custom_components.pulse.monitor import PulseMonitor


class Sensor(MockEntity):
    """Echte Entität: HA schreibt ihren Zustand selbst neu, wenn sich Gerät oder Register ändern."""

    def __init__(self, value: str, **values: Any) -> None:
        super().__init__(should_poll=False, **values)
        self._attr_state = value


class Leak(MockEntity):
    """Lecksensor mit force_update (Z-Wave, ESPHome, MQTT): jede Meldung ist ein neuer Zustand."""

    _attr_force_update = True

    def __init__(self, **values: Any) -> None:
        super().__init__(should_poll=False, **values)
        self._attr_state = "off"


class Water(SensorEntity):
    """Echter Temperatursensor: die Einheit in den Entitätsoptionen rechnet den Wert um."""

    _attr_should_poll = False
    _attr_has_entity_name = True
    _attr_device_class = SensorDeviceClass.TEMPERATURE
    _attr_native_unit_of_measurement = UnitOfTemperature.CELSIUS
    _attr_native_value = 25.0

    def __init__(self, info: dict[str, Any]) -> None:
        self._attr_unique_id = "cellar_water"
        self._attr_name = "Wasser"
        self._attr_device_info = info  # type: ignore[assignment]


async def cellar(hass: HomeAssistant, freezer: Any) -> dict[str, Any]:
    """Ein Batteriegerät mit echten Entitäten, Recorder läuft; Pulse startet danach."""
    from homeassistant.components.recorder import get_instance

    freezer.move_to("2026-10-03 10:00:00+00:00")
    entry = source_entry(hass)
    info = {"identifiers": {(SOURCE, "cellar")}, "name": "Keller", "manufacturer": "Aqara"}
    binary = MockEntityPlatform(hass, domain="binary_sensor", platform_name=SOURCE)
    binary.config_entry = entry
    sensor = MockEntityPlatform(hass, domain="sensor", platform_name=SOURCE)
    sensor.config_entry = entry
    leak = Leak(unique_id="cellar_leak", name="Leck", has_entity_name=True, device_class="moisture", device_info=info)
    valve = Sensor("heat", unique_id="cellar_valve", name="Ventil", has_entity_name=True, device_info=info)
    chatty = Sensor("0", unique_id="cellar_chatty", name="Signal", has_entity_name=True, device_info=info)
    plain = Sensor("21.0", unique_id="cellar_plain", name="Luft", has_entity_name=False, device_info=info)
    water = Water(info)
    battery = Sensor(
        "80", unique_id="cellar_b", name="Akku", has_entity_name=True, device_class="battery", device_info=info
    )
    await binary.async_add_entities([leak])
    await sensor.async_add_entities([valve, chatty, plain, water, battery])
    await hass.async_block_till_done()
    device_id = er.async_get(hass).async_get(leak.entity_id or "").device_id  # type: ignore[union-attr]
    assert device_id is not None
    await get_instance(hass).async_block_till_done()
    monitor = await start_pulse(hass)
    await hass.async_block_till_done()
    entities = [leak, valve, chatty, plain, water, battery]
    assert {e.entity_id for e in entities} <= set(monitor.devices[device_id].spec.entities) | {battery.entity_id}
    return {
        "freezer": freezer,
        "device_id": device_id,
        "entities": entities,
        "leak": leak,
        "valve": valve,
        "chatty": chatty,
        "plain": plain,
        "water": water,
    }


def monitor_of(hass: HomeAssistant) -> PulseMonitor:
    return hass.config_entries.async_entries(DOMAIN)[0].runtime_data


def events(hass: HomeAssistant, setup: dict[str, Any]) -> list[float]:
    return list(monitor_of(hass).devices[setup["device_id"]].record["events"])


async def flush(hass: HomeAssistant) -> None:
    from homeassistant.components.recorder import get_instance

    await hass.async_block_till_done()
    await get_instance(hass).async_block_till_done()
    await hass.async_block_till_done()


async def ha_restart(hass: HomeAssistant, setup: dict[str, Any], unavailable: bool = False) -> list[float]:
    """Echter Neustart-Nachbau, danach die Meldungen des Geräts.

    Pulse stoppt (sichert seinen Speicher), HA ist 20 s weg. Beim Start schreibt HA jede Entität neu: ohne
    `unavailable` mit gleichem Wert, bevor Pulse lädt (Quell-Integration zuerst geladen); mit `unavailable` lädt
    Pulse zuerst und die Entitäten kommen über „unavailable“ zurück. Pulse liest die Historie erst, wenn HA läuft.
    """
    freezer = setup["freezer"]
    await flush(hass)
    entry = hass.config_entries.async_entries(DOMAIN)[0]
    assert await hass.config_entries.async_unload(entry.entry_id)
    freezer.tick(timedelta(seconds=20))
    hass.set_state(CoreState.starting)
    rows = [(e.entity_id, hass.states.get(e.entity_id)) for e in setup["entities"]]
    if not unavailable:
        for entity_id, state in rows:
            hass.states.async_set(entity_id, state.state, state.attributes, force_update=True)
        freezer.tick(timedelta(seconds=5))
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    if unavailable:
        for entity_id, state in rows:
            hass.states.async_set(entity_id, "unavailable", {"restored": True, **state.attributes})
        freezer.tick(timedelta(seconds=5))
        for entity_id, state in rows:
            hass.states.async_set(entity_id, state.state, state.attributes)
    await hass.async_block_till_done()
    assert not monitor_of(hass).bootstrapped
    hass.set_state(CoreState.running)
    hass.bus.async_fire(EVENT_HOMEASSISTANT_STARTED)
    await flush(hass)
    monitor = monitor_of(hass)
    assert monitor.bootstrapped
    assert monitor.store.uptime[-1][0] == entry.runtime_data.started_at  # eigener Start → Neustart-Echos
    return events(hass, setup)


async def report(hass: HomeAssistant, setup: dict[str, Any], entity: Any, value: str | None = None) -> float:
    """Echte Meldung (neuer Wert bzw. gleicher Wert erneut), zählt live."""
    if value is not None:
        entity._attr_state = value
    entity.async_write_ha_state()
    await hass.async_block_till_done()
    assert events(hass, setup)[-1] == time.time()
    return time.time()


# ── Live ─────────────────────────────────────────────────────────────────


async def test_rename_device_and_entities_live_and_after_restart(hass: HomeAssistant, recorder_mock, freezer):
    setup = await cellar(hass, freezer)
    plain = setup["plain"]
    freezer.tick(timedelta(minutes=10))
    real = await report(hass, setup, plain, "21.5")
    freezer.tick(timedelta(days=5))
    names = {e.entity_id: hass.states.get(e.entity_id).attributes.get("friendly_name") for e in setup["entities"]}

    # Gerät umbenennen: HA schreibt alle Entitäten neu (friendly_name geändert bzw. gleich → state_reported)
    dr.async_get(hass).async_update_device(setup["device_id"], name_by_user="Keller Becken")
    await hass.async_block_till_done()
    leak_id = setup["leak"].entity_id
    assert hass.states.get(leak_id).attributes["friendly_name"] != names[leak_id]  # type: ignore[union-attr]
    assert events(hass, setup)[-1] == real

    # Entität umbenennen, Symbol ändern, Aliase: ebenso nur Register
    freezer.tick(timedelta(minutes=1))
    reg = er.async_get(hass)
    reg.async_update_entity(setup["valve"].entity_id, name="Heizkörper")
    reg.async_update_entity(plain.entity_id, icon="mdi:fish")
    reg.async_update_entity(setup["chatty"].entity_id, aliases={"Funk"})
    await hass.async_block_till_done()
    assert events(hass, setup)[-1] == real

    freezer.tick(timedelta(minutes=10))
    assert (await ha_restart(hass, setup))[-1] == real
    freezer.tick(timedelta(minutes=10))
    assert (await ha_restart(hass, setup, unavailable=True))[-1] == real


async def test_real_reports_around_a_registry_change_count(hass: HomeAssistant, recorder_mock, freezer):
    """Eine echte Meldung kurz vor der Änderung und eine mehr als REGISTRY_ECHO danach zählen, live und
    nach Neustart; eine Zeile binnen REGISTRY_ECHO danach nicht (gespeichert wird höchstens eine Meldung je
    THIN_SECONDS, darum die erste, die zählt)."""
    setup = await cellar(hass, freezer)
    plain, leak = setup["plain"], setup["leak"]
    freezer.tick(timedelta(days=1))
    before = await report(hass, setup, plain, "22.0")
    freezer.tick(timedelta(seconds=1))
    er.async_get(hass).async_update_entity(plain.entity_id, name="Luft Keller")
    await hass.async_block_till_done()
    assert events(hass, setup)[-1] == before
    freezer.tick(timedelta(days=1))
    # force_update: gleicher Wert in den 2 s nach der Änderung – nicht von der Änderung zu unterscheiden
    er.async_get(hass).async_update_entity(leak.entity_id, aliases={"Wasser"})
    await hass.async_block_till_done()
    freezer.tick(timedelta(seconds=2))
    leak.async_write_ha_state()
    await hass.async_block_till_done()
    assert events(hass, setup)[-1] == before
    freezer.tick(timedelta(seconds=1))  # 3 s nach der Änderung
    after = await report(hass, setup, leak)
    freezer.tick(timedelta(minutes=10))
    result = await ha_restart(hass, setup)
    assert before in result
    assert result[-1] == after
    assert all(not before < ts < after for ts in result)


async def test_force_update_rename_live_and_after_restart(hass: HomeAssistant, recorder_mock, freezer):
    """force_update setzt auch beim Umbenennen ein neues last_changed – wie eine echte Meldung."""
    setup = await cellar(hass, freezer)
    leak = setup["leak"]
    freezer.tick(timedelta(minutes=10))
    real = await report(hass, setup, leak)
    freezer.tick(timedelta(days=5))
    reg = er.async_get(hass)
    reg.async_update_entity(leak.entity_id, name="Leck Bad")
    await hass.async_block_till_done()
    freezer.tick(timedelta(minutes=1))
    reg.async_update_entity(leak.entity_id, aliases={"Bad"})  # keine Attribut-Änderung
    await hass.async_block_till_done()
    assert events(hass, setup)[-1] == real
    freezer.tick(timedelta(minutes=10))
    assert (await ha_restart(hass, setup))[-1] == real
    # Echte Meldungen mit force_update zählen weiter, auch nach dem Neustart
    freezer.tick(timedelta(minutes=10))
    reported = await report(hass, setup, leak)
    freezer.tick(timedelta(minutes=10))
    assert (await ha_restart(hass, setup))[-1] == reported


async def test_several_changes_all_known_after_restart(hass: HomeAssistant, recorder_mock, freezer):
    """Prüfrunde (d): nicht nur die letzte Registeränderung zählt nicht, auch frühere ohne Attribut-Änderung."""
    setup = await cellar(hass, freezer)
    leak = setup["leak"]
    freezer.tick(timedelta(minutes=10))
    real = await report(hass, setup, leak)
    reg = er.async_get(hass)
    for day in range(3):
        freezer.tick(timedelta(days=1, hours=day))
        reg.async_update_entity(leak.entity_id, aliases={f"Leck {day}"})
        await hass.async_block_till_done()
    assert events(hass, setup)[-1] == real
    freezer.tick(timedelta(minutes=10))
    result = await ha_restart(hass, setup)
    assert result[-1] == real


async def test_rename_then_restart_within_a_minute(hass: HomeAssistant, recorder_mock, freezer):
    """Prüfrunde (a): umbenennen, 60 s später Neustart. Die Umbenennung darf nicht als Neustart-Echo
    verbraucht werden, sonst zählt die echte Startzeile als Meldung."""
    setup = await cellar(hass, freezer)
    plain = setup["plain"]
    freezer.tick(timedelta(minutes=10))
    real = await report(hass, setup, plain, "21.5")
    freezer.tick(timedelta(days=2))
    er.async_get(hass).async_update_entity(plain.entity_id, name="Luft Gewölbe")
    await hass.async_block_till_done()
    freezer.tick(timedelta(seconds=35))
    assert (await ha_restart(hass, setup))[-1] == real


async def test_rename_three_minutes_after_a_start(hass: HomeAssistant, recorder_mock, freezer):
    """Prüfrunde (b): umbenennen in den ersten 5 Minuten nach einem Start."""
    setup = await cellar(hass, freezer)
    plain = setup["plain"]
    freezer.tick(timedelta(minutes=10))
    real = await report(hass, setup, plain, "21.5")
    freezer.tick(timedelta(days=2))
    assert (await ha_restart(hass, setup))[-1] == real
    freezer.tick(timedelta(minutes=3))
    reg = er.async_get(hass)
    reg.async_update_entity(plain.entity_id, name="Luft Gewölbe")
    await hass.async_block_till_done()
    assert events(hass, setup)[-1] == real
    # Später noch eine Änderung ohne neue Zeile (Aliase): die Umbenennung ist dann nicht mehr die letzte
    freezer.tick(timedelta(hours=5))
    reg.async_update_entity(plain.entity_id, aliases={"Gewölbe"})
    await hass.async_block_till_done()
    freezer.tick(timedelta(minutes=10))
    assert (await ha_restart(hass, setup))[-1] == real
    freezer.tick(timedelta(minutes=10))
    assert (await ha_restart(hass, setup, unavailable=True))[-1] == real


async def test_thermostat_with_many_attribute_rows(hass: HomeAssistant, recorder_mock, freezer):
    """Thermostat bleibt „heat“, viele reine Attribut-Zeilen (echte Meldungen), dann still und umbenannt."""
    setup = await cellar(hass, freezer)
    valve = setup["valve"]
    for i in range(40):
        freezer.tick(timedelta(minutes=10))
        valve._values["extra_state_attributes"] = {"valve": i}
        valve.async_write_ha_state()
        await hass.async_block_till_done()
    real = time.time()
    assert events(hass, setup)[-1] == real
    freezer.tick(timedelta(days=5))
    reg = er.async_get(hass)
    reg.async_update_entity(valve.entity_id, name="Heizkörper")
    await hass.async_block_till_done()
    freezer.tick(timedelta(minutes=1))
    reg.async_update_entity(valve.entity_id, icon="mdi:radiator")
    await hass.async_block_till_done()
    assert events(hass, setup)[-1] == real
    freezer.tick(timedelta(minutes=10))
    result = await ha_restart(hass, setup)
    assert result[-1] == real
    assert len(result) >= 40  # die Attribut-Zeilen zählen weiter


async def test_chatty_sensor_rename(hass: HomeAssistant, recorder_mock, freezer):
    """Gesprächiger Sensor (mehr als 2000 Zeilen), 4 Tage still, umbenannt."""
    from homeassistant.components.recorder import get_instance

    setup = await cellar(hass, freezer)
    chatty = setup["chatty"]
    for i in range(2100):
        freezer.tick(timedelta(seconds=30))
        chatty._attr_state = str(i % 7)
        chatty.async_write_ha_state()
        if i % 100 == 0:
            await hass.async_block_till_done()
            await get_instance(hass).async_block_till_done()
    await hass.async_block_till_done()
    real = events(hass, setup)[-1]  # dicht beieinander: eine Meldung je THIN_SECONDS
    assert time.time() - real < 120
    freezer.tick(timedelta(days=4))
    reg = er.async_get(hass)
    reg.async_update_entity(chatty.entity_id, name="Funk")
    await hass.async_block_till_done()
    freezer.tick(timedelta(minutes=1))
    reg.async_update_entity(chatty.entity_id, icon="mdi:radio")
    await hass.async_block_till_done()
    assert events(hass, setup)[-1] == real
    freezer.tick(timedelta(minutes=10))
    assert (await ha_restart(hass, setup))[-1] == real


async def test_unit_change_is_no_report_and_no_action(hass: HomeAssistant, recorder_mock, freezer):
    """Einheit in den Entitätsoptionen: HA schreibt den umgerechneten Wert (alter ≠ neuer Wert)."""
    setup = await cellar(hass, freezer)
    water = setup["water"]
    device = monitor_of(hass).devices[setup["device_id"]]
    device.spec.actions.append(water.entity_id)  # wie ein Sensor, dessen Wert eine Handlung ist
    freezer.tick(timedelta(minutes=10))
    water._attr_native_value = 25.5
    water.async_write_ha_state()
    await hass.async_block_till_done()
    real = time.time()
    assert device.record["events"][-1] == real
    actions = list(device.record["actions"])
    freezer.tick(timedelta(days=5))
    reg = er.async_get(hass)
    reg.async_update_entity_options(water.entity_id, "sensor", {"unit_of_measurement": "°F"})
    await hass.async_block_till_done()
    assert hass.states.get(water.entity_id).state == "77.9"  # type: ignore[union-attr]
    freezer.tick(timedelta(minutes=1))
    reg.async_update_entity(water.entity_id, name="Wasser Becken")  # danach noch umbenannt
    await hass.async_block_till_done()
    assert device.record["events"][-1] == real
    assert device.record["actions"] == actions
    freezer.tick(timedelta(minutes=10))
    assert (await ha_restart(hass, setup))[-1] == real
    # Ein echter neuer Wert in °F zählt weiter
    freezer.tick(timedelta(minutes=10))
    water._attr_native_value = 26.0
    water.async_write_ha_state()
    await hass.async_block_till_done()
    reported = time.time()
    assert events(hass, setup)[-1] == reported
    freezer.tick(timedelta(minutes=10))
    assert (await ha_restart(hass, setup))[-1] == reported


async def test_new_entity_id(hass: HomeAssistant, recorder_mock, freezer):
    """Neue Entity-ID: die Zeile der neu angelegten Entität ist keine Meldung, auch nach Neustart; frühere
    Änderungen wandern mit (der Recorder hängt die alten Zeilen an die neue ID)."""
    setup = await cellar(hass, freezer)
    leak = setup["leak"]
    freezer.tick(timedelta(minutes=10))
    real = await report(hass, setup, leak)
    freezer.tick(timedelta(days=1))
    reg = er.async_get(hass)
    reg.async_update_entity(leak.entity_id, aliases={"Bad"})
    await hass.async_block_till_done()
    freezer.tick(timedelta(days=4))
    reg.async_update_entity(leak.entity_id, new_entity_id="binary_sensor.keller_leck_bad")
    await hass.async_block_till_done()
    assert leak.entity_id == "binary_sensor.keller_leck_bad"
    assert events(hass, setup)[-1] == real
    freezer.tick(timedelta(minutes=10))
    result = await ha_restart(hass, setup)
    assert "binary_sensor.keller_leck_bad" in monitor_of(hass).devices[setup["device_id"]].spec.entities
    assert result[-1] == real
    freezer.tick(timedelta(minutes=10))
    assert (await report(hass, setup, leak)) == events(hass, setup)[-1]


# ── Speicher ─────────────────────────────────────────────────────────────


async def test_changes_are_stored_pruned_and_survive_restart(hass: HomeAssistant, recorder_mock, freezer):
    from custom_components.pulse.const import HISTORY_DAYS

    setup = await cellar(hass, freezer)
    plain = setup["plain"]
    other = setup["leak"].entity_id
    reg = er.async_get(hass)
    reg.async_update_entity(plain.entity_id, name="Eins")
    first = time.time()
    freezer.tick(timedelta(days=HISTORY_DAYS - 1))
    reg.async_update_entity(plain.entity_id, name="Zwei")
    second = time.time()
    await hass.async_block_till_done()
    store = monitor_of(hass).store
    assert store.registry_changes[plain.entity_id] == [first, second]
    assert other not in store.registry_changes
    # Gespeichert (gedrosselt) und nach dem Neustart wieder da
    await ha_restart(hass, setup)
    assert monitor_of(hass).store.registry_changes[plain.entity_id] == [first, second]
    # Älter als das History-Fenster: weg (beim Laden wie beim Merken)
    freezer.tick(timedelta(days=1, minutes=1))
    await ha_restart(hass, setup)
    assert monitor_of(hass).store.registry_changes[plain.entity_id] == [second]
    freezer.tick(timedelta(days=HISTORY_DAYS))
    reg.async_update_entity(other, name="Leck neu")
    await hass.async_block_till_done()
    store = monitor_of(hass).store
    assert plain.entity_id not in store.registry_changes
    assert store.registry_changes[other] == [time.time()]


async def test_changes_while_starting_are_not_remembered(hass: HomeAssistant, recorder_mock, freezer):
    """Während HA startet, ändern Integrationen ihre Registereinträge (neue Fähigkeiten) vor der ersten Zeile:
    das ist kein Umschreiben, die Startzeile ist ohnehin ein Neustart-Echo."""
    setup = await cellar(hass, freezer)
    monitor = monitor_of(hass)
    hass.set_state(CoreState.starting)
    er.async_get(hass).async_update_entity(setup["plain"].entity_id, name="Luft")
    dr.async_get(hass).async_update_device(setup["device_id"], name_by_user="Keller neu")
    await hass.async_block_till_done()
    assert monitor.store.registry_changes == {}
    hass.set_state(CoreState.running)


def test_store_migration_adds_registry_changes():
    from custom_components.pulse.store import migrate

    data = migrate(8, {"devices": {}, "settings": {}})
    assert data["registry_changes"] == {}
    kept = migrate(9, {"devices": {}, "registry_changes": {"sensor.a": [1.0]}})
    assert kept["registry_changes"] == {"sensor.a": [1.0]}


async def test_store_from_older_version_loads(hass: HomeAssistant, hass_storage):
    from custom_components.pulse.const import STORE_KEY
    from custom_components.pulse.store import PulseStore

    hass_storage[STORE_KEY] = {"version": 1, "minor_version": 8, "key": STORE_KEY, "data": {"devices": {}}}
    store = PulseStore(hass)
    await store.async_load()
    assert store.registry_changes == {}
    now = time.time()
    hass_storage[STORE_KEY] = {
        "version": 1,
        "minor_version": 9,
        "key": STORE_KEY,
        "data": {"devices": {}, "registry_changes": {"sensor.a": [now - 11 * 86400, now - 60], "sensor.b": [1.0]}},
    }
    store = PulseStore(hass)
    await store.async_load()
    assert store.registry_changes == {"sensor.a": [now - 60]}


def test_registry_rewrites_in_history_rows():
    """Reine Logik: Zeilen bis REGISTRY_ECHO nach einer Änderung zählen weder als Meldung noch als Aktion noch
    als Neustart-Echo; ihr Wert bleibt Vorgänger der nächsten Zeile."""
    from datetime import UTC, datetime

    from homeassistant.core import State

    from custom_components.pulse.history import real_reports

    t0 = datetime(2026, 10, 3, 10, tzinfo=UTC)

    def row(value: str, seconds: float) -> State:
        at = t0 + timedelta(seconds=seconds)
        return State("sensor.w", value, None, at, at)

    rows = [row("25.0", 0), row("77.0", 100), row("77.5", 200)]
    change = t0.timestamp() + 99
    assert real_reports(rows, (), [change]) == ([t0.timestamp() + 200], [t0.timestamp() + 200])
    assert real_reports(rows, (), [change - 3]) == ([t0.timestamp() + 100, t0.timestamp() + 200],) * 2
    # Neustart 60 s nach der Änderung: die Startzeile ist das Echo, nicht die umgeschriebene Zeile
    start = t0.timestamp() + 160
    restart_rows = [row("25.0", 0), row("25.0", 100), row("25.0", 170), row("25.0", 400)]
    assert real_reports(restart_rows, [start], [change])[0] == [t0.timestamp() + 400]
    # Eine umgeschriebene Zeile direkt nach „unavailable“ bleibt, wie sie war (keine Meldung, aber Neustart-Echo)
    gone = [row("25.0", 0), row("unavailable", 50), row("25.0", 100), row("25.0", 200)]
    assert real_reports(gone, [t0.timestamp() + 60], [change])[0] == [t0.timestamp() + 200]
