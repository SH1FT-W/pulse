"""Funde der Code-Sichtung vom 17.10.2026: Schreibhäufigkeit, Ereignisse, Rechte, Lebenszeichen."""

from __future__ import annotations

from datetime import timedelta
import time
from unittest.mock import AsyncMock, patch

from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry as er
from pytest_homeassistant_custom_component.common import async_capture_events

from common import add_device, seed, tick
from custom_components.pulse.const import DOMAIN, EVENT_STATUS_CHANGED
from custom_components.pulse.monitor import PulseMonitor
from custom_components.pulse.store import SAVE_DELAY, SAVE_DELAY_EVENTS, PulseStore

# ── 1. Schreibhäufigkeit ─────────────────────────────────────────────────


async def test_store_replans_only_when_sooner(hass: HomeAssistant):
    """Ein anstehendes Speichern wird nur vorgezogen, nie nach hinten geschoben."""
    store = PulseStore(hass)
    with patch.object(store._store, "async_delay_save") as planned:
        store.async_delay_save(SAVE_DELAY_EVENTS)
        store.async_delay_save(SAVE_DELAY_EVENTS)
        assert planned.call_count == 1
        store.async_delay_save(SAVE_DELAY)  # früher gewünscht: neu planen
        assert planned.call_count == 2
        store.async_delay_save(SAVE_DELAY_EVENTS)  # später gewünscht: das kurze bleibt
        assert planned.call_count == 2
        store._write_data()  # geschrieben: das nächste plant wieder
        store.async_delay_save(SAVE_DELAY_EVENTS)
        assert planned.call_count == 3


async def test_uptime_and_reports_do_not_write_every_minute(hass: HomeAssistant, setup):
    """Laufzeit-Stempel und laufende Meldungen schrieben jede Minute die ganze Datei."""
    store: PulseStore = setup["monitor"].store
    entity = setup["devices"]["thermo"].entities["temperature"]
    writes: list[float] = []
    original = store._write_data

    def counting():
        writes.append(time.time())
        return original()

    with patch.object(store, "_write_data", counting):
        for i in range(12):
            await tick(hass, setup["freezer"], timedelta(minutes=1))
            hass.states.async_set(entity, str(20 + (i % 2)))  # gesprächig: jede Minute ein neuer Wert
            await hass.async_block_till_done()
    # Vorher 12 Schreibvorgänge, jetzt nur noch die Laufzeit-Sicherungen (alle 5 Minuten)
    assert 1 <= len(writes) <= 3


# ── 2. Registry-Listener gefiltert ───────────────────────────────────────


async def test_registry_filters_skip_own_and_cosmetic_changes(hass: HomeAssistant, setup):
    monitor = setup["monitor"]
    door = setup["devices"]["door"]
    entries = er.async_get(hass).entities.values()
    own = next(e.entity_id for e in entries if e.platform == DOMAIN and e.device_id == door.device_id)
    # Geräte: Erstellen/Entfernen immer, Änderungen nur an Name, Raum, Deaktivierung usw.
    assert monitor._device_relevant({"action": "create", "device_id": "x"})
    assert monitor._device_relevant({"action": "update", "device_id": "x", "changes": {"name_by_user": "alt"}})
    assert not monitor._device_relevant({"action": "update", "device_id": "x", "changes": {"sw_version": "1"}})
    # Labels schon (pulse_important/pulse_ignore), auch an eigenen Entitäten
    assert monitor._device_relevant({"action": "update", "device_id": "x", "changes": {"labels": set()}})
    assert monitor._entity_relevant({"action": "update", "entity_id": own, "changes": {"labels": set()}})
    # Entitäten: eigene nie, kosmetische Änderungen nicht, Zuordnung/Deaktivierung schon
    assert not monitor._entity_relevant({"action": "create", "entity_id": own})
    assert not monitor._entity_relevant({"action": "update", "entity_id": own, "changes": {"device_id": None}})
    contact = door.entities["contact"]
    assert monitor._entity_relevant({"action": "create", "entity_id": contact})
    assert not monitor._entity_relevant({"action": "update", "entity_id": contact, "changes": {"icon": None}})
    assert monitor._entity_relevant({"action": "update", "entity_id": contact, "changes": {"disabled_by": None}})
    assert monitor._entity_relevant({"action": "remove", "entity_id": contact})


# ── 3. Letzte Meldung standardmäßig aus ──────────────────────────────────


async def test_last_report_sensor_disabled_by_default(hass: HomeAssistant, setup):
    """Jede Meldung wäre eine Recorder-Zeile, die Entität gibt es, aber aus."""
    reg = er.async_get(hass)
    mine = [e for e in reg.entities.values() if e.platform == DOMAIN and e.translation_key == "last_report"]
    assert len(mine) == 4
    assert all(e.disabled_by is er.RegistryEntryDisabler.INTEGRATION for e in mine)
    assert all(hass.states.get(e.entity_id) is None for e in mine)


# ── 4. Kein Status-Ereignis für die Startbewertung ───────────────────────


async def test_no_status_event_for_first_evaluation_after_start(hass: HomeAssistant, setup):
    """Vor dem Verlauf galt die Tür als ausgefallen, mit Verlauf läuft sie, das ist kein Wechsel."""
    monitor: PulseMonitor = setup["monitor"]
    door = setup["devices"]["door"]
    now = time.time()
    seed(monitor, door.device_id, 1800, 200, now - 7 * 3600)
    events = async_capture_events(hass, EVENT_STATUS_CHANGED)
    fresh = [now - 1800 * i for i in range(20, 0, -1)]
    history = {door.entities["contact"]: (fresh, [])}
    with patch("custom_components.pulse.monitor.async_load_history", AsyncMock(return_value=history)):
        assert await hass.config_entries.async_reload(setup["entry"].entry_id)
        await hass.async_block_till_done()
    monitor = setup["entry"].runtime_data
    assert monitor.bootstrapped
    assert monitor.devices[door.device_id].status == "ok"
    assert not events
    # Ein echter Wechsel danach kommt weiter als Ereignis
    seed(monitor, door.device_id, 1800, 200, now - 7 * 3600)
    await tick(hass, setup["freezer"], timedelta(minutes=1))
    assert [e.data["status"] for e in events] == ["failed"]


# ── 5. Batterie-Entität anderer Plattform ist kein Lebenszeichen ─────────


async def test_foreign_battery_entity_is_no_sign_of_life(hass: HomeAssistant, setup):
    monitor: PulseMonitor = setup["monitor"]
    dev = add_device(
        hass, "window", "Fenster Küche", [("binary_sensor", "contact", "window"), ("sensor", "temp", "temperature")]
    )
    battery = er.async_get(hass).async_get_or_create(
        "sensor", "template", "window_battery", device_id=dev.device_id, original_device_class="battery"
    )
    hass.states.async_set(dev.entities["contact"], "off")
    hass.states.async_set(battery.entity_id, "80")
    monitor._rediscover()
    await hass.async_block_till_done()
    device = monitor.devices[dev.device_id]
    assert device.spec.battery == battery.entity_id
    assert battery.entity_id not in device.spec.entities
    assert battery.entity_id in monitor._entity_map
    before = list(device.record["events"])
    setup["freezer"].tick(timedelta(minutes=6))
    hass.states.async_set(battery.entity_id, "79")
    await hass.async_block_till_done()
    assert device.record["events"] == before  # Batteriewert allein ist keine Meldung
    assert device.record["last_level"] == 79  # aber der Batteriewert wird weiter verfolgt
    hass.states.async_set(dev.entities["contact"], "on")
    await hass.async_block_till_done()
    assert len(device.record["events"]) == len(before) + 1


# ── 6. Rückgängig nimmt auch die eingetragene Meldung zurück ─────────────


async def test_undo_replaced_removes_inserted_report(hass: HomeAssistant, setup):
    monitor: PulseMonitor = setup["monitor"]
    thermo_id = setup["devices"]["thermo"].device_id
    seed(monitor, thermo_id, 1800, 200, time.time() - 7 * 3600)
    await tick(hass, setup["freezer"], timedelta(minutes=6))
    thermo = monitor.devices[thermo_id]
    assert thermo.status == "failed"
    events_before = list(thermo.record["events"])
    monitor.mark_replaced(thermo_id, "auto")
    assert len(thermo.record["events"]) == len(events_before) + 1
    assert monitor.undo_replaced(thermo_id)
    assert thermo.record["events"] == events_before
    assert thermo.record["replaced"] == [] and thermo.record["replaced_source"] == []


# ── 7. Nicht-Admins sehen keine Empfänger und Personen ───────────────────


async def test_non_admin_snapshot_without_recipients(
    hass: HomeAssistant, setup, hass_ws_client, hass_read_only_access_token
):
    monitor: PulseMonitor = setup["monitor"]
    monitor.store.settings["targets"] = ["mobile_app_alex"]
    monitor.store.settings["arrive_home"]["persons"] = ["person.alex"]
    hass.states.async_set("person.alex", "home")
    client = await hass_ws_client(hass, hass_read_only_access_token)
    await client.send_json_auto_id({"type": "pulse/subscribe"})
    assert (await client.receive_json())["success"]
    event = (await client.receive_json())["event"]
    assert event["devices"] and event["settings"]["summary_time"] == "18:00"
    assert event["targets"] == [] and event["persons"] == []
    assert event["settings"]["targets"] is None and event["settings"]["arrive_home"]["persons"] == []
    assert "mobile_app_alex" not in str(event) and "person.alex" not in str(event)
    # Admins sehen weiter alles
    admin = await hass_ws_client(hass)
    await admin.send_json_auto_id({"type": "pulse/subscribe"})
    assert (await admin.receive_json())["success"]
    event = (await admin.receive_json())["event"]
    assert event["settings"]["targets"] == ["mobile_app_alex"] and event["persons"] == ["person.alex"]
