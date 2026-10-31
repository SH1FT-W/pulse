"""Devices added by hand (issue #2): cameras, media players, robot vacuums, any network device."""

from __future__ import annotations

from datetime import timedelta
import time
from unittest.mock import AsyncMock, patch

from homeassistant.const import EntityCategory
from homeassistant.core import HomeAssistant
from homeassistant.helpers import device_registry as dr, entity_registry as er
from pytest_homeassistant_custom_component.common import MockConfigEntry

from common import TestDevice as Device, add_device, tick
from custom_components.pulse.const import DEFAULT_SETTINGS, DOMAIN
from custom_components.pulse.discovery import discover
from custom_components.pulse.rhythm import Facts, Rhythm, evaluate
from custom_components.pulse.store import PulseStore, merge_settings

DAY = 86400.0
T0 = 1_790_000_000.0


def _own_entry(hass: HomeAssistant, domain: str, slug: str, name: str, entities, **kwargs) -> Device:
    """A device in a config entry of its own (media players would otherwise mark the shared test entry)."""
    entry = MockConfigEntry(domain=domain, title=domain)
    entry.add_to_hass(hass)
    device = dr.async_get(hass).async_get_or_create(
        config_entry_id=entry.entry_id, identifiers={(domain, slug)}, name=name, **kwargs
    )
    reg = er.async_get(hass)
    result = Device(device.id)
    for e_domain, key, device_class, category in entities:
        entity = reg.async_get_or_create(
            e_domain,
            domain,
            f"{slug}_{key}",
            device_id=device.id,
            config_entry=entry,
            suggested_object_id=f"{slug}_{key}",
            original_device_class=device_class,
            entity_category=category,
        )
        result.entities[key] = entity.entity_id
    return result


def _camera(hass: HomeAssistant) -> Device:
    return add_device(
        hass,
        "cam",
        "Kamera Einfahrt",
        [("camera", "camera", None), ("sensor", "chip", "temperature")],
        manufacturer="Ubiquiti",
        model="G4 Bullet",
        platform="unifiprotect",
    )


def _echo(hass: HomeAssistant) -> Device:
    return _own_entry(
        hass,
        "alexa_media",
        "echo",
        "Echo Küche",
        [("media_player", "player", None, None), ("switch", "dnd", None, None)],
        manufacturer="Amazon",
        model="Echo Dot",
    )


async def _send(client, payload):
    await client.send_json_auto_id(payload)
    return await client.receive_json()


# ── Pure logic ───────────────────────────────────────────────────────────


def test_manual_device_reason_is_its_own():
    now = T0 + 30 * DAY
    quiet = evaluate(Facts(now=now, rhythm=Rhythm(None, None, 0), last_activity=now - 9 * DAY, mains=True, manual=True))
    assert (quiet.status, quiet.reason["key"]) == ("ok", "ok_manual")
    gone = evaluate(
        Facts(
            now=now,
            rhythm=Rhythm(None, None, 0),
            last_activity=None,
            mains=True,
            manual=True,
            unavailable_since=now - 3 * 3600,
        )
    )
    assert (gone.status, gone.reason["key"]) == ("failed", "unavailable")


# ── With Home Assistant ──────────────────────────────────────────────────


async def test_add_camera_and_echo_by_hand(hass: HomeAssistant, setup, hass_ws_client):
    monitor = setup["monitor"]
    cam, echo = _camera(hass), _echo(hass)
    hass.states.async_set(cam.entities["camera"], "idle")
    hass.states.async_set(cam.entities["chip"], "41")
    hass.states.async_set(echo.entities["player"], "idle")
    hass.states.async_set(echo.entities["dnd"], "off")
    monitor.async_rediscover()
    await hass.async_block_till_done()
    # Pulse does not pick them up by itself (no battery, no lamp/plug of its own; media players are left out)
    assert cam.device_id not in monitor.devices and echo.device_id not in monitor.devices
    client = await hass_ws_client(hass)
    reply = await _send(client, {"type": "pulse/manual_candidates"})
    assert reply["success"]
    offered = {d["id"]: d for d in reply["result"]["devices"]}
    assert cam.device_id in offered and echo.device_id in offered
    # Already watched devices are no candidates
    assert setup["devices"]["thermo"].device_id not in offered
    assert offered[cam.device_id]["icon"] == "mdi:cctv"
    assert offered[echo.device_id]["icon"] == "mdi:speaker"
    assert offered[echo.device_id]["integration"] == "alexa_media"

    for device in (cam, echo):
        reply = await _send(client, {"type": "pulse/manual_device", "device_id": device.device_id, "add": True})
        assert reply["success"] and reply["result"] == {"watched": True}
    await hass.async_block_till_done()
    assert monitor.store.settings["manual_devices"] == [cam.device_id, echo.device_id]
    camera = monitor.devices[cam.device_id]
    assert camera.spec.manual and camera.spec.mains and camera.spec.battery is None
    assert camera.spec.main_entities == [cam.entities["camera"]]
    player = monitor.devices[echo.device_id]
    assert player.spec.main_entities == [echo.entities["player"]]
    snap = {d["id"]: d for d in monitor.snapshot()["devices"]}
    assert snap[echo.device_id]["manual"] and snap[echo.device_id]["reason_key"] == "ok_manual"
    own = [e for e in er.async_get(hass).entities.values() if e.platform == DOMAIN and e.device_id == echo.device_id]
    assert own
    reply = await _send(client, {"type": "pulse/manual_candidates"})
    assert echo.device_id not in {d["id"] for d in reply["result"]["devices"]}
    await client.close()

    # Playing, paused, off: all there. Only unavailable is gone
    for state in ("playing", "off", "idle"):
        hass.states.async_set(echo.entities["player"], state)
        await tick(hass, setup["freezer"], timedelta(hours=3))
        assert player.status == "ok", state
    # The Echo is gone, the do-not-disturb switch of the Alexa cloud stays: the media player decides
    hass.states.async_set(echo.entities["player"], "unavailable")
    await tick(hass, setup["freezer"], timedelta(hours=2, minutes=1))
    assert player.status == "failed" and player.reason["key"] == "unavailable"
    # The camera's chip sensor alone does not decide
    hass.states.async_set(cam.entities["chip"], "unavailable")
    await tick(hass, setup["freezer"], timedelta(hours=3))
    assert camera.status == "ok"

    # Remove again: no longer watched, its Pulse entities go, it is offered again
    monitor.set_manual(echo.device_id, False)
    await hass.async_block_till_done()
    assert echo.device_id not in monitor.devices
    assert monitor.store.settings["manual_devices"] == [cam.device_id]
    assert not [
        e for e in er.async_get(hass).entities.values() if e.platform == DOMAIN and e.device_id == echo.device_id
    ]
    assert echo.device_id in {spec.device_id for spec in monitor.candidates()}


async def test_manual_device_independent_of_mains_beta(hass: HomeAssistant, setup, hass_ws_client):
    monitor = setup["monitor"]
    plug = add_device(hass, "plug", "Steckdose", [("switch", "switch", None)], platform="zha")
    hass.states.async_set(plug.entities["switch"], "off")
    client = await hass_ws_client(hass)
    assert (await _send(client, {"type": "pulse/settings", "settings": {"mains_beta": False}}))["success"]
    await hass.async_block_till_done()
    assert plug.device_id not in monitor.devices
    reply = await _send(client, {"type": "pulse/manual_candidates"})
    assert plug.device_id in {d["id"] for d in reply["result"]["devices"]}
    assert (await _send(client, {"type": "pulse/manual_device", "device_id": plug.device_id, "add": True}))["success"]
    await hass.async_block_till_done()
    assert monitor.devices[plug.device_id].spec.manual
    # Watching mains devices on again: Pulse finds it by itself, the hand-made entry stays for later
    assert (await _send(client, {"type": "pulse/settings", "settings": {"mains_beta": True}}))["success"]
    await hass.async_block_till_done()
    spec = monitor.devices[plug.device_id].spec
    assert spec.mains and not spec.manual
    assert monitor.store.settings["manual_devices"] == [plug.device_id]
    # The settings command cannot overwrite the list (only pulse/manual_device does)
    reply = await _send(client, {"type": "pulse/settings", "settings": {"manual_devices": []}})
    assert not reply["success"]
    # Unknown device
    reply = await _send(client, {"type": "pulse/manual_device", "device_id": "nope", "add": True})
    assert not reply["success"] and reply["error"]["code"] == "unknown_device"


async def test_vacuum_battery_is_ignored(hass: HomeAssistant, setup):
    monitor = setup["monitor"]
    vac = add_device(
        hass,
        "vac",
        "Saugroboter",
        [
            ("vacuum", "vacuum", None),
            ("sensor", "battery", "battery"),
            ("binary_sensor", "mop_attached", "connectivity"),
        ],
        manufacturer="Roborock",
        model="S8",
        platform="roborock",
    )
    hass.states.async_set(vac.entities["vacuum"], "docked")
    hass.states.async_set(vac.entities["battery"], "40")
    assert vac.device_id not in discover(hass, mains=True)
    spec = discover(hass, mains=True, manual={vac.device_id})[vac.device_id]
    assert spec.manual and spec.battery is None and spec.icon == "mdi:robot-vacuum"
    # Roborock files "mop attached" as connectivity: no reachability, the vacuum itself decides
    assert spec.connectivity is None and spec.main_entities == [vac.entities["vacuum"]]
    monitor.set_manual(vac.device_id, True)
    await hass.async_block_till_done()
    device = monitor.devices[vac.device_id]
    hass.states.async_set(vac.entities["battery"], "100")  # charging is no battery change
    await tick(hass, setup["freezer"], timedelta(minutes=10))
    assert device.record["replaced"] == []
    assert monitor.battery_level(device) is None


async def test_network_device_through_router_tracker(hass: HomeAssistant, setup):
    monitor = setup["monitor"]
    printer = _own_entry(
        hass,
        "unifi",
        "printer",
        "Drucker",
        [("device_tracker", "tracker", None, None), ("sensor", "uptime", "timestamp", EntityCategory.DIAGNOSTIC)],
    )
    hass.states.async_set(printer.entities["tracker"], "home", {"source_type": "router"})
    hass.states.async_set(printer.entities["uptime"], "2026-10-01T00:00:00+00:00")
    monitor.set_manual(printer.device_id, True)
    await hass.async_block_till_done()
    device = monitor.devices[printer.device_id]
    assert device.spec.connectivity == printer.entities["tracker"]
    assert device.spec.offline_state == "not_home"
    assert device.spec.icon == "mdi:lan-connect"
    await tick(hass, setup["freezer"], timedelta(minutes=1))
    assert device.status == "ok" and device.reason["key"] == "ok_reachable"
    hass.states.async_set(printer.entities["tracker"], "not_home", {"source_type": "router"})
    await tick(hass, setup["freezer"], timedelta(hours=2, minutes=1))
    assert device.status == "failed" and device.reason["key"] == "unavailable"
    hass.states.async_set(printer.entities["tracker"], "home", {"source_type": "router"})
    await tick(hass, setup["freezer"], timedelta(minutes=1))
    assert device.status == "ok"
    # A GPS tracker's "not_home" only means away
    hass.states.async_set(printer.entities["tracker"], "not_home", {"source_type": "gps"})
    await tick(hass, setup["freezer"], timedelta(hours=3))
    assert device.status == "ok"


async def test_gps_tracker_is_no_reachability(hass: HomeAssistant, setup):
    bike = _own_entry(
        hass,
        "ebike",
        "bike",
        "E-Bike",
        [("device_tracker", "location", None, None), ("sensor", "charge", None, None)],
    )
    hass.states.async_set(bike.entities["location"], "not_home", {"source_type": "gps"})
    spec = discover(hass, manual={bike.device_id})[bike.device_id]
    assert spec.connectivity is None


async def test_ping_device_with_only_connectivity(hass: HomeAssistant, setup):
    monitor = setup["monitor"]
    nas = _own_entry(hass, "ping", "nas", "NAS", [("binary_sensor", "ping", "connectivity", None)])
    hass.states.async_set(nas.entities["ping"], "on")
    assert nas.device_id not in discover(hass, mains=True)
    monitor.set_manual(nas.device_id, True)
    await hass.async_block_till_done()
    device = monitor.devices[nas.device_id]
    assert device.spec.entities == [] and device.spec.connectivity == nas.entities["ping"]
    hass.states.async_set(nas.entities["ping"], "off")
    await tick(hass, setup["freezer"], timedelta(hours=2, minutes=1))
    assert device.status == "failed"


async def test_nothing_to_watch_is_no_candidate(hass: HomeAssistant, setup):
    monitor = setup["monitor"]
    helper = add_device(hass, "tpl", "Vorlage", [("sensor", "value", None)], platform="template")
    only_update = add_device(hass, "upd", "Nur Update", [("update", "fw", None)], platform="somecloud")
    phone = add_device(hass, "phone", "Telefon", [("sensor", "battery", "battery")], platform="mobile_app")
    entry = MockConfigEntry(domain="sun")
    entry.add_to_hass(hass)
    service = dr.async_get(hass).async_get_or_create(
        config_entry_id=entry.entry_id, identifiers={("sun", "x")}, name="Sonne", entry_type=dr.DeviceEntryType.SERVICE
    )
    er.async_get(hass).async_get_or_create("sensor", "sun", "x", device_id=service.id, config_entry=entry)
    offered = {s.device_id for s in monitor.candidates()}
    assert not offered & {helper.device_id, only_update.device_id, phone.device_id, service.id}
    # Added anyway (stale entry): still nothing
    monitor.set_manual(service.id, True)
    assert service.id not in monitor.devices


async def test_added_device_learns_from_history(hass: HomeAssistant, setup):
    monitor = setup["monitor"]
    cam = _camera(hass)
    hass.states.async_set(cam.entities["camera"], "idle")
    monitor.bootstrapped = True
    now = time.time()
    reports = [now - 3600 * i for i in range(30, 0, -1)]
    load = AsyncMock(return_value={cam.entities["camera"]: (reports, [])})
    outages = AsyncMock(return_value={cam.entities["camera"]: ([(now - 50 * 3600, now - 49 * 3600)], None)})
    with (
        patch("custom_components.pulse.monitor.async_load_history", load),
        patch("custom_components.pulse.monitor.async_load_outages", outages),
    ):
        monitor.set_manual(cam.device_id, True)
        await hass.async_block_till_done()
    assert load.await_args.args[1] == sorted(cam.entities.values())  # only the new device
    record = monitor.devices[cam.device_id].record
    assert len(record["events"]) == 30 and record["first_seen"] == reports[0]
    assert record["outages"] == [[now - 50 * 3600, now - 49 * 3600]]


async def test_manual_list_survives_restart(hass: HomeAssistant, setup):
    monitor = setup["monitor"]
    cam = _camera(hass)
    monitor.set_manual(cam.device_id, True)
    await monitor.store.async_save()
    store = PulseStore(hass)
    await store.async_load()
    assert store.settings["manual_devices"] == [cam.device_id]
    # Stores from before 26.10.15 have no list: the default (none)
    assert merge_settings(DEFAULT_SETTINGS, {"mains_beta": False})["manual_devices"] == []
