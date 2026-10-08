"""Lernen aus dem Verlauf: die letzten Tage aus dem Recorder lesen, damit Pulse sofort Bescheid weiß."""

from __future__ import annotations

from datetime import timedelta
import logging

from homeassistant.const import STATE_UNAVAILABLE, STATE_UNKNOWN
from homeassistant.core import HomeAssistant, State
from homeassistant.util import dt as dt_util

_LOGGER = logging.getLogger(__name__)

NOT_REAL = {STATE_UNAVAILABLE, STATE_UNKNOWN, ""}
# So viele Entitäten je Abfrage
CHUNK = 3  # klein halten: gesprächige Sensoren haben zehntausende Zeilen je Tag


def real_reports(states: list[State]) -> tuple[list[float], list[float]]:
    """(Lebenszeichen, Aktionen) aus einer Zustandsfolge.

    Ein Lebenszeichen ist jede Zeile, deren Vorgänger schon ein echter Wert war – ein Wert direkt nach
    „nicht verfügbar“ ist ein Neustart-Echo. Eine Aktion ist ein echter Wechsel auf einen anderen Wert.
    """
    reports: list[float] = []
    actions: list[float] = []
    previous: str | None = None
    for state in states:
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
            for entity_id, rows in result.items():
                reports[entity_id] = real_reports([s for s in rows if isinstance(s, State)])
        return reports

    try:
        return await get_instance(hass).async_add_executor_job(_load)
    except Exception:  # Verlauf ist Zugabe – Pulse lernt notfalls live
        _LOGGER.exception("Verlauf konnte nicht gelesen werden")
        return {}
