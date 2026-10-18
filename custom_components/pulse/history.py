"""Learning from history: read the last days from the recorder so Pulse knows right away."""

from __future__ import annotations

from collections.abc import Iterable, Sequence
from datetime import timedelta
import logging
from typing import Any

from homeassistant.const import STATE_UNAVAILABLE, STATE_UNKNOWN
from homeassistant.core import HomeAssistant, State
from homeassistant.util import dt as dt_util

from .battery import LEVEL_LOW
from .forecast import Forecast, predict
from .rhythm import restart_echoes

_LOGGER = logging.getLogger(__name__)

NOT_REAL = {STATE_UNAVAILABLE, STATE_UNKNOWN, ""}
# This many entities per query
CHUNK = 3  # keep small: chatty sensors have tens of thousands of rows per day


def real_reports(states: Iterable[Any], starts: Sequence[float] = ()) -> tuple[list[float], list[float]]:
    """(Signs of life, actions) from a sequence of states.

    A sign of life is every row whose predecessor was already a real value; a value right after
    "unavailable" is a restart echo, as is the row HA rewrites on start (`starts`: own starts from
    `store.uptime`). An action is a real change to a different value.
    """
    stamps: list[float] = []  # all real rows
    rows: list[tuple[float, float, bool]] = []  # (updated, changed, different value) with a real predecessor
    previous: str | None = None
    for state in states:
        if not isinstance(state, State):
            continue  # minimal_response returns dicts for follow-up rows; not expected here
        if state.state in NOT_REAL:
            previous = None
            continue
        updated = state.last_updated.timestamp()
        stamps.append(updated)
        if previous is not None:
            rows.append((updated, state.last_changed.timestamp(), state.state != previous))
        previous = state.state
    echoes = restart_echoes(stamps, starts) if starts else set()
    reports = [updated for updated, _, _ in rows if updated not in echoes]
    actions = [changed for updated, changed, other in rows if other and updated not in echoes]
    return reports, actions


async def async_load_history(
    hass: HomeAssistant, entity_ids: list[str], days: int, starts: Sequence[float] = ()
) -> dict[str, tuple[list[float], list[float]]]:
    """Per entity (signs of life, actions) of the last `days` days. Empty if no recorder is running."""
    if not entity_ids or "recorder" not in hass.config.components:
        return {}
    from homeassistant.components.recorder import get_instance, history

    start = dt_util.utcnow() - timedelta(days=days)

    def _load() -> dict[str, tuple[list[float], list[float]]]:
        # Read in small chunks and boil them down to timestamps right away: chatty sensors
        # have tens of thousands of rows, and all state objects at once cost a lot of memory
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
            # Boil down and release right away: never more than one chunk of state objects in memory
            for entity_id in list(result):
                reports[entity_id] = real_reports(result.pop(entity_id), starts)
            del result
        return reports

    try:
        return await get_instance(hass).async_add_executor_job(_load)
    except Exception:  # history is a bonus; Pulse learns live if need be
        _LOGGER.exception("Could not read history")
        return {}


def load_forecasts(
    hass: HomeAssistant, jobs: list[tuple[str, str, float, bool]], now: float
) -> dict[str, tuple[Forecast | None, str | None]]:
    """In the recorder executor: hourly means of long-term statistics per battery entity → forecast.

    jobs: (device ID, battery entity, since when, percentage trustworthy).
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
        except Exception:  # statistics are a bonus; without them there is simply no forecast
            _LOGGER.debug("Statistics for %s not readable", entity_id, exc_info=True)
            rows = []
        points = [(float(row["start"]), float(mean)) for row in rows if (mean := row.get("mean")) is not None]
        result[device_id] = predict(points, now, float(LEVEL_LOW), trusted)
    return result
