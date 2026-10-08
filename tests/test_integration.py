"""Pulse im echten HA: Einrichtung, Entitäten, Meldungen, Status, Mitteilungen, Aktionen, WebSocket."""

from __future__ import annotations

from datetime import timedelta
import time
from typing import Any

from homeassistant import config_entries
from homeassistant.core import HomeAssistant
from homeassistant.data_entry_flow import FlowResultType
from homeassistant.exceptions import ServiceValidationError
from homeassistant.helpers import device_registry as dr, entity_registry as er, issue_registry as ir
import pytest
from pytest_homeassistant_custom_component.common import (
    async_capture_events,
)

from common import add_device, seed, tick
from custom_components.pulse.const import DOMAIN, EVENT_BATTERY_REPLACED, EVENT_STATUS_CHANGED
from custom_components.pulse.monitor import PulseMonitor


async def test_single_instance(hass: HomeAssistant, setup):
    result = await hass.config_entries.flow.async_init(DOMAIN, context={"source": config_entries.SOURCE_USER})
    assert result["type"] is FlowResultType.ABORT
    assert result["reason"] == "single_instance_allowed"


async def test_discovery_and_entities(hass: HomeAssistant, setup):
    monitor = setup["monitor"]
    devices = setup["devices"]
    assert len(monitor.devices) == 4
    door = monitor.devices[devices["door"].device_id]
    assert door.spec.ieee == "0x0002"
    assert door.spec.actions == [devices["door"].entities["contact"]]
    assert door.record["battery_type"] == "AAA"  # aus der Bibliothek
    assert door.spec.icon == "mdi:door"
    assert monitor.devices[devices["lock"].device_id].spec.icon == "mdi:lock-outline"
    assert monitor.devices[devices["thermo"].device_id].spec.icon == "mdi:thermometer"
    assert door.record["chemistry"] == "nimh"
    assert monitor.devices[devices["leak"].device_id].critical
    assert monitor.devices[devices["lock"].device_id].critical
    assert not door.critical
    reg = er.async_get(hass)
    pulse_entities = [e for e in reg.entities.values() if e.platform == DOMAIN]
    # 3 pro Gerät + 2 gesamt
    assert len(pulse_entities) == 14
    on_device = [e for e in pulse_entities if e.device_id == devices["door"].device_id]
    assert {e.translation_key for e in on_device} == {"problem", "status", "last_report"}
    # Entity-IDs nach dem Gerät, nicht pulse_pulse_problem_4
    assert {e.entity_id for e in on_device} == {
        "binary_sensor.turkontakt_wohnungstur_pulse_problem",
        "sensor.turkontakt_wohnungstur_pulse_status",
        "sensor.turkontakt_wohnungstur_pulse_zuletzt_gemeldet",  # Systemsprache Deutsch
    }
    assert hass.states.get("sensor.pulse_uberwachte_gerate").state == "4"
    assert hass.states.get("sensor.pulse_probleme").state == "0"


async def test_excludes_phones_and_power_devices(hass: HomeAssistant, freezer):
    add_device(hass, "phone", "iPhone", [("sensor", "battery", "battery")], platform="mobile_app")
    add_device(hass, "solar", "Solarbank", [("sensor", "battery", "battery"), ("sensor", "power", "power")])
    add_device(hass, "vac", "Roboter", [("vacuum", "vac", None), ("sensor", "battery", "battery")])
    add_device(hass, "plain", "Fernbedienung", [("event", "button", None), ("binary_sensor", "low", "battery")])
    from custom_components.pulse.discovery import discover

    found = discover(hass)
    assert [s.name for s in found.values()] == ["Fernbedienung"]


async def test_excludes_media_accessories(hass: HomeAssistant, freezer):
    """Akku-Rücklautsprecher einer Soundbar sind keine Batteriesensoren.

    Egal ob unter dem Mediaplayer (via_device) oder nur im selben Eintrag.
    """
    from pytest_homeassistant_custom_component.common import MockConfigEntry

    from custom_components.pulse.discovery import discover

    jbl = MockConfigEntry(domain="jbl_integration", title="JBL")
    jbl.add_to_hass(hass)
    devices = dr.async_get(hass)
    entities = er.async_get(hass)
    bar = devices.async_get_or_create(config_entry_id=jbl.entry_id, identifiers={("jbl", "bar")}, name="JBL BAR")
    entities.async_get_or_create("media_player", "jbl_integration", "bar", device_id=bar.id, config_entry=jbl)
    rear = devices.async_get_or_create(
        config_entry_id=jbl.entry_id, identifiers={("jbl", "rear")}, name="Rear Speaker", via_device_id=bar.id
    )
    entities.async_get_or_create(
        "sensor",
        "jbl_integration",
        "rear_battery",
        device_id=rear.id,
        config_entry=jbl,
        original_device_class="battery",
    )
    # Ohne via_device, aber im selben Eintrag wie der Mediaplayer
    side = devices.async_get_or_create(config_entry_id=jbl.entry_id, identifiers={("jbl", "side")}, name="Side")
    entities.async_get_or_create(
        "sensor",
        "jbl_integration",
        "side_battery",
        device_id=side.id,
        config_entry=jbl,
        original_device_class="battery",
    )
    # Ein Mediaplayer über eine Funk-Brücke (MQTT) schließt die übrigen Zigbee-Geräte nicht aus
    mqtt = add_device(
        hass,
        "door",
        "Türkontakt",
        [("binary_sensor", "contact", "door"), ("sensor", "battery", "battery")],
        platform="mqtt",
    )
    add_device(hass, "speaker", "MQTT-Lautsprecher", [("media_player", "player", None)], platform="mqtt")

    found = discover(hass)
    assert [s.name for s in found.values()] == ["Türkontakt"]
    assert mqtt.device_id in found


async def test_activity_ignores_restart_echo(hass: HomeAssistant, setup):
    monitor = setup["monitor"]
    devices = setup["devices"]
    door = monitor.devices[devices["door"].device_id]
    contact = devices["door"].entities["contact"]
    before = list(door.record["events"])
    hass.states.async_set(contact, "unavailable")
    hass.states.async_set(contact, "on")  # Wert direkt nach „nicht verfügbar“ = Echo
    await hass.async_block_till_done()
    assert door.record["events"] == before
    setup["freezer"].tick(timedelta(seconds=30))
    hass.states.async_set(contact, "off")
    await hass.async_block_till_done()
    assert len(door.record["events"]) == len(before) + 1
    assert len(door.record["actions"]) == 1
    # Gleicher Wert erneut gemeldet (state_reported) zählt als Lebenszeichen, nicht als Aktion
    setup["freezer"].tick(timedelta(seconds=30))
    hass.states.async_set(contact, "off", force_update=False)
    hass.states.async_set(contact, "off")
    await hass.async_block_till_done()
    assert len(door.record["actions"]) == 1


async def test_silence_becomes_failed_with_repair_event_and_push(hass: HomeAssistant, setup):
    monitor = setup["monitor"]
    devices = setup["devices"]
    thermo_id = devices["thermo"].device_id
    now = time.time()
    seed(monitor, thermo_id, 1800, 200, now - 7 * 3600)
    events = async_capture_events(hass, EVENT_STATUS_CHANGED)
    await tick(hass, setup["freezer"], timedelta(minutes=1))
    thermo = monitor.devices[thermo_id]
    assert thermo.status == "failed"
    assert monitor.reason(thermo).startswith("Seit 7 Stunden still")
    issue = ir.async_get(hass).async_get_issue(DOMAIN, f"failed_{thermo_id}")
    assert issue is not None and issue.translation_placeholders["name"] == "Aquarium Temperatur"
    assert events and events[-1].data["status"] == "failed"
    pushes = setup["pushes"]
    assert len(pushes) == 1
    assert pushes[0].data["title"] == "Aquarium Temperatur antwortet nicht"
    assert pushes[0].data["data"]["actions"][0]["action"] == f"PULSE_REPLACED::{thermo_id}"
    # Keine Wiederholung beim nächsten Takt
    await tick(hass, setup["freezer"], timedelta(minutes=1))
    assert len(pushes) == 1
    # Problem-Entität
    problem = next(
        e.entity_id
        for e in er.async_get(hass).entities.values()
        if e.platform == DOMAIN and e.device_id == thermo_id and e.translation_key == "problem"
    )
    assert hass.states.get(problem).state == "on"
    # Gerät meldet sich wieder → gut, Hinweis weg, „läuft wieder“
    hass.states.async_set(devices["thermo"].entities["temperature"], "25.4")
    await hass.async_block_till_done()
    assert thermo.status == "ok"
    assert ir.async_get(hass).async_get_issue(DOMAIN, f"failed_{thermo_id}") is None
    assert pushes[-1].data["title"] == "Aquarium Temperatur läuft wieder"


async def test_critical_push_and_quiet_hours(hass: HomeAssistant, setup):
    monitor = setup["monitor"]
    devices = setup["devices"]
    leak_id = devices["leak"].device_id
    door_id = devices["door"].device_id
    # 23:00 Ortszeit: Ruhezeit
    setup["freezer"].move_to("2026-10-03 21:00:00+00:00")
    now = time.time()
    seed(monitor, leak_id, 3000, 200, now - 6 * 3600)
    seed(monitor, door_id, 3000, 200, now - 2 * 86400)
    await tick(hass, setup["freezer"], timedelta(minutes=1))
    pushes = setup["pushes"]
    # Lecksensor kritisch → sofort trotz Ruhezeit; Türkontakt wartet
    assert [p.data["title"] for p in pushes] == ["Lecksensor Bad antwortet nicht"]
    assert pushes[0].data["data"]["push"]["sound"]["critical"] == 1
    assert len(monitor.notifier.queue) == 1
    # Nach der Ruhezeit nachgeliefert
    setup["freezer"].move_to("2026-10-04 06:00:00+00:00")
    seed(monitor, leak_id, 3000, 200, time.time() - 60)  # Lecksensor wieder da
    await tick(hass, setup["freezer"], timedelta(minutes=1))
    titles = [p.data["title"] for p in pushes]
    assert "Türkontakt Wohnungstür antwortet nicht" in titles
    assert not monitor.notifier.queue


async def test_partner_check(hass: HomeAssistant, setup):
    monitor = setup["monitor"]
    devices = setup["devices"]
    door_id, lock_id = devices["door"].device_id, devices["lock"].device_id
    now = time.time()
    seed(monitor, door_id, 600, 300, now)  # funkt noch (Heartbeat) …
    door = monitor.devices[door_id]
    door.record["actions"] = [now - 6 * 3600]  # … hat aber seit 6 h nichts erkannt
    monitor.devices[lock_id].record["actions"] = [now - 3 * 3600, now - 2 * 3600, now - 3600, now - 600]
    monitor.update_device(door_id, {"partner": lock_id})
    assert door.status == "check"
    assert monitor.reason(door) == "Türschloss war 4× aktiv, Türkontakt Wohnungstür hat sich seitdem nicht gemeldet."


def settle(monitor: PulseMonitor) -> None:
    """Home Assistant läuft schon länger (keine Start-Echos mehr)."""
    monitor.started_at = time.time() - 600


async def test_battery_replacement_auto_and_manual(hass: HomeAssistant, setup):
    monitor = setup["monitor"]
    devices = setup["devices"]
    door_id = devices["door"].device_id
    voltage = devices["door"].entities["voltage"]
    settle(monitor)
    replaced = async_capture_events(hass, EVENT_BATTERY_REPLACED)
    # Echter Wechsel: 1,2 V → 1,5 V, von der nächsten Meldung bestätigt
    hass.states.async_set(voltage, "1500")
    await hass.async_block_till_done()
    assert replaced == []  # erst vorgemerkt
    hass.states.async_set(voltage, "1500")  # gleicher Wert erneut gemeldet
    await hass.async_block_till_done()
    assert [e.data["source"] for e in replaced] == ["auto"]
    assert monitor.devices[door_id].record["replaced_source"] == ["auto"]
    # Gerät hatte kein Problem und keine schwache Batterie → still im Panel, keine Mitteilung
    await tick(hass, setup["freezer"], timedelta(minutes=4))
    assert not [p for p in setup["pushes"] if p.data["title"] == "Batteriewechsel erkannt"]
    # derselbe Wechsel zählt nicht doppelt
    hass.states.async_set(voltage, "1100")
    hass.states.async_set(voltage, "1500")
    hass.states.async_set(voltage, "1500")
    await hass.async_block_till_done()
    assert len(replaced) == 1
    await hass.services.async_call(DOMAIN, "mark_replaced", {"device_id": door_id}, blocking=True)
    assert [e.data["source"] for e in replaced] == ["auto", "manual"]
    assert monitor.devices[door_id].record["replaced_source"] == ["auto", "manual"]


async def test_battery_restart_sequence_is_no_replacement(hass: HomeAssistant, setup):
    """Neustart: unavailable → unknown → 1200 → 1300 (erst gerundet, dann genau) ist kein Wechsel."""
    monitor = setup["monitor"]
    devices = setup["devices"]
    voltage = devices["door"].entities["voltage"]
    battery = devices["thermo"].entities["battery"]
    replaced = async_capture_events(hass, EVENT_BATTERY_REPLACED)
    settle(monitor)
    for value in ("unavailable", "unknown", "1200", "1300", "1300"):
        hass.states.async_set(voltage, value)
        await hass.async_block_till_done()
    # NiMH-Rauschen und kleine Sprünge zählen nie (unter 15 % bzw. 150 mV)
    for value in ("1150", "1300", "1300"):
        hass.states.async_set(voltage, value)
        await hass.async_block_till_done()
    assert replaced == []
    # In den ersten Minuten nach dem Start zählt auch ein großer Sprung nicht
    monitor.started_at = time.time()
    for value in ("1000", "1500", "1500"):
        hass.states.async_set(voltage, value)
        await hass.async_block_till_done()
    hass.states.async_set(battery, "unknown")
    hass.states.async_set(battery, "20")
    hass.states.async_set(battery, "100")
    hass.states.async_set(battery, "100")
    await hass.async_block_till_done()
    assert replaced == []
    # Ein Sprung, den die nächste Meldung nicht bestätigt, verfällt
    settle(monitor)
    hass.states.async_set(battery, "20")
    hass.states.async_set(battery, "100")
    hass.states.async_set(battery, "21")
    await hass.async_block_till_done()
    assert replaced == []
    # Prozent: 20 → 100 ohne Echo, bestätigt → Wechsel
    hass.states.async_set(battery, "20")
    hass.states.async_set(battery, "100")
    hass.states.async_set(battery, "100")
    await hass.async_block_till_done()
    assert [e.data["source"] for e in replaced] == ["auto"]


async def test_voltage_in_volts_is_normalised(hass: HomeAssistant, setup):
    """ZHA meldet Volt: Panel und Wechsel-Erkennung rechnen in mV, ein alter Volt-Wert löst keinen Wechsel aus."""
    monitor = setup["monitor"]
    devices = setup["devices"]
    door_id = devices["door"].device_id
    voltage = devices["door"].entities["voltage"]
    settle(monitor)
    replaced = async_capture_events(hass, EVENT_BATTERY_REPLACED)
    hass.states.async_set(voltage, "1.21", {"unit_of_measurement": "V"})
    hass.states.async_set(voltage, "1.22", {"unit_of_measurement": "V"})
    await hass.async_block_till_done()
    door = monitor.devices[door_id]
    assert door.record["last_voltage"] == pytest.approx(1220)
    assert monitor.serialize(door, time.time())["battery"]["voltage"] == pytest.approx(1220)
    assert replaced == []
    hass.states.async_set(voltage, "1.5", {"unit_of_measurement": "V"})
    hass.states.async_set(voltage, "1.5", {"unit_of_measurement": "V"})
    await hass.async_block_till_done()
    assert [e.data["source"] for e in replaced] == ["auto"]


async def test_replacement_pushes_bundled(hass: HomeAssistant, setup):
    """Mitteilung nur bei vorherigem Problem/schwacher Batterie; viele auf einmal: eine oder keine."""
    monitor = setup["monitor"]
    ids = [d.device_id for d in setup["devices"].values()]
    pushes = setup["pushes"]

    def titles() -> list[str]:
        return [p.data["title"] for p in pushes]

    for device_id in ids:
        monitor.devices[device_id].record["last_level"] = 10  # alle mit schwacher Batterie
    # Einer: nach kurzer Wartezeit eine eigene Mitteilung
    monitor.mark_replaced(ids[0], "auto")
    await tick(hass, setup["freezer"], timedelta(minutes=1))
    assert "Batteriewechsel erkannt" not in titles()
    await tick(hass, setup["freezer"], timedelta(minutes=3))
    assert titles().count("Batteriewechsel erkannt") == 1
    # Drei innerhalb von 10 Minuten: höchstens eine gemeinsame Mitteilung
    await tick(hass, setup["freezer"], timedelta(minutes=15))
    pushes.clear()
    for device_id in ids[1:]:
        monitor.mark_replaced(device_id, "auto")
    monitor.devices[ids[0]].record["replaced"] = []
    monitor.mark_replaced(ids[0], "auto")  # vierter auf einmal → Neustart-Artefakt
    await tick(hass, setup["freezer"], timedelta(minutes=4))
    assert not [t for t in titles() if "Batteriewechsel" in t]
    # Genau drei: eine gemeinsame
    await tick(hass, setup["freezer"], timedelta(minutes=15))
    pushes.clear()
    for device_id in ids[:3]:
        monitor.devices[device_id].record["replaced"] = []
        monitor.mark_replaced(device_id, "auto")
    await tick(hass, setup["freezer"], timedelta(minutes=4))
    assert [t for t in titles() if "Batteriewechsel" in t] == ["3 Batteriewechsel erkannt"]
    # Ohne Problem und mit voller Batterie: keine Mitteilung
    await tick(hass, setup["freezer"], timedelta(minutes=15))
    pushes.clear()
    monitor.devices[ids[3]].record["replaced"] = []
    monitor.devices[ids[3]].record["last_level"] = 90
    monitor.mark_replaced(ids[3], "auto")
    await tick(hass, setup["freezer"], timedelta(minutes=4))
    assert not [t for t in titles() if "Batteriewechsel" in t]


def test_store_migration_drops_old_replacements():
    from custom_components.pulse.store import migrate

    data = {"devices": {"a": {"replaced": [1.0, 2.0], "events": [1.0]}}}
    migrated = migrate(2, data)
    assert migrated["devices"]["a"]["replaced"] == []
    assert migrated["devices"]["a"]["replaced_source"] == []
    assert migrated["devices"]["a"]["events"] == [1.0]
    kept = migrate(3, {"devices": {"a": {"replaced": [5.0]}}})
    assert kept["devices"]["a"]["replaced"] == [5.0]


async def test_services_snooze_ignore_test(hass: HomeAssistant, setup):
    monitor = setup["monitor"]
    devices = setup["devices"]
    thermo_id = devices["thermo"].device_id
    await hass.services.async_call(DOMAIN, "snooze", {"device_id": thermo_id, "hours": 2}, blocking=True)
    assert monitor.devices[thermo_id].record["snooze_until"] > time.time()
    # Stummes Gerät während „später“ → keine Mitteilung
    seed(monitor, thermo_id, 1800, 200, time.time() - 8 * 3600)
    await tick(hass, setup["freezer"], timedelta(minutes=1))
    assert not setup["pushes"]
    # Nach Ablauf genau eine Erinnerung
    await tick(hass, setup["freezer"], timedelta(hours=2, minutes=1))
    assert len(setup["pushes"]) == 1
    await hass.services.async_call(DOMAIN, "ignore", {"device_id": thermo_id}, blocking=True)
    await tick(hass, setup["freezer"], timedelta(seconds=2))
    assert monitor.devices[thermo_id].ignored
    assert ir.async_get(hass).async_get_issue(DOMAIN, f"failed_{thermo_id}") is None
    assert hass.states.get("sensor.pulse_uberwachte_gerate").state == "3"
    response = await hass.services.async_call(DOMAIN, "send_test", {}, blocking=True, return_response=True)
    assert response == {"targets": ["mobile_app_alex"]}
    assert setup["pushes"][-1].data["title"] == "Pulse-Testmitteilung"
    with pytest.raises(ServiceValidationError, match=r"monitor|überwacht"):
        await hass.services.async_call(DOMAIN, "snooze", {"device_id": "gibtsnicht"}, blocking=True)


async def test_notification_actions(hass: HomeAssistant, setup):
    monitor = setup["monitor"]
    thermo_id = setup["devices"]["thermo"].device_id
    hass.bus.async_fire("mobile_app_notification_action", {"action": f"PULSE_LATER::{thermo_id}"})
    await hass.async_block_till_done()
    assert monitor.devices[thermo_id].record["snooze_until"] is not None
    hass.bus.async_fire("mobile_app_notification_action", {"action": f"PULSE_REPLACED::{thermo_id}"})
    hass.bus.async_fire("mobile_app_notification_action", {"action": "ANDERE_APP"})
    await hass.async_block_till_done()
    assert len(monitor.devices[thermo_id].record["replaced"]) == 1


async def test_daily_summary(hass: HomeAssistant, setup):
    monitor = setup["monitor"]
    devices = setup["devices"]
    # Türkontakt still → „prüfen“ (Stufe täglich)
    door_id = devices["door"].device_id
    monitor.store.settings["levels"]["failed"] = "daily"
    seed(monitor, door_id, 3000, 200, time.time() - 4 * 3600)
    hass.states.async_set(devices["thermo"].entities["battery"], "12")
    monitor.devices[devices["thermo"].device_id].record["battery_type"] = "CR2032"
    await tick(hass, setup["freezer"], timedelta(minutes=1))
    assert monitor.devices[door_id].status == "check"
    assert not setup["pushes"]
    setup["freezer"].move_to("2026-10-03 16:00:30+00:00")  # 18:00 Ortszeit
    await tick(hass, setup["freezer"], timedelta(seconds=1))
    pushes = setup["pushes"]
    assert len(pushes) == 1
    assert pushes[0].data["title"] == "Heute: 1 Gerät prüfen"
    assert pushes[0].data["message"].startswith("Türkontakt Wohnungstür: Seit 10 Stunden still.")
    assert "Bald fällig: 1× CR2032." in pushes[0].data["message"]
    # Die Übersicht nennt dieselbe schwache Batterie (gleiche Schwelle wie der Status)
    assert monitor.snapshot()["summary"]["low_batteries"] == ["Aquarium Temperatur"]
    # Der Tag ist gespeichert: nach einem Neustart kurz danach keine zweite Zusammenfassung
    assert monitor.store.summary_sent == "2026-10-03"
    await tick(hass, setup["freezer"], timedelta(minutes=1))
    assert len(pushes) == 1


async def test_replaced_from_push_does_not_renotify(hass: HomeAssistant, setup):
    """„Batterie gewechselt“ aus der Mitteilung: die Stille zählt neu, kein sofortiges „antwortet nicht“."""
    monitor = setup["monitor"]
    thermo_id = setup["devices"]["thermo"].device_id
    seed(monitor, thermo_id, 1800, 200, time.time() - 7 * 3600)
    await tick(hass, setup["freezer"], timedelta(minutes=1))
    assert len(setup["pushes"]) == 1
    hass.bus.async_fire("mobile_app_notification_action", {"action": f"PULSE_REPLACED::{thermo_id}"})
    await tick(hass, setup["freezer"], timedelta(minutes=1))
    assert len(setup["pushes"]) == 1
    thermo = monitor.devices[thermo_id]
    assert (thermo.status, thermo.reason["key"]) == ("watch", "waiting_first")
    # Bleibt es danach still, meldet Pulse es wieder
    await tick(hass, setup["freezer"], timedelta(hours=8))
    assert [p.data["title"] for p in setup["pushes"]][-1] == "Aquarium Temperatur antwortet nicht"


async def test_quiet_queue_keeps_latest_per_device(hass: HomeAssistant, setup):
    """Nachts ausgefallen und wieder da: morgens weder „antwortet nicht“ noch „läuft wieder“."""
    monitor = setup["monitor"]
    devices = setup["devices"]
    thermo_id = devices["thermo"].device_id
    setup["freezer"].move_to("2026-10-03 21:00:00+00:00")  # 23:00 Ortszeit
    seed(monitor, thermo_id, 1800, 200, time.time() - 7 * 3600)
    await tick(hass, setup["freezer"], timedelta(minutes=1))
    assert len(monitor.notifier.queue) == 1
    hass.states.async_set(devices["thermo"].entities["temperature"], "25.4")
    await hass.async_block_till_done()
    assert monitor.devices[thermo_id].status == "ok"
    assert not monitor.notifier.queue
    setup["freezer"].move_to("2026-10-04 06:00:00+00:00")
    hass.states.async_set(devices["thermo"].entities["temperature"], "25.6")
    await tick(hass, setup["freezer"], timedelta(minutes=1))
    assert not setup["pushes"]


async def test_arrive_home_defers(hass: HomeAssistant, setup):
    monitor = setup["monitor"]
    hass.states.async_set("person.alex", "not_home")
    hass.states.async_set("person.sam", "not_home")
    # Mehrere Personen (eine gelöschte zählt nicht): zugestellt, sobald irgendeine zu Hause ist
    monitor.store.settings["arrive_home"] = {"enabled": True, "persons": ["person.alex", "person.sam", "person.gone"]}
    thermo_id = setup["devices"]["thermo"].device_id
    seed(monitor, thermo_id, 1800, 200, time.time() - 8 * 3600)
    await tick(hass, setup["freezer"], timedelta(minutes=1))
    assert not setup["pushes"]
    hass.states.async_set("person.sam", "home")
    await tick(hass, setup["freezer"], timedelta(minutes=1))
    assert len(setup["pushes"]) == 1


async def test_websocket_api(hass: HomeAssistant, setup, hass_ws_client):
    devices = setup["devices"]
    client = await hass_ws_client(hass)
    await client.send_json_auto_id({"type": "pulse/subscribe"})
    result = await client.receive_json()
    assert result["success"]
    event = await client.receive_json()
    snap: dict[str, Any] = event["event"]
    assert snap["summary"]["total"] == 4
    assert snap["targets"] == ["mobile_app_alex"]
    assert len(snap["devices"][0]["strip"]) == 84

    # Herzschlag-Kalender auf Anfrage: 15-min-Fenster über 7 Tage, unbekannte Geräte fehlen einfach
    door = devices["door"].device_id
    await client.send_json_auto_id({"type": "pulse/heartbeat", "device_ids": [door, "x"]})
    response = await client.receive_json()
    while response.get("type") == "event":
        response = await client.receive_json()
    beat = response["result"]
    assert beat["bin_minutes"] == 15
    assert beat["days"] == 7
    assert list(beat["devices"]) == [door]
    assert [len(day) for day in beat["devices"][door]] == [96] * 7  # Oktober vor der Zeitumstellung
    assert len(beat["day_starts"]) == 8 and snap["day_starts"][0] == snap["strip_start"]
    assert isinstance(beat["no_data"], list)
    assert isinstance(snap["no_data"], list)
    assert "AAA" in snap["battery_types"]
    assert snap["summary"]["low_batteries"] == []

    door_id, lock_id = devices["door"].device_id, devices["lock"].device_id
    await client.send_json_auto_id({"type": "pulse/device", "device_id": door_id, "partner": lock_id, "critical": True})
    assert (await client.receive_json())["success"]
    await client.send_json_auto_id({"type": "pulse/device", "device_id": door_id, "partner": door_id})
    response = await client.receive_json()
    assert response["error"]["code"] == "invalid_partner"
    await client.send_json_auto_id({"type": "pulse/device", "device_id": "x"})
    assert (await client.receive_json())["error"]["code"] == "unknown_device"
    for command in (
        {"type": "pulse/replaced", "device_id": "x"},
        {"type": "pulse/snooze", "device_id": "x", "hours": 1},
    ):
        await client.send_json_auto_id(command)
        assert (await client.receive_json())["error"]["code"] == "unknown_device"
    # Zigbee2MQTT-Thema: Platzhalter abgelehnt, gültiges übernommen
    await client.send_json_auto_id({"type": "pulse/settings", "settings": {"z2m_base": "z2m/#"}})
    assert not (await client.receive_json())["success"]
    await client.send_json_auto_id({"type": "pulse/settings", "settings": {"z2m_base": "zigbee2mqtt_2"}})
    response = await client.receive_json()
    while response.get("type") == "event":
        response = await client.receive_json()
    assert response["result"]["settings"]["z2m_base"] == "zigbee2mqtt_2"
    monitor = setup["monitor"]
    assert monitor.devices[door_id].record["partner"] == lock_id
    assert monitor.devices[door_id].critical

    await client.send_json_auto_id(
        {"type": "pulse/settings", "settings": {"levels": {"check": "now"}, "quiet": {"enabled": False}}}
    )
    response = await client.receive_json()
    while response.get("type") == "event":
        response = await client.receive_json()
    assert response["result"]["settings"]["levels"] == {"failed": "now", "check": "now", "battery": "daily"}
    assert response["result"]["settings"]["quiet"]["start"] == "22:00"

    for command in (
        {"type": "pulse/replaced", "device_id": door_id},
        {"type": "pulse/snooze", "device_id": door_id, "hours": 1},
    ):
        await client.send_json_auto_id(command)
        response = await client.receive_json()
        while response.get("type") == "event":
            response = await client.receive_json()
        assert response["success"]

    # Rückgängig nimmt den frischen Wechsel zurück, ein zweites Mal gibt es nichts mehr
    before = len(monitor.devices[door_id].record["replaced"])
    for expected in (True, False):
        await client.send_json_auto_id({"type": "pulse/replaced_undo", "device_id": door_id})
        response = await client.receive_json()
        while response.get("type") == "event":
            response = await client.receive_json()
        assert response["result"] == {"undone": expected}
    assert len(monitor.devices[door_id].record["replaced"]) == before - 1
    await client.send_json_auto_id({"type": "pulse/replaced_undo", "device_id": "x"})
    response = await client.receive_json()
    while response.get("type") == "event":
        response = await client.receive_json()
    assert response["result"] == {"undone": False}

    await client.send_json_auto_id({"type": "pulse/test"})
    response = await client.receive_json()
    while response.get("type") == "event":
        response = await client.receive_json()
    assert response["result"] == {"targets": ["mobile_app_alex"]}

    await client.send_json_auto_id({"type": "pulse/summary"})
    response = await client.receive_json()
    while response.get("type") == "event":
        response = await client.receive_json()
    assert response["result"] == {"sent": False}

    await client.send_json_auto_id({"type": "pulse/enable_z2m"})
    response = await client.receive_json()
    while response.get("type") == "event":
        response = await client.receive_json()
    assert response["error"]["code"] == "no_z2m"


async def test_unload_and_remove(hass: HomeAssistant, setup):
    entry = setup["entry"]
    monitor = setup["monitor"]
    seed(monitor, setup["devices"]["thermo"].device_id, 1800, 200, time.time() - 8 * 3600)
    await tick(hass, setup["freezer"], timedelta(minutes=1))
    assert await hass.config_entries.async_unload(entry.entry_id)
    assert await hass.config_entries.async_remove(entry.entry_id)
    assert not [i for (d, i) in ir.async_get(hass).issues if d == DOMAIN]


async def test_store_survives_restart(hass: HomeAssistant, setup, hass_storage):
    entry = setup["entry"]
    monitor = setup["monitor"]
    door_id = setup["devices"]["door"].device_id
    monitor.update_device(door_id, {"battery_type": "CR2032", "battery_count": 2})
    monitor.store.settings["summary_time"] = "19:30"
    assert await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()
    monitor = entry.runtime_data
    assert monitor.devices[door_id].record["battery_type"] == "CR2032"
    assert monitor.store.settings["summary_time"] == "19:30"


async def test_vanished_device_cleans_up(hass: HomeAssistant, setup):
    """Gerät endgültig weg (Integration ersetzt) → Pulse-Entitäten + Datensatz weg, Nachfolger ohne _2."""
    monitor: PulseMonitor = setup["monitor"]
    devices = setup["devices"]
    door_id = devices["door"].device_id
    reg = er.async_get(hass)
    assert reg.async_get("binary_sensor.turkontakt_wohnungstur_pulse_problem")

    dr.async_get(hass).async_remove_device(door_id)
    await hass.async_block_till_done()
    monitor._rediscover()
    await hass.async_block_till_done()
    assert door_id not in monitor.devices
    assert door_id not in monitor.store.devices
    assert not [e for e in reg.entities.values() if e.platform == DOMAIN and e.unique_id.startswith(door_id)]
    # Hub-Entitäten bleiben
    assert hass.states.get("sensor.pulse_uberwachte_gerate") is not None

    # Nachfolger mit gleichem Namen (neue Integration) bekommt die alten IDs
    successor = add_device(
        hass,
        "door_new",
        "Türkontakt Wohnungstür",
        [("binary_sensor", "contact", "door"), ("sensor", "battery", "battery")],
        ieee="0x0099",
    )
    hass.states.async_set(successor.entities["battery"], "90")
    monitor._rediscover()
    await hass.async_block_till_done()
    assert successor.device_id in monitor.devices
    entry = reg.async_get("binary_sensor.turkontakt_wohnungstur_pulse_problem")
    assert entry is not None and entry.device_id == successor.device_id


async def test_device_without_entities_keeps_pulse_entities(hass: HomeAssistant, setup):
    """Gerät noch in der Registry (z. B. Integration gerade nicht geladen) → nichts löschen."""
    monitor: PulseMonitor = setup["monitor"]
    devices = setup["devices"]
    door_id = devices["door"].device_id
    reg = er.async_get(hass)
    for entity_id in devices["door"].entities.values():
        reg.async_remove(entity_id)
    await hass.async_block_till_done()
    monitor._rediscover()
    await hass.async_block_till_done()
    assert door_id not in monitor.devices
    assert door_id in monitor.store.devices
    assert reg.async_get("binary_sensor.turkontakt_wohnungstur_pulse_problem") is not None
