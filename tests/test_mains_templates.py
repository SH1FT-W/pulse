"""Beta mains-powered devices and own notification texts."""

from __future__ import annotations

from datetime import timedelta
import time

from homeassistant.core import HomeAssistant
from homeassistant.helpers import area_registry as ar, device_registry as dr, entity_registry as er
from homeassistant.util import dt as dt_util

from common import add_device, seed, tick
from custom_components.pulse.const import DOMAIN
from custom_components.pulse.rhythm import Facts, Rhythm, evaluate
from custom_components.pulse.texts import TEMPLATE_KEYS, render, template_defaults

HOUR = 3600.0
DAY = 86400.0
T0 = 1_790_000_000.0


# ── Pure logic ───────────────────────────────────────────────────────────


def test_mains_device_only_counts_when_unavailable_or_regular():
    now = T0 + 30 * DAY
    # Plug that only reports when switched: a week of silence is fine
    unused = evaluate(Facts(now=now, rhythm=Rhythm(None, None, 3), last_activity=now - 7 * DAY, mains=True))
    assert (unused.status, unused.reason["key"]) == ("ok", "ok_mains")
    # ... but not when it is gone
    gone = evaluate(
        Facts(
            now=now, rhythm=Rhythm(None, None, 3), last_activity=now - DAY, mains=True, unavailable_since=now - 3 * HOUR
        )
    )
    assert (gone.status, gone.reason["key"]) == ("failed", "unavailable")
    # Plug with a power meter reporting every ten minutes that hangs: silence counts as for batteries
    regular = Rhythm(600.0, 1200.0, 500)
    hung = evaluate(Facts(now=now, rhythm=regular, last_activity=now - 7 * HOUR, mains=True))
    assert (hung.status, hung.reason["key"]) == ("failed", "silent")


def test_render_drops_empty_values_with_their_separator():
    values = {"name": "Fenster", "area": None, "reason": "Seit 7 Stunden still."}
    assert render("{area} · {reason}", values) == "Seit 7 Stunden still."
    assert (
        render("{name} · {area} · {reason}", {**values, "area": "Küche"}) == "Fenster · Küche · Seit 7 Stunden still."
    )
    # Unknown placeholders stay as written, line breaks stay
    assert render("{name} {foo}\n{reason}", values) == "Fenster {foo}\nSeit 7 Stunden still."
    defaults = template_defaults("en")
    assert set(defaults) == set(TEMPLATE_KEYS)
    assert defaults["failed_title"] == "{name} isn't responding"


# ── With Home Assistant ──────────────────────────────────────────────────


def _plug(hass: HomeAssistant):
    return add_device(
        hass,
        "plug",
        "Steckdose Kaffee",
        [("switch", "switch", None), ("sensor", "power", "power")],
        manufacturer="IKEA",
        model="TRETAKT",
        platform="zha",
    )


async def test_mains_beta_switch(hass: HomeAssistant, setup, hass_ws_client):
    monitor = setup["monitor"]
    plug = _plug(hass)
    hass.states.async_set(plug.entities["switch"], "off")
    await tick(hass, setup["freezer"], timedelta(seconds=10))
    assert monitor.store.settings["mains_beta"]  # default: on (since 26.10.9)
    client = await hass_ws_client(hass)
    await client.send_json_auto_id({"type": "pulse/settings", "settings": {"mains_beta": False}})
    assert (await client.receive_json())["success"]
    await hass.async_block_till_done()
    assert plug.device_id not in monitor.devices
    await client.send_json_auto_id({"type": "pulse/settings", "settings": {"mains_beta": True}})
    assert (await client.receive_json())["success"]
    await hass.async_block_till_done()
    device = monitor.devices[plug.device_id]
    assert device.spec.mains and device.spec.battery is None
    assert device.spec.icon == "mdi:power-socket-eu"
    snap = next(d for d in monitor.snapshot()["devices"] if d["id"] == plug.device_id)
    assert snap["mains"] and snap["status"] == "ok" and snap["reason_key"] == "ok_mains"
    own = [e for e in er.async_get(hass).entities.values() if e.platform == DOMAIN and e.device_id == plug.device_id]
    assert own
    # Gone for two hours: failed, the push only offers "later"
    hass.states.async_set(plug.entities["switch"], "unavailable")
    hass.states.async_set(plug.entities["power"], "unavailable")
    await tick(hass, setup["freezer"], timedelta(hours=2, minutes=1))
    assert device.status == "failed"
    push = setup["pushes"][-1]
    assert push.data["title"] == "Steckdose Kaffee antwortet nicht"
    assert [a["action"].split("::")[0] for a in push.data["data"]["actions"]] == ["PULSE_LATER"]
    # Off again: no longer monitored, its Pulse entities are removed
    await client.send_json_auto_id({"type": "pulse/settings", "settings": {"mains_beta": False}})
    assert (await client.receive_json())["success"]
    await hass.async_block_till_done()
    assert plug.device_id not in monitor.devices
    assert not [
        e for e in er.async_get(hass).entities.values() if e.platform == DOMAIN and e.device_id == plug.device_id
    ]


async def test_mqtt_mains_device_needs_zigbee(hass: HomeAssistant, setup):
    monitor = setup["monitor"]
    monitor.store.settings["mains_beta"] = True
    other = add_device(hass, "tasmota_mqtt", "MQTT-Lampe", [("light", "light", None)], platform="mqtt")
    router = add_device(hass, "router", "Zigbee-Lampe", [("light", "light", None)], platform="mqtt", ieee="0x00aa")
    monitor.async_rediscover()
    assert other.device_id not in monitor.devices
    assert monitor.devices[router.device_id].spec.icon == "mdi:lightbulb-outline"


async def test_govee_cloud_lamp_reports_unavailable(hass: HomeAssistant, setup):
    monitor = setup["monitor"]
    monitor.store.settings["mains_beta"] = True
    lamp = add_device(
        hass,
        "floor_lamp",
        "Stehlampe",
        [
            ("light", "light", None),
            ("sensor", "last_update_received", "timestamp"),
            ("binary_sensor", "connectivity", "connectivity"),
        ],
        manufacturer="Govee",
        model="H6076",
        platform="govee",
    )
    hass.states.async_set(lamp.entities["light"], "off")
    hass.states.async_set(lamp.entities["connectivity"], "on")
    monitor.async_rediscover()
    await hass.async_block_till_done()
    device = monitor.devices[lamp.device_id]
    assert device.spec.mains and device.spec.reachable_via == lamp.entities["connectivity"]
    # Prod (26.10.): the lamp goes unavailable, Govee's connectivity sensor stays "on" and the diagnostic
    # sensor keeps reporting every cloud poll
    hass.states.async_set(lamp.entities["light"], "unavailable")
    await hass.async_block_till_done()
    assert device.unavailable_since is not None
    for minute in range(3):
        hass.states.async_set(lamp.entities["last_update_received"], f"2026-10-26T08:0{minute}:00+00:00")
        await tick(hass, setup["freezer"], timedelta(minutes=50))
    assert device.unavailable_since is not None
    assert (device.status, device.reason["key"]) == ("failed", "unavailable")
    # Dashboards read silent_since: the start of the outage, not the diagnostic sensor's last report
    status = next(
        s
        for s in hass.states.async_all("sensor")
        if s.attributes.get("reason_key") == "unavailable" and "stehlampe" in s.entity_id
    )
    assert status.attributes["silent_since"] == status.attributes["unavailable_since"]
    assert status.attributes["silent_since"] == dt_util.utc_from_timestamp(device.unavailable_since).isoformat()
    # Back
    hass.states.async_set(lamp.entities["light"], "off")
    await hass.async_block_till_done()
    assert device.unavailable_since is None
    # Govee says the lamp is offline (unplugged, Wi-Fi lost)
    hass.states.async_set(lamp.entities["connectivity"], "off")
    await hass.async_block_till_done()
    assert device.unavailable_since is not None


async def test_own_templates(hass: HomeAssistant, setup, hass_ws_client):
    monitor = setup["monitor"]
    devices = setup["devices"]
    kitchen = ar.async_get(hass).async_create("Küche")
    dr.async_get(hass).async_update_device(devices["thermo"].device_id, area_id=kitchen.id)
    await tick(hass, setup["freezer"], timedelta(seconds=10))
    client = await hass_ws_client(hass)
    templates = {"failed_title": "🔴 {name} ({area})", "failed_message": "{reason}\n{manufacturer} {model}"}
    await client.send_json_auto_id({"type": "pulse/settings", "settings": {"templates": templates}})
    result = await client.receive_json()
    assert result["success"]
    assert result["result"]["settings"]["templates"]["failed_title"] == "🔴 {name} ({area})"
    assert result["result"]["settings"]["templates"]["check_title"] is None
    seed(monitor, devices["thermo"].device_id, 1800, 200, time.time() - 7 * 3600)
    await tick(hass, setup["freezer"], timedelta(minutes=1))
    push = setup["pushes"][-1]
    assert push.data["title"] == "🔴 Aquarium Temperatur (Küche)"
    assert push.data["message"].startswith("Seit 7 Stunden still")
    assert push.data["message"].endswith("\nTuya Waterproof temperature sensor")
    # The panel gets the defaults in the language of the notifications
    snap = monitor.snapshot("en")
    assert snap["template_defaults"]["failed_title"] == "{name} antwortet nicht"
    assert "area" in snap["template_vars"]
    # Too long: refused
    await client.send_json_auto_id({"type": "pulse/settings", "settings": {"templates": {"check_title": "x" * 301}}})
    assert not (await client.receive_json())["success"]


def test_five_languages():
    from custom_components.pulse.texts import TEXTS, lang, reason_text

    assert [lang(x) for x in ("fr-FR", "es", "nl", "de-CH", "it", None)] == ["fr", "es", "nl", "de", "en", "en"]
    assert all(set(TEXTS[code]) == set(TEXTS["en"]) for code in ("de", "fr", "es", "nl"))
    sentence = reason_text("fr", {"key": "silent", "params": {"since": 7 * HOUR, "every": 1800.0}})
    assert "7 heures" in sentence
    assert template_defaults("nl")["failed_title"] != template_defaults("en")["failed_title"]


def test_daily_pause_is_learned_and_widens_the_limits():
    from custom_components.pulse.rhythm import daily_quiet, learn, limits

    # Like the HWR motion sensor: every ten minutes from 8 to 20 o'clock, nothing at night, five days
    events = [T0 + day * DAY + h * HOUR + m * 600 for day in range(5) for h in range(8, 20) for m in range(6)]
    rhythm = learn(events)
    assert rhythm.typical == 600.0 and rhythm.longest < 3 * HOUR  # still regular by day
    assert rhythm.quiet is not None and 12 * HOUR < rhythm.quiet < 13 * HOUR
    lim = limits(rhythm, critical=False)
    assert lim.watch > 13 * HOUR and lim.failed > 30 * HOUR
    # Silent at night: fine; silent for two whole days: still noticed
    night = evaluate(Facts(now=events[-1] + 10 * HOUR, rhythm=rhythm, last_activity=events[-1], reachable="Matter"))
    assert night.status == "ok"
    gone = evaluate(Facts(now=events[-1] + 2 * DAY, rhythm=rhythm, last_activity=events[-1], reachable="Matter"))
    assert (gone.status, gone.reason["key"]) == ("check", "radio_only")
    # One long outage is no daily pause; less than three days: none yet
    steady = [T0 + i * 600 for i in range(5 * 144)]
    outage = steady[:300] + [t + 10 * HOUR for t in steady[300:]]
    assert daily_quiet(outage) is None or daily_quiet(outage) < HOUR
    assert daily_quiet(events[:100]) is None
