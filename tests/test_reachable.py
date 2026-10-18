"""Reachability from the integration, restart echoes from the recorder and the cloud report rebuild."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
import time
from typing import Any

from homeassistant.core import HomeAssistant, State

from common import add_device, seed, tick
from custom_components.pulse.history import real_reports
from custom_components.pulse.monitor import PulseMonitor
from custom_components.pulse.rhythm import (
    RESTART_AFTER,
    Facts,
    Rhythm,
    evaluate,
    restart_echoes,
)
from custom_components.pulse.store import migrate
from custom_components.pulse.texts import reason_text

HOUR = 3600.0
DAY = 86400.0
T0 = 1_790_000_000.0


# ── Pure logic ───────────────────────────────────────────────────────────


def test_restart_echoes_take_the_first_stamp_after_each_start():
    stamps = [T0, T0 + HOUR, T0 + 10 * HOUR + 30, T0 + 10 * HOUR + 90, T0 + 20 * HOUR]
    starts = [T0 + 10 * HOUR, T0 + 15 * HOUR]
    # Only the rewrite right after the first start; nothing near the second; the next real report stays
    assert restart_echoes(stamps, starts) == {T0 + 10 * HOUR + 30}
    # Nothing before the start: the first row ever is no echo
    assert restart_echoes([T0 + 10], [T0]) == set()
    # Too late after the start: a real report
    assert restart_echoes([T0, T0 + HOUR + RESTART_AFTER + 1], [T0 + HOUR]) == set()


def _state(value: str, ts: float) -> State:
    when = datetime.fromtimestamp(ts, UTC)
    return State("lock.door", value, last_changed=when, last_updated=when)


def test_real_reports_skip_the_rewrite_on_start():
    rows = [_state("locked", T0), _state("unlocked", T0 + HOUR), _state("unlocked", T0 + 5 * HOUR + 20)]
    reports, actions = real_reports(rows, [T0 + 5 * HOUR])
    assert reports == [T0 + HOUR]
    assert actions == [T0 + HOUR]
    # Without known starts everything with a real predecessor counts (as before)
    assert real_reports(rows) == ([T0 + HOUR, T0 + 5 * HOUR + 20], [T0 + HOUR])
    # Not a State object (minimal response): ignored
    assert real_reports([{"state": "locked"}]) == ([], [])


def _facts(**kwargs: Any) -> Facts:
    rhythm = Rhythm(3 * HOUR, 9 * HOUR, 200)
    return Facts(now=T0 + 30 * DAY, rhythm=rhythm, critical=True, **kwargs)


def test_reachable_device_is_only_unused_never_silent():
    now = T0 + 30 * DAY
    fine = evaluate(_facts(last_activity=now - 2 * HOUR, reachable="Matter"))
    assert (fine.status, fine.reason) == ("ok", {"key": "ok_reachable", "params": {"via": "Matter"}})
    # A quiet morning or a weekend away: still fine
    weekend = evaluate(_facts(last_activity=now - 3 * DAY, reachable="Matter"))
    assert weekend.reason["key"] == "ok_reachable"
    # A leak sensor without water for weeks: still fine, also with HA downtime in between
    quiet = evaluate(_facts(last_activity=now - 25 * DAY, downtime=2 * HOUR, reachable="Matter"))
    assert (quiet.status, quiet.reason["key"]) == ("ok", "ok_reachable")
    # Not reachable: the learned rhythm applies as before
    silent = evaluate(_facts(last_activity=now - 14 * HOUR))
    assert (silent.status, silent.reason["key"]) == ("check", "silent")
    # Without a learned rhythm the reachable device is fine as well
    learning = evaluate(
        Facts(now=now, last_activity=None, rhythm=Rhythm(None, None, 0), observed_since=now - 3 * DAY, reachable="X")
    )
    assert (learning.status, learning.reason["key"]) == ("ok", "ok_reachable")
    assert reason_text("en", fine.reason).startswith("Reachable according to Matter.")


def test_migration_drops_restart_echoes_and_marks_rebuild():
    start = T0 + 10 * HOUR
    data: dict[str, Any] = {
        "uptime": [[T0, start - 600], [start, start + HOUR], [1.0]],
        "devices": {
            "a": {"events": [T0 + HOUR, start + 20, start + 1800], "actions": [T0 + HOUR, start + 20]},
            "b": {"events": [], "actions": []},
        },
    }
    migrated = migrate(6, data)
    a = migrated["devices"]["a"]
    assert a["events"] == [T0 + HOUR, start + 1800]
    assert a["actions"] == [T0 + HOUR]
    assert a["rebuild_events"] is True
    assert migrated["devices"]["b"]["events"] == []


# ── In Home Assistant ────────────────────────────────────────────────────


async def test_matter_lock_unused_is_fine_until_unavailable(hass: HomeAssistant, setup):
    monitor: PulseMonitor = setup["monitor"]
    lock = add_device(
        hass,
        "matter_lock",
        "Wohnungstür",
        [("lock", "lock", None), ("sensor", "battery", "battery")],
        manufacturer="Nuki",
        model="Smart Lock Pro",
        platform="matter",
    )
    hass.states.async_set(lock.entities["lock"], "locked")
    hass.states.async_set(lock.entities["battery"], "73")
    monitor._rediscover()
    await hass.async_block_till_done()
    device = monitor.devices[lock.device_id]
    assert device.spec.reachable_via == "matter"
    assert device.critical
    seed(monitor, lock.device_id, 3 * HOUR, 60, time.time() - 14 * HOUR)
    await tick(hass, setup["freezer"], timedelta(minutes=1))
    assert (device.status, device.reason["key"]) == ("ok", "ok_reachable")
    seed(monitor, lock.device_id, 3 * HOUR, 60, time.time())
    # Matter loses the lock: all entities unavailable → the outage is still noticed
    for entity_id in lock.entities.values():
        hass.states.async_set(entity_id, "unavailable")
    await hass.async_block_till_done()
    await tick(hass, setup["freezer"], timedelta(hours=1, minutes=1))
    assert (device.status, device.reason["key"]) == ("failed", "unavailable")


async def test_cloud_connectivity_and_rebuild(hass: HomeAssistant, setup):
    monitor: PulseMonitor = setup["monitor"]
    rain = add_device(
        hass,
        "rain",
        "Regenmesser",
        [
            ("sensor", "rain", "precipitation"),
            ("sensor", "battery", "battery"),
            ("binary_sensor", "reachable", "connectivity"),
        ],
        manufacturer="Netatmo",
        model="Smart Rain Gauge",
        platform="netatmo",
    )
    hass.states.async_set(rain.entities["rain"], "0")
    hass.states.async_set(rain.entities["battery"], "80")
    hass.states.async_set(rain.entities["reachable"], "on")
    # Stored from before 1.1 (every poll counted): dropped once, the recorder refills value changes
    record = monitor.store.record(rain.device_id)
    record["events"] = [time.time() - 120 * i for i in range(500, 0, -1)]
    record["rebuild_events"] = True
    monitor._rediscover()
    await hass.async_block_till_done()
    device = monitor.devices[rain.device_id]
    assert device.cloud
    assert device.spec.reachable_via == rain.entities["reachable"]
    assert record["events"] == [] and "rebuild_events" not in record
    # Dry for hours after a learned rain rhythm: reachable, so nothing to report
    seed(monitor, rain.device_id, 600, 40, time.time() - 20 * HOUR)
    await tick(hass, setup["freezer"], timedelta(minutes=1))
    assert (device.status, device.reason["key"]) == ("ok", "ok_reachable")
    # The cloud says the gauge is gone
    hass.states.async_set(rain.entities["reachable"], "off")
    await hass.async_block_till_done()
    assert device.unavailable_since is not None
    await tick(hass, setup["freezer"], timedelta(hours=2, minutes=1))
    assert (device.status, device.reason["key"]) == ("failed", "unavailable")
    hass.states.async_set(rain.entities["reachable"], "on")
    await hass.async_block_till_done()
    assert device.unavailable_since is None
    # A device without the flag in the store is left alone
    other = monitor.store.record("not_cloud")
    other["rebuild_events"] = True
    assert monitor.devices.get("not_cloud") is None
