"""Zigbee2MQTT mithören (über HAs MQTT-Testbroker) und Lernen aus dem Recorder-Verlauf."""

from __future__ import annotations

import asyncio
from datetime import timedelta
import json
import time

from homeassistant import config_entries
from homeassistant.core import HomeAssistant
from homeassistant.util import dt as dt_util
import pytest
from pytest_homeassistant_custom_component.common import async_fire_mqtt_message, async_fire_time_changed

from common import set_states, standard_devices
from custom_components.pulse.const import DOMAIN, EVENT_BATTERY_REPLACED
from custom_components.pulse.monitor import PulseMonitor


async def start_pulse(hass: HomeAssistant) -> PulseMonitor:
    result = await hass.config_entries.flow.async_init(DOMAIN, context={"source": config_entries.SOURCE_USER})
    await hass.config_entries.flow.async_configure(result["flow_id"], {})
    await hass.async_block_till_done()
    return hass.config_entries.async_entries(DOMAIN)[0].runtime_data


def bridge(hass: HomeAssistant, last_seen: bool = False, retain: bool = True) -> None:
    devices = [
        {"ieee_address": "0x0001", "friendly_name": "Aquarium Temperatur", "power_source": "Battery"},
        {"ieee_address": "0x0002", "friendly_name": "Flur/Türkontakt Wohnungstür", "power_source": "Battery"},
    ]
    async_fire_mqtt_message(hass, "zigbee2mqtt/bridge/devices", json.dumps(devices), retain=retain)
    info = {
        "version": "2.6.1",
        "config": {
            "advanced": {"last_seen": "ISO_8601" if last_seen else "disable"},
            "availability": {"enabled": last_seen},
        },
    }
    async_fire_mqtt_message(hass, "zigbee2mqtt/bridge/info", json.dumps(info), retain=retain)


# HAs MQTT-Client lässt einen Wartungs-Timer laufen
@pytest.mark.parametrize("expected_lingering_timers", [True])
async def test_z2m_last_seen_echo_availability_announce(hass: HomeAssistant, mqtt_mock, freezer):
    freezer.move_to("2026-10-03 10:00:00+00:00")
    devices = standard_devices(hass)
    set_states(hass, devices)
    monitor = await start_pulse(hass)
    assert monitor.z2m_active
    bridge(hass)
    await hass.async_block_till_done()
    snap = monitor.snapshot()
    assert snap["z2m"]["present"] and not snap["z2m"]["last_seen"]
    thermo = monitor.devices[devices["thermo"].device_id]

    # Nachricht ohne Zeitstempel = jetzt
    async_fire_mqtt_message(hass, "zigbee2mqtt/Aquarium Temperatur", json.dumps({"temperature": 25.1}))
    await hass.async_block_till_done()
    assert thermo.last_activity == pytest.approx(time.time(), abs=2)

    # Bridge-Neustart: alte Werte ohne Zeitstempel zählen nicht
    freezer.tick(timedelta(hours=1))
    count = len(thermo.record["events"])
    async_fire_mqtt_message(hass, "zigbee2mqtt/bridge/state", json.dumps({"state": "online"}))
    async_fire_mqtt_message(hass, "zigbee2mqtt/Aquarium Temperatur", json.dumps({"temperature": 25.1}))
    await hass.async_block_till_done()
    assert len(thermo.record["events"]) == count

    # Option „last_seen“ aus: ein mitgeschickter (eingefrorener) Zeitstempel zählt nicht
    frozen = dt_util.now() - timedelta(days=40)
    async_fire_mqtt_message(hass, "zigbee2mqtt/Aquarium Temperatur", json.dumps({"last_seen": frozen.isoformat()}))
    await hass.async_block_till_done()
    assert len(thermo.record["events"]) == count  # Echo-Fenster: nichts
    freezer.tick(timedelta(minutes=2))
    async_fire_mqtt_message(hass, "zigbee2mqtt/Aquarium Temperatur", json.dumps({"last_seen": frozen.isoformat()}))
    await hass.async_block_till_done()
    assert thermo.last_activity == pytest.approx(time.time(), abs=2)

    # Option an: die Zeit der Bridge zählt – auch im Echo-Fenster (alter Wert wird erkannt)
    bridge(hass, last_seen=True, retain=False)
    async_fire_mqtt_message(hass, "zigbee2mqtt/bridge/state", json.dumps({"state": "online"}))
    old = dt_util.now() - timedelta(minutes=30)
    async_fire_mqtt_message(hass, "zigbee2mqtt/Aquarium Temperatur", json.dumps({"last_seen": old.isoformat()}))
    await hass.async_block_till_done()
    assert old.timestamp() in [pytest.approx(ts, abs=1) for ts in thermo.record["events"]]
    bridge(hass, retain=False)

    # Unbekannte Geräte, kaputte Nachrichten, Bridge-Themen: nichts passiert
    async_fire_mqtt_message(hass, "zigbee2mqtt/Fremd", json.dumps({"x": 1}))
    async_fire_mqtt_message(hass, "zigbee2mqtt/Aquarium Temperatur", "kaputt{")
    async_fire_mqtt_message(hass, "zigbee2mqtt/bridge/info", "kein json")
    async_fire_mqtt_message(hass, "zigbee2mqtt/bridge/devices", json.dumps({"kein": "array"}))
    await hass.async_block_till_done()

    # Verfügbarkeit
    bridge(hass, last_seen=True, retain=False)
    await hass.async_block_till_done()
    assert monitor.z2m is not None and monitor.z2m.availability_enabled
    door = monitor.devices[devices["door"].device_id]
    async_fire_mqtt_message(
        hass, "zigbee2mqtt/Flur/Türkontakt Wohnungstür/availability", json.dumps({"state": "offline"})
    )
    await hass.async_block_till_done()
    assert door.unavailable_since is not None
    freezer.tick(timedelta(hours=3))
    async_fire_time_changed(hass, dt_util.utcnow())
    await hass.async_block_till_done()
    assert door.status == "failed"
    assert door.reason["key"] in ("unavailable", "silent_new")

    # Neuanmeldung direkt nach dem Start von HA (oder im Echo eines Bridge-Neustarts) zählt nicht
    replaced: list = []
    hass.bus.async_listen(EVENT_BATTERY_REPLACED, replaced.append)
    monitor.started_at = time.time()
    async_fire_mqtt_message(
        hass, "zigbee2mqtt/bridge/event", json.dumps({"type": "device_announce", "data": {"ieee_address": "0x0002"}})
    )
    await hass.async_block_till_done()
    assert replaced == []
    monitor.started_at = time.time() - 600

    # Neuanmeldung nach echter Stille = neue Batterie
    async_fire_mqtt_message(
        hass, "zigbee2mqtt/bridge/event", json.dumps({"type": "device_announce", "data": {"ieee_address": "0x0002"}})
    )
    async_fire_mqtt_message(hass, "zigbee2mqtt/Flur/Türkontakt Wohnungstür/availability", "online")
    await hass.async_block_till_done()
    assert [e.data["source"] for e in replaced] == ["announce"]
    assert door.unavailable_since is None


@pytest.mark.parametrize("expected_lingering_timers", [True])
async def test_enable_options_publishes(hass: HomeAssistant, mqtt_mock, hass_ws_client):
    devices = standard_devices(hass)
    set_states(hass, devices)
    await start_pulse(hass)
    client = await hass_ws_client(hass)
    await client.send_json_auto_id({"type": "pulse/enable_z2m"})
    response = await client.receive_json()
    assert response["success"]
    topic, payload = mqtt_mock.async_publish.call_args[0][:2]
    assert topic == "zigbee2mqtt/bridge/request/options"
    assert json.loads(payload) == {
        "options": {"advanced": {"last_seen": "ISO_8601"}, "availability": {"enabled": True}}
    }


async def test_bootstrap_from_recorder(hass: HomeAssistant, recorder_mock, freezer):
    from homeassistant.components.recorder import get_instance

    freezer.move_to("2026-10-03 10:00:00+00:00")
    devices = standard_devices(hass)
    contact = devices["door"].entities["contact"]
    temperature = devices["thermo"].entities["temperature"]
    # Vorgeschichte: Thermometer alle 30 min, Türkontakt mit Neustart-Echo dazwischen
    hass.states.async_set(temperature, "20.0")
    hass.states.async_set(contact, "off")
    for i in range(12):
        freezer.tick(timedelta(minutes=30))
        hass.states.async_set(temperature, f"{20 + i * 0.1:.1f}")
        hass.states.async_set(contact, "on" if i % 2 else "off")
        if i == 5:
            hass.states.async_set(contact, "unavailable")
            hass.states.async_set(contact, "on")
    await hass.async_block_till_done()
    await get_instance(hass).async_block_till_done()
    freezer.tick(timedelta(minutes=5))
    monitor = await start_pulse(hass)
    await hass.async_block_till_done()
    await get_instance(hass).async_block_till_done()
    await hass.async_block_till_done()
    assert monitor.bootstrapped
    thermo = monitor.devices[devices["thermo"].device_id]
    assert len(thermo.record["events"]) >= 10
    assert thermo.rhythm.known
    assert thermo.rhythm.typical == pytest.approx(1800, abs=5)
    door = monitor.devices[devices["door"].device_id]
    assert len(door.record["actions"]) >= 8
    assert thermo.record["first_seen"] <= thermo.record["events"][0]


@pytest.mark.parametrize("expected_lingering_timers", [True])
async def test_z2m_base_change_and_retained(hass: HomeAssistant, mqtt_mock, freezer):
    freezer.move_to("2026-10-03 10:00:00+00:00")
    devices = standard_devices(hass)
    set_states(hass, devices)
    monitor = await start_pulse(hass)
    bridge(hass)
    await hass.async_block_till_done()
    thermo = monitor.devices[devices["thermo"].device_id]
    freezer.tick(timedelta(minutes=5))
    count = len(thermo.record["events"])
    # Gespeicherte (retain) Nachricht ohne Zeitstempel ist kein Lebenszeichen
    async_fire_mqtt_message(hass, "zigbee2mqtt/Aquarium Temperatur", json.dumps({"temperature": 25.1}), retain=True)
    # Bridge-Themen zählen nie
    async_fire_mqtt_message(hass, "zigbee2mqtt/bridge/logging", json.dumps({"level": "info"}))
    await hass.async_block_till_done()
    assert len(thermo.record["events"]) == count

    # Anderes Basis-Thema, zweimal schnell hintereinander: am Ende genau ein Listener auf dem neuen Thema
    monitor.store.settings["z2m_base"] = "z2m_b"
    first = monitor.z2m
    await asyncio.gather(monitor.async_restart_z2m(), monitor.async_restart_z2m())
    assert monitor.z2m is not None and monitor.z2m is not first and monitor.z2m.base == "z2m_b"
    async_fire_mqtt_message(hass, "zigbee2mqtt/bridge/devices", json.dumps([]))
    await hass.async_block_till_done()
    assert monitor.z2m.names == {}
    devices_msg = [{"ieee_address": "0x0001", "friendly_name": "Aquarium Temperatur"}]
    async_fire_mqtt_message(hass, "z2m_b/bridge/devices", json.dumps(devices_msg))
    freezer.tick(timedelta(minutes=5))
    async_fire_mqtt_message(hass, "z2m_b/Aquarium Temperatur", json.dumps({"temperature": 25.2}))
    await hass.async_block_till_done()
    assert thermo.last_activity == pytest.approx(time.time(), abs=2)
