"""An outage that runs over an HA restart keeps its real start (from the recorder), for every device."""

from __future__ import annotations

from datetime import timedelta
import time
from unittest.mock import AsyncMock, patch

from homeassistant.core import HomeAssistant

from common import add_device, tick
from custom_components.pulse.monitor import PulseMonitor

HOUR = 3600.0
DAY = 86400.0
LOAD = "custom_components.pulse.monitor.async_load_outages"


def _leak(hass: HomeAssistant):
    return add_device(
        hass,
        "matter_leak",
        "Lecksensor Küche",
        [("binary_sensor", "leak", "moisture"), ("sensor", "battery", "battery")],
        manufacturer="IKEA",
        model="KLIPPBOK",
        platform="matter",
    )


async def test_battery_device_gone_before_the_restart_fails_right_away(hass: HomeAssistant, setup):
    monitor: PulseMonitor = setup["monitor"]
    leak = _leak(hass)
    for entity_id in leak.entities.values():
        hass.states.async_set(entity_id, "unavailable")
    monitor._rediscover()
    await hass.async_block_till_done()
    device = monitor.devices[leak.device_id]
    # No learned rhythm yet (new sensor): the silence rule can't catch it, only "unavailable" can
    assert not device.spec.mains and device.unavailable_since is not None  # HA only knows: since the start
    gone = time.time() - 3 * DAY
    result = {e: ([], gone) for e in leak.entities.values()}
    with patch(LOAD, AsyncMock(return_value=result)) as load:
        await monitor._async_learn_outages()
    assert leak.entities["leak"] in load.call_args.args[1]  # asked for, although no mains device
    assert device.unavailable_since == gone
    await tick(hass, setup["freezer"], timedelta(minutes=1))
    assert (device.status, device.reason["key"]) == ("failed", "unavailable")
    # Back: the old start is forgotten, the next outage counts from its own start
    hass.states.async_set(leak.entities["leak"], "off")
    await hass.async_block_till_done()
    assert device.unavailable_since is None and leak.device_id not in monitor._gone_before


async def test_zigbee_offline_after_the_history_read_keeps_the_real_start(hass: HomeAssistant, setup):
    monitor: PulseMonitor = setup["monitor"]
    thermo = setup["devices"]["thermo"]
    device = monitor.devices[thermo.device_id]
    # HA entities unavailable (Zigbee2MQTT availability), the bridge's "offline" not processed yet
    for entity_id in thermo.entities.values():
        hass.states.async_set(entity_id, "unavailable")
    await hass.async_block_till_done()
    device.unavailable_since = None
    gone = time.time() - 2 * DAY
    with patch(LOAD, AsyncMock(return_value={e: ([], gone) for e in thermo.entities.values()})):
        await monitor._async_learn_outages()
    monitor._z2m_availability(device.spec.ieee or "", False)
    assert device.unavailable_since == gone


async def test_gone_only_since_the_start_is_not_backdated(hass: HomeAssistant, setup):
    monitor: PulseMonitor = setup["monitor"]
    leak = _leak(hass)
    for entity_id in leak.entities.values():
        hass.states.async_set(entity_id, "unavailable")
    monitor._rediscover()
    await hass.async_block_till_done()
    device = monitor.devices[leak.device_id]
    since = device.unavailable_since
    # The recorder's outage began at this HA start: the integration was loading, nothing older is known
    start = monitor._starts()[-1]
    with patch(LOAD, AsyncMock(return_value={e: ([], start + 30) for e in leak.entities.values()})):
        await monitor._async_learn_outages()
    assert device.unavailable_since == since
    assert leak.device_id not in monitor._gone_before


async def test_stored_reports_from_an_outage_are_dropped(hass: HomeAssistant, setup):
    monitor: PulseMonitor = setup["monitor"]
    lamp = add_device(
        hass,
        "ceiling",
        "Deckenleuchte",
        [("light", "light", None), ("sensor", "mode", None)],
        manufacturer="Govee",
        platform="govee",
    )
    hass.states.async_set(lamp.entities["light"], "unavailable")
    hass.states.async_set(lamp.entities["mode"], "cloud_api")
    monitor._rediscover()
    await hass.async_block_till_done()
    device = monitor.devices[lamp.device_id]
    now = time.time()
    # Before 26.10.12 the rewritten "cloud_api" counted every 5 minutes, also during the outage
    real = [now - 6 * DAY + i * 300 for i in range(10)]
    old_outage = (now - 5 * DAY, now - 4 * DAY)
    fake = [old_outage[0] + 600, now - 2 * DAY, now - 600]
    device.record["events"] = sorted(real + fake)
    result = {lamp.entities["light"]: ([old_outage], now - 3 * DAY)}
    with patch(LOAD, AsyncMock(return_value=result)):
        await monitor._async_learn_outages()
    assert device.record["events"] == real
    assert device.record["outages"] == [list(old_outage)]


async def test_one_entity_often_unavailable_is_no_outage_of_the_device(hass: HomeAssistant, setup):
    """Prod 26.10.: a camera's siren is "unknown" normally and "unavailable" every evening; 26.10.12 took its
    never-ending "outage" for the device's and dropped ten days of reports."""
    monitor: PulseMonitor = setup["monitor"]
    camera = add_device(
        hass,
        "camera",
        "Flur",
        [("siren", "siren", None), ("light", "spotlight", None), ("binary_sensor", "motion", "motion")],
        manufacturer="Reolink",
        platform="reolink",
    )
    hass.states.async_set(camera.entities["siren"], "unknown")
    hass.states.async_set(camera.entities["spotlight"], "off")
    hass.states.async_set(camera.entities["motion"], "off")
    monitor._rediscover()
    await hass.async_block_till_done()
    device = monitor.devices[camera.device_id]
    now = time.time()
    device.record["events"] = events = [now - DAY * 9 + i * 3600 for i in range(200)]
    siren_gone = ([(now - 5 * DAY, now - 4 * DAY)], now - 8 * DAY)
    result = {camera.entities["siren"]: siren_gone, camera.entities["spotlight"]: ([], None)}
    with patch(LOAD, AsyncMock(return_value=result)):
        await monitor._async_learn_outages()
    assert device.record["events"] == events
    assert device.record.get("outages", []) == []
    assert camera.device_id not in monitor._gone_before
