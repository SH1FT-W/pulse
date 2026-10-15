"""Pulse 1.1 im echten HA: Fixes aus der Sichtung (je ein Regressionstest) und die neuen Funktionen."""

from __future__ import annotations

from datetime import timedelta
import json
import time
from typing import Any
from unittest.mock import patch

from homeassistant import config_entries
from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry as er
from homeassistant.util import dt as dt_util
import pytest
from pytest_homeassistant_custom_component.common import async_capture_events, async_fire_mqtt_message

from common import SOURCE, add_device, report_back, seed, set_states, source_entry, standard_devices, tick
from custom_components.pulse.const import DOMAIN, EVENT_BATTERY_REPLACED
from custom_components.pulse.monitor import PulseMonitor

HOUR = 3600.0
DAY = 86400.0


def titles(setup: dict[str, Any]) -> list[str]:
    return [p.data["title"] for p in setup["pushes"]]


# ── 1. Sturm-Bremse in der Ruhezeit ──────────────────────────────────────


async def test_burst_is_queued_once_in_quiet_hours(hass: HomeAssistant, setup):
    """Die gemeinsame Mitteilung wurde in der Ruhezeit jede Minute neu eingereiht."""
    monitor: PulseMonitor = setup["monitor"]
    devices = setup["devices"]
    setup["freezer"].move_to("2026-10-03 21:00:00+00:00")  # 23:00 Ortszeit
    now = time.time()
    for key in ("thermo", "door", "leak"):
        seed(monitor, devices[key].device_id, 1800, 200, now - 8 * 3600)
    for _ in range(10):
        await tick(hass, setup["freezer"], timedelta(minutes=1))
    assert [m["title"] for m in monitor.notifier.queue] == ["3 Geräte auf einmal still"]
    setup["freezer"].move_to("2026-10-04 06:00:00+00:00")
    await tick(hass, setup["freezer"], timedelta(minutes=1))
    assert titles(setup) == ["3 Geräte auf einmal still"]
    await tick(hass, setup["freezer"], timedelta(minutes=1))
    assert titles(setup) == ["3 Geräte auf einmal still"]


async def test_recovery_leaves_the_burst(hass: HomeAssistant, setup):
    """Erholt sich ein Gerät aus einer wartenden gemeinsamen Mitteilung, fällt es heraus – ohne „läuft wieder“."""
    monitor: PulseMonitor = setup["monitor"]
    devices = setup["devices"]
    setup["freezer"].move_to("2026-10-03 21:00:00+00:00")
    now = time.time()
    for key in ("thermo", "door", "leak"):
        seed(monitor, devices[key].device_id, 1800, 200, now - 8 * 3600)
    await tick(hass, setup["freezer"], timedelta(minutes=1))
    await report_back(hass, setup["freezer"], devices["thermo"].entities["temperature"])
    queue = monitor.notifier.queue
    assert [m["title"] for m in queue] == ["2 Geräte auf einmal still"]
    assert "Aquarium Temperatur" not in queue[0]["message"]
    await tick(hass, setup["freezer"], timedelta(minutes=1))
    assert len(monitor.notifier.queue) == 1
    # Bleibt nur eins übrig, kommt dessen eigene Mitteilung (Lecksensor = wichtig → kritisch, sofort)
    await report_back(hass, setup["freezer"], devices["door"].entities["contact"], ("on", "off"))
    assert not monitor.notifier.queue
    await tick(hass, setup["freezer"], timedelta(minutes=1))
    assert titles(setup) == ["Lecksensor Bad antwortet nicht"]


# ── 2. Speichern im laufenden Betrieb ────────────────────────────────────


async def test_store_saves_while_running(hass: HomeAssistant, hass_storage, setup):
    """HAs verzögertes Speichern verschob sich bei jedem Aufruf – im Betrieb wurde nie gespeichert."""
    entity = setup["devices"]["thermo"].entities["temperature"]
    for i in range(40):
        await tick(hass, setup["freezer"], timedelta(seconds=30))
        hass.states.async_set(entity, str(20 + (i % 2)))  # gesprächig: alle 30 s ein neuer Wert
        await hass.async_block_till_done()
    await tick(hass, setup["freezer"], timedelta(seconds=30))
    data = hass_storage["pulse.devices"]["data"]
    assert data["uptime"][-1][1] >= time.time() - 2 * 60
    assert data["devices"][setup["devices"]["thermo"].device_id]["events"]


# ── 3. Nach einer HA-Pause ───────────────────────────────────────────────


async def test_downtime_does_not_count_as_silence(hass: HomeAssistant, setup):
    monitor: PulseMonitor = setup["monitor"]
    devices = setup["devices"]
    now = time.time()
    for key in ("thermo", "door", "leak", "lock"):
        seed(monitor, devices[key].device_id, 1800, 200, now - 60)
    seed(monitor, devices["lock"].device_id, 1800, 200, now - 20 * 3600)  # schon vorher ausgefallen
    await tick(hass, setup["freezer"], timedelta(minutes=1))
    told = len(setup["pushes"])
    assert monitor.devices[devices["lock"].device_id].status == "failed"
    entry = setup["entry"]
    assert await hass.config_entries.async_unload(entry.entry_id)
    setup["freezer"].tick(timedelta(hours=7))
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    monitor = entry.runtime_data
    await tick(hass, setup["freezer"], timedelta(minutes=1))
    for key in ("thermo", "door", "leak"):
        device = monitor.devices[devices[key].device_id]
        assert (device.status, device.reason["key"]) == ("watch", "startup_waiting")
    # Der schon ausgefallene bleibt es – ohne neue Mitteilung
    assert monitor.devices[devices["lock"].device_id].status == "failed"
    assert len(setup["pushes"]) == told
    # Nach dem eigenen Takt seit dem Start: normale Stille
    await tick(hass, setup["freezer"], timedelta(hours=2))
    assert monitor.devices[devices["thermo"].device_id].reason["key"] == "silent"


# ── 4. Zigbee2MQTT-Echos ─────────────────────────────────────────────────


def bridge(hass: HomeAssistant, last_seen: bool) -> None:
    devices = [{"ieee_address": "0x0001", "friendly_name": "Aquarium Temperatur"}]
    async_fire_mqtt_message(hass, "zigbee2mqtt/bridge/devices", json.dumps(devices))
    info = {"version": "2.6.1", "config": {"advanced": {"last_seen": "ISO_8601" if last_seen else "disable"}}}
    async_fire_mqtt_message(hass, "zigbee2mqtt/bridge/info", json.dumps(info))


async def start_pulse(hass: HomeAssistant) -> PulseMonitor:
    result = await hass.config_entries.flow.async_init(DOMAIN, context={"source": config_entries.SOURCE_USER})
    await hass.config_entries.flow.async_configure(result["flow_id"], {})
    await hass.async_block_till_done()
    monitor: PulseMonitor = hass.config_entries.async_entries(DOMAIN)[0].runtime_data
    return monitor


@pytest.mark.parametrize("expected_lingering_timers", [True])
async def test_z2m_late_echo_is_no_life_sign(hass: HomeAssistant, mqtt_mock, freezer):
    """Prod: das zweite Echo kam bis zu 142 s nach „unknown“ und zählte als Lebenszeichen."""
    freezer.move_to("2026-10-03 10:00:00+00:00")
    devices = standard_devices(hass)
    set_states(hass, devices)
    monitor = await start_pulse(hass)
    monitor.started_at = time.time() - 600
    bridge(hass, last_seen=True)
    await hass.async_block_till_done()
    thermo = monitor.devices[devices["thermo"].device_id]
    battery = devices["thermo"].entities["battery"]
    hass.states.async_set(battery, "100")
    await hass.async_block_till_done()
    stamp = dt_util.now().isoformat()
    async_fire_mqtt_message(hass, "zigbee2mqtt/Aquarium Temperatur", json.dumps({"last_seen": stamp, "battery": 100}))
    await hass.async_block_till_done()
    freezer.tick(timedelta(minutes=10))
    async_fire_mqtt_message(hass, "zigbee2mqtt/bridge/state", json.dumps({"state": "online"}))
    freezer.tick(timedelta(seconds=200))  # nach dem Echo-Fenster
    await hass.async_block_till_done()
    count = len(thermo.record["events"])
    # Zweites Echo: alter Stempel, alter Batteriewert – HAs Entitäten aktualisieren sich im selben Durchlauf
    hass.states.async_set(battery, "83")
    async_fire_mqtt_message(hass, "zigbee2mqtt/Aquarium Temperatur", json.dumps({"last_seen": stamp, "battery": 83}))
    hass.states.async_set(devices["thermo"].entities["temperature"], "25.0")
    await hass.async_block_till_done()
    assert len(thermo.record["events"]) == count
    assert thermo.record["last_level"] == 100
    # Neue Nachricht (neuer Stempel) zählt
    freezer.tick(timedelta(minutes=1))
    fresh = {"last_seen": dt_util.now().isoformat(), "battery": 100}
    async_fire_mqtt_message(hass, "zigbee2mqtt/Aquarium Temperatur", json.dumps(fresh))
    await hass.async_block_till_done()
    assert len(thermo.record["events"]) == count + 1


@pytest.mark.parametrize("expected_lingering_timers", [True])
async def test_z2m_identical_echo_without_last_seen(hass: HomeAssistant, mqtt_mock, freezer):
    """Option aus (eingefrorener Stempel): Wort für Wort dieselbe Nachricht kurz nach dem Neustart = Echo."""
    freezer.move_to("2026-10-03 10:00:00+00:00")
    devices = standard_devices(hass)
    set_states(hass, devices)
    monitor = await start_pulse(hass)
    bridge(hass, last_seen=False)
    await hass.async_block_till_done()
    thermo = monitor.devices[devices["thermo"].device_id]
    frozen = (dt_util.now() - timedelta(days=40)).isoformat()
    message = {"last_seen": frozen, "temperature": 25.1, "linkquality": 90}
    async_fire_mqtt_message(hass, "zigbee2mqtt/Aquarium Temperatur", json.dumps(message))
    await hass.async_block_till_done()
    freezer.tick(timedelta(minutes=10))
    async_fire_mqtt_message(hass, "zigbee2mqtt/bridge/state", "online")
    freezer.tick(timedelta(seconds=200))
    count = len(thermo.record["events"])
    async_fire_mqtt_message(hass, "zigbee2mqtt/Aquarium Temperatur", json.dumps(message))
    await hass.async_block_till_done()
    assert len(thermo.record["events"]) == count
    # Eingefrorener Stempel allein macht keine echte Nachricht zum Echo
    freezer.tick(timedelta(minutes=1))
    async_fire_mqtt_message(hass, "zigbee2mqtt/Aquarium Temperatur", json.dumps({**message, "linkquality": 70}))
    await hass.async_block_till_done()
    assert len(thermo.record["events"]) == count + 1


# ── 5. Batterie + Spannung in einer Nachricht ────────────────────────────


async def test_one_message_does_not_confirm_its_own_jump(hass: HomeAssistant, setup):
    monitor: PulseMonitor = setup["monitor"]
    door = setup["devices"]["door"]
    replaced = async_capture_events(hass, EVENT_BATTERY_REPLACED)
    await tick(hass, setup["freezer"], timedelta(minutes=10))
    hass.states.async_set(door.entities["battery"], "30")
    hass.states.async_set(door.entities["voltage"], "1000")
    await hass.async_block_till_done()
    await tick(hass, setup["freezer"], timedelta(minutes=10))
    hass.states.async_set(door.entities["battery"], "100")
    hass.states.async_set(door.entities["voltage"], "1500")
    await hass.async_block_till_done()
    record = monitor.devices[door.device_id].record
    assert replaced == [] and record["pending_jump"] is not None
    # Ausreißer: die nächste Meldung zeigt wieder die alten Werte → verfällt
    await tick(hass, setup["freezer"], timedelta(minutes=1))
    hass.states.async_set(door.entities["battery"], "30")
    await hass.async_block_till_done()
    assert replaced == [] and record["pending_jump"] is None


# ── 6. Text der gemeinsamen Mitteilung, Batterie nicht in der Sturm-Bremse ─


async def test_burst_text_follows_reasons_and_batteries_stay_single(hass: HomeAssistant, setup):
    monitor: PulseMonitor = setup["monitor"]
    devices = setup["devices"]
    mixed = monitor.notifier._burst(
        [{"device_id": "a", "name": "A", "reason_key": "partner"}, {"device_id": "b", "name": "B", "reason_key": "x"}]
    )
    assert mixed["title"] == "2 Geräte auffällig" and mixed["message"] == "Bitte prüfen: A, B."
    monitor.store.settings["levels"]["battery"] = "now"
    for key in ("thermo", "door", "leak", "lock"):
        monitor.update_device(devices[key].device_id, {"chemistry": "alkaline"})
        hass.states.async_set(devices[key].entities["battery"], "5")
    await hass.async_block_till_done()
    await tick(hass, setup["freezer"], timedelta(minutes=1))
    assert sorted(titles(setup)) == sorted(
        f"{name}: Batterie fast leer"
        for name in ("Aquarium Temperatur", "Türkontakt Wohnungstür", "Lecksensor Bad", "Türschloss")
    )


# ── 7./8. Warn-Sensor gegen Prozent, Batteriewert fehlt ──────────────────


async def test_battery_flag_beats_percentage(hass: HomeAssistant, setup):
    monitor: PulseMonitor = setup["monitor"]
    remote = add_device(
        hass,
        "remote",
        "Heizkörper Bad",
        [("sensor", "battery", "battery"), ("binary_sensor", "low", "battery"), ("sensor", "temp", "temperature")],
        manufacturer="Bosch",
        model="Thermostat II",
    )
    hass.states.async_set(remote.entities["battery"], "89")
    hass.states.async_set(remote.entities["low"], "on")
    hass.states.async_set(remote.entities["temp"], "21")
    monitor._rediscover()
    await tick(hass, setup["freezer"], timedelta(minutes=1))
    device = monitor.devices[remote.device_id]
    assert device.spec.battery == remote.entities["battery"] and device.spec.battery_low == remote.entities["low"]
    assert (device.status, device.reason["key"]) == ("check", "battery_low_flag")
    battery = monitor.serialize(device, time.time())["battery"]
    assert battery["flag_conflict"] and battery["level"] == 89
    assert device in monitor.notifier.due_batteries()
    hass.states.async_set(remote.entities["low"], "off")
    await tick(hass, setup["freezer"], timedelta(minutes=1))
    assert device.reason["key"] != "battery_low_flag"
    assert not monitor.serialize(device, time.time())["battery"]["flag_conflict"]


async def test_battery_missing(hass: HomeAssistant, setup):
    monitor: PulseMonitor = setup["monitor"]
    door = setup["devices"]["door"]
    device = monitor.devices[door.device_id]
    seed(monitor, door.device_id, 1800, 200, time.time() - 60)
    hass.states.async_set(door.entities["battery"], "unavailable")
    await tick(hass, setup["freezer"], timedelta(minutes=1))
    assert device.record["battery_missing_since"] is not None
    assert monitor.serialize(device, time.time())["battery"]["missing_since"] is None  # noch kein Tag
    device.record["battery_missing_since"] = time.time() - 25 * HOUR
    hass.states.async_set(door.entities["contact"], "on")
    await tick(hass, setup["freezer"], timedelta(minutes=1))
    assert (device.status, device.reason["key"]) == ("watch", "battery_missing")
    assert monitor.serialize(device, time.time())["battery"]["missing_since"] == device.record["battery_missing_since"]
    hass.states.async_set(door.entities["battery"], "90")
    await tick(hass, setup["freezer"], timedelta(minutes=1))
    assert device.record["battery_missing_since"] is None and device.reason["key"] != "battery_missing"


# ── 9. Cloud-Geräte ──────────────────────────────────────────────────────


def cloud_device(hass: HomeAssistant, slug: str, name: str, platform: str):
    return add_device(
        hass,
        slug,
        name,
        [("sensor", "temp", "temperature"), ("sensor", "battery", "battery")],
        manufacturer="Netatmo",
        model="Indoor module",
        platform=platform,
    )


async def test_cloud_outage_is_one_muted_notification(hass: HomeAssistant, setup):
    monitor: PulseMonitor = setup["monitor"]
    a = cloud_device(hass, "net_a", "Wetter Balkon", "netatmo")
    b = cloud_device(hass, "net_b", "Wetter Küche", "netatmo")
    ring = cloud_device(hass, "ring_a", "Klingel", "ring")
    for item in (a, b, ring):
        hass.states.async_set(item.entities["temp"], "20")
        hass.states.async_set(item.entities["battery"], "80")
    monitor._rediscover()
    await hass.async_block_till_done()
    now = time.time()
    for item in (a, b, ring):
        seed(monitor, item.device_id, 1800, 200, now - 8 * 3600)
    await tick(hass, setup["freezer"], timedelta(minutes=1))
    for item in (a, b):
        device = monitor.devices[item.device_id]
        assert device.cloud
        assert (device.status, device.reason["key"]) == ("watch", "cloud_outage")
    # Einzelnes Cloud-Gerät: erst nach längerer Grenze ausgefallen
    assert monitor.devices[ring.device_id].status == "check"
    assert titles(setup) == ["netatmo: 2 Geräte still"]
    await tick(hass, setup["freezer"], timedelta(minutes=1))
    assert titles(setup) == ["netatmo: 2 Geräte still"]
    summary = monitor.snapshot()["summary"]
    assert summary["cloud_outages"] == [{"integration": "netatmo", "count": 2, "since": pytest.approx(now - 8 * 3600)}]
    serialized = monitor.serialize(monitor.devices[a.device_id], time.time())
    assert serialized["cloud"] is True and serialized["radio_only"] is False
    assert monitor.store.cloud_notified
    # Abfragetakt der Cloud (gleicher Wert erneut) ist kein Lebenszeichen, ein neuer Wert schon
    device = monitor.devices[a.device_id]
    count = len(device.record["events"])
    hass.states.async_set(a.entities["temp"], "20", force_update=True)
    hass.states.async_set(a.entities["temp"], "20")
    await hass.async_block_till_done()
    assert len(device.record["events"]) == count
    await report_back(hass, setup["freezer"], a.entities["temp"], ("21", "22"))
    await report_back(hass, setup["freezer"], b.entities["temp"], ("21", "22"))
    await tick(hass, setup["freezer"], timedelta(minutes=1))
    assert device.status == "ok" and not monitor.cloud_outages and not monitor.store.cloud_notified
    assert titles(setup) == ["netatmo: 2 Geräte still"]  # kein „läuft wieder“ je Gerät


# ── 10. Nicht mehr überwachte Geräte ─────────────────────────────────────


async def test_unmonitored_device_loses_and_regains_entities(hass: HomeAssistant, setup):
    monitor: PulseMonitor = setup["monitor"]
    door = setup["devices"]["door"]
    reg = er.async_get(hass)
    problem = "binary_sensor.turkontakt_wohnungstur_pulse_problem"
    assert reg.async_get(problem)
    seed(monitor, door.device_id, 60, 500, time.time())
    for key in ("battery", "voltage"):
        reg.async_remove(door.entities[key])
    await hass.async_block_till_done()
    monitor._rediscover()
    await hass.async_block_till_done()
    assert door.device_id not in monitor.devices
    assert reg.async_get(problem) is None and hass.states.get(problem) is None
    record = monitor.store.devices[door.device_id]
    assert len(record["events"]) == 100  # Datensatz bleibt, gekürzt
    # Batterie wieder da → Entitäten entstehen neu, mit derselben ID
    battery = reg.async_get_or_create(
        "sensor",
        SOURCE,
        "door_battery_new",
        device_id=door.device_id,
        config_entry=source_entry(hass),
        original_device_class="battery",
    )
    hass.states.async_set(battery.entity_id, "90")
    monitor._rediscover()
    await hass.async_block_till_done()
    assert door.device_id in monitor.devices
    assert reg.async_get(problem) is not None and hass.states.get(problem) is not None


# ── 11. Ein Bezugspunkt für Stille ───────────────────────────────────────


async def test_silent_since_uses_silence_start(hass: HomeAssistant, setup):
    monitor: PulseMonitor = setup["monitor"]
    thermo = setup["devices"]["thermo"]
    seed(monitor, thermo.device_id, 1800, 200, time.time() - 9 * 3600)
    start = monitor.devices[thermo.device_id].record["events"][-1]
    await tick(hass, setup["freezer"], timedelta(minutes=1))
    hass.states.async_set(thermo.entities["temperature"], "26")
    await tick(hass, setup["freezer"], timedelta(minutes=1))
    device = monitor.devices[thermo.device_id]
    data = monitor.serialize(device, time.time())
    assert data["silence_start"] == start and data["strays"] == 1
    assert data["silence_from"] == device.last_activity != start
    status = next(
        e.entity_id for e in er.async_get(hass).entities.values() if e.unique_id == f"{thermo.device_id}_status"
    )
    assert hass.states.get(status).attributes["silent_since"] == dt_util.utc_from_timestamp(start).isoformat()


# ── 12. Snapshot einmal je Update ────────────────────────────────────────


async def test_snapshot_built_once_per_update(hass: HomeAssistant, setup):
    monitor: PulseMonitor = setup["monitor"]
    first = monitor.snapshot_cached("de")
    assert monitor.snapshot_cached("de") is first
    assert monitor.snapshot_cached("en") is not first
    await monitor._async_push_update()
    assert monitor.snapshot_cached("de") is not first
    snap = monitor.snapshot()
    assert snap["z2m"]["health"] is False and snap["summary"]["due_batteries"] == []


# ── A. Laufzeit-Vorhersage ───────────────────────────────────────────────


async def test_forecast_from_statistics(hass: HomeAssistant, recorder_mock, freezer):
    freezer.move_to("2026-10-03 10:00:00+00:00")
    devices = standard_devices(hass)
    set_states(hass, devices)
    thermo_battery = devices["thermo"].entities["battery"]
    door_battery = devices["door"].entities["battery"]
    now = time.time()
    rows = [{"start": now - (720 - i) * HOUR, "mean": 40 - 0.5 * i / 24} for i in range(721)]
    calls: list[set[str]] = []

    def fake(_hass, _start, _end, ids, period, _units, types):
        assert period == "hour" and types == {"mean"}
        calls.append(ids)
        return {thermo_battery: rows} if thermo_battery in ids else {}

    with patch("homeassistant.components.recorder.statistics.statistics_during_period", fake):
        monitor = await start_pulse(hass)
        for _ in range(3):
            await hass.async_block_till_done()
    thermo = monitor.devices[devices["thermo"].device_id]
    assert thermo.forecast is not None and thermo.forecast.due_within(56)
    assert door_battery not in set().union(*calls)  # NiMH: gar nicht erst gelesen
    monitor.update_device(thermo.device_id, {"battery_type": "CR2032", "battery_count": 1})
    snap = monitor.snapshot()
    by_id = {d["id"]: d for d in snap["devices"]}
    battery = by_id[thermo.device_id]["battery"]
    assert battery["forecast"]["days_min"] < battery["forecast"]["days_max"] and battery["forecast_reason"] is None
    assert by_id[devices["door"].device_id]["battery"]["forecast_reason"] == "untrusted"
    assert by_id[devices["lock"].device_id]["battery"]["forecast_reason"] == "too_short"
    due = snap["summary"]["due_batteries"]
    assert [d["id"] for d in due] == [thermo.device_id] and due[0]["type"] == "CR2032"
    assert snap["summary"]["next_battery"] == "1× CR2032"
    # Nur laut Vorhersage fällig: steht in der Liste, löst aber keine tägliche Zusammenfassung aus
    assert monitor.notifier.send_summary() is False


# ── B. Funkt ohne Werte (Zigbee2MQTT-Health) ─────────────────────────────


@pytest.mark.parametrize("expected_lingering_timers", [True])
async def test_radio_only_from_health(hass: HomeAssistant, mqtt_mock, freezer):
    freezer.move_to("2026-10-03 10:00:00+00:00")
    devices = standard_devices(hass)
    set_states(hass, devices)
    monitor = await start_pulse(hass)
    bridge(hass, last_seen=False)
    await hass.async_block_till_done()
    thermo = monitor.devices[devices["thermo"].device_id]
    seed(monitor, thermo.device_id, 1800, 200, time.time() - 10 * 3600)
    health = {"devices": {"0x0001": {"messages": 10}, "0x0099": {"messages": 1}, "0x0002": "kaputt"}}
    async_fire_mqtt_message(hass, "zigbee2mqtt/bridge/health", json.dumps(health))
    await tick(hass, freezer, timedelta(minutes=1))
    assert thermo.status == "failed"
    count = len(thermo.record["events"])
    # Ein einzelner Anstieg reicht nicht (normale Wert-Nachrichten lassen den Zähler auch steigen)
    health["devices"]["0x0001"] = {"messages": 15}
    async_fire_mqtt_message(hass, "zigbee2mqtt/bridge/health", json.dumps(health))
    async_fire_mqtt_message(hass, "zigbee2mqtt/bridge/health", "kein json")
    await hass.async_block_till_done()
    assert thermo.status == "failed"
    freezer.tick(timedelta(minutes=10))
    health["devices"]["0x0001"] = {"messages": 18}
    async_fire_mqtt_message(hass, "zigbee2mqtt/bridge/health", json.dumps(health))
    await hass.async_block_till_done()
    assert (thermo.status, thermo.reason["key"]) == ("check", "radio_only")
    assert len(thermo.record["events"]) == count  # Funk ist kein Wert
    snap = monitor.snapshot()
    assert snap["z2m"]["health"] is True
    assert next(d for d in snap["devices"] if d["id"] == thermo.device_id)["radio_only"] is True
    # Steigt der Zähler nicht mehr (Gerät wirklich tot), wird es nach Ablauf der Frische doch „ausgefallen“
    await tick(hass, freezer, timedelta(hours=3))
    assert (thermo.status, thermo.reason["key"]) == ("failed", "silent")


@pytest.mark.parametrize("expected_lingering_timers", [True])
async def test_radio_rise_from_own_value_message_is_not_radio_only(hass: HomeAssistant, mqtt_mock, freezer):
    """Prüfung #1: der Zähler steigt auch durch die eigene Wert-Nachricht – tote Geräte blieben ewig „check“."""
    freezer.move_to("2026-10-03 10:00:00+00:00")
    devices = standard_devices(hass)
    set_states(hass, devices)
    monitor = await start_pulse(hass)
    bridge(hass, last_seen=False)
    await hass.async_block_till_done()
    thermo = monitor.devices[devices["thermo"].device_id]
    seed(monitor, thermo.device_id, 1800, 200, time.time() - 10 * 3600)
    # Anstiege kurz nach der letzten Meldung (deren eigene Nachricht) zählen nicht
    thermo.radio_rises = [thermo.record["events"][-1] + 300, thermo.record["events"][-1] + 600]
    thermo.radio_last = thermo.radio_rises[-1]
    await tick(hass, freezer, timedelta(minutes=1))
    assert (thermo.status, thermo.reason["key"]) == ("failed", "silent")


@pytest.mark.parametrize("expected_lingering_timers", [True])
async def test_enable_health_publishes(hass: HomeAssistant, mqtt_mock, hass_ws_client):
    """Einschalten nur über den eigenen Befehl (das Panel fragt vorher nach)."""
    devices = standard_devices(hass)
    set_states(hass, devices)
    monitor = await start_pulse(hass)
    client = await hass_ws_client(hass)
    await client.send_json_auto_id({"type": "pulse/enable_z2m_health"})
    response = await client.receive_json()
    assert response["success"]
    topic, payload = mqtt_mock.async_publish.call_args[0][:2]
    assert topic == "zigbee2mqtt/bridge/request/options"
    assert json.loads(payload) == {"options": {"health": {"interval": 10, "reset_on_check": False}}}
    assert monitor.store.z2m_health_at is not None


async def test_enable_health_without_z2m(hass: HomeAssistant, setup, hass_ws_client):
    client = await hass_ws_client(hass)
    await client.send_json_auto_id({"type": "pulse/enable_z2m_health"})
    response = await client.receive_json()
    assert response["error"]["code"] == "no_z2m"
    with pytest.raises(ValueError, match="no_z2m"):
        await setup["monitor"].async_enable_z2m_health()


# ── D. Partner-Vorschläge ────────────────────────────────────────────────


async def test_partner_suggestions_and_dismiss(hass: HomeAssistant, setup, hass_ws_client, hass_storage):
    monitor: PulseMonitor = setup["monitor"]
    devices = setup["devices"]
    door, lock = devices["door"].device_id, devices["lock"].device_id
    now = time.time()
    door_actions = [now - d * DAY - h * HOUR for d in range(4) for h in (2, 9)]
    monitor.devices[door].spec.area = monitor.devices[lock].spec.area = "Flur"
    monitor.devices[door].record["actions"] = sorted(door_actions)
    monitor.devices[lock].record["actions"] = sorted(ts + 40 for ts in door_actions)
    await monitor._async_partners()
    by_id = {d["id"]: d for d in monitor.snapshot()["devices"]}
    suggestion = by_id[door]["partner_suggestions"][0]
    assert suggestion == {"id": lock, "name": "Türschloss", "score": 1.0, "together": 8}
    client = await hass_ws_client(hass)
    await client.send_json_auto_id({"type": "pulse/partner_suggestion_dismiss", "device_id": door, "partner_id": lock})
    response = await client.receive_json()
    while response.get("type") == "event":
        response = await client.receive_json()
    assert response["success"]
    assert lock in monitor.devices[door].record["partner_dismissed"]
    assert not monitor.serialize(monitor.devices[door], now)["partner_suggestions"]
    await monitor._async_partners()
    assert not [s for s in monitor.devices[door].suggestions if s.id == lock]
    # Mit gesetztem Partner keine Vorschläge
    monitor.update_device(lock, {"partner": door})
    assert monitor.serialize(monitor.devices[lock], now)["partner_suggestions"] == []
    # Unbekanntes Gerät
    await client.send_json_auto_id({"type": "pulse/partner_suggestion_dismiss", "device_id": "x", "partner_id": lock})
    response = await client.receive_json()
    assert response["error"]["code"] == "unknown_device"


# ── Zweite Prüfung: Echo-Regeln, Cloud-Gruppen, Wechsel ──────────────────


async def test_z2m_echo_rules_are_narrow(hass: HomeAssistant, freezer):
    """Prüfung #2/#3: neuer Stempel ist nie ein Echo; Stempel nur mit Option und nur kurz nach Neustart vergleichen."""
    from custom_components.pulse.z2m import Z2MListener

    freezer.move_to("2026-10-03 10:00:00+00:00")
    seen: list[float] = []
    listener = Z2MListener(
        hass, "z", lambda _i, ts, _e: seen.append(ts), lambda *_: None, lambda _i: None, lambda: None
    )
    listener.last_seen_enabled = True
    listener.online_at = time.time()
    first = dt_util.now().isoformat()
    body = {"temperature": 21}
    listener._message("0x1", json.dumps({**body, "last_seen": first}))
    freezer.tick(timedelta(seconds=200))  # nach dem Echo-Fenster, aber kurz nach „online“
    # #2: gleicher Inhalt, aber neuer Stempel → echte Nachricht
    listener._message("0x1", json.dumps({**body, "last_seen": dt_util.now().isoformat()}))
    assert len(seen) == 2
    # Alter Stempel kurz nach dem Neustart → Echo
    listener._message("0x1", json.dumps({**body, "last_seen": first}))
    assert len(seen) == 2 and listener.echo_marked("0x1")
    # #3: lange nach dem Neustart (z. B. Uhrsprung) ist ein alter Stempel kein Echo mehr
    freezer.tick(timedelta(minutes=30))
    listener._message("0x1", json.dumps({**body, "last_seen": first}))
    assert len(seen) == 3
    # Option zur Laufzeit aus: Stempel werden vergessen und nicht mehr verglichen
    info = {"config": {"advanced": {"last_seen": "disable"}}}
    listener._info(type("Msg", (), {"payload": json.dumps(info)})())
    assert not listener.last_seen_enabled and not listener._stamps
    listener.online_at = time.time()
    freezer.tick(timedelta(seconds=200))
    listener._message("0x1", json.dumps({"temperature": 22, "last_seen": first}))
    assert len(seen) == 4


async def test_cloud_outage_largest_group_and_held(hass: HomeAssistant, setup):
    """Prüfung #5: größte Gruppe im 2-h-Fenster; ein gemeldeter Ausfall hält, solange seine Geräte still sind."""
    monitor: PulseMonitor = setup["monitor"]
    items = [cloud_device(hass, f"net_{i}", f"Wetter {i}", "netatmo") for i in range(3)]
    for item in items:
        hass.states.async_set(item.entities["temp"], "20")
        hass.states.async_set(item.entities["battery"], "80")
    monitor._rediscover()
    await hass.async_block_till_done()
    now = time.time()
    # Zwei gemeinsam vor 9 h, einer erst vor 3 h still (früher: nur die späteste Gruppe zählte → kein Ausfall)
    for item, ago in zip(items, (9, 8.5, 3), strict=True):
        seed(monitor, item.device_id, 1800, 200, now - ago * 3600)
    await tick(hass, setup["freezer"], timedelta(minutes=1))
    outage = monitor.cloud_outages["netatmo"]
    assert outage["ids"] == {items[0].device_id, items[1].device_id}
    assert titles(setup) == ["netatmo: 2 Geräte still"]
    # Einer kommt zurück: der Ausfall hält für den anderen – keine zweite Mitteilung, keine Einzelmeldung
    await report_back(hass, setup["freezer"], items[0].entities["temp"], ("21", "22"))
    await tick(hass, setup["freezer"], timedelta(minutes=1))
    assert monitor.cloud_outages["netatmo"]["ids"] >= {items[1].device_id}
    assert monitor.devices[items[1].device_id].reason["key"] == "cloud_outage"
    await tick(hass, setup["freezer"], timedelta(hours=20))
    assert monitor.devices[items[1].device_id].reason["key"] == "cloud_outage"
    assert titles(setup) == ["netatmo: 2 Geräte still"]


async def test_replaced_clears_forecast(hass: HomeAssistant, setup):
    """Prüfung #8: nach dem Wechsel raus aus der Einkaufsliste, Vorhersage erst wieder mit neuen Daten."""
    from custom_components.pulse.forecast import Forecast

    monitor: PulseMonitor = setup["monitor"]
    thermo = monitor.devices[setup["devices"]["thermo"].device_id]
    thermo.forecast = Forecast(5, 10, time.time() + 7 * DAY, 3.0, 10)
    assert [d for d, _ in monitor.notifier.due_soon()] == [thermo]
    monitor.mark_replaced(thermo.device_id, "manual")
    assert thermo.forecast is None and thermo.forecast_reason == "too_short"
    assert monitor.notifier.due_soon() == []
