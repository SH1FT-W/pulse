"""Learning from history: read the last days from the recorder so Pulse knows right away."""

from __future__ import annotations

from collections.abc import Callable, Iterable, Mapping, Sequence
from datetime import timedelta
import logging
from typing import Any

from homeassistant.const import (
    ATTR_DEVICE_CLASS,
    ATTR_ENTITY_PICTURE,
    ATTR_FRIENDLY_NAME,
    ATTR_ICON,
    ATTR_UNIT_OF_MEASUREMENT,
    STATE_UNAVAILABLE,
    STATE_UNKNOWN,
)
from homeassistant.core import HomeAssistant, State
from homeassistant.util import dt as dt_util

from .battery import LEVEL_LOW
from .forecast import Forecast, predict
from .rhythm import near_start, restart_echoes

_LOGGER = logging.getLogger(__name__)

NOT_REAL = {STATE_UNAVAILABLE, STATE_UNKNOWN, ""}
# This many entities per query
CHUNK = 3  # keep small: chatty sensors have tens of thousands of rows per day
# Attributes HA rewrites when the user renames the device or entity or changes an entity's settings in the
# registry; a row (or state change) that only changes these is no report of the device
# At most this many attribute-only rows: then read the entity again with attributes (`same_value_rows`)
ATTRIBUTE_ROWS = 30
ATTRIBUTE_READ_MAX = 2000  # and at most this many rows in all
METADATA = frozenset({ATTR_FRIENDLY_NAME, ATTR_ICON, ATTR_ENTITY_PICTURE, ATTR_DEVICE_CLASS, ATTR_UNIT_OF_MEASUREMENT})


def metadata_only(old: Mapping[str, Any], new: Mapping[str, Any]) -> bool:
    """Only registry metadata changed (renamed, new icon), no reported data. Identical attributes are no metadata
    change: an entity with `force_update` reports the same value and attributes again."""
    changed = {key for key in old.keys() | new.keys() if old.get(key) != new.get(key)}
    return bool(changed) and changed <= METADATA


def same_value_rows(states: Sequence[Any]) -> bool:
    """A few rows repeat the value of a real predecessor without being a new state object (`last_changed` before
    `last_updated`: only the attributes changed): only their attributes can tell a rename from a report. A new state
    object (the row HA writes on start, `force_update`) has `last_changed == last_updated` and needs none. Many such
    rows (thermostats) or many rows at all (a chatty sensor) are not worth reading again: one row more or less does
    not change what Pulse learns about a device that reports this often."""
    if len(states) > ATTRIBUTE_READ_MAX:
        return False
    previous: str | None = None
    count = 0
    for state in states:
        if not isinstance(state, State):
            continue
        if state.state not in NOT_REAL and state.state == previous and state.last_changed < state.last_updated:
            count += 1
            if count > ATTRIBUTE_ROWS:
                return False
        previous = None if state.state in NOT_REAL else state.state
    return count > 0


def real_reports(states: Iterable[Any], starts: Sequence[float] = ()) -> tuple[list[float], list[float]]:
    """(Signs of life, actions) from a sequence of states.

    A sign of life is every row whose predecessor was already a real value; a value right after
    "unavailable" is a restart echo, as is the row HA rewrites on start (`starts`: own starts from
    `store.uptime`). An action is a real change to a different value. A row with the same value that only
    changes metadata (device or entity renamed, `metadata_only`) is no sign of life; that needs the attributes.
    """
    stamps: list[float] = []  # all real rows
    rows: list[tuple[float, float, bool]] = []  # (updated, changed, different value) with a real predecessor
    previous: State | None = None
    for state in states:
        if not isinstance(state, State):
            continue  # minimal_response returns dicts for follow-up rows; not expected here
        if state.state in NOT_REAL:
            previous = None
            continue
        if (
            previous is not None
            and state.state == previous.state
            and metadata_only(previous.attributes, state.attributes)
        ):
            stamps.append(state.last_updated.timestamp())  # still a row for `restart_echoes`
            previous = state
            continue
        updated = state.last_updated.timestamp()
        stamps.append(updated)
        if previous is not None:
            rows.append((updated, state.last_changed.timestamp(), state.state != previous.state))
        previous = state
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
        elif since is not None:
            # Any other state ends it, also "unknown": an entity whose normal state is unknown (a siren, a
            # button) is there; only "unavailable" means gone
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
        else:
            since = None  # any other state, also "unknown", means the entity is there
    return since


async def _async_read[T](
    hass: HomeAssistant,
    entity_ids: list[str],
    days: int,
    boil: Callable[[str, list[Any]], T],
    attributes_if: Callable[[list[Any]], bool] | None = None,
) -> dict[str, T]:
    """Per entity `boil(entity_id, states)` over the last `days` days. Empty if no recorder is running.

    `attributes_if`: read an entity again with its attributes if its rows (without) need them.
    """
    if not entity_ids or "recorder" not in hass.config.components:
        return {}
    from homeassistant.components.recorder import get_instance, history

    start = dt_util.utcnow() - timedelta(days=days)

    def _load() -> dict[str, T]:
        # Read in small chunks and boil them down to timestamps right away: chatty sensors
        # have tens of thousands of rows, and all state objects at once cost a lot of memory
        result: dict[str, T] = {}

        def query(ids: list[str], no_attributes: bool) -> dict[str, list[Any]]:
            return history.get_significant_states(
                hass,
                start,
                None,
                ids,
                None,
                include_start_time_state=False,
                significant_changes_only=False,
                minimal_response=False,
                no_attributes=no_attributes,
            )

        for i in range(0, len(entity_ids), CHUNK):
            rows = query(entity_ids[i : i + CHUNK], True)
            # Boil down and release right away: never more than one chunk of state objects in memory
            for entity_id in list(rows):
                states = rows.pop(entity_id)
                if attributes_if is not None and attributes_if(states):
                    # Only for a few attribute-only rows (renamed) in a quiet entity: read with attributes
                    del states
                    states = query([entity_id], False).get(entity_id, [])
                result[entity_id] = boil(entity_id, states)
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
    return await _async_read(
        hass, entity_ids, days, lambda _, states: real_reports(states, starts), attributes_if=same_value_rows
    )


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
