"""Zweite Runde: Rückgängig, Eskalation über Nacht, wichtige Geräte, Zusammenfassung, Leserechte, Zeitumstellung."""

from __future__ import annotations

from datetime import timedelta
import time

from homeassistant.core import HomeAssistant
from homeassistant.util import dt as dt_util
import pytest
from pytest_homeassistant_custom_component.common import async_capture_events

from common import seed, tick
from custom_components.pulse.const import DOMAIN, EVENT_STATUS_CHANGED
from custom_components.pulse.store import migrate


async def test_undo_replaced_does_not_renotify(hass: HomeAssistant, setup):
    monitor = setup["monitor"]
    thermo_id = setup["devices"]["thermo"].device_id
    seed(monitor, thermo_id, 1800, 200, time.time() - 7 * 3600)
    await tick(hass, setup["freezer"], timedelta(minutes=1))
    assert len(setup["pushes"]) == 1
    monitor.mark_replaced(thermo_id, "manual")
    assert monitor.undo_replaced(thermo_id)
    await tick(hass, setup["freezer"], timedelta(minutes=1))
    assert monitor.devices[thermo_id].status == "failed"
    assert len(setup["pushes"]) == 1


async def test_recovered_after_daytime_push_survives_night_queue(hass: HomeAssistant, setup):
    """Tagsüber „prüfen“ zugestellt, nachts eskaliert und erholt: die Entwarnung kommt trotzdem."""
    monitor = setup["monitor"]
    devices = setup["devices"]
    thermo_id = devices["thermo"].device_id
    monitor.store.settings["levels"]["check"] = "now"
    seed(monitor, thermo_id, 1800, 200, time.time() - 2.5 * 3600)
    await tick(hass, setup["freezer"], timedelta(minutes=1))
    assert [p.data["title"] for p in setup["pushes"]] == ["Aquarium Temperatur prüfen"]
    setup["freezer"].move_to("2026-10-03 21:00:00+00:00")  # 23:00 Ortszeit, Ruhezeit
    await tick(hass, setup["freezer"], timedelta(minutes=1))
    assert monitor.devices[thermo_id].status == "failed"
    assert len(monitor.notifier.queue) == 1
    hass.states.async_set(devices["thermo"].entities["temperature"], "25.4")
    await hass.async_block_till_done()
    assert [m["title"] for m in monitor.notifier.queue] == ["Aquarium Temperatur läuft wieder"]


async def test_critical_device_check_now_but_not_critical_sound(hass: HomeAssistant, setup):
    monitor = setup["monitor"]
    leak_id = setup["devices"]["leak"].device_id
    events = async_capture_events(hass, EVENT_STATUS_CHANGED)
    # Lecksensor (wichtig) still → „prüfen“: kommt sofort, aber ohne kritischen Ton
    seed(monitor, leak_id, 3000, 200, time.time() - 3.5 * 3600)
    await tick(hass, setup["freezer"], timedelta(minutes=1))
    leak = monitor.devices[leak_id]
    assert leak.status == "check"
    push = setup["pushes"][-1].data
    assert push["title"] == "Lecksensor Bad prüfen"
    assert "sound" not in push["data"]["push"]
    assert push["data"]["priority"] == "high"
    assert events[-1].data["reason_key"] == "silent"


async def test_summary_waits_for_quiet_hours_and_lists_more(hass: HomeAssistant, setup):
    monitor = setup["monitor"]
    monitor.store.settings["summary_time"] = "23:00"
    monitor.store.settings["levels"]["failed"] = "daily"
    for key in ("thermo", "door", "leak", "lock"):
        seed(monitor, setup["devices"][key].device_id, 1800, 200, time.time() - 9 * 3600)
    setup["freezer"].move_to("2026-10-03 21:00:30+00:00")  # 23:00 Ortszeit, in der Ruhezeit
    await tick(hass, setup["freezer"], timedelta(seconds=1))
    assert not setup["pushes"]
    assert [m.get("summary") for m in monitor.notifier.queue] == [True]
    setup["freezer"].move_to("2026-10-04 06:00:00+00:00")  # 08:00, Ruhezeit vorbei
    await tick(hass, setup["freezer"], timedelta(minutes=1))
    summary = [p for p in setup["pushes"] if p.data["title"].startswith("Heute")]
    assert len(summary) == 1
    # Fünf wären zu viel: vier Zeilen, dann „Und … weitere“ (hier genau vier Geräte → keine Zeile)
    assert "weitere" not in summary[0].data["message"]


async def test_entities_attributes_for_automations(hass: HomeAssistant, setup):
    monitor = setup["monitor"]
    thermo_id = setup["devices"]["thermo"].device_id
    seed(monitor, thermo_id, 1800, 200, time.time() - 7 * 3600)
    await tick(hass, setup["freezer"], timedelta(minutes=1))
    await tick(hass, setup["freezer"], timedelta(seconds=2))  # Updates werden je Sekunde gebündelt
    problems = hass.states.get("sensor.pulse_probleme")
    assert problems.attributes["devices"][0]["device_id"] == thermo_id
    assert problems.attributes["devices"][0]["reason_key"] == "silent"
    status = hass.states.get("sensor.aquarium_temperatur_pulse_status")
    assert status.attributes["reason_key"] == "silent"
    assert status.attributes["silent_since"] is not None
    # Unverändert → kein neuer Zustand, auch wenn Pulse ein Update schickt
    before = status.last_updated
    monitor.async_update()
    await hass.async_block_till_done()
    assert hass.states.get("sensor.aquarium_temperatur_pulse_status").last_updated == before


async def test_non_admin_reads_but_cannot_write(
    hass: HomeAssistant, setup, hass_ws_client, hass_read_only_access_token
):
    client = await hass_ws_client(hass, hass_read_only_access_token)
    await client.send_json_auto_id({"type": "pulse/subscribe"})
    response = await client.receive_json()
    assert response["success"]
    event = await client.receive_json()
    assert event["event"]["devices"]
    door = setup["devices"]["door"].device_id
    await client.send_json_auto_id({"type": "pulse/heartbeat", "device_ids": [door]})
    response = await client.receive_json()
    while response.get("type") == "event":
        response = await client.receive_json()
    assert response["success"]
    await client.send_json_auto_id({"type": "pulse/replaced", "device_id": door})
    response = await client.receive_json()
    while response.get("type") == "event":
        response = await client.receive_json()
    assert response["error"]["code"] == "unauthorized"


async def test_daylight_saving_week(hass: HomeAssistant, setup):
    """Woche mit Zeitumstellung (25.10.2026, Berlin): Kalendertag mit 25 h, Leiste weiter 12 Fenster je Tag."""
    monitor = setup["monitor"]
    setup["freezer"].move_to("2026-10-27 11:00:00+00:00")
    door = setup["devices"]["door"].device_id
    beat = monitor.heartbeats([door])
    lengths = [len(day) for day in beat["devices"][door]]
    assert lengths == [96, 96, 96, 96, 100, 96, 96]
    snap = monitor.snapshot()
    assert len(snap["devices"][0]["strip"]) == 84
    assert snap["day_starts"][0] == snap["strip_start"]
    assert dt_util.as_local(dt_util.utc_from_timestamp(snap["day_starts"][5])).hour == 0


def test_store_migration_volts_and_persons():
    data = {
        "devices": {"a": {"last_voltage": 3.01}, "b": {"last_voltage": 2900.0}, "c": {"last_voltage": None}},
        "settings": {"arrive_home": {"enabled": True, "person": "person.alex"}},
    }
    migrated = migrate(3, data)
    assert migrated["devices"]["a"]["last_voltage"] == pytest.approx(3010)
    assert migrated["devices"]["b"]["last_voltage"] == 2900.0
    assert migrated["settings"]["arrive_home"] == {"enabled": True, "persons": ["person.alex"]}


async def test_stop_before_started_starts_nothing(hass: HomeAssistant, setup):
    monitor = setup["monitor"]
    monitor.async_stop()
    await monitor._async_start_z2m()
    assert monitor.z2m is None
    monitor.bootstrapped = False
    await monitor._started(hass)
    assert not monitor.bootstrapped
    assert DOMAIN in hass.config.components
