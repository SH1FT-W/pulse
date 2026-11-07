"""Battery changes through real Home Assistant state events (`replacement.py`, issue #5).

The rules themselves are tested in `test_replacement.py`; here the monitor feeds them: state changes, the same
value reported again (`state_reported`), unavailable transitions, the minute tick and HA's start.
Realistic timing: a flat battery has reported its low level for hours before the new one goes in.
"""

from __future__ import annotations

from datetime import timedelta
import time

from homeassistant.core import HomeAssistant
from pytest_homeassistant_custom_component.common import async_capture_events

from common import tick
from custom_components.pulse.const import EVENT_BATTERY_REPLACED
from custom_components.pulse.monitor import PulseMonitor

TITLE = "Batteriewechsel erkannt"


async def report(hass: HomeAssistant, setup, pairs: list[tuple[str, str]], wait=timedelta(hours=1)) -> float:
    """Time passes, then the device reports these values (same value again = only `state_reported`)."""
    await tick(hass, setup["freezer"], wait)
    for entity_id, value in pairs:
        hass.states.async_set(entity_id, value)
    await hass.async_block_till_done()
    return time.time()


async def hourly(hass: HomeAssistant, setup, entity_id: str, values: tuple[str, ...]) -> float:
    ts = 0.0
    for value in values:
        ts = await report(hass, setup, [(entity_id, value)])
    return ts


async def flat(hass: HomeAssistant, setup, pairs: list[tuple[str, str]], days: int = 4) -> None:
    """A flat battery: the same low values every 6 h for days (Pulse needs a day of history, and the level of
    setup must be older than the last three days)."""
    for _ in range(days * 4):
        await report(hass, setup, pairs, wait=timedelta(hours=6))


def door(setup) -> tuple[PulseMonitor, dict, str, str]:
    monitor: PulseMonitor = setup["monitor"]
    device = setup["devices"]["door"]
    return monitor, monitor.devices[device.device_id].record, device.entities["battery"], device.entities["voltage"]


async def test_single_dip_then_back_is_no_battery_change(hass: HomeAssistant, setup):
    _, record, battery, _ = door(setup)
    replaced = async_capture_events(hass, EVENT_BATTERY_REPLACED)
    await flat(hass, setup, [(battery, "70")])
    await hourly(hass, setup, battery, ("70", "66"))
    await report(hass, setup, [(battery, "15")])
    for value in ("70", "71", "68"):
        await report(hass, setup, [(battery, value)], wait=timedelta(minutes=10))
    assert replaced == [] and record["replaced"] == []
    assert record["last_level"] == 68


async def test_republished_outlier_then_back_is_no_battery_change(hass: HomeAssistant, setup):
    """#5 with Zigbee2MQTT: the outlier comes again with the next message (`state_reported`); 26.11.7 took it as
    the confirmed new low reference, so the return to 70 % counted as a new battery."""
    _, record, battery, _ = door(setup)
    replaced = async_capture_events(hass, EVENT_BATTERY_REPLACED)
    await flat(hass, setup, [(battery, "70")])
    await hourly(hass, setup, battery, ("70", "68"))
    await report(hass, setup, [(battery, "15")], wait=timedelta(minutes=10))
    await report(hass, setup, [(battery, "15")], wait=timedelta(minutes=2))  # republished with the next message
    for value in ("70", "70", "69"):
        await report(hass, setup, [(battery, value)], wait=timedelta(minutes=10))
    assert replaced == [] and record["replaced"] == []


async def test_single_voltage_dip_then_back_is_no_battery_change(hass: HomeAssistant, setup):
    _, _, _, voltage = door(setup)
    replaced = async_capture_events(hass, EVENT_BATTERY_REPLACED)
    await flat(hass, setup, [(voltage, "1200")])
    await hourly(hass, setup, voltage, ("1200", "1190"))
    await report(hass, setup, [(voltage, "900")], wait=timedelta(minutes=10))
    for value in ("1200", "1200", "1195"):
        await report(hass, setup, [(voltage, value)], wait=timedelta(minutes=10))
    assert replaced == []


async def test_unavailable_then_cached_then_real_is_no_battery_change(hass: HomeAssistant, setup):
    """Prod (Zigbee2MQTT): after "unavailable" the entity first shows the old cached 91 %, a minute later the real
    27 %, every time."""
    _, record, battery, _ = door(setup)
    replaced = async_capture_events(hass, EVENT_BATTERY_REPLACED)
    await flat(hass, setup, [(battery, "28")])
    await hourly(hass, setup, battery, ("28", "27", "27"))
    for _ in range(3):
        await report(hass, setup, [(battery, "unavailable")])
        await report(hass, setup, [(battery, "91")], wait=timedelta(minutes=5))
        await report(hass, setup, [(battery, "27")], wait=timedelta(minutes=1))
        await report(hass, setup, [(battery, "27")], wait=timedelta(minutes=20))
    await tick(hass, setup["freezer"], timedelta(hours=7))
    assert replaced == [] and record["replaced"] == []


async def test_swap_while_unavailable_confirmed_later(hass: HomeAssistant, setup):
    """Battery out (unavailable), new one in: the first value after unavailable alone never counts, the next real
    report confirms it; the change is recorded at the step, not at the confirmation. 26.11.7 skipped the
    transition from unavailable and only looked at a repeated value while something was pending: never detected."""
    monitor, record, battery, _ = door(setup)
    replaced = async_capture_events(hass, EVENT_BATTERY_REPLACED)
    await flat(hass, setup, [(battery, "21")])
    await hourly(hass, setup, battery, ("21", "20", "20"))
    await report(hass, setup, [(battery, "unavailable")], wait=timedelta(minutes=10))
    step = await report(hass, setup, [(battery, "100")], wait=timedelta(minutes=2))
    await tick(hass, setup["freezer"], timedelta(hours=7))
    assert replaced == []  # a value right after unavailable never counts by time alone
    await report(hass, setup, [(battery, "100")], wait=timedelta(minutes=10))  # reported again
    assert [e.data["source"] for e in replaced] == ["auto"]
    assert record["replaced"] == [step] and record["replaced_source"] == ["auto"]
    # The forecast starts at the step, the device shows "new battery" from then
    assert monitor.devices[setup["devices"]["door"].device_id].forecast_reason == "too_short"


async def test_level_and_voltage_are_one_change(hass: HomeAssistant, setup):
    _, record, battery, voltage = door(setup)
    replaced = async_capture_events(hass, EVENT_BATTERY_REPLACED)
    await flat(hass, setup, [(battery, "22"), (voltage, "1110")])
    for lvl, mv in (("22", "1110"), ("21", "1105"), ("20", "1100")):
        await report(hass, setup, [(battery, lvl), (voltage, mv)])
    step = await report(hass, setup, [(battery, "100"), (voltage, "1500")])
    # ZHA reports them separately, minutes apart
    await report(hass, setup, [(voltage, "1495")], wait=timedelta(minutes=10))
    await report(hass, setup, [(battery, "99")], wait=timedelta(minutes=10))
    await report(hass, setup, [(battery, "99"), (voltage, "1490")], wait=timedelta(hours=8))
    assert len(replaced) == 1 and record["replaced"] == [step]


async def test_voltage_step_reads_the_level_before_it(hass: HomeAssistant, setup):
    """Only the voltage steps (the level stays): the notification asks whether the level was low before."""
    _, record, battery, voltage = door(setup)
    replaced = async_capture_events(hass, EVENT_BATTERY_REPLACED)
    await tick(hass, setup["freezer"], timedelta(hours=12))  # confirmed in the morning, not in the quiet time
    await flat(hass, setup, [(battery, "15"), (voltage, "1110")])
    for lvl, mv in (("15", "1110"), ("14", "1105"), ("14", "1100")):
        await report(hass, setup, [(battery, lvl), (voltage, mv)])
    step = await report(hass, setup, [(voltage, "1500")])
    await report(hass, setup, [(battery, "14"), (voltage, "1498")], wait=timedelta(hours=6, minutes=10))  # held 6 h
    assert [e.data["source"] for e in replaced] == ["auto"] and record["replaced"] == [step]
    await tick(hass, setup["freezer"], timedelta(minutes=5))
    assert [p.data["title"] for p in setup["pushes"]] == [TITLE]


async def test_manual_mark_after_the_step_is_no_second_change(hass: HomeAssistant, setup):
    """The device already showed 100 % when the user marked the change; it writes only on change, so the
    next report (the same 100 %) came hours later. 26.11.7 then counted a second, automatic change."""
    monitor, record, battery, _ = door(setup)
    replaced = async_capture_events(hass, EVENT_BATTERY_REPLACED)
    await flat(hass, setup, [(battery, "21")])
    await hourly(hass, setup, battery, ("21", "20", "20"))
    await report(hass, setup, [(battery, "100")])
    await tick(hass, setup["freezer"], timedelta(hours=1))
    monitor.mark_replaced(setup["devices"]["door"].device_id, "manual")
    await report(hass, setup, [(battery, "100")], wait=timedelta(hours=7))
    await report(hass, setup, [(battery, "99")], wait=timedelta(hours=1))
    assert [e.data["source"] for e in replaced] == ["manual"]
    assert record["replaced_source"] == ["manual"]


async def test_undo_then_real_change_counts(hass: HomeAssistant, setup):
    monitor, record, battery, _ = door(setup)
    device_id = setup["devices"]["door"].device_id
    replaced = async_capture_events(hass, EVENT_BATTERY_REPLACED)
    await flat(hass, setup, [(battery, "21")])
    await hourly(hass, setup, battery, ("21", "20", "20"))
    monitor.mark_replaced(device_id, "manual")  # by mistake ...
    assert monitor.undo_replaced(device_id)  # ... and undone
    step = await report(hass, setup, [(battery, "100")])
    await report(hass, setup, [(battery, "100")], wait=timedelta(hours=6, minutes=10))  # held 6 h
    assert [e.data["source"] for e in replaced] == ["manual", "auto"]
    assert record["replaced"] == [step] and record["replaced_source"] == ["auto"]


async def test_on_change_device_confirmed_by_tick(hass: HomeAssistant, setup):
    """A device that only writes on change: the new level holds 6 h without a report against it, the minute tick
    confirms it. 26.11.7 needed a second report and never confirmed it."""
    _, record, battery, _ = door(setup)
    replaced = async_capture_events(hass, EVENT_BATTERY_REPLACED)
    await flat(hass, setup, [(battery, "21")])
    await hourly(hass, setup, battery, ("20",))
    await tick(hass, setup["freezer"], timedelta(days=2))  # coarse steps: 20 % for days
    step = await report(hass, setup, [(battery, "100")])
    await tick(hass, setup["freezer"], timedelta(hours=5))
    assert replaced == []
    await tick(hass, setup["freezer"], timedelta(hours=1, minutes=1))
    assert [e.data["source"] for e in replaced] == ["auto"]
    assert record["replaced"] == [step]


async def test_swap_while_home_assistant_was_down(hass: HomeAssistant, setup):
    """HA start: the first values are no confirmation, but a battery swapped while HA was down is detected once HA
    has run for a while. 26.11.7 took the start value as the new reference and missed the change."""
    monitor, record, battery, _ = door(setup)
    replaced = async_capture_events(hass, EVENT_BATTERY_REPLACED)
    await flat(hass, setup, [(battery, "21")])
    await hourly(hass, setup, battery, ("21", "20", "20"))
    await tick(hass, setup["freezer"], timedelta(hours=3))
    monitor.started_at = time.time()  # restart; the entity comes back as unknown, then with its value
    hass.states.async_set(battery, "unknown")
    await hass.async_block_till_done()
    step = await report(hass, setup, [(battery, "100")], wait=timedelta(seconds=20))
    await report(hass, setup, [(battery, "100")], wait=timedelta(minutes=1))  # still in the start grace
    await tick(hass, setup["freezer"], timedelta(minutes=2))
    assert replaced == []
    await report(hass, setup, [(battery, "100")], wait=timedelta(minutes=10))
    assert [e.data["source"] for e in replaced] == ["auto"]
    assert step < record["replaced"][0] <= time.time()


async def test_outlier_around_a_restart_is_no_battery_change(hass: HomeAssistant, setup):
    monitor, record, battery, _ = door(setup)
    replaced = async_capture_events(hass, EVENT_BATTERY_REPLACED)
    await flat(hass, setup, [(battery, "70")])
    await hourly(hass, setup, battery, ("70", "70"))
    await report(hass, setup, [(battery, "15")], wait=timedelta(minutes=10))
    monitor.started_at = time.time()  # restart
    await report(hass, setup, [(battery, "16")], wait=timedelta(seconds=30))
    for value in ("70", "71", "70"):
        await report(hass, setup, [(battery, value)], wait=timedelta(minutes=10))
    assert replaced == [] and record["replaced"] == []


async def test_charging_in_small_steps_is_no_battery_change(hass: HomeAssistant, setup):
    _, record, battery, _ = door(setup)
    await flat(hass, setup, [(battery, "20")])
    await hourly(hass, setup, battery, ("20", "20", "35", "50", "65", "80", "95", "100"))
    await tick(hass, setup["freezer"], timedelta(hours=7))
    assert record["replaced"] == []


async def test_bad_values_are_ignored(hass: HomeAssistant, setup):
    _, record, battery, voltage = door(setup)
    await flat(hass, setup, [(battery, "20"), (voltage, "1100")])
    await hourly(hass, setup, battery, ("20", "20", "abc", "255"))
    await hourly(hass, setup, voltage, ("1100", "1100", "0"))
    await tick(hass, setup["freezer"], timedelta(hours=7))
    assert record["replaced"] == []


def test_store_migration_starts_the_history():
    from custom_components.pulse.store import migrate

    record = {"last_level": 40, "last_voltage": 2900.0, "pending_jump": {"level": 1.0}, "pending_drop": {}}
    data = migrate(12, {"devices": {"a": record, "b": {"last_level": True}}})
    a = data["devices"]["a"]
    assert a["pending_jump"] is None and a["pending_drop"] is None
    assert [s[1] for s in a["battery_history"]["level"]["samples"]] == [40.0]
    assert [s[1] for s in a["battery_history"]["voltage"]["samples"]] == [2900.0]
    assert data["devices"]["b"]["battery_history"] == {}
    # Older minor versions end with the same keys
    old = migrate(10, {"devices": {"a": {"pending_jump": None}}})["devices"]["a"]
    assert old["pending_jump"] is None and old["battery_history"] == {}
