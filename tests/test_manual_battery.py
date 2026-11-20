"""Battery sensor chosen by hand for a device added by hand (#9).

The case of the report: a Tibber Pulse (custom integration `tibber_local`, Wi-Fi, 2× AA) whose battery is only a
voltage sensor, so Pulse does not find it as a battery device and it was added by hand. Its voltage sensor may
come with the device class `voltage` or without one; both are tested.
"""

from __future__ import annotations

from datetime import timedelta
import time
from unittest.mock import AsyncMock, patch

from homeassistant.core import HomeAssistant
from homeassistant.helpers import device_registry as dr, entity_registry as er
from pytest_homeassistant_custom_component.common import MockConfigEntry, async_capture_events

from common import TestDevice as Device, tick
from custom_components.pulse.const import EVENT_BATTERY_REPLACED
from custom_components.pulse.discovery import battery_choices, discover
from custom_components.pulse.monitor import GONE_KEEP_SETTINGS
from custom_components.pulse.store import PulseStore, default_record

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


async def test_chosen_voltage_makes_it_a_battery_device_added_by_hand(hass: HomeAssistant):
    tibber = _tibber(hass, None)
    voltage = tibber.entities["battery_voltage"]
    # The automatic way does not find it, with or without a choice (it never reads one)
    assert tibber.device_id not in discover(hass, mains=True)
    assert tibber.device_id not in discover(hass, mains=True, batteries={tibber.device_id: voltage})
    plain = discover(hass, mains=True, manual={tibber.device_id})[tibber.device_id]
    assert plain.manual and plain.mains and plain.voltage is None and plain.battery is None
    assert plain.battery_choices == [voltage]
    chosen = discover(hass, mains=True, manual={tibber.device_id}, batteries={tibber.device_id: voltage})
    spec = chosen[tibber.device_id]
    # Only shown and its changes detected; everything else as without it (still a device watched for being there)
    assert spec.manual and spec.mains and spec.manual_battery == voltage
    assert spec.voltage == voltage and spec.battery is None
    # Everything else as without a battery
    assert spec.entities == plain.entities and spec.icon == plain.icon and spec.connectivity == plain.connectivity
    # A sensor that is not offered (or no longer there) counts as no choice
    other = discover(hass, manual={tibber.device_id}, batteries={tibber.device_id: tibber.entities["power"]})
    assert other[tibber.device_id].mains and other[tibber.device_id].voltage is None


async def test_automatic_devices_ignore_a_chosen_battery(hass: HomeAssistant, setup):
    """The automatic way never changes (CLAUDE.md): a stored choice on an automatic device has no effect."""
    door = setup["devices"]["door"]
    before = discover(hass, mains=True)
    after = discover(hass, mains=True, batteries={door.device_id: door.entities["battery"]})
    assert after == before


# ── Monitor, panel, battery change ───────────────────────────────────────


async def test_tibber_pulse_voltage_end_to_end(hass: HomeAssistant, setup, hass_ws_client):
    monitor = setup["monitor"]
    tibber = _tibber(hass, "voltage")
    voltage = tibber.entities["battery_voltage"]
    monitor.set_manual(tibber.device_id, True)
    await hass.async_block_till_done()
    device = monitor.devices[tibber.device_id]
    assert device.spec.mains and device.spec.voltage is None
    snap = {d["id"]: d for d in monitor.snapshot()["devices"]}[tibber.device_id]
    assert snap["battery_entity"] is None
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
    assert not reply["success"]
    assert monitor.devices[door.device_id].record["battery_entity"] is None

    # Chosen when the batteries are already low (the reason one cares)
    hass.states.async_set(voltage, "2.24", {"unit_of_measurement": "V", "device_class": "voltage"})
    reply = await _send(client, {"type": "pulse/device", "device_id": tibber.device_id, "battery_entity": voltage})
    assert reply["success"]
    await hass.async_block_till_done()
    device = monitor.devices[tibber.device_id]
    assert device.record["battery_entity"] == voltage
    assert device.spec.mains and device.spec.voltage == voltage and device.spec.manual_battery == voltage
    assert device.record["last_voltage"] == 2240
    snap = {d["id"]: d for d in monitor.snapshot()["devices"]}[tibber.device_id]
    assert snap["battery_entity"] == voltage and snap["mains"] and snap["manual"]
    assert snap["battery"]["voltage"] == 2240 and snap["battery"]["level"] is None
    await client.close()  # days pass below (the test client would time out)
    await tick(hass, setup["freezer"], timedelta(minutes=1))
    assert device.reason["key"] == "ok_manual"

    # Batteries run down over days (it reports every few hours), then new ones go in: a battery change
    replaced = async_capture_events(hass, EVENT_BATTERY_REPLACED)
    for value in ("2.24", "2.22", "2.23", "2.22") * 4:
        await _report(hass, setup, voltage, value, wait=timedelta(hours=6))
    await _report(hass, setup, voltage, "2.21")
    step = await _report(hass, setup, voltage, "3.02")
    for value in ("3.01", "3.01", "3.00"):
        await _report(hass, setup, voltage, value, wait=timedelta(minutes=20))
    await tick(hass, setup["freezer"], timedelta(hours=6))  # held long enough (`replacement.HOLD_SECONDS`)
    assert len(replaced) == 1 and replaced[0].data["source"] == "auto"
    assert device.record["replaced"] and abs(device.record["replaced"][-1] - step) < 60
    assert device.record["last_voltage"] == 3000

    # Reachability stays as for devices added by hand: hours without a report are no finding ...
    await tick(hass, setup["freezer"], timedelta(days=3))
    assert device.status == "ok" and device.reason["key"] == "ok_manual"
    # ... only all of its entities unavailable
    for entity_id in tibber.entities.values():
        hass.states.async_set(entity_id, "unavailable")
    await tick(hass, setup["freezer"], timedelta(hours=2, minutes=1))
    assert device.status == "failed" and device.reason["key"] == "unavailable"

    # No battery again: back to a device without battery
    monitor.update_device(tibber.device_id, {"battery_entity": None})
    await hass.async_block_till_done()
    assert device.record["battery_entity"] is None and device.spec.mains and device.spec.voltage is None


async def test_voltage_without_device_class_end_to_end(hass: HomeAssistant, setup):
    """The other variant of the report: no device class, only the unit V."""
    monitor = setup["monitor"]
    tibber = _tibber(hass, None)
    voltage = tibber.entities["battery_voltage"]
    monitor.set_manual(tibber.device_id, True)
    await hass.async_block_till_done()
    monitor.update_device(tibber.device_id, {"battery_entity": voltage})
    await hass.async_block_till_done()
    device = monitor.devices[tibber.device_id]
    assert device.spec.voltage == voltage and monitor.voltage(device) == 2950
    hass.states.async_set(voltage, "2.91", {"unit_of_measurement": "V"})
    await hass.async_block_till_done()
    assert device.record["last_voltage"] == 2910


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
    assert device.spec.voltage == "sensor.tibber_akku" and device.spec.manual_battery == "sensor.tibber_akku"

    # Stored and read back (no new minor version: a new key with a default)
    await monitor.store.async_save()
    store = PulseStore(hass)
    await store.async_load()
    assert store.devices[tibber.device_id]["battery_entity"] == "sensor.tibber_akku"


async def test_store_default_and_records_from_before(hass: HomeAssistant):
    assert default_record()["battery_entity"] is None
    assert "battery_entity" in GONE_KEEP_SETTINGS  # a device paired again keeps its choice like its other settings
    store = PulseStore(hass)
    await store._store.async_save({"devices": {"old": {"events": [1.0]}}})
    await store.async_load()
    assert store.devices["old"]["battery_entity"] is None


async def test_percentage_chosen_on_a_device_left_out_automatically(hass: HomeAssistant, setup):
    """A device automatic discovery leaves out (a lawn mower: its own domain) with a battery percentage: chosen
    by hand, the percentage is its battery; not chosen, it stays ignored (a mower charges)."""
    monitor = setup["monitor"]
    entry = MockConfigEntry(domain="husqvarna", title="Mower")
    entry.add_to_hass(hass)
    dev = dr.async_get(hass).async_get_or_create(
        config_entry_id=entry.entry_id, identifiers={("husqvarna", "m1")}, name="Mäher"
    )
    reg = er.async_get(hass)
    mower = reg.async_get_or_create("lawn_mower", "husqvarna", "m1", device_id=dev.id, config_entry=entry)
    level = reg.async_get_or_create(
        "sensor", "husqvarna", "m1_battery", device_id=dev.id, config_entry=entry, original_device_class="battery"
    )
    hass.states.async_set(mower.entity_id, "docked")
    hass.states.async_set(level.entity_id, "64", {"unit_of_measurement": "%", "device_class": "battery"})
    monitor.set_manual(dev.id, True)
    await hass.async_block_till_done()
    device = monitor.devices[dev.id]
    assert device.spec.battery is None and device.spec.battery_choices == [level.entity_id]
    monitor.update_device(dev.id, {"battery_entity": level.entity_id})
    await hass.async_block_till_done()
    # Only shown: no `battery` (no level finding, no shopping list, no forecast), no change detection
    assert device.spec.manual_battery == level.entity_id and device.spec.battery is None and device.spec.mains
    assert device.spec.voltage is None and monitor.battery_level(device) is None
    assert monitor.battery_percent(device) == 64
    # Nothing to do when nothing changes; a device that is not watched is left alone
    monitor.update_device(dev.id, {"battery_entity": level.entity_id})
    monitor.update_device("unknown", {"battery_entity": level.entity_id})
    assert not monitor.battery_entity_allowed("unknown", None)


# ── Review findings: the battery of a device added by hand never decides its status ──


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


async def test_removed_battery_sensor_leaves_no_battery_missing(hass: HomeAssistant, setup):
    """The chosen sensor goes unavailable and then away for good: no "battery missing" stays behind, and the
    panel still offers the stored choice so "None" can be picked."""
    monitor = setup["monitor"]
    dev, mower, level = _mower(hass)
    monitor.set_manual(dev.id, True)
    await hass.async_block_till_done()
    monitor.update_device(dev.id, {"battery_entity": level.entity_id})
    await hass.async_block_till_done()
    hass.states.async_set(level.entity_id, "unavailable", {"unit_of_measurement": "%", "device_class": "battery"})
    await tick(hass, setup["freezer"], timedelta(minutes=2))
    er.async_get(hass).async_remove(level.entity_id)
    hass.states.async_remove(level.entity_id)
    await tick(hass, setup["freezer"], timedelta(seconds=30))
    device = monitor.devices[dev.id]
    assert device.spec.battery is None and device.spec.mains
    for i in range(30):
        hass.states.async_set(mower.entity_id, "mowing" if i % 2 else "docked")
        await tick(hass, setup["freezer"], timedelta(hours=1))
    assert device.reason["key"] != "battery_missing" and device.status == "ok"
    assert device.record["battery_missing_since"] is None
    snap = {d["id"]: d for d in monitor.snapshot()["devices"]}[dev.id]
    assert snap["battery_entity"] == level.entity_id
    assert snap["battery_choices"] == [{"entity_id": level.entity_id, "name": level.entity_id, "gone": True}]
    monitor.update_device(dev.id, {"battery_entity": None})
    await hass.async_block_till_done()
    assert device.record["battery_entity"] is None


async def test_low_percentage_of_a_device_added_by_hand_is_no_finding(hass: HomeAssistant, setup):
    """A mower at 8 % is charging, not due: shown, but no low battery status, shopping list or forecast."""
    monitor = setup["monitor"]
    dev, _mower_entity, level = _mower(hass)
    monitor.set_manual(dev.id, True)
    await hass.async_block_till_done()
    monitor.update_device(dev.id, {"battery_entity": level.entity_id})
    await hass.async_block_till_done()
    hass.states.async_set(level.entity_id, "8", {"unit_of_measurement": "%", "device_class": "battery"})
    await tick(hass, setup["freezer"], timedelta(hours=2))
    device = monitor.devices[dev.id]
    assert device.status == "ok" and device.reason["key"] == "ok_manual"
    assert monitor.battery_percent(device) == 8 and monitor.battery_level(device) is None
    snap = {d["id"]: d for d in monitor.snapshot()["devices"]}[dev.id]
    assert snap["battery"]["level"] == 8 and snap["mains"]
    assert device not in monitor.notifier.due_batteries()
    hass.states.async_set(level.entity_id, "unavailable", {"unit_of_measurement": "%", "device_class": "battery"})
    await tick(hass, setup["freezer"], timedelta(days=3))
    assert device.reason["key"] != "battery_missing" and device.record["battery_missing_since"] is None
    # No forecast: the daily run leaves it out, a new battery sets no reason
    device.forecast, device.forecast_reason = None, "too_short"
    with patch("custom_components.pulse.monitor.load_forecasts", return_value={}) as load:
        hass.config.components.add("recorder")
        with patch("homeassistant.components.recorder.get_instance") as instance:
            instance.return_value.async_add_executor_job = AsyncMock(return_value={})
            await monitor._async_forecasts()
    assert device.forecast is None and device.forecast_reason is None
    load.assert_not_called()
    snap = {d["id"]: d for d in monitor.snapshot()["devices"]}[dev.id]
    assert snap["battery"]["forecast"] is None and snap["battery"]["forecast_reason"] is None


# ── Review round 2: a battery chosen by hand changes nothing but what is shown and detected ──


async def _mower_with_battery(hass: HomeAssistant, setup):
    monitor = setup["monitor"]
    dev, mower, level = _mower(hass)
    monitor.set_manual(dev.id, True)
    await hass.async_block_till_done()
    monitor.update_device(dev.id, {"battery_entity": level.entity_id})
    await hass.async_block_till_done()
    return monitor, monitor.devices[dev.id], mower, level


async def test_no_battery_changed_for_a_device_added_by_hand(hass: HomeAssistant, setup):
    """No "Battery changed" button, menu entry or notification action (all follow `mains`), and the action itself
    leaves the device alone: it stays "added by hand" instead of waiting for a first report."""
    monitor, device, _mower_entity, _level = await _mower_with_battery(hass, setup)
    await tick(hass, setup["freezer"], timedelta(minutes=5))
    snap = {d["id"]: d for d in monitor.snapshot()["devices"]}[device.device_id]
    assert snap["mains"] and snap["manual"]
    monitor.mark_replaced(device.device_id)
    await tick(hass, setup["freezer"], timedelta(days=2))
    assert device.record["replaced"] == []
    assert device.status == "ok" and device.reason["key"] == "ok_manual"


async def test_battery_changed_during_an_outage_keeps_the_outage(hass: HomeAssistant, setup):
    monitor, device, mower, level = await _mower_with_battery(hass, setup)
    await tick(hass, setup["freezer"], timedelta(hours=1))
    hass.states.async_set(mower.entity_id, "unavailable")
    hass.states.async_set(level.entity_id, "unavailable", {"unit_of_measurement": "%", "device_class": "battery"})
    await tick(hass, setup["freezer"], timedelta(hours=3))
    assert device.status == "failed"
    monitor.mark_replaced(device.device_id)
    await tick(hass, setup["freezer"], timedelta(minutes=1))
    assert device.status == "failed" and device.unavailable_since is not None
    await tick(hass, setup["freezer"], timedelta(minutes=30))
    hass.states.async_set(mower.entity_id, "docked")
    hass.states.async_set(level.entity_id, "100", {"unit_of_measurement": "%", "device_class": "battery"})
    await tick(hass, setup["freezer"], timedelta(minutes=5))
    assert device.record["outages"]


async def test_device_added_by_hand_without_choice_keeps_its_record(hass: HomeAssistant, setup):
    """Without a choice nothing about the battery is touched (a value from before stays as it is)."""
    monitor = setup["monitor"]
    dev, _mower_entity, level = _mower(hass)
    monitor.set_manual(dev.id, True)
    await hass.async_block_till_done()
    device = monitor.devices[dev.id]
    device.record["battery_missing_since"] = 123.0
    hass.states.async_set(level.entity_id, "unavailable", {"unit_of_measurement": "%", "device_class": "battery"})
    await tick(hass, setup["freezer"], timedelta(hours=1))
    assert device.record["battery_missing_since"] == 123.0
    assert device.reason["key"] == "ok_manual"


async def test_percentage_chosen_by_hand_detects_no_change(hass: HomeAssistant, setup):
    """A mower charging from 15 % to 100 % is no new battery: a percentage chosen by hand is only shown."""
    monitor, device, _mower_entity, level = await _mower_with_battery(hass, setup)
    replaced = async_capture_events(hass, EVENT_BATTERY_REPLACED)
    attrs = {"unit_of_measurement": "%", "device_class": "battery"}
    for _ in range(16):
        await tick(hass, setup["freezer"], timedelta(hours=6))
        hass.states.async_set(level.entity_id, "15", attrs)
    for value in ("100", "100", "99"):
        await tick(hass, setup["freezer"], timedelta(hours=1))
        hass.states.async_set(level.entity_id, value, attrs)
    await tick(hass, setup["freezer"], timedelta(hours=8))
    assert replaced == [] and device.record["replaced"] == []
    assert monitor.battery_percent(device) == 99 and len(setup["pushes"]) == 0


async def test_voltage_change_of_a_device_added_by_hand_sends_nothing(hass: HomeAssistant, setup):
    """New batteries in the Tibber Pulse: recorded and the event fired, no notification, status untouched."""
    monitor = setup["monitor"]
    tibber = _tibber(hass, "voltage")
    voltage = tibber.entities["battery_voltage"]
    hass.states.async_set(voltage, "2.22", {"unit_of_measurement": "V"})
    monitor.set_manual(tibber.device_id, True)
    await hass.async_block_till_done()
    monitor.update_device(tibber.device_id, {"battery_entity": voltage})
    await hass.async_block_till_done()
    device = monitor.devices[tibber.device_id]
    for value in ("2.22", "2.21") * 8:
        await _report(hass, setup, voltage, value, wait=timedelta(hours=6))
    await _report(hass, setup, voltage, "3.02")
    for value in ("3.01", "3.00"):
        await _report(hass, setup, voltage, value, wait=timedelta(minutes=20))
    pushes = len(setup["pushes"])
    await tick(hass, setup["freezer"], timedelta(hours=7))
    assert len(device.record["replaced"]) == 1 and device.record["replaced_source"] == ["auto"]
    assert len(setup["pushes"]) == pushes
    assert device.reason["key"] == "ok_manual"
