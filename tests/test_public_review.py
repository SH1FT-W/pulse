"""Funde der Veröffentlichungs-Prüfung: Merker nach Neustart, verlorene Warteschlange, Sturm-Bremse,
Zusammenfassung nachholen, Grenzen, Warn-Sensoren, Nutzersprache."""

from __future__ import annotations

from datetime import timedelta
import time
from typing import Any
from unittest.mock import AsyncMock

from homeassistant.core import HomeAssistant
import pytest
import voluptuous as vol

from common import add_device, seed, tick
from custom_components.pulse.const import DOMAIN


async def _reload(hass: HomeAssistant, setup) -> Any:
    assert await hass.config_entries.async_reload(setup["entry"].entry_id)
    await hass.async_block_till_done()
    setup["monitor"] = setup["entry"].runtime_data
    return setup["monitor"]


async def test_recovery_while_offline_clears_notified(hass: HomeAssistant, setup):
    """Ausfall gemeldet, Batterie gewechselt, während HA aus war: nach dem Start ist das Gerät gut –
    der Merker muss weg, sonst bliebe der nächste Ausfall für immer stumm."""
    monitor = setup["monitor"]
    thermo_id = setup["devices"]["thermo"].device_id
    seed(monitor, thermo_id, 1800, 200, time.time() - 8 * 3600)
    await tick(hass, setup["freezer"], timedelta(minutes=1))
    assert len(setup["pushes"]) == 1
    assert monitor.devices[thermo_id].record["notified"] == "failed"
    # „Erholt“ ohne beobachteten Übergang: frische Meldungen im Speicher, dann Neustart
    seed(monitor, thermo_id, 1800, 200, time.time() - 60)
    monitor = await _reload(hass, setup)
    await tick(hass, setup["freezer"], timedelta(minutes=1))
    assert monitor.devices[thermo_id].status == "ok"
    assert monitor.devices[thermo_id].record["notified"] is None
    assert len(setup["pushes"]) == 1  # kein „läuft wieder“ – den Übergang hat Pulse nicht gesehen
    # Nächster Ausfall wird wieder gemeldet
    seed(monitor, thermo_id, 1800, 200, time.time() - 8 * 3600)
    await tick(hass, setup["freezer"], timedelta(minutes=1))
    assert len(setup["pushes"]) == 2


async def test_queued_notification_survives_restart(hass: HomeAssistant, setup):
    """In der Ruhezeit zurückgehalten, dann Neustart: die Mitteilung kommt trotzdem nach der Ruhezeit."""
    monitor = setup["monitor"]
    door_id = setup["devices"]["door"].device_id
    setup["freezer"].move_to("2026-10-03 21:00:00+00:00")  # 23:00 Ortszeit
    seed(monitor, door_id, 3000, 200, time.time() - 2 * 86400)
    await tick(hass, setup["freezer"], timedelta(minutes=1))
    assert not setup["pushes"] and len(monitor.notifier.queue) == 1
    assert monitor.devices[door_id].record["notified"] == "failed"
    monitor = await _reload(hass, setup)  # die Warteschlange ist flüchtig – nach dem Start wieder eingereiht
    await tick(hass, setup["freezer"], timedelta(minutes=1))
    assert not setup["pushes"]  # weiter Ruhezeit: nicht geschickt
    assert len(monitor.notifier.queue) == 1
    setup["freezer"].move_to("2026-10-04 06:00:00+00:00")
    await tick(hass, setup["freezer"], timedelta(minutes=1))
    assert [p.data["title"] for p in setup["pushes"]] == ["Türkontakt Wohnungstür antwortet nicht"]
    assert monitor.devices[door_id].record["told"] is True
    await tick(hass, setup["freezer"], timedelta(minutes=1))
    assert len(setup["pushes"]) == 1


async def test_burst_becomes_one_notification(hass: HomeAssistant, setup):
    """Koordinator weg: viele Geräte fallen im selben Takt aus → eine gemeinsame, nicht kritische Mitteilung."""
    monitor = setup["monitor"]
    devices = setup["devices"]
    now = time.time()
    for key in ("thermo", "door", "leak", "lock"):
        seed(monitor, devices[key].device_id, 1800, 200, now - 8 * 3600)
    await tick(hass, setup["freezer"], timedelta(minutes=1))
    pushes = setup["pushes"]
    assert len(pushes) == 1
    assert pushes[0].data["title"] == "4 Geräte auf einmal still"
    assert "Lecksensor Bad" in pushes[0].data["message"]
    assert "critical" not in str(pushes[0].data["data"].get("push"))
    assert all(monitor.devices[devices[k].device_id].record["told"] for k in devices)
    await tick(hass, setup["freezer"], timedelta(minutes=1))
    assert len(pushes) == 1
    # Erholt sich eines, kommt „läuft wieder“ wie sonst
    hass.states.async_set(devices["thermo"].entities["temperature"], "25.4")
    await hass.async_block_till_done()
    assert pushes[-1].data["title"] == "Aquarium Temperatur läuft wieder"


async def test_burst_in_quiet_hours_waits(hass: HomeAssistant, setup):
    monitor = setup["monitor"]
    devices = setup["devices"]
    setup["freezer"].move_to("2026-10-03 21:00:00+00:00")
    now = time.time()
    for key in ("thermo", "door", "leak"):
        seed(monitor, devices[key].device_id, 1800, 200, now - 8 * 3600)
    await tick(hass, setup["freezer"], timedelta(minutes=1))
    assert not setup["pushes"] and len(monitor.notifier.queue) == 1
    setup["freezer"].move_to("2026-10-04 06:00:00+00:00")
    await tick(hass, setup["freezer"], timedelta(minutes=1))
    assert [p.data["title"] for p in setup["pushes"]] == ["3 Geräte auf einmal still"]


async def test_summary_catches_up_after_downtime(hass: HomeAssistant, setup):
    """HA lief zur Zusammenfassungszeit nicht: bis zu zwei Stunden danach kommt sie trotzdem."""
    monitor = setup["monitor"]
    door_id = setup["devices"]["door"].device_id
    monitor.store.settings["levels"]["failed"] = "daily"
    seed(monitor, door_id, 3000, 200, time.time() - 4 * 3600)
    await tick(hass, setup["freezer"], timedelta(minutes=1))
    setup["freezer"].move_to("2026-10-03 17:30:00+00:00")  # 19:30 Ortszeit, 90 Minuten nach 18:00
    await tick(hass, setup["freezer"], timedelta(seconds=1))
    assert [p.data["title"] for p in setup["pushes"]] == ["Heute: 1 Gerät prüfen"]


async def test_summary_too_late_is_skipped(hass: HomeAssistant, setup):
    monitor = setup["monitor"]
    door_id = setup["devices"]["door"].device_id
    monitor.store.settings["levels"]["failed"] = "daily"
    seed(monitor, door_id, 3000, 200, time.time() - 4 * 3600)
    await tick(hass, setup["freezer"], timedelta(minutes=1))
    setup["freezer"].move_to("2026-10-03 19:00:00+00:00")  # 21:00 Ortszeit – zu spät
    await tick(hass, setup["freezer"], timedelta(seconds=1))
    assert not setup["pushes"]
    assert monitor.store.summary_sent == "2026-10-03"


async def test_deferred_summary_survives_restart(hass: HomeAssistant, setup):
    """Zusammenfassung wartet aufs Heimkommen; dazwischen Neustart – sie kommt beim Heimkommen trotzdem."""
    monitor = setup["monitor"]
    door_id = setup["devices"]["door"].device_id
    hass.states.async_set("person.alex", "not_home")
    monitor.store.settings["levels"]["failed"] = "daily"
    monitor.store.settings["arrive_home"] = {"enabled": True, "persons": ["person.alex"]}
    seed(monitor, door_id, 3000, 200, time.time() - 4 * 3600)
    await tick(hass, setup["freezer"], timedelta(minutes=1))
    setup["freezer"].move_to("2026-10-03 16:00:30+00:00")
    await tick(hass, setup["freezer"], timedelta(seconds=1))
    assert not setup["pushes"]
    assert monitor.store.summary_pending == "2026-10-03"
    monitor = await _reload(hass, setup)
    await tick(hass, setup["freezer"], timedelta(minutes=1))
    assert not setup["pushes"]  # weiter unterwegs
    hass.states.async_set("person.alex", "home")
    await tick(hass, setup["freezer"], timedelta(minutes=1))
    assert [p.data["title"] for p in setup["pushes"]] == ["Heute: 1 Gerät prüfen"]
    assert monitor.store.summary_pending is None
    await tick(hass, setup["freezer"], timedelta(minutes=1))
    assert len(setup["pushes"]) == 1


async def test_snooze_hours_are_bounded(hass: HomeAssistant, setup, hass_ws_client):
    thermo_id = setup["devices"]["thermo"].device_id
    with pytest.raises(vol.Invalid):
        await hass.services.async_call(DOMAIN, "snooze", {"device_id": thermo_id, "hours": 1e12}, blocking=True)
    client = await hass_ws_client(hass)
    await client.send_json_auto_id({"type": "pulse/snooze", "device_id": thermo_id, "hours": 1e12})
    result = await client.receive_json()
    assert not result["success"]
    assert setup["monitor"].devices[thermo_id].record.get("snooze_until") is None


async def test_binary_battery_sensor_has_no_percentage(hass: HomeAssistant, setup):
    """Geräte mit „Batterie schwach“ an/aus bekommen keinen erfundenen Prozentwert."""
    monitor = setup["monitor"]
    dev = add_device(
        hass,
        "zwave",
        "Rauchmelder Flur",
        [("binary_sensor", "smoke", "smoke"), ("binary_sensor", "battery", "battery")],
        manufacturer="Fibaro",
        model="Smoke Sensor",
    )
    hass.states.async_set(dev.entities["smoke"], "off")
    hass.states.async_set(dev.entities["battery"], "off")
    await tick(hass, setup["freezer"], timedelta(seconds=6))
    device = monitor.devices[dev.device_id]
    seed(monitor, dev.device_id, 3600, 200, time.time() - 60)
    await tick(hass, setup["freezer"], timedelta(minutes=1))
    assert device.status == "ok"
    assert device.record["last_level"] is None
    hass.states.async_set(dev.entities["battery"], "on")
    await tick(hass, setup["freezer"], timedelta(minutes=1))
    assert device.status == "check"
    assert device.reason["key"] == "battery_low_flag"
    assert monitor.reason(device) == "Das Gerät meldet eine schwache Batterie."
    assert monitor.reason(device, "en") == "The device reports a low battery."
    snap = next(d for d in monitor.snapshot()["devices"] if d["id"] == dev.device_id)
    assert snap["battery"]["level"] is None and snap["battery"]["flag"] and snap["battery"]["low"]
    assert monitor.notifier.level_for(device) == "daily"  # Stufe „Batterie“, nicht „Prüfen“
    assert not setup["pushes"]
    hass.states.async_set(dev.entities["battery"], "off")
    await tick(hass, setup["freezer"], timedelta(minutes=1))
    assert device.status == "ok"


async def test_subscribe_in_user_language(hass: HomeAssistant, setup, hass_ws_client):
    monitor = setup["monitor"]
    thermo_id = setup["devices"]["thermo"].device_id
    seed(monitor, thermo_id, 1800, 200, time.time() - 8 * 3600)
    await tick(hass, setup["freezer"], timedelta(minutes=1))
    client = await hass_ws_client(hass)
    await client.send_json_auto_id({"type": "pulse/subscribe", "language": "en-GB"})
    assert (await client.receive_json())["success"]
    snap = (await client.receive_json())["event"]
    thermo = next(d for d in snap["devices"] if d["id"] == thermo_id)
    assert thermo["reason"].startswith("Silent for 8 hours")
    assert snap["language"] == "en-GB"
    assert monitor.reason(monitor.devices[thermo_id]).startswith("Seit 8 Stunden still")


async def test_remove_entry_deletes_store(hass: HomeAssistant, setup, hass_storage):
    entry = setup["entry"]
    await setup["monitor"].store.async_save()
    assert "pulse.devices" in hass_storage
    assert await hass.config_entries.async_remove(entry.entry_id)
    await hass.async_block_till_done()
    assert "pulse.devices" not in hass_storage


async def test_z2m_is_retried_when_mqtt_was_late(hass: HomeAssistant, setup):
    monitor = setup["monitor"]
    assert monitor.z2m is None
    monitor._async_start_z2m = AsyncMock()  # type: ignore[method-assign]
    await tick(hass, setup["freezer"], timedelta(minutes=6))
    monitor._async_start_z2m.assert_not_called()  # ohne MQTT kein Versuch
    hass.config.components.add("mqtt")
    monitor._z2m_tried = time.time()
    await tick(hass, setup["freezer"], timedelta(minutes=1))
    monitor._async_start_z2m.assert_not_called()  # noch keine 5 Minuten seit dem letzten Versuch
    await tick(hass, setup["freezer"], timedelta(minutes=5))
    monitor._async_start_z2m.assert_awaited_once()
