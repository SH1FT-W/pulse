"""Learn the rhythm and determine the status: pure calculation logic without HA dependency.

A device reports in its own rhythm. The intervals of the last days yield a "typical" interval
(90th percentile) and a "longest normal" one (98th percentile, so an earlier outage does not inflate
the limits forever). If the current silence gets clearly longer, the status rises.
"""

from __future__ import annotations

from bisect import bisect_left
from collections.abc import Callable, Sequence
from dataclasses import dataclass
import itertools
from typing import Any

from . import battery as batt
from .const import (
    MERGE_SECONDS,
    OUTAGE_HABIT,
    OUTAGE_MIN,
    OUTAGES_KEPT,
    SEVERITY,
    STATUS_CHECK,
    STATUS_FAILED,
    STATUS_LEARNING,
    STATUS_OK,
    STATUS_WATCH,
)

MINUTE = 60.0
HOUR = 3600.0
DAY = 86400.0

# Heartbeat calendar: at most this many reports per window
HEARTBEAT_CAP = 9

# At least this many intervals before Pulse trusts a rhythm
MIN_GAPS = 6

# Transmits without values: the health counter also rises with regular value messages (next health tick, ≤ 10 min).
# Only increases this long after the last report count; several of them, and recent.
RADIO_BUFFER = 15 * MINUTE
RADIO_MIN_RISES = 2

# Battery entity without a value for this long (the rest reports) → own reason
BATTERY_MISSING_AFTER = DAY

# Without a learned rhythm (device reports only on actions, e.g. a rarely opened door): after two days of silence
# "im Blick" (watch), only after a week "prüfen" (check), otherwise every quiet door would be in the daily summary
SILENT_NEW_WATCH = 2 * DAY
SILENT_NEW_CHECK = 7 * DAY

# A reachable device whose longest normal gap is at most this reports on its own (presence sensor, outdoor module):
# its silence still counts. Longer gaps mean it only reports on events (leak sensor, lock), then reachable = fine.
REGULAR_LONGEST = 3 * HOUR

# On start HA rewrites every state; in the recorder this row looks like a report. The first row of an
# entity in this window around an HA start (after a row before it) is no sign of life.
RESTART_BEFORE = 2 * MINUTE
RESTART_AFTER = 5 * MINUTE


def restart_echoes(stamps: Sequence[float], starts: Sequence[float]) -> set[float]:
    """Timestamps that are only the rewrite on HA start: per start the first one after an earlier one."""
    echoes: set[float] = set()
    for start in starts:
        idx = bisect_left(stamps, start - RESTART_BEFORE)
        if 0 < idx < len(stamps) and stamps[idx] <= start + RESTART_AFTER:
            echoes.add(stamps[idx])
    return echoes


def near_start(ts: float, starts: Sequence[float]) -> bool:
    """`ts` lies in the window around an HA start (the integration was loading, nothing about the device)."""
    return any(start - RESTART_BEFORE <= ts <= start + RESTART_AFTER for start in starts)


@dataclass(frozen=True)
class Rhythm:
    """Learned rhythm in seconds (None = not enough data yet)."""

    typical: float | None
    longest: float | None
    samples: int
    # Pause that comes back on most days (night, nobody home): one gap per day, so the percentiles miss it
    quiet: float | None = None

    @property
    def known(self) -> bool:
        return self.typical is not None and self.longest is not None

    @property
    def span(self) -> float | None:
        """Longest normal silence: the longest usual gap or the daily pause, whichever is longer."""
        if self.longest is None:
            return None
        return max(self.longest, self.quiet or 0.0)


@dataclass(frozen=True)
class Limits:
    watch: float
    check: float
    failed: float


@dataclass(frozen=True)
class Verdict:
    status: str
    reason: dict[str, Any]


def percentile(values: Sequence[float], q: float, presorted: bool = False) -> float:
    """Percentile with linear interpolation (values not empty)."""
    ordered = values if presorted else sorted(values)
    if len(ordered) == 1:
        return ordered[0]
    pos = q * (len(ordered) - 1)
    low = int(pos)
    high = min(low + 1, len(ordered) - 1)
    return ordered[low] + (ordered[high] - ordered[low]) * (pos - low)


def merge_event(
    events: list[float],
    ts: float,
    keep_from: float | None = None,
    limit: int = 4000,
    window: float = MERGE_SECONDS,
) -> bool:
    """Insert a report; reports close together (< window) count as one. True = newly added."""
    if events and abs(events[-1] - ts) < window:
        return False
    if events and ts < events[-1]:
        idx = bisect_left(events, ts)
        near = [events[i] for i in (idx - 1, idx) if 0 <= i < len(events)]
        if any(abs(n - ts) < window for n in near):
            return False
        events.insert(idx, ts)
    else:
        events.append(ts)
    if keep_from is not None:
        drop = bisect_left(events, keep_from)
        if drop:
            del events[:drop]
    if len(events) > limit:
        del events[: len(events) - limit]
    return True


# Daily pause: from this many full days of data, the median of the longest gap per day
QUIET_MIN_DAYS = 3


def daily_quiet(events: Sequence[float]) -> float | None:
    """The pause that recurs: per 24 h slice the longest gap beginning in it, the median over the slices.

    A device that reports every ten minutes by day and not at all at night (a light sensor in the dark) has
    a twelve-hour pause every day; a single outage is only one slice and does not move the median.
    """
    if len(events) < 2 or events[-1] - events[0] < QUIET_MIN_DAYS * DAY:
        return None
    start = events[0]
    longest: dict[int, float] = {}
    for a, b in itertools.pairwise(events):
        day = int((a - start) // DAY)
        longest[day] = max(longest.get(day, 0.0), b - a)
    full = [gap for day, gap in longest.items() if start + (day + 1) * DAY <= events[-1]]
    if len(full) < QUIET_MIN_DAYS:
        return None
    return percentile(full, 0.5)


def learn(events: Sequence[float]) -> Rhythm:
    gaps = sorted(b - a for a, b in itertools.pairwise(events) if b - a >= MERGE_SECONDS)
    if len(gaps) < MIN_GAPS:
        return Rhythm(None, None, len(gaps))
    typical = percentile(gaps, 0.9, presorted=True)
    longest = max(percentile(gaps, 0.98, presorted=True) if len(gaps) >= 20 else gaps[-1], typical)
    quiet = daily_quiet(events)
    return Rhythm(typical, longest, len(gaps), quiet if quiet is not None and quiet > longest else None)


class RhythmCache:
    """Learned rhythm per device; relearned only when the reports changed (not every minute)."""

    def __init__(self) -> None:
        self._data: dict[str, tuple[tuple[int, float | None, float | None], Rhythm]] = {}

    def get(self, key_id: str, events: Sequence[float]) -> Rhythm:
        key = (len(events), events[0] if events else None, events[-1] if events else None)
        cached = self._data.get(key_id)
        if cached is not None and cached[0] == key:
            return cached[1]
        rhythm = learn(events)
        self._data[key_id] = (key, rhythm)
        return rhythm

    def forget(self, key_id: str) -> None:
        self._data.pop(key_id, None)


# Cloud devices: the rhythm is the cloud's polling rhythm; individually "ausgefallen" (offline) only much later
CLOUD_CHECK_MIN = 6 * HOUR
CLOUD_FAILED_MIN = DAY


def limits(rhythm: Rhythm, critical: bool, cloud: bool = False) -> Limits:
    """Which status applies from which silence on."""
    typical = rhythm.typical or HOUR
    longest = rhythm.span or typical
    if critical:
        lim = Limits(
            watch=max(2.0 * typical, 1.1 * longest, 30 * MINUTE),
            check=max(3.0 * typical, 1.5 * longest, HOUR),
            failed=max(5.0 * typical, 2.0 * longest, 3 * HOUR),
        )
    else:
        lim = Limits(
            watch=max(2.5 * typical, 1.2 * longest, 45 * MINUTE),
            check=max(4.0 * typical, 2.0 * longest, 2 * HOUR),
            failed=max(8.0 * typical, 3.0 * longest, 6 * HOUR),
        )
    if cloud:
        lim = Limits(lim.watch, max(lim.check, CLOUD_CHECK_MIN), max(2 * lim.failed, CLOUD_FAILED_MIN))
    return lim


# Stray rule (one reference point for status, panel, `silent_since`): if after a long gap only one or two
# sporadic reports came (a dying sensor), the silence already starts before the gap.
MAX_STRAYS = 2
STRAY_GAP_MIN = 6 * HOUR
# Two reports after the gap in the usual rhythm: the device is running again (no strays)
STRAY_RESUME = 1.5


def downtime_gaps(uptime: Sequence[Sequence[float]]) -> list[tuple[float, float]]:
    """Gaps in the own uptime (HA was not running), from UPTIME_SLACK on."""
    spans = sorted((float(a), float(b)) for a, b in uptime if b >= a)
    return [(end, nxt) for (_, end), (nxt, _) in itertools.pairwise(spans) if nxt - end >= UPTIME_SLACK]


def overlap(gaps: Sequence[tuple[float, float]], start: float, end: float) -> float:
    """How much of the time [start, end] lay in gaps without data."""
    return sum(max(0.0, min(end, b) - max(start, a)) for a, b in gaps)


def device_outages(
    per_entity: Sequence[tuple[Sequence[tuple[float, float]], float | None]], now: float
) -> tuple[list[tuple[float, float]], float | None]:
    """A device is gone only while all of its entities are: intersect their outages.

    per_entity: per entity (finished outages, start of the one still running). Returns (finished outages of the
    device, start of its outage still running or None).
    """
    if not per_entity:
        return [], None
    common: list[tuple[float, float]] | None = None
    for spans, running in per_entity:
        mine = sorted([*spans, *([(running, now)] if running is not None else [])])
        if common is None:
            common = mine
            continue
        common = [(max(a, c), min(b, d)) for a, b in common for c, d in mine if max(a, c) < min(b, d)]
    finished = [(a, b) for a, b in common or [] if b < now]
    running = next((a for a, b in common or [] if b >= now), None)
    return finished, running


def without_spans(events: Sequence[float], spans: Sequence[tuple[float, float]]) -> list[float]:
    """Reports outside the given [start, end] spans (in place of the device: e.g. while it was unreachable)."""
    return [ts for ts in events if not any(start <= ts <= end for start, end in spans)]


def merge_outages(
    outages: Sequence[Sequence[float]], new: Sequence[tuple[float, float]], keep_from: float
) -> list[list[float]]:
    """Outages [start, end] sorted, without the ones older than `keep_from`; the same outage (start within a
    minute, live and again from history) only once, the longer one wins."""
    merged: list[list[float]] = []
    for start, end in sorted([(float(a), float(b)) for a, b in outages] + [(float(a), float(b)) for a, b in new]):
        if end < keep_from:
            continue
        if merged and start - merged[-1][0] < MINUTE:
            merged[-1][1] = max(merged[-1][1], end)
            continue
        merged.append([start, end])
    return merged[-OUTAGES_KEPT:]


def usual_outage(
    outages: Sequence[Sequence[float]],
    now: float,
    gaps: Sequence[tuple[float, float]] = (),
    days: float = 14,
    starts: Sequence[float] = (),
) -> float | None:
    """Longest outage if the device often goes unavailable by itself (standby, switched off), otherwise None.

    Counts outages of the last `days` that lasted ≥ OUTAGE_MIN and ended by themselves. Those during an HA
    pause or beginning at an HA start (integration still loading; an outage that was already running before
    the restart is known from the recorder with its real start) say nothing about the device.
    """
    since = now - days * DAY
    spans = [
        end - start
        for start, end in outages
        if end >= since
        and end - start >= OUTAGE_MIN
        and overlap(gaps, start, end) == 0
        and not near_start(start, starts)
    ]
    return max(spans) if len(spans) >= OUTAGE_HABIT else None


def silence_start(
    events: Sequence[float],
    rhythm: Rhythm,
    replaced_at: float | None = None,
    gaps: Sequence[tuple[float, float]] = (),
    actions: Sequence[float] = (),
) -> tuple[float | None, int]:
    """(Start of the silence, number of sporadic reports since).

    Without strays this is the last report (or a later "Batterie gewechselt" (battery changed)). Gaps in
    which Home Assistant was not running do not count as a gap. A real action after the gap (button pressed,
    door opened) ends the silence immediately; the rule only applies to pure state reports.
    """
    if not events:
        return replaced_at, 0
    last = events[-1]
    if replaced_at is not None and replaced_at > last:
        return replaced_at, 0
    if rhythm.typical is None or len(events) < 2:
        return last, 0
    limit = max(STRAY_GAP_MIN, 3 * rhythm.typical, rhythm.span or 0.0)
    n = len(events)
    for k in range(n - 2, max(-1, n - 2 - MAX_STRAYS), -1):
        here, nxt = events[k], events[k + 1]
        if replaced_at is not None and replaced_at >= here:
            break  # after a change every report is new life
        if nxt - here - overlap(gaps, here, nxt) >= limit:
            tail = events[k + 1 :]
            if actions and actions[-1] > here:
                return last, 0
            if len(tail) >= 2 and all(b - a <= STRAY_RESUME * rhythm.typical for a, b in itertools.pairwise(tail)):
                return last, 0
            return here, n - 1 - k
    return last, 0


@dataclass(frozen=True)
class Facts:
    """What Pulse currently knows about a device."""

    now: float
    last_activity: float | None
    rhythm: Rhythm
    critical: bool = False
    observed_since: float | None = None  # since when Pulse has any data at all
    unavailable_since: float | None = None
    battery_level: float | None = None
    battery_trusted: bool = True  # NiMH rechargeables: the percentage says nothing
    battery_flag: bool = False  # only a warning sensor ("battery low" on/off), no percentage
    partner_name: str | None = None
    partner_actions: int = 0  # partner's actions since the last own action
    own_last_action: float | None = None
    name: str = ""
    waiting_first: bool = False  # "Batterie gewechselt" (battery changed) recorded, no report since
    downtime: float = 0.0  # time since `last_activity` (or `observed_since`) during which HA was not running
    strays: int = 0  # sporadic reports since `last_activity` (stray rule)
    last_report: float | None = None  # actual last report (with strays later than last_activity)
    cloud: bool = False  # rhythm of the cloud, not of the device
    radio_last: float | None = None  # Zigbee2MQTT health: message counter last increased
    radio_rises: int = 0  # how often the counter increased since the last report (+ buffer)
    flag_on: bool = False  # "battery low" warning sensor on (in addition to the percentage)
    battery_missing_since: float | None = None  # battery entity permanently without a value
    reachable: str | None = None  # integration currently reports the device reachable (its name), otherwise None
    mains: bool = False  # beta: mains-powered, an unused lamp is not broken
    manual: bool = False  # added by hand: watched like a mains device, but maybe not on the mains (camera, vacuum)
    usual_outage: float | None = None  # often unavailable by itself: its longest such outage (`usual_outage`)


SILENCE_KEYS = frozenset({"silent", "silent_new", "radio_only"})


def _worse(a: Verdict, b: Verdict) -> Verdict:
    return b if SEVERITY[b.status] > SEVERITY[a.status] else a


def _silent_new(real: float, silence: float) -> Verdict | None:
    """Silence without a learned rhythm: reason `silent_new`, level by duration (without HA pauses)."""
    if silence >= SILENT_NEW_CHECK:
        return Verdict(STATUS_CHECK, {"key": "silent_new", "params": {"since": real}})
    if silence >= SILENT_NEW_WATCH:
        return Verdict(STATUS_WATCH, {"key": "silent_new", "params": {"since": real}})
    return None


def evaluate(facts: Facts) -> Verdict:
    """Status with reason. The worst finding wins."""
    now = facts.now
    rhythm = facts.rhythm
    regular = rhythm.known and rhythm.longest is not None and rhythm.longest <= REGULAR_LONGEST
    if facts.reachable and not regular:
        verdict = Verdict(STATUS_OK, {"key": "ok_reachable", "params": {"via": facts.reachable}})
    elif facts.mains and not regular:
        verdict = Verdict(STATUS_OK, {"key": "ok_manual" if facts.manual else "ok_mains", "params": {}})
    elif rhythm.known:
        verdict = Verdict(STATUS_OK, {"key": "ok_rhythm", "params": {"every": rhythm.typical}})
    else:
        verdict = Verdict(STATUS_LEARNING, {"key": "learning", "params": {}})

    # 1. Silence compared to the own rhythm; times when HA was not running do not count
    silent: Verdict | None = None
    waiting = False  # after an HA pause: no report yet, but the own rhythm has not elapsed yet
    if facts.last_activity is not None:
        real = now - facts.last_activity
        silence = real - facts.downtime
        if rhythm.known:
            lim = limits(rhythm, facts.critical, facts.cloud)
            params: dict[str, Any] = {"since": real, "every": rhythm.typical}
            if facts.strays and facts.last_report is not None:
                params |= {"strays": facts.strays, "last": now - facts.last_report}
            for status, bound in ((STATUS_FAILED, lim.failed), (STATUS_CHECK, lim.check), (STATUS_WATCH, lim.watch)):
                if silence >= bound:
                    silent = Verdict(status, {"key": "silent", "params": params})
                    break
            waiting = silent is None and real >= lim.watch
        else:
            # Hardly any data, but silent for long: carefully, first "im Blick" (watch), after a week "prüfen" (check)
            silent = _silent_new(real, silence)
            waiting = silent is None and real >= SILENT_NEW_WATCH
    elif facts.observed_since is not None:
        observed = now - facts.observed_since
        silent = _silent_new(observed, observed - facts.downtime)
    if (facts.reachable or facts.mains) and not regular:
        # Mains-powered and only reporting on use: silence is no finding, only "unavailable" counts.
        # The integration sees the device (Matter subscription, cloud "reachable" flag) and it only reports on
        # events: silence means it had nothing to report (a leak sensor without water, a lock during vacation)
        silent, waiting = None, False
    elif facts.reachable and silent is not None:
        # Reachable, but a device that reports on its own all the time fell silent: it still talks to the network
        # without sending values. At most "prüfen" (check), never "ausgefallen" (failed), the connection is there
        status = STATUS_CHECK if SEVERITY[silent.status] >= SEVERITY[STATUS_CHECK] else silent.status
        silent = Verdict(status, {"key": "radio_only", "params": {"since": silent.reason["params"]["since"]}})
    if (
        silent is not None
        and facts.radio_last is not None
        and facts.radio_rises >= RADIO_MIN_RISES
        and now - facts.radio_last < limits(rhythm, facts.critical, facts.cloud).watch + RADIO_BUFFER
    ):
        # Zigbee2MQTT still counts radio traffic, just no values: never "ausgefallen" (offline)
        status = STATUS_CHECK if SEVERITY[silent.status] >= SEVERITY[STATUS_CHECK] else silent.status
        silent = Verdict(status, {"key": "radio_only", "params": {"since": silent.reason["params"]["since"]}})
    if silent is not None:
        verdict = _worse(verdict, silent)
    elif waiting and facts.downtime > 0:
        verdict = _worse(verdict, Verdict(STATUS_WATCH, {"key": "startup_waiting", "params": {}}))

    # 2. Not reachable (Zigbee availability, Matter). Being unreachable explains a silence: at the same level
    # "nicht erreichbar" (unreachable) is the reason shown, not "still" (silent)
    def _gone(current: Verdict, new: Verdict) -> Verdict:
        if SEVERITY[new.status] >= SEVERITY[current.status] and current.reason["key"] in SILENCE_KEYS:
            return new
        return _worse(current, new)

    if facts.unavailable_since is not None:
        gone = now - facts.unavailable_since
        params = {"since": gone}
        if facts.usual_outage is not None:
            # Often away by itself (standby, switched off at the plug): being gone is its habit. At most "watch";
            # only much longer than ever before (twice its longest outage, at least a day) "prüfen" (check)
            if gone >= max(2 * facts.usual_outage, DAY):
                verdict = _gone(verdict, Verdict(STATUS_CHECK, {"key": "unavailable", "params": params}))
            elif gone >= OUTAGE_MIN:
                verdict = _gone(verdict, Verdict(STATUS_WATCH, {"key": "unavailable_usual", "params": params}))
        elif gone >= (HOUR if facts.critical else 2 * HOUR):
            verdict = _gone(verdict, Verdict(STATUS_FAILED, {"key": "unavailable", "params": params}))
        elif gone >= (10 * MINUTE if facts.critical else 20 * MINUTE):
            verdict = _gone(verdict, Verdict(STATUS_CHECK, {"key": "unavailable", "params": params}))

    # 3. Cross-check: the partner was active several times, this device was not
    if facts.partner_name and facts.partner_actions >= 3:
        quiet_for = now - facts.own_last_action if facts.own_last_action is not None else None
        if quiet_for is None or quiet_for >= 2 * HOUR:
            verdict = _worse(
                verdict,
                Verdict(
                    STATUS_CHECK,
                    {
                        "key": "partner",
                        "params": {"partner": facts.partner_name, "count": facts.partner_actions, "name": facts.name},
                    },
                ),
            )

    # After a recorded change: watch until the first report comes (silence counts from the change)
    if facts.waiting_first:
        verdict = _worse(verdict, Verdict(STATUS_WATCH, {"key": "waiting_first", "params": {}}))

    # 4. Battery: warning sensor without percentage, otherwise only if the percentage means something.
    # If the device itself reports "low", that wins over a (contradicting) percentage.
    if facts.flag_on:
        verdict = _worse(verdict, Verdict(STATUS_CHECK, {"key": "battery_low_flag", "params": {}}))
    if facts.battery_flag:
        if facts.battery_level is not None:
            verdict = _worse(verdict, Verdict(STATUS_CHECK, {"key": "battery_low_flag", "params": {}}))
    elif facts.battery_level is not None and facts.battery_trusted:
        level = round(facts.battery_level)
        if level <= batt.LEVEL_LOW:
            verdict = _worse(verdict, Verdict(STATUS_CHECK, {"key": "battery_low", "params": {"level": level}}))
        elif level <= batt.LEVEL_SOON:
            verdict = _worse(verdict, Verdict(STATUS_WATCH, {"key": "battery_soon", "params": {"level": level}}))
    # Battery entity without a value for a day, but the device keeps reporting
    missing = facts.battery_missing_since
    if (
        missing is not None
        and now - missing >= BATTERY_MISSING_AFTER
        and facts.last_report is not None
        and facts.last_report >= missing
    ):
        verdict = _worse(verdict, Verdict(STATUS_WATCH, {"key": "battery_missing", "params": {"since": now - missing}}))

    return verdict


def strip(events: Sequence[float], day_starts: Sequence[float], per_day: int, now: float) -> list[int | None]:
    """Reports per time window for the rhythm bar: `per_day` windows per calendar day (days with a
    DST change have slightly longer/shorter windows); windows in the future are None."""
    buckets: list[int | None] = []
    for start, end in itertools.pairwise(day_starts):
        buckets += _bins(events, start, per_day, (end - start) / per_day, now, cap=None)
    return buckets


def heartbeat_days(
    events: Sequence[float], day_starts: Sequence[float], bin_minutes: int, now: float
) -> list[list[int | None]]:
    """Heartbeat calendar: reports per small window (e.g. 15 min), capped at 9 per window.

    Enough to draw one stroke per report in the panel without transferring thousands of timestamps
    for very chatty devices. One row per calendar day (days with a DST change have 23 or 25 hours),
    windows in the future are None.
    """
    size = bin_minutes * MINUTE
    return [
        _bins(events, start, round((end - start) / size), size, now) for start, end in itertools.pairwise(day_starts)
    ]


def _bins(
    events: Sequence[float], start: float, count: int, size: float, now: float, cap: int | None = HEARTBEAT_CAP
) -> list[int | None]:
    bins: list[int | None] = [0] * count
    for ts in events[bisect_left(events, start) :]:
        idx = int((ts - start) // size)
        if idx >= count:
            break
        if idx >= 0:
            value = (bins[idx] or 0) + 1
            bins[idx] = value if cap is None else min(cap, value)
    first_future = max(0, int((now - start) // size) + 1)
    for idx in range(first_future, count):
        bins[idx] = None
    return bins


# Gaps in the own uptime shorter than this are a normal restart, not missing data
UPTIME_SLACK = 10 * MINUTE
# Before the first own uptime (history from the recorder): no device reported for this long → HA was not running
HISTORY_GAP = 3 * HOUR


def no_data(
    uptime: Sequence[Sequence[float]],
    events: Sequence[float],
    window_start: float,
    now: float,
    chatty: bool,
) -> list[list[float]]:
    """Times without data in the window [window_start, now]: Pulse or Home Assistant was not running.

    Since Pulse runs, this is in the own uptime (`uptime`: [start, last seen]).
    Before that (history from the recorder) a gap of at least three hours counts in which not a
    single device reported anything, but only if there are chatty devices (`chatty`), otherwise
    a quiet night could not be told apart from missing data.
    """
    gaps: list[list[float]] = []
    spans = sorted((float(a), float(b)) for a, b in uptime if b >= a)
    first_start = spans[0][0] if spans else now
    if chatty and first_start > window_start:
        upto = min(first_start, now)
        start = bisect_left(events, window_start)
        prev = window_start
        for ts in events[start:]:
            if ts >= upto:
                break
            if ts - prev >= HISTORY_GAP:
                gaps.append([prev, ts])
            prev = ts
        if upto - prev >= HISTORY_GAP:
            gaps.append([prev, upto])
    for (_, end), (start_next, _) in itertools.pairwise(spans):
        if start_next - end >= UPTIME_SLACK:
            gaps.append([end, start_next])
    clipped = [[max(a, window_start), min(b, now)] for a, b in gaps]
    return [g for g in clipped if g[1] > g[0]]


class BinCache:
    """Cache for bars and calendars: recalculated only when the reports, the day or the current
    window changed, not on every send to the panel."""

    def __init__(self) -> None:
        self._data: dict[tuple[str, str], tuple[tuple[Any, ...], Any]] = {}
        self.hits = 0

    def get[T](
        self,
        kind: str,
        key_id: str,
        events: Sequence[float],
        day_start: float,
        window: float,
        now: float,
        build: Callable[[], T],
    ) -> T:
        key = (
            day_start,
            len(events),
            events[-1] if events else None,
            events[0] if events else None,
            int((now - day_start) // window),
        )
        cached = self._data.get((kind, key_id))
        if cached is not None and cached[0] == key:
            self.hits += 1
            value: T = cached[1]
            return value
        fresh = build()
        self._data[(kind, key_id)] = (key, fresh)
        return fresh

    def forget(self, key_id: str) -> None:
        for slot in [k for k in self._data if k[1] == key_id]:
            del self._data[slot]


def is_ok(status: str) -> bool:
    return SEVERITY[status] == 0


__all__ = [
    "BinCache",
    "Facts",
    "Limits",
    "Rhythm",
    "RhythmCache",
    "Verdict",
    "downtime_gaps",
    "evaluate",
    "heartbeat_days",
    "is_ok",
    "learn",
    "limits",
    "merge_event",
    "no_data",
    "overlap",
    "percentile",
    "restart_echoes",
    "silence_start",
    "strip",
]
