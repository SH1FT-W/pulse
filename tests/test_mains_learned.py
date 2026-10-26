"""Beta mains-powered devices: found by what they are, and learned availability (often gone by itself)."""

from __future__ import annotations

from datetime import datetime, timedelta
import time
from unittest.mock import AsyncMock, patch

from homeassistant.const import EntityCategory
from homeassistant.core import HomeAssistant, State
from homeassistant.helpers import device_registry as dr, entity_registry as er

from common import add_device, tick
from custom_components.pulse.history import outage_spans, running_outage
from custom_components.pulse.rhythm import Facts, Rhythm, device_outages, evaluate, merge_outages, usual_outage
from custom_components.pulse.store import migrate

MINUTE = 60.0
HOUR = 3600.0
DAY = 86400.0
HALF_DAY = DAY / 2
T0 = 1_790_000_000.0


# ── Pure logic ───────────────────────────────────────────────────────────


def test_usual_outage_needs_three_real_outages():
    now = T0 + 10 * DAY
    two = [[T0 + i * DAY, T0 + i * DAY + 3 * HOUR] for i in range(2)]
    assert usual_outage(two, now) is None
    three = [*two, [T0 + 5 * DAY, T0 + 5 * DAY + 8 * HOUR]]
    assert usual_outage(three, now) == 8 * HOUR
    # Too short (a restart blip) or during an HA pause: says nothing about the device
    blips = [[T0 + i * DAY, T0 + i * DAY + 5 * MINUTE] for i in range(5)]
    assert usual_outage(blips, now) is None
    paused = [(T0 + 5 * DAY - HOUR, T0 + 5 * DAY + HOUR)]
    assert usual_outage(three, now, paused) is None
    # Older than the window
    assert usual_outage(three, now + 20 * DAY) is None


def test_outage_at_ha_start_does_not_count():
    now = T0 + 10 * DAY
    outages = [[T0 + i * DAY, T0 + i * DAY + 3 * HOUR] for i in range(3)]
    assert usual_outage(outages, now) == 3 * HOUR
    # The second one began right at an HA start (integration loading): only two left
    assert usual_outage(outages, now, starts=[T0 + DAY - MINUTE]) is None


def test_unreachable_is_the_reason_not_the_silence():
    now = T0
    # A lamp gone for three days: silent for as long (no fake reports), and unreachable
    facts = Facts(
        now=now,
        rhythm=Rhythm(300.0, 900.0, 200),
        last_activity=now - 3 * DAY,
        mains=True,
        unavailable_since=now - 3 * DAY,
    )
    verdict = evaluate(facts)
    assert (verdict.status, verdict.reason["key"]) == ("failed", "unavailable")
    # A worse silence still wins over a milder unreachable (just gone for 30 minutes)
    late = evaluate(Facts(**{**facts.__dict__, "unavailable_since": now - 30 * MINUTE}))
    assert (late.status, late.reason["key"]) == ("failed", "silent")


def test_device_is_gone_only_while_all_its_entities_are():
    now = T0 + DAY
    light = ([(T0, T0 + 3 * HOUR)], now - HOUR)
    siren = ([(T0 + HOUR, T0 + 5 * HOUR)], None)  # often unavailable on its own, there right now
    assert device_outages([light, siren], now) == ([(T0 + HOUR, T0 + 3 * HOUR)], None)
    assert device_outages([light], now) == ([(T0, T0 + 3 * HOUR)], now - HOUR)
    both = ([], now - 2 * HOUR)
    assert device_outages([light, both], now) == ([], now - HOUR)
    assert device_outages([], now) == ([], None)


def test_merge_outages_keeps_one_per_start():
    live = [[T0, T0 + HOUR]]
    merged = merge_outages(live, [(T0 + 20, T0 + 2 * HOUR), (T0 + DAY, T0 + DAY + HOUR)], T0 - DAY)
    assert merged == [[T0, T0 + 2 * HOUR], [T0 + DAY, T0 + DAY + HOUR]]
    assert merge_outages(merged, [], T0 + HALF_DAY) == [[T0 + DAY, T0 + DAY + HOUR]]


def test_habitually_gone_is_at_most_watch():
    now = T0
    facts = Facts(
        now=now,
        rhythm=Rhythm(None, None, 3),
        last_activity=now - 4 * HOUR,
        mains=True,
        unavailable_since=now - 4 * HOUR,
        usual_outage=10 * HOUR,
    )
    verdict = evaluate(facts)
    assert (verdict.status, verdict.reason["key"]) == ("watch", "unavailable_usual")
    # Longer than ever (twice its longest, at least a day): check, never failed
    long = evaluate(Facts(**{**facts.__dict__, "unavailable_since": now - 21 * HOUR}))
    assert long.status == "watch"
    gone = evaluate(Facts(**{**facts.__dict__, "unavailable_since": now - 2 * DAY}))
    assert (gone.status, gone.reason["key"]) == ("check", "unavailable")
    # Without the habit: failed after two hours, as before
    plain = evaluate(Facts(**{**facts.__dict__, "usual_outage": None}))
    assert (plain.status, plain.reason["key"]) == ("failed", "unavailable")


def _state(value: str, ts: float) -> State:
    when = datetime.fromtimestamp(ts).astimezone()
    return State("light.x", value, last_updated=when, last_changed=when)


def test_outage_spans_only_finished_ones():
    rows = [
        _state("on", T0),
        _state("unavailable", T0 + HOUR),
        _state("unknown", T0 + 2 * HOUR),
        _state("off", T0 + 3 * HOUR),
        _state("unavailable", T0 + 5 * HOUR),
    ]
    # "unknown" means the entity is there (a siren's normal state): it ends the outage
    assert outage_spans(rows) == [(T0 + HOUR, T0 + 2 * HOUR)]
    siren = [_state("unknown", T0), _state("unavailable", T0 + HOUR), _state("unknown", T0 + 9 * HOUR)]
    assert outage_spans(siren) == [(T0 + HOUR, T0 + 9 * HOUR)]
    assert running_outage(siren) is None
    sensor = [_state("on", T0), _state("off", T0 + HOUR), _state("on", T0 + 4 * HOUR)]
    assert outage_spans(sensor, "off") == [(T0 + HOUR, T0 + 4 * HOUR)]
    assert outage_spans(sensor) == []
    # Restart during an outage: HA rewrites "unavailable" at the start, the outage counts once from its real start
    restart = T0 + 2 * HOUR
    through = [
        _state("on", T0),
        _state("unavailable", T0 + HOUR),
        _state("unavailable", restart),
        _state("on", T0 + 4 * HOUR),
    ]
    assert outage_spans(through, starts=[restart]) == [(T0 + HOUR, T0 + 4 * HOUR)]
    # Integration slow after a restart (25 min): no outage of the device; blips are dropped too
    slow = [_state("on", T0), _state("unavailable", restart + 10), _state("on", restart + 25 * MINUTE)]
    assert outage_spans(slow, starts=[restart]) == []
    blip = [_state("on", T0), _state("unavailable", T0 + HOUR), _state("on", T0 + HOUR + 30)]
    assert outage_spans(blip, shortest=20 * MINUTE) == []


def test_running_outage_keeps_its_real_start():
    restart = T0 + 2 * HOUR
    rows = [_state("on", T0), _state("unavailable", T0 + HOUR), _state("unavailable", restart)]
    assert running_outage(rows) == T0 + HOUR
    assert running_outage([*rows, _state("off", T0 + 3 * HOUR)]) is None
    assert running_outage([_state("on", T0), _state("off", T0 + HOUR)], "off") == T0 + HOUR


# ── Discovery ────────────────────────────────────────────────────────────


async def test_mains_found_by_domain_not_integration(hass: HomeAssistant, setup):
    monitor = setup["monitor"]
    monitor.store.settings["mains_beta"] = True
    aquarium = add_device(
        hass,
        "aquarium_lamp",
        "Aquariumlampe",
        [("light", "light", None), ("sensor", "power", "power")],
        manufacturer="Chihiros",
        model="C II RGB",
        platform="chihiros",
    )
    sensor_only = add_device(hass, "meter", "Zähler", [("sensor", "power", "power")], platform="acme")
    helper = add_device(hass, "helper", "Vorlage", [("light", "light", None)], platform="template")
    service = add_device(hass, "service", "Dienst", [("switch", "switch", None)], platform="acme")
    dr.async_get(hass).async_update_device(service.device_id, entry_type=dr.DeviceEntryType.SERVICE)
    proxy = add_device(hass, "proxy", "ESP32 Küche", [("sensor", "rssi", "signal_strength")], platform="esphome")
    monitor.async_rediscover()
    assert monitor.devices[aquarium.device_id].spec.mains
    # Local hardware integration: also without a lamp or plug (Bluetooth proxy)
    assert monitor.devices[proxy.device_id].spec.mains
    for other in (sensor_only, helper, service):
        assert other.device_id not in monitor.devices


async def test_helper_entities_do_not_take_over_the_device(hass: HomeAssistant, setup):
    monitor = setup["monitor"]
    monitor.store.settings["mains_beta"] = True
    lamp = add_device(
        hass,
        "edison",
        "Edison-Lampe",
        [("light", "light", None)],
        manufacturer="Govee",
        model="H14C0",
        platform="govee",
    )
    # Three powercalc sensors on the same device outnumber the one Govee light
    reg = er.async_get(hass)
    for i in range(3):
        reg.async_get_or_create(
            "sensor", "powercalc", f"edison_seg{i}", device_id=lamp.device_id, original_device_class="power"
        )
    monitor.async_rediscover()
    assert monitor.devices[lamp.device_id].spec.integration == "govee"


# ── Learned availability ─────────────────────────────────────────────────


async def test_standby_device_learns_to_be_gone(hass: HomeAssistant, setup):
    monitor = setup["monitor"]
    monitor.store.settings["mains_beta"] = True
    console = add_device(
        hass, "console", "Spielkonsole", [("switch", "power", None)], manufacturer="Sony", platform="ps5"
    )
    hass.states.async_set(console.entities["power"], "off")
    monitor.async_rediscover()
    await hass.async_block_till_done()
    device = monitor.devices[console.device_id]
    freezer = setup["freezer"]
    pushes = setup["pushes"]
    before = len(pushes)
    # Gone right at the HA start: the integration was loading, says nothing about the device
    hass.states.async_set(console.entities["power"], "unavailable")
    await tick(hass, freezer, timedelta(minutes=30))
    hass.states.async_set(console.entities["power"], "off")
    await tick(hass, freezer, timedelta(minutes=10))
    assert device.record["outages"] == []
    # Off at night three times, back by itself in the morning
    for _ in range(3):
        hass.states.async_set(console.entities["power"], "unavailable")
        await tick(hass, freezer, timedelta(minutes=30))
        hass.states.async_set(console.entities["power"], "off")
        await tick(hass, freezer, timedelta(minutes=1))
    assert len(device.record["outages"]) == 3
    # The fourth night: it is its habit, no notification
    hass.states.async_set(console.entities["power"], "unavailable")
    await tick(hass, freezer, timedelta(hours=3))
    assert (device.status, device.reason["key"]) == ("watch", "unavailable_usual")
    assert all("Spielkonsole" not in p.data.get("title", "") for p in pushes[before:])


def test_store_minor_8_adds_outages():
    data = migrate(7, {"devices": {"a": {"events": []}}, "settings": {"mains_beta": False}})
    assert data["devices"]["a"]["outages"] == []
    assert data["settings"]["mains_beta"] is True  # on by default from 26.10.9
    assert migrate(8, {"settings": {"mains_beta": False}})["settings"]["mains_beta"] is False


async def test_config_switch_does_not_keep_the_lamp_reachable(hass: HomeAssistant, setup):
    monitor = setup["monitor"]
    lamp = add_device(
        hass,
        "lamp",
        "Stehlampe",
        [("light", "light", None), ("switch", "child_lock", None)],
        manufacturer="Govee",
        platform="govee",
    )
    er.async_get(hass).async_update_entity(lamp.entities["child_lock"], entity_category=EntityCategory.CONFIG)
    hass.states.async_set(lamp.entities["light"], "on")
    hass.states.async_set(lamp.entities["child_lock"], "off")
    monitor.async_rediscover()
    await hass.async_block_till_done()
    device = monitor.devices[lamp.device_id]
    assert device.spec.main_entities == [lamp.entities["light"]]
    hass.states.async_set(lamp.entities["light"], "unavailable")
    await hass.async_block_till_done()
    assert device.unavailable_since is not None


async def test_gone_since_before_the_restart_fails_right_away(hass: HomeAssistant, setup):
    monitor = setup["monitor"]
    lamp = add_device(
        hass, "ceiling", "Deckenleuchte", [("light", "light", None)], manufacturer="Govee", platform="govee"
    )
    hass.states.async_set(lamp.entities["light"], "unavailable")
    monitor.async_rediscover()
    await hass.async_block_till_done()
    device = monitor.devices[lamp.device_id]
    assert device.unavailable_since is not None  # HA only knows: since the start
    gone = time.time() - 3 * DAY
    result = {lamp.entities["light"]: ([], gone)}
    with patch("custom_components.pulse.monitor.async_load_outages", AsyncMock(return_value=result)):
        await monitor._async_learn_outages()
    assert device.unavailable_since == gone
    await tick(hass, setup["freezer"], timedelta(minutes=1))
    assert (device.status, device.reason["key"]) == ("failed", "unavailable")


async def test_icon_from_what_the_device_is(hass: HomeAssistant, setup):
    """Prod 26.10.: an ESPHome camera got a thermometer from its diagnostic chip temperature sensor."""
    monitor = setup["monitor"]
    cam = add_device(
        hass,
        "birdhouse",
        "Vogelhaus Kamera",
        [("camera", "camera", None), ("sensor", "chip", "temperature"), ("switch", "standby", None)],
        manufacturer="Espressif",
        platform="esphome",
    )
    er.async_get(hass).async_update_entity(cam.entities["chip"], entity_category=EntityCategory.DIAGNOSTIC)
    monitor.async_rediscover()
    assert monitor.devices[cam.device_id].spec.icon == "mdi:cctv"
    # Smoke detector over MQTT: the smoke sensor is filed under diagnostics, nothing regular says what it is
    smoke = add_device(
        hass,
        "smoke",
        "Rauchmelder",
        [("binary_sensor", "smoke", "smoke"), ("sensor", "battery", "battery"), ("sensor", "due", "date")],
        manufacturer="Techem",
        platform="mqtt",
        ieee="0x00ff",
    )
    reg = er.async_get(hass)
    for key in ("smoke", "battery"):
        reg.async_update_entity(smoke.entities[key], entity_category=EntityCategory.DIAGNOSTIC)
    monitor.async_rediscover()
    assert monitor.devices[smoke.device_id].spec.icon == "mdi:smoke-detector-variant"
