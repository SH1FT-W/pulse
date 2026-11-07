"""Issue #5: a single outlier report far below must not become the reference for a battery change.

Shelly BLU H&T: level wobbles 60-75 %, once a single report of ~15 %, then 70 % again. The dip became the
reference value at once, so the return to 70 % (confirmed by the next report) counted as a new battery.
"""

from __future__ import annotations

from datetime import timedelta

from homeassistant.core import HomeAssistant
from pytest_homeassistant_custom_component.common import async_capture_events

from common import tick
from custom_components.pulse.const import EVENT_BATTERY_REPLACED
from custom_components.pulse.monitor import PulseMonitor


async def report(hass: HomeAssistant, setup, entity_id: str, value: str) -> None:
    await tick(hass, setup["freezer"], timedelta(minutes=10))
    hass.states.async_set(entity_id, value)
    await hass.async_block_till_done()


async def test_single_dip_then_back_is_no_battery_change(hass: HomeAssistant, setup):
    monitor: PulseMonitor = setup["monitor"]
    door = setup["devices"]["door"]
    battery = door.entities["battery"]
    replaced = async_capture_events(hass, EVENT_BATTERY_REPLACED)
    for value in ("70", "66", "15", "70", "71", "68"):
        await report(hass, setup, battery, value)
    record = monitor.devices[door.device_id].record
    assert replaced == []
    assert record["replaced"] == []
    assert record["last_level"] == 68


async def test_single_voltage_dip_then_back_is_no_battery_change(hass: HomeAssistant, setup):
    door = setup["devices"]["door"]
    voltage = door.entities["voltage"]
    replaced = async_capture_events(hass, EVENT_BATTERY_REPLACED)
    for value in ("1200", "1190", "900", "1200", "1195"):
        await report(hass, setup, voltage, value)
    assert replaced == []


async def test_confirmed_drop_then_new_battery_is_detected(hass: HomeAssistant, setup):
    monitor: PulseMonitor = setup["monitor"]
    door = setup["devices"]["door"]
    battery = door.entities["battery"]
    replaced = async_capture_events(hass, EVENT_BATTERY_REPLACED)
    # A real fast drop (confirmed by the next report) becomes the reference ...
    for value in ("70", "15", "14"):
        await report(hass, setup, battery, value)
    assert monitor.devices[door.device_id].record["last_level"] == 14
    # ... so the following jump to a fresh battery still counts
    for value in ("100", "100"):
        await report(hass, setup, battery, value)
    assert len(replaced) == 1


async def test_same_low_value_reported_again_confirms_the_drop(hass: HomeAssistant, setup):
    monitor: PulseMonitor = setup["monitor"]
    door = setup["devices"]["door"]
    battery = door.entities["battery"]
    for value in ("70", "15"):
        await report(hass, setup, battery, value)
    record = monitor.devices[door.device_id].record
    assert record["last_level"] == 70 and record["pending_drop"] is not None
    await tick(hass, setup["freezer"], timedelta(minutes=10))
    hass.states.async_set(battery, "15", force_update=True)  # same value: only state_reported
    await hass.async_block_till_done()
    assert record["last_level"] == 15 and record["pending_drop"] is None


def test_store_migration_adds_pending_drop():
    from custom_components.pulse.store import migrate

    data = migrate(10, {"devices": {"a": {"pending_jump": None}}})
    assert data["devices"]["a"]["pending_drop"] is None
