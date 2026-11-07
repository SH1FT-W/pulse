"""Battery change detection from the reported values alone, without Home Assistant.

Pulse never polls a device, so a battery change has to be read from what the battery entities report. Field
data (#5, Daniel's devices, research on Zigbee2MQTT/ZHA/Z-Wave/BLE/Matter/cloud) shows why pairs of reports
cannot confirm each other:
- BLE sensors wobble (Shelly BLU H&T 60-75 %) and send single outliers (15 %, 50 %); a weak coin cell swings
  40 % ↔ 95 % within seconds, and BLE reports every minute.
- After "unavailable", a Zigbee2MQTT entity shows an old cached value first (91 %) and the real one about a
  minute later (sometimes the other way round), in one house 186 times in 10 days.
- Cold and warm: a freezer sensor defrosting, outdoor sensors at night, Aqara % computed from voltage and
  Tuya TRVs flipping 100/50 all go down and come back to where they were.
- Some devices only write on change, in coarse steps; cloud devices report hours apart; buttons only on press.
- Rechargeable devices (soundbar rear speakers) charge up again and again.
- Level and voltage arrive separately (ZHA, up to two days apart); Z-Wave sends 255 for "low".

So a change is judged on a short history per quantity (level in %, voltage in mV):
1. Step: one single step up of at least the jump threshold (charging in small steps never counts), from a
   robust "before" (median of the last three samples, so a single low outlier is no "before").
2. Low held: every value in the hour before the step was low, and so was the value an hour before: outliers
   last minutes, a flat battery days. By time, not by count (BLE sends every minute).
3. New, not back: the new value is clearly above everything of the last three days. A level the device
   already had (before the cold night, the defrost, the last charge) is no new battery. With less than a day
   of history nothing counts (first day after setup or after updating to this version).
4. Cached values: values in the first minutes after "unavailable" are provisional; they may start a
   candidate (a swap while the device was gone) but only their last value counts as real: when those
   minutes end without another dropout, or when it differs from the first one (cached first, real a minute
   later, even if the next dropout follows; devices that drop out every hour still get a history).
5. Held: the new level has to hold HOLD_SECONDS (confirmed by a later report or by time); one report back
   down is an outlier, staying down ends it. After "unavailable": a real report or a calm day without
   another dropout confirms it.
6. One change once: a step within ABSORB_SECONDS of a change already recorded (automatic or by hand) is that
   change (level and voltage, a manual mark). It is kept for that time: if the mark is undone, it counts.

Known limits (accepted): a step under 25 points / 15 %; a flip lasting longer than three days; a cliff to
a few percent and a swap within three days (the level was 100 recently; only the voltage can tell); a single
low report before a swap on a device that reports rarely; a cached value shown after the real one, twice in
a row; nothing in the first day after setup or update.
"""

from __future__ import annotations

from dataclasses import dataclass
from statistics import median
from typing import Any

LEVEL = "level"
VOLTAGE = "voltage"
KINDS = (LEVEL, VOLTAGE)

LEVEL_JUMP = 25.0
LEVEL_JUMP_FROM = 75.0
VOLTAGE_JUMP_ABS = 150.0  # mV
VOLTAGE_JUMP_REL = 0.15
LEVEL_ABOVE_PEAK = 5.0  # the new level must be this much above the highest of the last days
VOLTAGE_ABOVE_PEAK = 50.0  # mV

BEFORE_SAMPLES = 3  # median of this many samples is the level before the step
LOW_HOLD_SECONDS = 3600.0
KEEP_SECONDS = 2 * 3600.0  # raw samples kept this long (plus the last BEFORE_SAMPLES)
MAX_SAMPLES = 150
SAME_SAMPLE_SECONDS = 1800.0  # the same value again within this time is no new sample (republish)
# Several values within a minute are one sample, its highest value (BLE thermometers advertise every few
# seconds; the highest keeps a weak cell's short swing up from looking like a low level)
THIN_SECONDS = 60.0
PEAK_BUCKET = 6 * 3600.0
PEAK_SECONDS = 3 * 86400.0  # "the last days" for the highest value
MIN_HISTORY_SECONDS = 86400.0  # without a day of history there is no "last days" to compare with
STALE_SECONDS = 180.0  # values this soon after "unavailable" may be cached
HOLD_SECONDS = 6 * 3600.0  # the new level held this long
CALM_SECONDS = 86400.0  # after "unavailable": confirmed by time only after a day without another dropout
ABSORB_SECONDS = 3 * 86400.0  # a step this close to a recorded change is that change
CANDIDATE_MAX_SECONDS = 14 * 86400.0  # a step not confirmed within this time is dropped


@dataclass(frozen=True)
class Verdict:
    """A confirmed battery change: when the step happened and the level before it (for the notification)."""

    at: float
    kind: str
    before: float
    level_before: float | None  # the level (%) before the step, also when the voltage confirmed it


def valid(kind: str, value: float) -> bool:
    """A usable value: Z-Wave sends 255 for "low", some firmware 200 % (half units), a voltage of 0 is none."""
    if kind == LEVEL:
        return 0.0 <= value <= 100.0
    return value > 0.0


def jump(kind: str, before: float, after: float) -> bool:
    """A step up that no normal wobble explains."""
    if kind == LEVEL:
        return before <= LEVEL_JUMP_FROM and after - before >= LEVEL_JUMP
    return before > 0 and after - before >= VOLTAGE_JUMP_ABS and (after - before) / before >= VOLTAGE_JUMP_REL


def _still_high(kind: str, before: float, value: float) -> bool:
    """A later value still counts as the new battery (some wobble down allowed, never back near before)."""
    if kind == LEVEL:
        return value - before >= LEVEL_JUMP - 10
    return value - before >= VOLTAGE_JUMP_ABS * 0.6


def _state(record: dict[str, Any]) -> dict[str, Any]:
    state = record.get("battery_history")
    if not isinstance(state, dict):
        state = record["battery_history"] = {}
    for kind in KINDS:
        item = state.get(kind)
        if not isinstance(item, dict):
            item = state[kind] = {}
        for key in ("samples", "peaks"):
            if not isinstance(item.get(key), list):
                item[key] = []
        for key in ("candidate", "back", "absorbed"):
            if not isinstance(item.get(key), dict):
                item[key] = None
        for key in ("rise",):
            if not isinstance(item.get(key), list):
                item[key] = None
    return state


def _forget_future(item: dict[str, Any], now: float) -> None:
    """The clock was once ahead (wrong at boot): what is dated after now never resolves, so drop it."""
    for key in ("candidate", "absorbed", "back"):
        at = item[key].get("at") if item[key] else None
        if isinstance(at, int | float) and at > now:
            item[key] = None
    rise = item["rise"]
    if rise and isinstance(rise[0], int | float) and rise[0] > now:
        item["rise"] = None


def _pairs(items: Any) -> list[list[float]]:
    return [s for s in items if isinstance(s, list) and len(s) == 2 and all(isinstance(x, int | float) for x in s)]


def _add_sample(item: dict[str, Any], ts: float, value: float) -> None:
    samples = [s for s in _pairs(item["samples"]) if s[0] <= ts]  # a clock once ahead: drop "future" samples
    if samples and 0 <= ts - samples[-1][0] < THIN_SECONDS:
        samples[-1][1] = max(samples[-1][1], value)
    elif not (samples and samples[-1][1] == value and ts - samples[-1][0] < SAME_SAMPLE_SECONDS):
        samples.append([ts, value])
    keep = [s for s in samples[:-BEFORE_SAMPLES] if ts - s[0] <= KEEP_SECONDS]
    # Keep the newest sample from before the window too: it tells the level an hour before a step
    older = [s for s in samples[:-BEFORE_SAMPLES] if ts - s[0] > KEEP_SECONDS][-1:]
    item["samples"] = (older + keep + samples[-BEFORE_SAMPLES:])[-MAX_SAMPLES:]
    bucket = ts - ts % PEAK_BUCKET
    stored = [p for p in _pairs(item["peaks"]) if p[0] <= bucket]  # a clock once ahead: drop "future" buckets
    item["peaks"] = kept = _recent_peaks(stored, ts)
    if kept and kept[-1][0] == bucket:
        kept[-1][1] = max(kept[-1][1], value)
    else:
        kept.append([bucket, value])


def _recent_peaks(stored: list[list[float]], ts: float) -> list[list[float]]:
    """The peaks of the last days; silent for longer (flat battery, a button, frost): the days before the last
    report, so a device that comes back is compared with what it had then, not with its last few hours."""
    recent = [p for p in stored if ts - p[0] <= PEAK_SECONDS + PEAK_BUCKET]
    if recent or not stored:
        return recent
    last = stored[-1][0]
    return [p for p in stored if last - p[0] <= PEAK_SECONDS + PEAK_BUCKET]


def _before(item: dict[str, Any]) -> float | None:
    values = [s[1] for s in _pairs(item["samples"])[-BEFORE_SAMPLES:]]
    return float(median(values)) if values else None


def current(record: dict[str, Any], kind: str = LEVEL) -> float | None:
    """The robust current value (median of the last samples), e.g. for "was the battery low" on a manual mark."""
    return _before(_state(record)[kind])


def seed(record: dict[str, Any], kind: str, ts: float, value: float | None) -> None:
    """Start the history from a value Pulse already knew (store from before this version)."""
    if value is None or not valid(kind, value):
        return
    item = _state(record)[kind]
    if not _pairs(item["samples"]):
        _add_sample(item, ts, value)


def _resolve_window(item: dict[str, Any], kind: str, changes: list[float], settled: bool, held: bool) -> Verdict | None:
    """The minutes after "unavailable" end. Their last value is real when they ended without another dropout
    (`held`), or when it differs from the first one (cached first, then the real one; Daniel's freezer showed
    91, then 27, then dropped out again). A single value cut off by the next dropout stays unknown."""
    back = item["back"]
    item["back"] = None
    last = back.get("last") if back else None
    if not (isinstance(last, list) and len(last) == 2):
        return None
    if not held and last[1] == back.get("first"):
        return None
    ts, value = float(last[0]), float(last[1])
    verdict = _confirm(item, kind, ts, value, changes, settled)
    candidate = item["candidate"]
    if candidate and candidate.get("at") == ts:
        candidate["window"] = None  # its own value is resolved as real: no later window replaces it
    _add_sample(item, ts, value)
    return verdict


def unavailable(
    record: dict[str, Any], kind: str, changes: list[float] | None = None, settled: bool = True
) -> Verdict | None:
    """The entity went unavailable/unknown: the next values may be cached ones."""
    item = _state(record)[kind]
    verdict = None
    if item["back"] is not None and isinstance(item["back"].get("at"), int | float):
        verdict = _resolve_window(item, kind, changes or [], settled, held=False)
    item["back"] = {"at": None}
    candidate = item["candidate"]
    if candidate:
        candidate["after_unavailable"] = True
        candidate["calm_since"] = None
    return verdict


def report(
    record: dict[str, Any], kind: str, ts: float, value: float, changes: list[float], settled: bool = True
) -> Verdict | None:
    """One real report of a quantity (state changed or the same value reported again).

    `changes`: times of battery changes already recorded (automatic and manual). `settled`: Home Assistant
    has been running long enough that values are no restart echoes; before that a step can still start a
    candidate (a battery swapped while HA was down) but nothing is confirmed.
    """
    if not valid(kind, value):
        return None
    item = _state(record)[kind]
    _forget_future(item, ts)
    back = item["back"]
    verdict: Verdict | None = None
    if back is not None:
        first = back.get("at")
        if not isinstance(first, int | float):
            back["at"] = first = ts
            back["first"] = value
            candidate = item["candidate"]
            if candidate and candidate.get("after_unavailable") and candidate.get("window") != first:
                candidate["calm_since"] = ts
        if ts - first < STALE_SECONDS:
            # Maybe cached (Zigbee2MQTT shows an old value first, mostly followed by the real one): the latest
            # value of these minutes may start a candidate; it counts as real only once resolved (see
            # `_resolve_window`)
            candidate = item["candidate"]
            if candidate and candidate.get("window") == first:
                item["candidate"] = None  # replaced within its own minutes: it was the cached one
            back["last"] = [ts, value]
            _maybe_candidate(_state(record), kind, ts, value, window=first)
            return None
        verdict = _resolve_window(item, kind, changes, settled, held=True)
    verdict = _confirm(item, kind, ts, value, changes, settled) or verdict
    _maybe_candidate(_state(record), kind, ts, value, window=None)
    _add_sample(item, ts, value)
    return verdict


def tick(record: dict[str, Any], kind: str, now: float, changes: list[float], settled: bool = True) -> Verdict | None:
    """Time passed without a report: a held candidate may be confirmed, a stale one dropped."""
    item = _state(record)[kind]
    _forget_future(item, now)
    back = item["back"]
    resolved = None
    if back is not None and isinstance(back.get("at"), int | float) and now - back["at"] >= STALE_SECONDS:
        # The first minutes after "unavailable" are over (a button, a cloud device)
        resolved = _resolve_window(item, kind, changes, settled, held=True)
    if resolved:
        return resolved
    absorbed = item["absorbed"]
    if absorbed:
        at = absorbed.get("dated", absorbed.get("at"))
        prev = absorbed.get("prev")
        if not isinstance(at, int | float) or now - at > ABSORB_SECONDS:
            item["absorbed"] = None
        elif not any(
            abs(at - change) <= ABSORB_SECONDS or (isinstance(prev, int | float) and prev < change <= at)
            for change in changes
        ):
            # The change it was taken for is gone (undone by hand): it counts after all
            item["absorbed"] = None
            return _verdict(absorbed, kind)
    candidate = item["candidate"]
    if not candidate:
        return None
    if now - candidate["at"] > CANDIDATE_MAX_SECONDS:
        item["candidate"] = None
        return None
    if not settled:
        return None
    back = item["back"]
    if candidate.get("low_since") is not None:
        return None  # the last report was back down: wait for the next one
    if candidate.get("after_unavailable"):
        calm = candidate.get("calm_since")
        if isinstance(calm, int | float) and back is None and now - calm >= CALM_SECONDS:
            return _accept(item, kind, changes)
        return None
    if now - candidate["at"] >= HOLD_SECONDS:
        return _accept(item, kind, changes)
    return None


def _maybe_candidate(state: dict[str, Any], kind: str, ts: float, value: float, window: float | None) -> None:
    item = state[kind]
    if item["candidate"]:
        return
    samples = _pairs(item["samples"])
    before = _before(item)
    if not samples or before is None:
        return
    if not jump(kind, samples[-1][1], value):
        return  # one single step up (no charging)
    if kind == LEVEL:
        item["rise"] = [ts, before]  # for a voltage step confirmed later: when the level rose, and from where
    if not jump(kind, before, value):
        return  # from a robust low level (no single outlier as "before")
    start = ts - LOW_HOLD_SECONDS
    earlier = [s for s in samples if s[0] <= start]
    recent = [s for s in samples if s[0] > start]
    if not earlier or not all(jump(kind, s[1], value) for s in [earlier[-1], *recent]):
        return  # the low level did not last an hour: outliers, a dip, a weak cell swinging
    stored = [p for p in _pairs(item["peaks"]) if p[0] <= ts]
    if not stored or ts - stored[0][0] < MIN_HISTORY_SECONDS:
        return  # Pulse knows the device for less than a day: it cannot tell a new battery from a warm morning
    peaks = _recent_peaks(stored, ts)
    margin = LEVEL_ABOVE_PEAK if kind == LEVEL else VOLTAGE_ABOVE_PEAK
    if value < max(p[1] for p in peaks) + margin:
        return  # back to a level of the last days (cold night, defrost, charging): no new battery
    item["candidate"] = {
        "at": ts,
        "before": before,
        "value": value,
        "window": window,  # started in the minutes after "unavailable" that began then (maybe cached)
        "after_unavailable": window is not None,
        "calm_since": ts if window is not None else None,
        "low_since": None,  # a report back down since then (one outlier does not end the candidate)
        "prev": samples[-1][0],  # the last report before the step (a mark since then: this is that change)
        "dated": ts,
        "level_before": before,
    }
    if kind == VOLTAGE:
        # The level may have stepped already (ZHA reports it on its own, hours apart): if it rose after the last
        # voltage report before this step, that is the same change, dated at the level's step and judged by
        # the level before it. An older rise (back from an outlier days ago) has nothing to do with it.
        rise = state[LEVEL]["rise"]
        level_before = _before(state[LEVEL])
        if isinstance(rise, list) and len(rise) == 2 and samples[-1][0] < rise[0] <= ts:
            item["candidate"]["dated"] = float(rise[0])
            level_before = float(rise[1])
        item["candidate"]["level_before"] = level_before


def _confirm(
    item: dict[str, Any], kind: str, ts: float, value: float, changes: list[float], settled: bool
) -> Verdict | None:
    candidate = item["candidate"]
    if not candidate or ts <= candidate["at"]:
        return None
    candidate["window"] = None  # a real report after its first minutes: the step was no cached value
    if not _still_high(kind, candidate["before"], value):
        low_since = candidate.get("low_since")
        if not isinstance(low_since, int | float):
            candidate["low_since"] = ts  # one outlier down does not end it ...
        elif ts - low_since >= STALE_SECONDS:
            item["candidate"] = None  # ... staying down does: no new battery (or the old one back)
        return None
    candidate["low_since"] = None
    if not settled:
        return None
    if ts - candidate["at"] >= HOLD_SECONDS:
        return _accept(item, kind, changes)
    if candidate.get("after_unavailable") and ts - candidate["at"] >= STALE_SECONDS:
        return _accept(item, kind, changes)  # swapped while the device was gone: a real report still high
    return None


def _accept(item: dict[str, Any], kind: str, changes: list[float]) -> Verdict | None:
    candidate = item["candidate"]
    item["candidate"] = None
    dated = candidate.get("dated", candidate["at"])
    prev = candidate.get("prev")
    silent = [at for at in changes if isinstance(prev, int | float) and prev < at <= dated]
    if silent or any(abs(dated - at) <= ABSORB_SECONDS for at in changes):
        # Already counted (the other quantity, or marked by hand); kept a while in case the mark is undone
        item["absorbed"] = candidate
        return None
    return _verdict(candidate, kind)


def _verdict(candidate: dict[str, Any], kind: str) -> Verdict:
    level_before = candidate.get("level_before")
    return Verdict(
        at=float(candidate.get("dated", candidate["at"])),
        kind=kind,
        before=float(candidate["before"]),
        level_before=float(level_before) if isinstance(level_before, int | float) else None,
    )
