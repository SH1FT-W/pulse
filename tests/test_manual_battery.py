"""Battery sensor chosen by hand for a device added by hand (#9): only shown, it changes nothing else.

The case of the report: a Tibber Pulse (custom integration `tibber_local`, Wi-Fi, 2× AA) whose battery is only a
voltage sensor, so Pulse does not find it as a battery device and it was added by hand. Its voltage sensor may
come with the device class `voltage` or without one; both are tested.
"""

from __future__ import annotations

from dataclasses import replace
from datetime import timedelta
import time

from homeassistant.core import HomeAssistant
from homeassistant.helpers import device_registry as dr, entity_registry as er
from pytest_homeassistant_custom_component.common import MockConfigEntry, async_capture_events

from common import TestDevice as Device, tick
from custom_components.pulse.const import EVENT_BATTERY_REPLACED
from custom_components.pulse.discovery import battery_choices, discover
from custom_components.pulse.monitor import GONE_KEEP_SETTINGS
from custom_components.pulse.store import PulseStore

# (domain, key, device class, unit in the registry)
Entity = tuple[str, str, str | None, str | None]


def _tibber(hass: HomeAssistant, voltage_class: str | None, extra: list[Entity] | None = None) -> Device:
    entry = MockConfigEntry(domain="tibber_local", title="Tibber Pulse")
    entry.add_to_hass(hass)
    device = dr.async_get(hass).async_get_or_create(
        config_entry_id=entry.entry_id,
        identifiers={("tibber_local", "pulse")},
        name="Tibber Pulse",
        manufacturer="Tibber",
        model="Pulse IR",
    )
    reg = er.async_get(hass)
    result = Device(device.id)
    entities: list[Entity] = [
        ("sensor", "power", "power", "W"),
        ("sensor", "energy", "energy", "kWh"),
        ("sensor", "battery_voltage", voltage_class, "V"),
        *(extra or []),
    ]
    for domain, key, device_class, unit in entities:
        entity = reg.async_get_or_create(
            domain,
            "tibber_local",
            f"pulse_{key}",
            device_id=device.id,
            config_entry=entry,
            suggested_object_id=f"tibber_pulse_{key}",
            original_device_class=device_class,
            unit_of_measurement=unit,
        )
        result.entities[key] = entity.entity_id
    hass.states.async_set(result.entities["power"], "412", {"unit_of_measurement": "W"})
    hass.states.async_set(result.entities["energy"], "18234.5", {"unit_of_measurement": "kWh"})
    attrs = {"unit_of_measurement": "V", "friendly_name": "Tibber Pulse Battery voltage"}
    if voltage_class:
        attrs["device_class"] = voltage_class
    hass.states.async_set(result.entities["battery_voltage"], "2.95", attrs)
    return result


async def _send(client, payload):
    await client.send_json_auto_id(payload)
    return await client.receive_json()


async def _report(hass: HomeAssistant, setup, entity_id: str, value: str, wait=timedelta(hours=1)) -> float:
    await tick(hass, setup["freezer"], wait)
    hass.states.async_set(entity_id, value, {"unit_of_measurement": "V"})
    await hass.async_block_till_done()
    return time.time()


# ── Which sensors are offered ────────────────────────────────────────────


async def test_voltage_with_and_without_device_class_is_offered(hass: HomeAssistant):
    for voltage_class in ("voltage", None):
        hass_device = _tibber(hass, voltage_class)
        own = er.async_entries_for_device(er.async_get(hass), hass_device.device_id)
        assert battery_choices(hass, own) == {hass_device.entities["battery_voltage"]: "voltage"}, voltage_class
        # Power, energy: never a battery
        er.async_get(hass).async_remove(hass_device.entities["battery_voltage"])
        dr.async_get(hass).async_remove_device(hass_device.device_id)


async def test_what_is_offered_and_what_not(hass: HomeAssistant):
    """No device class: only a unit of V or mV says it is a voltage; a percentage needs the battery class."""
    device = _tibber(
        hass,
        None,
        [
            ("sensor", "millivolt", None, "mV"),
            ("sensor", "level", "battery", "%"),
            ("sensor", "plain", None, None),  # no device class, no unit: could be anything
            ("sensor", "temperature", "temperature", "°C"),
            ("binary_sensor", "low", "battery", None),  # a warning flag is no value to watch
            ("sensor", "supply", "voltage", None),  # device class voltage, unit unknown: still a voltage
            ("sensor", "line", "voltage", "kV"),  # another unit: `_millivolts` would read it wrongly
            ("sensor", "odd", "battery", "Wh"),  # a battery class in neither % nor V/mV
        ],
    )
    hass.states.async_set(device.entities["millivolt"], "2950", {"unit_of_measurement": "mV"})
    own = er.async_entries_for_device(er.async_get(hass), device.device_id)
    assert battery_choices(hass, own) == {
        device.entities["battery_voltage"]: "voltage",
        device.entities["millivolt"]: "voltage",
        device.entities["supply"]: "voltage",
        device.entities["level"]: "battery",
    }
    # While HA starts (no state yet) the unit comes from the registry
    hass.states.async_remove(device.entities["battery_voltage"])
    assert device.entities["battery_voltage"] in battery_choices(hass, own)


# ── Discovery ────────────────────────────────────────────────────────────


async def test_chosen_voltage_is_only_shown(hass: HomeAssistant):
    tibber = _tibber(hass, None)
    voltage = tibber.entities["battery_voltage"]
    # The automatic way does not find it, with or without a choice (it never reads one)
    assert tibber.device_id not in discover(hass, mains=True)
    assert tibber.device_id not in discover(hass, mains=True, batteries={tibber.device_id: voltage})
    plain = discover(hass, mains=True, manual={tibber.device_id})[tibber.device_id]
    assert plain.manual and plain.mains and plain.manual_battery is None and plain.battery_choices == [voltage]
    spec = discover(hass, mains=True, manual={tibber.device_id}, batteries={tibber.device_id: voltage})[
        tibber.device_id
    ]
    assert spec.manual_battery == voltage and spec.manual_battery_kind == "voltage"
    # Nothing else changes: still watched for being there, no battery, no voltage for change detection
    assert replace(spec, manual_battery=None, manual_battery_kind=None) == plain
    # A sensor that is not offered (or no longer there) counts as no choice
    other = discover(hass, manual={tibber.device_id}, batteries={tibber.device_id: tibber.entities["power"]})
    assert other[tibber.device_id].manual_battery is None


async def test_automatic_devices_ignore_a_chosen_battery(hass: HomeAssistant, setup):
    """The automatic way never changes (CLAUDE.md): a stored choice on an automatic device has no effect."""
    door = setup["devices"]["door"]
    before = discover(hass, mains=True)
    after = discover(hass, mains=True, batteries={door.device_id: door.entities["battery"]})
    assert after == before


# ── Monitor and panel ────────────────────────────────────────────────────


async def test_tibber_pulse_voltage_shown_through_the_panel(hass: HomeAssistant, setup, hass_ws_client):
    monitor = setup["monitor"]
    tibber = _tibber(hass, "voltage")
    voltage = tibber.entities["battery_voltage"]
    monitor.set_manual(tibber.device_id, True)
    await hass.async_block_till_done()
    snap = {d["id"]: d for d in monitor.snapshot()["devices"]}[tibber.device_id]
    assert snap["battery_entity"] is None and snap["manual_battery"] is None
    assert snap["battery_choices"] == [{"entity_id": voltage, "name": "Tibber Pulse Battery voltage"}]

    client = await hass_ws_client(hass)
    # Not one of its battery sensors / not a device added by hand: refused, nothing stored
    reply = await _send(
        client, {"type": "pulse/device", "device_id": tibber.device_id, "battery_entity": tibber.entities["power"]}
    )
    assert not reply["success"] and reply["error"]["code"] == "invalid_battery_entity"
    door = setup["devices"]["door"]
    reply = await _send(
        client, {"type": "pulse/device", "device_id": door.device_id, "battery_entity": door.entities["battery"]}
    )
    assert not reply["success"] and "battery_entity" not in monitor.devices[door.device_id].record

    reply = await _send(client, {"type": "pulse/device", "device_id": tibber.device_id, "battery_entity": voltage})
    assert reply["success"]
    await hass.async_block_till_done()
    await client.close()
    device = monitor.devices[tibber.device_id]
    assert device.record["battery_entity"] == voltage and device.spec.manual_battery == voltage
    snap = {d["id"]: d for d in monitor.snapshot()["devices"]}[tibber.device_id]
    assert snap["battery_entity"] == voltage and snap["mains"] and snap["manual"]
    assert snap["manual_battery"] == {"level": None, "voltage": 2950}
    # The battery fields of a battery device stay empty: nothing to mark, forecast or warn about
    assert snap["battery"]["voltage"] is None and snap["battery"]["level"] is None

    monitor.update_device(tibber.device_id, {"battery_entity": None})
    await hass.async_block_till_done()
    assert device.record["battery_entity"] is None and device.spec.manual_battery is None


async def test_voltage_without_device_class_is_shown(hass: HomeAssistant, setup):
    """The other variant of the report: no device class, only the unit V."""
    monitor = setup["monitor"]
    tibber = _tibber(hass, None)
    voltage = tibber.entities["battery_voltage"]
    monitor.set_manual(tibber.device_id, True)
    await hass.async_block_till_done()
    monitor.update_device(tibber.device_id, {"battery_entity": voltage})
    await hass.async_block_till_done()
    device = monitor.devices[tibber.device_id]
    hass.states.async_set(voltage, "2.91", {"unit_of_measurement": "V"})
    await hass.async_block_till_done()
    assert monitor.manual_battery(device) == {"level": None, "voltage": 2910}


async def test_percentage_is_only_shown(hass: HomeAssistant, setup):
    monitor, device, _mower_entity, _level = await _mower_with_battery(hass, setup)
    assert device.spec.manual_battery_kind == "battery" and device.spec.battery is None
    assert monitor.manual_battery(device) == {"level": 64, "voltage": None}
    assert monitor.battery_level(device) is None


async def test_choice_follows_a_new_entity_id_and_survives_a_restart(hass: HomeAssistant, setup):
    monitor = setup["monitor"]
    tibber = _tibber(hass, "voltage")
    monitor.set_manual(tibber.device_id, True)
    await hass.async_block_till_done()
    monitor.update_device(tibber.device_id, {"battery_entity": tibber.entities["battery_voltage"]})
    await hass.async_block_till_done()
    er.async_get(hass).async_update_entity(tibber.entities["battery_voltage"], new_entity_id="sensor.tibber_akku")
    hass.states.async_set("sensor.tibber_akku", "2.9", {"unit_of_measurement": "V", "device_class": "voltage"})
    await tick(hass, setup["freezer"], timedelta(seconds=30))
    device = monitor.devices[tibber.device_id]
    assert device.record["battery_entity"] == "sensor.tibber_akku"
    assert device.spec.manual_battery == "sensor.tibber_akku"

    # Stored and read back (no new minor version: a new key, read with `get`)
    await monitor.store.async_save()
    store = PulseStore(hass)
    await store.async_load()
    assert store.devices[tibber.device_id]["battery_entity"] == "sensor.tibber_akku"
    assert "battery_entity" in GONE_KEEP_SETTINGS  # a device paired again keeps its choice like its other settings


def _mower(hass: HomeAssistant):
    entry = MockConfigEntry(domain="husqvarna", title="Mower")
    entry.add_to_hass(hass)
    dev = dr.async_get(hass).async_get_or_create(
        config_entry_id=entry.entry_id, identifiers={("husqvarna", "m2")}, name="Mäher 2"
    )
    reg = er.async_get(hass)
    mower = reg.async_get_or_create("lawn_mower", "husqvarna", "m2", device_id=dev.id, config_entry=entry)
    level = reg.async_get_or_create(
        "sensor", "husqvarna", "m2_battery", device_id=dev.id, config_entry=entry, original_device_class="battery"
    )
    hass.states.async_set(mower.entity_id, "docked")
    hass.states.async_set(level.entity_id, "64", {"unit_of_measurement": "%", "device_class": "battery"})
    return dev, mower, level


async def _mower_with_battery(hass: HomeAssistant, setup):
    monitor = setup["monitor"]
    dev, mower, level = _mower(hass)
    monitor.set_manual(dev.id, True)
    await hass.async_block_till_done()
    monitor.update_device(dev.id, {"battery_entity": level.entity_id})
    await hass.async_block_till_done()
    return monitor, monitor.devices[dev.id], mower, level


async def test_removed_battery_sensor_can_be_set_to_none(hass: HomeAssistant, setup):
    """A chosen sensor removed for good: nothing hangs on it, the panel still lists it so "None" can be picked."""
    monitor, device, mower, level = await _mower_with_battery(hass, setup)
    hass.states.async_set(level.entity_id, "unavailable", {"unit_of_measurement": "%", "device_class": "battery"})
    await tick(hass, setup["freezer"], timedelta(minutes=2))
    er.async_get(hass).async_remove(level.entity_id)
    hass.states.async_remove(level.entity_id)
    await tick(hass, setup["freezer"], timedelta(seconds=30))
    for i in range(30):
        hass.states.async_set(mower.entity_id, "mowing" if i % 2 else "docked")
        await tick(hass, setup["freezer"], timedelta(hours=1))
    assert device.spec.manual_battery is None and device.status == "ok"
    assert not str(device.reason["key"]).startswith("battery")
    snap = {d["id"]: d for d in monitor.snapshot()["devices"]}[device.device_id]
    assert snap["battery_entity"] == level.entity_id and snap["manual_battery"] is None
    assert snap["battery_choices"] == [{"entity_id": level.entity_id, "name": level.entity_id, "gone": True}]
    monitor.update_device(device.device_id, {"battery_entity": None})
    await hass.async_block_till_done()
    assert device.record["battery_entity"] is None


# ── Regressions (review rounds 1-3): the chosen battery changes nothing ──


async def _flat_then_new(hass: HomeAssistant, setup, entity_id: str, attrs: dict) -> None:
    """Days of a flat battery, then a clear step up that holds (what Pulse would take for new batteries)."""
    for value in ("2.22", "2.21") * 8:
        await tick(hass, setup["freezer"], timedelta(hours=6))
        hass.states.async_set(entity_id, value, attrs)
    await tick(hass, setup["freezer"], timedelta(hours=1))
    hass.states.async_set(entity_id, "3.02", attrs)
    for value in ("3.01", "3.00"):
        await tick(hass, setup["freezer"], timedelta(minutes=20))
        hass.states.async_set(entity_id, value, attrs)
    await tick(hass, setup["freezer"], timedelta(hours=7))


async def test_voltage_step_is_no_battery_change(hass: HomeAssistant, setup):
    """2.2 V → 3.0 V on the chosen voltage: only shown, no change recorded, no event, status untouched."""
    monitor = setup["monitor"]
    tibber = _tibber(hass, "voltage")
    voltage = tibber.entities["battery_voltage"]
    monitor.set_manual(tibber.device_id, True)
    await hass.async_block_till_done()
    monitor.update_device(tibber.device_id, {"battery_entity": voltage})
    await hass.async_block_till_done()
    device = monitor.devices[tibber.device_id]
    replaced = async_capture_events(hass, EVENT_BATTERY_REPLACED)
    pushes = len(setup["pushes"])
    await _flat_then_new(hass, setup, voltage, {"unit_of_measurement": "V", "device_class": "voltage"})
    assert replaced == [] and device.record["replaced"] == []
    history = device.record["battery_history"].get("voltage") or {}
    assert not history.get("samples") and not history.get("candidate") and device.record["last_voltage"] is None
    assert len(setup["pushes"]) == pushes
    assert device.status == "ok" and device.reason["key"] == "ok_manual"
    assert monitor.manual_battery(device) == {"level": None, "voltage": 3000}


async def test_voltage_of_a_template_helper_keeps_the_status(hass: HomeAssistant, setup):
    """The voltage may come from a template helper on the device (not a sign of life): the status stays."""
    monitor = setup["monitor"]
    entry = MockConfigEntry(domain="tibber_local", title="Tibber Pulse")
    entry.add_to_hass(hass)
    helper = MockConfigEntry(domain="template", title="volt")
    helper.add_to_hass(hass)
    dev = dr.async_get(hass).async_get_or_create(
        config_entry_id=entry.entry_id, identifiers={("tibber_local", "p")}, name="Tibber Pulse"
    )
    reg = er.async_get(hass)
    power = reg.async_get_or_create(
        "sensor", "tibber_local", "p_power", device_id=dev.id, config_entry=entry, original_device_class="power"
    )
    volt = reg.async_get_or_create(
        "sensor",
        "template",
        "p_volt",
        device_id=dev.id,
        config_entry=helper,
        original_device_class="voltage",
        unit_of_measurement="V",
    )
    hass.states.async_set(power.entity_id, "412", {"unit_of_measurement": "W"})
    attrs = {"unit_of_measurement": "V", "device_class": "voltage"}
    hass.states.async_set(volt.entity_id, "2.22", attrs)
    monitor.set_manual(dev.id, True)
    await hass.async_block_till_done()
    monitor.update_device(dev.id, {"battery_entity": volt.entity_id})
    await hass.async_block_till_done()
    device = monitor.devices[dev.id]
    await tick(hass, setup["freezer"], timedelta(minutes=1))
    before = (device.status, device.reason["key"])
    await _flat_then_new(hass, setup, volt.entity_id, attrs)
    assert device.record["replaced"] == []
    assert (device.status, device.reason["key"]) == before


async def test_low_percentage_is_no_finding(hass: HomeAssistant, setup):
    """A mower at 8 % is charging, not due: no low battery status, shopping list or missing battery."""
    monitor, device, _mower_entity, level = await _mower_with_battery(hass, setup)
    attrs = {"unit_of_measurement": "%", "device_class": "battery"}
    hass.states.async_set(level.entity_id, "8", attrs)
    await tick(hass, setup["freezer"], timedelta(hours=2))
    assert device.status == "ok" and device.reason["key"] == "ok_manual"
    assert device not in monitor.notifier.due_batteries()
    hass.states.async_set(level.entity_id, "unavailable", attrs)
    await tick(hass, setup["freezer"], timedelta(days=3))
    assert device.reason["key"] == "ok_manual" and device.record["battery_missing_since"] is None


async def test_mark_replaced_works_as_before(hass: HomeAssistant, setup):
    """Marking a change by hand (service, Casora, Zigbee2MQTT announce) on a device added by hand without a
    choice does what it always did."""
    monitor = setup["monitor"]
    dev, _mower_entity, _level = _mower(hass)
    monitor.set_manual(dev.id, True)
    await hass.async_block_till_done()
    device = monitor.devices[dev.id]
    replaced = async_capture_events(hass, EVENT_BATTERY_REPLACED)
    monitor.mark_replaced(dev.id)
    await hass.async_block_till_done()
    assert len(device.record["replaced"]) == 1 and device.record["replaced_source"] == ["manual"]
    assert len(replaced) == 1
    assert monitor.undo_replaced(dev.id) and device.record["replaced"] == []


async def test_diagnostics_hide_the_chosen_sensor(hass: HomeAssistant, setup):
    """The chosen sensor is an entity ID (with the device name in it): diagnostics only say whether there is one."""
    from custom_components.pulse.diagnostics import async_get_config_entry_diagnostics

    monitor = setup["monitor"]
    tibber = _tibber(hass, "voltage")
    voltage = tibber.entities["battery_voltage"]
    monitor.set_manual(tibber.device_id, True)
    await hass.async_block_till_done()
    monitor.update_device(tibber.device_id, {"battery_entity": voltage})
    await hass.async_block_till_done()
    data = await async_get_config_entry_diagnostics(hass, setup["entry"])
    assert voltage not in str(data)
    records = [d["record"] for d in data["devices"]]
    assert [r["battery_entity"] for r in records if "battery_entity" in r] == [True]
