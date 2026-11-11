"""#5: after an HA start, Bluetooth replays the last stored advertisement of every device.

Passive Bluetooth integrations (BTHome, Xiaomi BLE …) register their callback with Home Assistant's Bluetooth
manager on start, which hands them the last advertisement it remembers (`_async_replay_history_for_callback` in
`homeassistant/components/bluetooth/manager.py`). The entity writes the same value again (`state_reported`) although
the device sent nothing. A thermometer with an empty battery then looks alive after every restart.
"""

from datetime import timedelta
import time

from homeassistant import config_entries
from homeassistant.core import HomeAssistant
from homeassistant.data_entry_flow import FlowResultType

from common import add_device, seed, tick
from custom_components.pulse.const import DOMAIN
from custom_components.pulse.monitor import PulseMonitor

START = "2026-11-09 03:00:00+00:00"


async def _ble_thermometer(hass: HomeAssistant, freezer):
    await hass.config.async_set_time_zone("Europe/Berlin")
    freezer.move_to(START)
    device = add_device(
        hass,
        "flur",
        "Flur Thermometer",
        [
            ("sensor", "temperature", "temperature"),
            ("sensor", "humidity", "humidity"),
            ("sensor", "battery", "battery"),
        ],
        manufacturer="Shelly",
        model="Shelly BLU H&T",
        platform="bthome",
    )
    hass.states.async_set(device.entities["temperature"], "20.7")
    hass.states.async_set(device.entities["humidity"], "51")
    hass.states.async_set(device.entities["battery"], "8")
    result = await hass.config_entries.flow.async_init(DOMAIN, context={"source": config_entries.SOURCE_USER})
    result = await hass.config_entries.flow.async_configure(result["flow_id"], {})
    assert result["type"] is FlowResultType.CREATE_ENTRY
    await hass.async_block_till_done()
    entry = hass.config_entries.async_entries(DOMAIN)[0]
    return device, entry


async def _restart(hass: HomeAssistant, entry) -> PulseMonitor:
    assert await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()
    return entry.runtime_data


async def test_bluetooth_replay_after_start_is_no_sign_of_life(hass: HomeAssistant, freezer):
    device, entry = await _ble_thermometer(hass, freezer)
    monitor: PulseMonitor = entry.runtime_data
    # Reported every 10 minutes for two days, then the battery ran empty
    seed(monitor, device.device_id, 600, 288, time.time())
    await tick(hass, freezer, timedelta(hours=30))
    before = list(monitor.devices[device.device_id].record["events"])

    monitor = await _restart(hass, entry)
    await tick(hass, freezer, timedelta(seconds=10))
    # Bluetooth replays the stored advertisement: same values written again
    for key, value in (("temperature", "20.7"), ("humidity", "51"), ("battery", "8")):
        hass.states.async_set(device.entities[key], value)
    await hass.async_block_till_done()

    assert monitor.devices[device.device_id].record["events"] == before


async def test_same_value_reported_later_still_counts(hass: HomeAssistant, freezer):
    """A real advertisement with unchanged values, well after the start, stays a sign of life."""
    device, entry = await _ble_thermometer(hass, freezer)
    monitor: PulseMonitor = entry.runtime_data
    seed(monitor, device.device_id, 600, 288, time.time())
    await tick(hass, freezer, timedelta(hours=2))
    monitor = await _restart(hass, entry)
    await tick(hass, freezer, timedelta(minutes=20))
    before = len(monitor.devices[device.device_id].record["events"])
    hass.states.async_set(device.entities["temperature"], "20.7")
    await hass.async_block_till_done()
    assert len(monitor.devices[device.device_id].record["events"]) == before + 1
