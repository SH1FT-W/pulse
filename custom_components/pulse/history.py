"""Lernen aus dem Verlauf: die letzten Tage aus dem Recorder lesen, damit Pulse sofort Bescheid weiß."""

from __future__ import annotations

from collections.abc import Iterable
from datetime import timedelta
import logging
from typing import Any

from homeassistant.const import STATE_UNAVAILABLE, STATE_UNKNOWN
from homeassistant.core import HomeAssistant, State
from homeassistant.util import dt as dt_util

from .battery import LEVEL_LOW
from .forecast import Forecast, predict

_LOGGER = logging.getLogger(__name__)

NOT_REAL = {STATE_UNAVAILABLE, STATE_UNKNOWN, ""}
# So viele Entitäten je Abfrage
CHUNK = 3  # klein halten: gesprächige Sensoren haben zehntausende Zeilen je Tag


def real_reports(states: Iterable[Any]) -> tuple[list[float], list[float]]:
    """(Lebenszeichen, Aktionen) aus einer Zustandsfolge.

    Ein Lebenszeichen ist jede Zeile, deren Vorgänger schon ein echter Wert war – ein Wert direkt nach
    „nicht verfügbar“ ist ein Neustart-Echo. Eine Aktion ist ein echter Wechsel auf einen anderen Wert.
    """
    reports: list[float] = []
    actions: list[float] = []
    previous: str | None = None
    for state in states:
        if not isinstance(state, State):
            continue  # minimal_response liefert für Folgezeilen dicts – hier nicht erwartet
        if state.state in NOT_REAL:
            previous = None
            continue
        if previous is not None:
            reports.append(state.last_updated.timestamp())
            if state.state != previous:
                actions.append(state.last_changed.timestamp())
        previous = state.state
    return reports, actions


async def async_load_history(
    hass: HomeAssistant, entity_ids: list[str], days: int
) -> dict[str, tuple[list[float], list[float]]]:
    """Pro Entität (Lebenszeichen, Aktionen) der letzten `days` Tage. Leer, wenn kein Recorder läuft."""
    if not entity_ids or "recorder" not in hass.config.components:
        return {}
    from homeassistant.components.recorder import get_instance, history

    start = dt_util.utcnow() - timedelta(days=days)

    def _load() -> dict[str, tuple[list[float], list[float]]]:
        # In kleinen Portionen lesen und gleich zu Zeitpunkten eindampfen: gesprächige Sensoren
        # haben zehntausende Zeilen, und alle State-Objekte auf einmal kosten viel Speicher
        reports: dict[str, tuple[list[float], list[float]]] = {}
        for i in range(0, len(entity_ids), CHUNK):
            result = history.get_significant_states(
                hass,
                start,
                None,
                entity_ids[i : i + CHUNK],
                None,
                include_start_time_state=False,
                significant_changes_only=False,
                minimal_response=False,
                no_attributes=True,
            )
            # Gleich eindampfen und loslassen: nie mehr als eine Portion State-Objekte im Speicher
            for entity_id in list(result):
                reports[entity_id] = real_reports(result.pop(entity_id))
            del result
        return reports

    try:
        return await get_instance(hass).async_add_executor_job(_load)
    except Exception:  # Verlauf ist Zugabe – Pulse lernt notfalls live
        _LOGGER.exception("Could not read history")
        return {}


def load_forecasts(
    hass: HomeAssistant, jobs: list[tuple[str, str, float, bool]], now: float
) -> dict[str, tuple[Forecast | None, str | None]]:
    """Im Recorder-Executor: Stundenmittel der Langzeitstatistik je Batterie-Entität → Vorhersage.

    jobs: (Geräte-ID, Batterie-Entität, ab wann, Prozentwert vertrauenswürdig).
    """
    from homeassistant.components.recorder.statistics import statistics_during_period

    result: dict[str, tuple[Forecast | None, str | None]] = {}
    for device_id, entity_id, start, trusted in jobs:
        if not trusted:
            result[device_id] = (None, "untrusted")
            continue
        try:
            rows = statistics_during_period(
                hass, dt_util.utc_from_timestamp(start), None, {entity_id}, "hour", None, {"mean"}
            ).get(entity_id, [])
        except Exception:  # Statistik ist Zugabe – ohne sie gibt es eben keine Vorhersage
            _LOGGER.debug("Statistics for %s not readable", entity_id, exc_info=True)
            rows = []
        points = [(float(row["start"]), float(mean)) for row in rows if (mean := row.get("mean")) is not None]
        result[device_id] = predict(points, now, float(LEVEL_LOW), trusted)
    return result
