"""Funde der Code-Sichtung vom 17.10.2026: Schreibhäufigkeit, Ereignisse, Rechte, Lebenszeichen."""

from __future__ import annotations

from datetime import timedelta
import time
from unittest.mock import patch

from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry as er

from common import tick
from custom_components.pulse.const import DOMAIN
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
    assert not monitor._device_relevant({"action": "update", "device_id": "x", "changes": {"labels": set()}})
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
    """Jede Meldung wäre eine Recorder-Zeile – die Entität gibt es, aber aus."""
    reg = er.async_get(hass)
    mine = [e for e in reg.entities.values() if e.platform == DOMAIN and e.translation_key == "last_report"]
    assert len(mine) == 4
    assert all(e.disabled_by is er.RegistryEntryDisabler.INTEGRATION for e in mine)
    assert all(hass.states.get(e.entity_id) is None for e in mine)
