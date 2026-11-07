"""Issue #5: a single outlier report far below must not become the reference for a battery change.

Shelly BLU H&T: level wobbles 60-75 %, once a single report of ~15 %, then 70 % again. The dip became the
reference value at once, so the return to 70 % (confirmed by the next report) counted as a new battery.
"""

from __future__ import annotations

from datetime import timedelta
import time

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
    assert record["last_level"] == 70 and "level" in record["pending_drop"]
    await tick(hass, setup["freezer"], timedelta(minutes=10))
    hass.states.async_set(battery, "15", force_update=True)  # same value: only state_reported
    await hass.async_block_till_done()
    assert record["last_level"] == 15 and record["pending_drop"] == {}


def test_store_migration_makes_pending_per_quantity():
    from custom_components.pulse.store import migrate

    for minor, record in ((10, {"pending_jump": None}), (11, {"pending_jump": 1.0, "pending_drop": 2.0})):
        data = migrate(minor, {"devices": {"a": record}})
        assert data["devices"]["a"]["pending_jump"] == {} and data["devices"]["a"]["pending_drop"] == {}


# ── Battery and voltage of one device in the same messages (review of 26.11.6) ──


async def msg(hass, setup, pairs, wait=timedelta(minutes=10)):
    await tick(hass, setup["freezer"], wait)
    for eid, value in pairs:
        hass.states.async_set(eid, value)
    await hass.async_block_till_done()


async def test_level_drop_never_confirmed_when_voltage_reports_too(hass: HomeAssistant, setup):
    """Real drop 80 -> 30 %, voltage only drops 50 mV (no voltage 'drop'). Both report per message."""
    monitor = setup["monitor"]
    door = setup["devices"]["door"]
    b, v = door.entities["battery"], door.entities["voltage"]
    replaced = async_capture_events(hass, EVENT_BATTERY_REPLACED)
    await msg(hass, setup, [(b, "80"), (v, "1190")])
    for lvl, mv in (("30", "1150"), ("29", "1148"), ("28", "1146"), ("27", "1144")):
        await msg(hass, setup, [(b, lvl), (v, mv)])
    rec = monitor.devices[door.device_id].record
    # new battery
    await msg(hass, setup, [(b, "100"), (v, "1300")])
    await msg(hass, setup, [(b, "100"), (v, "1300")])
    assert rec["last_level"] != 80, "reference stuck at 80"
    assert len(replaced) == 1, "new battery missed"


async def test_voltage_reference_stuck_when_battery_reports_too(hass: HomeAssistant, setup):
    """Both drop in the same messages: the battery's report clears the voltage's pending_drop."""
    monitor = setup["monitor"]
    door = setup["devices"]["door"]
    b, v = door.entities["battery"], door.entities["voltage"]
    await msg(hass, setup, [(b, "70"), (v, "1200")])
    for lvl, mv in (("15", "900"), ("14", "899"), ("13", "898"), ("12", "897")):
        await msg(hass, setup, [(b, lvl), (v, mv)])
    rec = monitor.devices[door.device_id].record
    assert rec["last_voltage"] != 1200, "voltage reference stuck"


async def test_outlier_then_other_entity_value(hass: HomeAssistant, setup):
    """Battery outlier 15, then a voltage report (same as before, only state_reported) then battery back at 70."""
    door = setup["devices"]["door"]
    b, v = door.entities["battery"], door.entities["voltage"]
    replaced = async_capture_events(hass, EVENT_BATTERY_REPLACED)
    await msg(hass, setup, [(b, "70"), (v, "1200")])
    await msg(hass, setup, [(b, "15")])
    await msg(hass, setup, [(b, "45")])  # second, different low-ish value confirms "the fall"
    await msg(hass, setup, [(b, "70")])
    await msg(hass, setup, [(b, "71")])
    assert replaced == []


async def test_stale_reference_suppresses_push_flag(hass: HomeAssistant, setup):
    """Level 80 -> 10 real, voltage reports each message; worth_push reads last_level."""
    monitor = setup["monitor"]
    door = setup["devices"]["door"]
    b, v = door.entities["battery"], door.entities["voltage"]
    await msg(hass, setup, [(b, "80"), (v, "1190")])
    for lvl, mv in (("10", "1150"), ("9", "1149"), ("8", "1148")):
        await msg(hass, setup, [(b, lvl), (v, mv)])
    rec = monitor.devices[door.device_id].record
    assert rec["last_level"] <= 20, f"last_level stale: {rec['last_level']}"


async def test_outlier_survives_restart_grace(hass: HomeAssistant, setup):
    """Outlier 15 pending, HA restart (grace), a report 15 during grace becomes baseline -> 70 counts as new battery."""
    monitor = setup["monitor"]
    door = setup["devices"]["door"]
    b = door.entities["battery"]
    replaced = async_capture_events(hass, EVENT_BATTERY_REPLACED)
    await msg(hass, setup, [(b, "70")])
    await msg(hass, setup, [(b, "15")])
    monitor.started_at = time.time()  # simulate a restart
    await msg(hass, setup, [(b, "16")], wait=timedelta(seconds=30))
    await msg(hass, setup, [(b, "70")])
    await msg(hass, setup, [(b, "71")])
    assert replaced == []


async def test_level_drop_stuck_then_new_battery_with_voltage_jump(hass: HomeAssistant, setup):
    monitor = setup["monitor"]
    door = setup["devices"]["door"]
    b, v = door.entities["battery"], door.entities["voltage"]
    replaced = async_capture_events(hass, EVENT_BATTERY_REPLACED)
    await msg(hass, setup, [(b, "80"), (v, "1190")])
    for lvl, mv in (("30", "1150"), ("29", "1148"), ("28", "1146"), ("27", "1144")):
        await msg(hass, setup, [(b, lvl), (v, mv)])
    assert monitor.devices[door.device_id].record["last_level"] == 27
    await msg(hass, setup, [(b, "100"), (v, "1450")])
    await msg(hass, setup, [(b, "100"), (v, "1450")])
    await msg(hass, setup, [(b, "99"), (v, "1449")])
    assert len(replaced) == 1


async def test_pre_existing_voltage_clears_level_jump(hass: HomeAssistant, setup):
    door = setup["devices"]["door"]
    b, v = door.entities["battery"], door.entities["voltage"]
    replaced = async_capture_events(hass, EVENT_BATTERY_REPLACED)
    await msg(hass, setup, [(b, "30"), (v, "1150")])
    await msg(hass, setup, [(b, "29"), (v, "1149")])
    await msg(hass, setup, [(b, "100"), (v, "1250")])
    await msg(hass, setup, [(b, "99"), (v, "1249")])
    await msg(hass, setup, [(b, "98"), (v, "1248")])
    assert len(replaced) == 1
