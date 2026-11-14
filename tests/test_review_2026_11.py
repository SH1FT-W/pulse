"""November review 2026: admin-only services, stable status attributes, one cached snapshot per language."""

from datetime import timedelta
import time

from homeassistant.const import EVENT_STATE_CHANGED
from homeassistant.core import HomeAssistant

from common import seed, tick


async def test_read_only_user_cannot_ignore_via_service(
    hass: HomeAssistant, setup, hass_ws_client, hass_read_only_access_token
) -> None:
    """The panel lets only admins ignore a device; the `pulse.ignore` service must not be a way around it."""
    monitor = setup["monitor"]
    door = setup["devices"]["door"].device_id
    client = await hass_ws_client(hass, hass_read_only_access_token)
    await client.send_json_auto_id(
        {"type": "call_service", "domain": "pulse", "service": "ignore", "service_data": {"device_id": door}}
    )
    assert not (await client.receive_json())["success"]
    # Changing batteries stays open to housemates (Casora's popup, notification actions)
    await client.send_json_auto_id(
        {"type": "call_service", "domain": "pulse", "service": "mark_replaced", "service_data": {"device_id": door}}
    )
    assert (await client.receive_json())["success"]
    await hass.async_block_till_done()
    assert not monitor.devices[door].ignored


async def test_status_sensor_quiet_while_in_rhythm(hass: HomeAssistant, setup) -> None:
    """A device in rhythm must not rewrite its status row (a recorder row) after every report."""
    monitor = setup["monitor"]
    thermo = setup["devices"]["thermo"]
    seed(monitor, thermo.device_id, 300, 200, time.time() - 60)
    await tick(hass, setup["freezer"], timedelta(minutes=1))
    await tick(hass, setup["freezer"], timedelta(seconds=2))
    status_id = "sensor.aquarium_temperatur_pulse_status"
    assert hass.states.get(status_id).state == "ok"
    rows = []
    hass.bus.async_listen(EVENT_STATE_CHANGED, lambda e: rows.append(e) if e.data["entity_id"] == status_id else None)
    temp = thermo.entities["temperature"]
    for i in range(24):  # 2 hours, one report every 5 minutes, "ok" throughout
        hass.states.async_set(temp, f"{25 + (i % 2) / 10:.1f}")
        await hass.async_block_till_done()
        for _ in range(5):
            await tick(hass, setup["freezer"], timedelta(minutes=1))
    assert hass.states.get(status_id).state == "ok"
    assert len(rows) <= 2
    assert hass.states.get(status_id).attributes["silent_since"] is None


async def test_snapshot_cache_per_known_language(hass: HomeAssistant, setup, hass_ws_client) -> None:
    monitor = setup["monitor"]
    client = await hass_ws_client(hass)
    for language in [f"xx-{i}" for i in range(20)]:
        await client.send_json_auto_id({"type": "pulse/subscribe", "language": language})
        assert (await client.receive_json())["success"]
        await client.receive_json()  # first snapshot
    monitor.async_update()
    await tick(hass, setup["freezer"], timedelta(seconds=2))
    assert len(monitor._snapshots) <= 8


def test_rough_interval() -> None:
    from custom_components.pulse.sensor import _rough

    assert [_rough(x) for x in (45, 312, 1834, 86_399)] == [45, 310, 1800, 86_000]


def test_rhythm_cache_skips_relearning_chatty_devices() -> None:
    """A device reporting every 30 s must not be relearned on every minute tick (performance review)."""
    from unittest.mock import patch

    from custom_components.pulse import rhythm

    events = [1_000_000.0 + i * 30 for i in range(6000)]
    cache = rhythm.RhythmCache()
    learned = cache.get("a", events)
    assert learned.typical is not None
    with patch.object(rhythm, "learn", wraps=rhythm.learn) as learn:
        for _ in range(10):  # five minutes of new reports
            events.append(events[-1] + 30)
            assert cache.get("a", events) is learned
        assert learn.call_count == 0
        events.append(events[-1] + rhythm.RELEARN_AFTER)  # long gap: relearned at once
        cache.get("a", events)
        assert learn.call_count == 1
        sparse = [1_000_000.0 + i * 4 * 3600 for i in range(30)]
        cache.get("b", sparse)
        sparse.append(sparse[-1] + 4 * 3600)  # a device reporting every few hours: relearned on each report
        cache.get("b", sparse)
        assert learn.call_count == 3
        events.insert(0, events[0] - 30)  # history read brought older reports
        cache.get("a", events)
        assert learn.call_count == 4


async def test_no_data_same_with_merged_cache(hass: HomeAssistant, setup) -> None:
    """First week after setup: the merged reports are cached; the result must equal a fresh calculation."""
    monitor = setup["monitor"]
    thermo = setup["devices"]["thermo"]
    now = time.time()
    seed(monitor, thermo.device_id, 600, 600, now - 3600)
    monitor.store.uptime = [[now - 2 * 86400, now]]  # Pulse runs since two days
    for device in monitor.devices.values():
        device.rhythm = monitor.rhythms.get(device.device_id, device.record["events"])
    day_start = monitor.day_starts()[0]
    first = monitor.no_data(day_start, now)
    await tick(hass, setup["freezer"], timedelta(minutes=2))
    later = time.time()
    cached = monitor.no_data(day_start, later)
    monitor._no_data_cache = None
    monitor._no_data_events = None
    assert cached == monitor.no_data(day_start, later)
    assert first  # there was something to merge
    # Older reports arrive (dated battery change): merged again
    before = monitor._past_reports
    monitor.mark_replaced(thermo.device_id, "auto", at=now - 5 * 86400)
    assert monitor._past_reports == before + 1


async def test_status_sensor_quiet_with_low_battery(hass: HomeAssistant, setup) -> None:
    """ "Battery low" stands for weeks; reports meanwhile must not rewrite `silent_since` either (gegenprüfung)."""
    monitor = setup["monitor"]
    thermo = setup["devices"]["thermo"]
    seed(monitor, thermo.device_id, 300, 200, time.time() - 60)
    await tick(hass, setup["freezer"], timedelta(minutes=1))
    await tick(hass, setup["freezer"], timedelta(seconds=2))
    hass.states.async_set(thermo.entities["battery"], "4")
    await hass.async_block_till_done()
    await tick(hass, setup["freezer"], timedelta(minutes=1))
    await tick(hass, setup["freezer"], timedelta(seconds=2))
    status_id = "sensor.aquarium_temperatur_pulse_status"
    state = hass.states.get(status_id)
    assert state.state != "ok"
    assert state.attributes["reason_key"].startswith("battery")
    assert state.attributes["silent_since"] is None
