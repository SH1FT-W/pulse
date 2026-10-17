"""Funde der Code-Sichtung vom 17.10.2026: Schreibhäufigkeit, Ereignisse, Rechte, Lebenszeichen."""

from __future__ import annotations

from datetime import timedelta
import time
from unittest.mock import patch

from homeassistant.core import HomeAssistant

from common import tick
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
