"""Issue #4: an important device that is unreachable. When "Prüfen" (check) comes is a setting (default 10 min),
and the status sensor says since when the problem is reported (`problem_since`), not only when the outage began."""

from __future__ import annotations

from datetime import timedelta

from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry as er
from homeassistant.util import dt as dt_util

from common import add_device, tick
from custom_components.pulse.rhythm import Facts, Rhythm, evaluate

MINUTE = 60.0
NOW = 1_790_000_000.0


def _facts(gone: float, critical: bool = True, after: float | None = None) -> Facts:
    extra = {} if after is None else {"critical_unreachable": after}
    return Facts(
        now=NOW,
        rhythm=Rhythm(300.0, 900.0, 200),
        last_activity=NOW - gone,
        mains=True,
        critical=critical,
        unavailable_since=NOW - gone,
        **extra,
    )


def test_check_after_is_configurable_for_important_devices():
    # Default stays 10 minutes
    assert evaluate(_facts(9 * MINUTE)).status == "ok"
    assert evaluate(_facts(10 * MINUTE)).status == "check"
    # Two minutes: "prüfen" right after
    verdict = evaluate(_facts(2 * MINUTE, after=2 * MINUTE))
    assert (verdict.status, verdict.reason["key"]) == ("check", "unavailable")
    assert evaluate(_facts(MINUTE, after=2 * MINUTE)).status == "ok"
    # Normal devices keep 20 minutes, "ausgefallen" (failed) stays at one hour
    assert evaluate(_facts(5 * MINUTE, critical=False, after=2 * MINUTE)).status == "ok"
    assert evaluate(_facts(59 * MINUTE, after=2 * MINUTE)).status == "check"
    assert evaluate(_facts(60 * MINUTE, after=2 * MINUTE)).status == "failed"


def _status_entity(hass: HomeAssistant, device_id: str) -> str:
    return next(e.entity_id for e in er.async_get(hass).entities.values() if e.unique_id == f"{device_id}_status")


async def test_important_plug_reported_after_setting_and_problem_since(hass: HomeAssistant, setup, hass_ws_client):
    monitor = setup["monitor"]
    freezer = setup["freezer"]
    pushes = setup["pushes"]
    plug = add_device(hass, "plug", "Steckdose Server", [("switch", "power", None)], manufacturer="Shelly")
    hass.states.async_set(plug.entities["power"], "on")
    monitor.async_rediscover()
    await hass.async_block_till_done()
    device = monitor.devices[plug.device_id]
    assert device.spec.mains
    device.record["critical"] = True

    client = await hass_ws_client(hass)
    await client.send_json_auto_id({"type": "pulse/settings", "settings": {"important_unreachable_minutes": 7}})
    assert not (await client.receive_json())["success"], "only the offered choices"
    await client.send_json_auto_id({"type": "pulse/settings", "settings": {"important_unreachable_minutes": 2}})
    response = await client.receive_json()
    while response.get("type") == "event":
        response = await client.receive_json()
    assert response["result"]["settings"]["important_unreachable_minutes"] == 2

    await tick(hass, freezer, timedelta(minutes=1))
    before = len(pushes)
    gone_at = dt_util.utcnow()
    hass.states.async_set(plug.entities["power"], "unavailable")
    await tick(hass, freezer, timedelta(minutes=1))
    assert device.status == "ok"
    await tick(hass, freezer, timedelta(minutes=1))
    assert (device.status, device.reason["key"]) == ("check", "unavailable")
    reported_at = dt_util.utcnow()
    assert any("Steckdose Server" in p.data.get("message", "") + p.data.get("title", "") for p in pushes[before:])

    entity_id = _status_entity(hass, plug.device_id)
    await tick(hass, freezer, timedelta(seconds=5))  # entities are written debounced
    attrs = hass.states.get(entity_id).attributes
    assert abs(dt_util.parse_datetime(attrs["silent_since"]).timestamp() - gone_at.timestamp()) < 2
    # The notice itself is new now, not two minutes ago (Casora's bell sorts and counts by it)
    assert abs(dt_util.parse_datetime(attrs["problem_since"]).timestamp() - reported_at.timestamp()) < 1

    # Stays put while the problem lasts, also on the first evaluation after a restart (no baseline yet)
    await tick(hass, freezer, timedelta(minutes=5))
    assert hass.states.get(entity_id).attributes["problem_since"] == attrs["problem_since"]
    device.baseline = False
    monitor._evaluate(device, dt_util.utcnow().timestamp())
    assert device.record["problem_since"] == dt_util.parse_datetime(attrs["problem_since"]).timestamp()

    # Escalation (one hour: "ausgefallen") is a new notice
    await tick(hass, freezer, timedelta(hours=1))
    assert device.status == "failed"
    assert device.record["problem_since"] > dt_util.parse_datetime(attrs["problem_since"]).timestamp()

    # Back: no problem, no time
    hass.states.async_set(plug.entities["power"], "on")
    await tick(hass, freezer, timedelta(minutes=1))
    assert not device.problem
    await tick(hass, freezer, timedelta(seconds=5))
    assert hass.states.get(entity_id).attributes["problem_since"] is None
    assert device.record["problem_since"] is None


async def test_problem_not_seen_beginning_keeps_its_start(hass: HomeAssistant, setup):
    """After an update (no `problem_since` stored yet) a known problem keeps the start of the outage."""
    monitor = setup["monitor"]
    freezer = setup["freezer"]
    plug = add_device(hass, "plug", "Steckdose Keller", [("switch", "power", None)], manufacturer="Shelly")
    hass.states.async_set(plug.entities["power"], "on")
    monitor.async_rediscover()
    await hass.async_block_till_done()
    device = monitor.devices[plug.device_id]
    device.record["critical"] = True
    hass.states.async_set(plug.entities["power"], "unavailable")
    await tick(hass, freezer, timedelta(minutes=15))
    assert device.problem
    device.record["problem_since"] = device.record["problem_of"] = None
    device.baseline = False
    monitor._evaluate(device, dt_util.utcnow().timestamp())
    assert device.record["problem_since"] == device.unavailable_since
