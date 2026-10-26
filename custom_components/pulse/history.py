"""Learning from history: read the last days from the recorder so Pulse knows right away."""

from __future__ import annotations

from collections.abc import Callable, Iterable, Mapping, Sequence
from datetime import timedelta
import logging
from typing import Any

from homeassistant.const import STATE_UNAVAILABLE, STATE_UNKNOWN
from homeassistant.core import HomeAssistant, State
from homeassistant.util import dt as dt_util

from .battery import LEVEL_LOW
from .forecast import Forecast, predict
from .rhythm import near_start, restart_echoes

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


def outage_spans(
    states: Iterable[Any], offline: str | None = None, starts: Sequence[float] = (), shortest: float = 0.0
) -> list[tuple[float, float]]:
    """[start, end] of the times the entity was "unavailable" (or `offline`, e.g. a connectivity sensor's "off")
    and came back by itself, at least `shortest` long. An outage still running at the end is no finished one;
    one beginning at an HA start (`starts`) is the integration loading. The row HA rewrites on start keeps an
    outage that was already running, so it is counted once with its real start."""
    spans: list[tuple[float, float]] = []
    since: float | None = None
    for state in states:
        if not isinstance(state, State):
            continue
        gone = state.state == STATE_UNAVAILABLE or (offline is not None and state.state == offline)
        if gone:
            if since is None:
                since = state.last_updated.timestamp()
        elif state.state not in NOT_REAL and since is not None:
            end = state.last_updated.timestamp()
            if end - since >= shortest and not near_start(since, starts):
                spans.append((since, end))
            since = None
    return spans


def running_outage(states: Iterable[Any], offline: str | None = None) -> float | None:
    """Start of an outage that is still running at the end (None if the entity is there). The row HA rewrites
    on start keeps an outage that began before the restart, so this is its real start."""
    since: float | None = None
    for state in states:
        if not isinstance(state, State):
            continue
        if state.state == STATE_UNAVAILABLE or (offline is not None and state.state == offline):
            if since is None:
                since = state.last_updated.timestamp()
        elif state.state not in NOT_REAL:
            since = None
    return since


async def _async_read[T](
    hass: HomeAssistant, entity_ids: list[str], days: int, boil: Callable[[str, list[Any]], T]
) -> dict[str, T]:
    """Per entity `boil(entity_id, states)` over the last `days` days. Empty if no recorder is running."""
    if not entity_ids or "recorder" not in hass.config.components:
        return {}
    from homeassistant.components.recorder import get_instance, history

    start = dt_util.utcnow() - timedelta(days=days)

    def _load() -> dict[str, T]:
        # Read in small chunks and boil them down to timestamps right away: chatty sensors
        # have tens of thousands of rows, and all state objects at once cost a lot of memory
        result: dict[str, T] = {}
        for i in range(0, len(entity_ids), CHUNK):
            rows = history.get_significant_states(
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
            for entity_id in list(rows):
                result[entity_id] = boil(entity_id, rows.pop(entity_id))
            del rows
        return result

    try:
        return await get_instance(hass).async_add_executor_job(_load)
    except Exception:  # history is a bonus; Pulse learns live if need be
        _LOGGER.exception("Could not read history")
        return {}


async def async_load_history(
    hass: HomeAssistant, entity_ids: list[str], days: int, starts: Sequence[float] = ()
) -> dict[str, tuple[list[float], list[float]]]:
    """Per entity (signs of life, actions) of the last `days` days. Empty if no recorder is running."""
    return await _async_read(hass, entity_ids, days, lambda _, states: real_reports(states, starts))


async def async_load_outages(
    hass: HomeAssistant,
    entity_ids: list[str],
    days: int,
    offline: Mapping[str, str] | None = None,
    starts: Sequence[float] = (),
    shortest: float = 0.0,
) -> dict[str, tuple[list[tuple[float, float]], float | None]]:
    """Per entity (finished outages, start of the one still running) of the last `days` days (`offline`:
    entity → its "gone" state)."""
    offline = offline or {}
    return await _async_read(
        hass,
        entity_ids,
        days,
        lambda e, states: (
            outage_spans(states, offline.get(e), starts, shortest),
            running_outage(states, offline.get(e)),
        ),
    )


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
