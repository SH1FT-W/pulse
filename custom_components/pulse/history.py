"""Learning from history: read the last days from the recorder so Pulse knows right away."""

from __future__ import annotations

from collections.abc import Callable, Iterable, Mapping, Sequence
from datetime import datetime, timedelta
import logging
from typing import Any, NamedTuple

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
METADATA = frozenset({ATTR_FRIENDLY_NAME, ATTR_ICON, ATTR_ENTITY_PICTURE, ATTR_DEVICE_CLASS, ATTR_UNIT_OF_MEASUREMENT})
# HA rewrites an entity's state right after its registry entry or device changed (renamed, area, icon, unit, new
# entity ID); a write this close after such a change is that rewrite, not a report of the device
REGISTRY_ECHO = 2.0
# Read again with attributes: at most the last this many rows of an entity. They decide its last report; a quiet
# device has fewer rows in all, and for one with more a rename further back is one report among hundreds
ATTRIBUTE_ROWS = 200


class Registry(NamedTuple):
    """When the entity's registry entry and its device were last changed (`modified_at`, None = unknown)."""

    entity: float | None = None
    device: float | None = None


NO_REGISTRY = Registry()


def registry_echo(written: float, registry: Registry, device: bool = True) -> bool:
    """A write right after a registry change of the entity (or, with `device`, of its device)."""
    stamps = (registry.entity, registry.device) if device else (registry.entity,)
    # HA rewrites after the change, never before it
    return any(stamp is not None and 0 <= written - stamp <= REGISTRY_ECHO for stamp in stamps)


def metadata_only(old: Mapping[str, Any], new: Mapping[str, Any]) -> bool:
    """Only registry metadata changed (renamed, new icon), no reported data. Identical attributes are no metadata
    change: an entity with `force_update` reports the same value and attributes again."""
    changed = {key for key in old.keys() | new.keys() if old.get(key) != new.get(key)}
    return bool(changed) and changed <= METADATA


def registry_rewrite(old: State, new: State) -> bool:
    """HA rewrote the state after a registry change: same value with only metadata changed, or a value converted
    to another unit (entity options; the unit and at most other metadata changed). A unit that only appears or
    disappears is no conversion."""
    if old.state != new.state:
        units = (old.attributes.get(ATTR_UNIT_OF_MEASUREMENT), new.attributes.get(ATTR_UNIT_OF_MEASUREMENT))
        if None in units or units[0] == units[1]:
            return False  # checked first: every new value of a chatty sensor passes here
    return metadata_only(old.attributes, new.attributes)


def attribute_window(
    states: Sequence[Any], starts: Sequence[float] = (), registry: Registry = NO_REGISTRY
) -> int | None:
    """Index from which an entity's rows (read without attributes) must be read again with them, None = not needed.

    Only the attributes tell a rename from a report when a row repeats the value of its real predecessor: an
    attribute-only row, but also a new state object with `force_update` (`last_changed == last_updated` there,
    for a rename too). The row HA writes on start (`starts`) needs none, it never counts. A new value right after
    a change of the entity's registry entry may be converted to a new unit. Read are the last `ATTRIBUTE_ROWS`
    rows (plus the one before, to compare with), not more: they decide the last report.
    """
    first = max(0, len(states) - ATTRIBUTE_ROWS - 1)
    previous: str | None = None
    for state in states[first:]:
        if not isinstance(state, State):
            continue
        if state.state in NOT_REAL:
            previous = None
            continue
        written = state.last_updated.timestamp()
        if previous is not None and (
            (state.state == previous and not near_start(written, starts))
            or registry_echo(written, registry, device=False)
        ):
            return first
        previous = state.state
    return None


def real_reports(
    states: Iterable[Any], starts: Sequence[float] = (), registry: Registry = NO_REGISTRY, compare_from: int = 0
) -> tuple[list[float], list[float]]:
    """(Signs of life, actions) from a sequence of states.

    A sign of life is every row whose predecessor was already a real value; a value right after
    "unavailable" is a restart echo, as is the row HA rewrites on start (`starts`: own starts from
    `store.uptime`). An action is a real change to a different value. A rewrite after a registry change is no
    sign of life: by its attributes (`registry_rewrite`; only rows from `compare_from` on have them, the ones
    before were read without), the same value also by its time right after the last change (`registry`, from
    `modified_at`: covers a rewrite with identical attributes, `force_update` or a new entity ID).
    """
    stamps: list[float] = []  # all real rows
    rows: list[tuple[float, float, bool]] = []  # (updated, changed, different value) with a real predecessor
    previous: State | None = None
    for index, state in enumerate(states):
        if not isinstance(state, State):
            continue  # minimal_response returns dicts for follow-up rows; not expected here
        if state.state in NOT_REAL:
            previous = None
            continue
        updated = state.last_updated.timestamp()
        stamps.append(updated)  # also a rewrite: still a row for `restart_echoes`
        if previous is not None:
            same = state.state == previous.state
            if (same and registry_echo(updated, registry)) or (
                index > compare_from and registry_rewrite(previous, state)
            ):
                previous = state
                continue
            rows.append((updated, state.last_changed.timestamp(), not same))
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
    boil: Callable[[str, list[Any], int], T],
    attributes_from: Callable[[str, list[Any]], int | None] | None = None,
) -> dict[str, T]:
    """Per entity `boil(entity_id, states, compare_from)` over the last `days` days. Empty if no recorder is running.

    `attributes_from`: index from which an entity's rows (read without attributes) are needed with them; those are
    read again and `compare_from` says from where on they have them (else the end: none has).
    """
    if not entity_ids or "recorder" not in hass.config.components:
        return {}
    from homeassistant.components.recorder import get_instance, history

    start = dt_util.utcnow() - timedelta(days=days)

    def _load() -> dict[str, T]:
        # Read in small chunks and boil them down to timestamps right away: chatty sensors
        # have tens of thousands of rows, and all state objects at once cost a lot of memory
        result: dict[str, T] = {}

        def query(ids: list[str], since: datetime, no_attributes: bool) -> dict[str, list[Any]]:
            return history.get_significant_states(
                hass,
                since,
                None,
                ids,
                None,
                include_start_time_state=False,
                significant_changes_only=False,
                minimal_response=False,
                no_attributes=no_attributes,
            )

        for i in range(0, len(entity_ids), CHUNK):
            rows = query(entity_ids[i : i + CHUNK], start, True)
            # Boil down and release right away: never more than one chunk of state objects in memory
            for entity_id in list(rows):
                states = rows.pop(entity_id)
                compare_from = len(states)
                first = attributes_from(entity_id, states) if attributes_from is not None else None
                if first is not None:
                    # Only the last rows, from the first one on (the recorder reads after `since`)
                    since = states[first].last_updated - timedelta(microseconds=1)
                    tail = query([entity_id], since, False).get(entity_id, [])
                    if tail and isinstance(tail[0], State) and tail[0].last_updated == states[first].last_updated:
                        states = [*states[:first], *tail]
                        compare_from = first
                    del tail
                result[entity_id] = boil(entity_id, states, compare_from)
            del rows
        return result

    try:
        return await get_instance(hass).async_add_executor_job(_load)
    except Exception:  # history is a bonus; Pulse learns live if need be
        _LOGGER.exception("Could not read history")
        return {}


async def async_load_history(
    hass: HomeAssistant,
    entity_ids: list[str],
    days: int,
    starts: Sequence[float] = (),
    registry: Mapping[str, Registry] | None = None,
) -> dict[str, tuple[list[float], list[float]]]:
    """Per entity (signs of life, actions) of the last `days` days. Empty if no recorder is running.

    `registry`: per entity when its registry entry and device were last changed (HA rewrote the state then).
    """
    registry = registry or {}
    return await _async_read(
        hass,
        entity_ids,
        days,
        lambda e, states, compare_from: real_reports(states, starts, registry.get(e, NO_REGISTRY), compare_from),
        attributes_from=lambda e, states: attribute_window(states, starts, registry.get(e, NO_REGISTRY)),
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
        lambda e, states, _: (
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
