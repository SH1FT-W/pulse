"""Battery change detection (replacement.py) on report sequences from the field and from three review rounds."""

from __future__ import annotations

from typing import Any

import pytest

from custom_components.pulse import replacement as r

MIN = 60.0
HOUR = 3600.0
NA = None  # unavailable/unknown


def run(
    seq: list[tuple[float, str, float | None]],
    changes: list[float] | None = None,
    settled_from: float = 0.0,
    tick_every: float = HOUR,
    tail: float = 8 * HOUR,
) -> tuple[list[r.Verdict], dict[str, Any]]:
    """Feed (minutes, kind, value) reports, ticking every hour in between and `tail` after the last one."""
    record: dict[str, Any] = {}
    changes = [] if changes is None else changes
    verdicts: list[r.Verdict] = []
    last = None
    for minutes, kind, value in seq:
        ts = minutes * MIN
        if last is not None:
            t = last + tick_every
            while t < ts:
                for k in r.KINDS:
                    if v := r.tick(record, k, t, changes, settled=t >= settled_from):
                        verdicts.append(v)
                        changes.append(v.at)
                t += tick_every
        last = ts
        if value is None:
            r.unavailable(record, kind)
            continue
        if v := r.report(record, kind, ts, value, changes, settled=ts >= settled_from):
            verdicts.append(v)
            changes.append(v.at)
    t = (last or 0.0) + tick_every
    while last is not None and t <= last + tail:
        for k in r.KINDS:
            if v := r.tick(record, k, t, changes, settled=t >= settled_from):
                verdicts.append(v)
                changes.append(v.at)
        t += tick_every
    return verdicts, record


def levels(*values: float | None, every: float = 10.0, start: float = 0.0) -> list[tuple[float, str, float | None]]:
    return [(start + i * every, r.LEVEL, v) for i, v in enumerate(values)]


def known(kind: str, value: float) -> list[tuple[float, str, float | None]]:
    """A day of history before minute 0 (Pulse compares a step with the last days)."""
    return [(-26 * 60 + h * 60, kind, value) for h in range(25)]


def volts(*values: float | None, every: float = 10.0, start: float = 0.0) -> list[tuple[float, str, float | None]]:
    return [(start + i * every, r.VOLTAGE, v) for i, v in enumerate(values)]


# ── No change: outliers, wobble, caches, charging ─────────────────────────


@pytest.mark.parametrize(
    "values",
    [
        (70, 66, 15, 70, 71, 68),  # #5: single outlier far down (Shelly BLU H&T in a fridge)
        (74, 50, 75, 75),  # outlier just under the old 25-point limit
        (70, 70, 15, 15, 70, 70),  # Zigbee2MQTT republishes the outlier with the next message (same value)
        (70, 15, 45, 70, 71),  # two different outliers in a row
        (62, 75, 60, 77, 61, 74, 63, 76, 60, 75),  # wobble 60-77
        (40, 41, 40, 41),
    ],
)
def test_outliers_and_wobble_are_no_change(values):
    verdicts, _ = run(levels(*values))
    assert verdicts == []


def test_voltage_outlier_back_to_same_value():
    verdicts, _ = run(volts(3000, 3000, 2600, 3000, 3000))  # 13.3 % down, 15.4 % back up
    assert verdicts == []


def test_cached_value_after_unavailable_is_no_change():
    """IKEA PARASOLL via Zigbee2MQTT (Daniel's freezer): after unavailable 91 % (cached), then the real 27 %."""
    seq = levels(27, 27)
    t = 30.0
    for _ in range(20):
        seq += [(t, r.LEVEL, NA), (t + 0.1, r.LEVEL, 91), (t + 1, r.LEVEL, 27)]
        t += 120
    verdicts, _ = run(seq)
    assert verdicts == []


def test_cached_value_after_unavailable_without_real_value_soon():
    """Freezer, 30.10.: unavailable → 91 (cached), no real value for hours, unavailable → 91 again, then 40."""
    seq = [
        *levels(40, 40),
        (30, r.LEVEL, NA),
        (30.1, r.LEVEL, 91),
        (130, r.LEVEL, NA),
        (130.1, r.LEVEL, 91),
        (160, r.LEVEL, NA),
        (160.1, r.LEVEL, 91),
        (170, r.LEVEL, 40),
    ]
    verdicts, _ = run(seq)
    assert verdicts == []


def test_charging_in_small_steps_is_no_change():
    """JBL rear speaker: 78 → 100 in 1-2 point steps within half an hour."""
    values = [90, 85, 80, 78, *range(79, 101)]
    verdicts, _ = run(levels(*values, every=2))
    assert verdicts == []


def test_weak_coin_cell_swinging_within_minutes_is_no_change():
    """Shelly BLU with a weak CR2032: 40 % ↔ 95 % within minutes, a packet every minute, for hours."""
    values = [95, 40, 41, 39, 95, 94, 40, 42, 95] * 20
    verdicts, _ = run(levels(*values, every=1))
    assert verdicts == []


@pytest.mark.parametrize("value", [255.0, 200.0, -1.0])
def test_values_out_of_range_are_ignored(value):
    verdicts, record = run([*levels(20, 20, 20, every=60), (200, r.LEVEL, value), (300, r.LEVEL, value)])
    assert verdicts == [] and r.current(record) == 20


def test_outlier_up_that_falls_back_is_no_change():
    verdicts, _ = run(levels(30, 30, 30, 90, 30, 30))
    assert verdicts == []


# ── Real changes ───────────────────────────────────────────────────────────


def test_plain_change_confirmed_by_next_report():
    hist = known(r.LEVEL, 20)
    verdicts, _ = run(hist + levels(20, 19, 18, 100, 100, every=60))
    assert len(verdicts) == 1 and verdicts[0].before == 19 and verdicts[0].at == 180 * MIN


def test_change_confirmed_by_time_alone_for_on_change_devices():
    """Coarse steps, writes only on change (cloud): 100/80/60/40/20, new battery 100, then silence."""
    hist = known(r.LEVEL, 100)
    seq = [
        *levels(100, 80, 60, 40, 20, every=24 * 60),
        (5 * 24 * 60, r.LEVEL, 100),
        (5 * 24 * 60 + 12 * 60, r.LEVEL, 100),
    ]
    verdicts, _ = run(hist + seq)
    assert len(verdicts) == 1 and verdicts[0].before == 40


def test_change_after_unavailable_during_swap():
    hist = known(r.LEVEL, 11)
    seq = [*levels(11, 10, every=60), (90, r.LEVEL, NA), (100, r.LEVEL, 100), (120, r.LEVEL, 100)]
    verdicts, _ = run(hist + seq)
    assert len(verdicts) == 1 and verdicts[0].at == 100 * MIN


def test_change_after_unavailable_needs_a_real_report_not_time():
    hist = known(r.LEVEL, 11)
    seq = [*levels(11, 10, every=60), (90, r.LEVEL, NA), (100, r.LEVEL, 100)]
    verdicts, _ = run(hist + seq + [(100 + 24 * 60, r.LEVEL, 99)])
    assert len(verdicts) == 1 and verdicts[0].at == 100 * MIN


def test_wobbling_real_fall_then_change():
    hist = known(r.LEVEL, 80)
    verdicts, _ = run(hist + levels(80, 8, 20, 8, 20, 100, 100, every=60))
    assert len(verdicts) == 1 and verdicts[0].before <= 20


def test_confirmed_fall_then_change_with_coarse_steps():
    hist = known(r.LEVEL, 70)
    verdicts, _ = run(hist + levels(70, 15, 14, 100, 100, every=60))
    assert len(verdicts) == 1


def test_voltage_only_device():
    hist = known(r.VOLTAGE, 2600)
    verdicts, _ = run(hist + volts(2600, 2590, 2580, 3100, 3100, every=60))
    assert len(verdicts) == 1 and verdicts[0].kind == r.VOLTAGE


def test_swap_while_home_assistant_was_down_counts_once_settled():
    hist = known(r.LEVEL, 20)
    seq = [*levels(20, 20, 20), (600, r.LEVEL, 100), (605, r.LEVEL, 100), (700, r.LEVEL, 100)]
    verdicts, _ = run(hist + seq, settled_from=650 * MIN)
    assert len(verdicts) == 1 and verdicts[0].at == 600 * MIN


# ── One change counts once ───────────────────────────────────────────────


def test_level_and_voltage_in_one_message_count_once():
    hist = known(r.LEVEL, 30)
    seq: list[tuple[float, str, float | None]] = []
    for minutes, (level, volt) in enumerate([(30, 1100), (30, 1100), (100, 1500), (100, 1500)]):
        seq += [(minutes * 60, r.LEVEL, level), (minutes * 60, r.VOLTAGE, volt)]
    verdicts, _ = run(hist + seq)
    assert len(verdicts) == 1


def test_voltage_reported_hours_later_counts_once():
    hist = known(r.LEVEL, 30)
    seq = [(0, r.LEVEL, 31), (0, r.VOLTAGE, 1110), (60, r.LEVEL, 30), (60, r.VOLTAGE, 1100)]
    seq += [(120, r.LEVEL, 100), (120, r.VOLTAGE, 1500), (130, r.LEVEL, 100), (550, r.VOLTAGE, 1500)]
    seq += [(4000, r.VOLTAGE, 1490)]
    verdicts, _ = run(hist + seq)
    assert len(verdicts) == 1


def test_marked_by_hand_after_the_device_reported_counts_once():
    hist = known(r.LEVEL, 20)
    seq = hist + levels(20, 20, 100, every=60) + levels(100, 99, 99, every=60, start=180)
    # Without the mark this is one change at minute 120 ...
    alone, _ = run(seq, [])
    assert [v.at for v in alone] == [120 * MIN]
    # ... tapped "battery replaced" 5 minutes after the device already showed 100: no second, automatic one
    verdicts, _ = run(seq, [125 * MIN])
    assert verdicts == []


def test_undo_lets_a_real_change_count_again():
    hist = known(r.LEVEL, 21)
    changes = [5 * MIN]  # wrong device marked ...
    changes.clear()  # ... and undone
    verdicts, _ = run(hist + levels(21, 20, 19, 100, 100, every=60), changes)
    assert len(verdicts) == 1


# ── Robustness ───────────────────────────────────────────────────────────


def test_unconfirmed_candidate_expires():
    seq = [*levels(20, 20), (30, r.LEVEL, NA), (40, r.LEVEL, 100)]
    _, record = run([*seq, (40 + 15 * 24 * 60, r.LEVEL, 20)])
    assert record["battery_history"][r.LEVEL]["candidate"] is None


@pytest.mark.parametrize("stored", [None, 1.0, "x", {"level": 5}, {"level": {"samples": "x", "candidate": 3}}])
def test_damaged_stored_history_is_replaced(stored):
    record = {"battery_history": stored}
    assert r.report(record, r.LEVEL, 0.0, 50.0, []) is None
    assert r.current(record) == 50.0


def test_seed_and_current():
    record: dict[str, Any] = {}
    r.seed(record, r.LEVEL, 0.0, 42.0)
    r.seed(record, r.LEVEL, 1.0, 10.0)  # only when empty
    r.seed(record, r.VOLTAGE, 0.0, None)
    assert r.current(record) == 42.0 and r.current(record, r.VOLTAGE) is None


def test_samples_are_kept_by_time():
    """BLE every minute: the last two hours stay (an hour of low level must be visible), older ones go."""
    _, record = run(levels(*([40, 41] * 300), every=1), tail=0)
    samples = record["battery_history"][r.LEVEL]["samples"]
    assert len(samples) <= r.MAX_SAMPLES
    assert samples[-1][0] - samples[0][0] >= r.LOW_HOLD_SECONDS


# ── From the user simulations (BLE, Matter, cloud, Zigbee2MQTT, ZHA, Z-Wave) ──


def test_ble_every_minute_with_wobble_detects_the_swap():
    """Shelly BLU H&T: a packet every minute, 12 % ±2 for a day, then a new battery."""
    low = [12, 11, 13, 12, 14, 10] * 240
    seq = levels(*low, every=1) + levels(*([100, 99, 100] * 160), every=1, start=len(low))
    verdicts, _ = run(seq)
    assert len(verdicts) == 1 and verdicts[0].at == len(low) * MIN


@pytest.mark.parametrize(
    ("night", "day"),
    [
        (57, 100),  # Aqara % from voltage, outdoors in winter
        (50, 100),  # Tuya TRV flipping to 50 while heating
        (40, 68),  # Matter contact outdoors
        (0, 80),  # Z-Wave "low" mapped to 0 on two wake-ups
    ],
)
def test_coming_back_to_a_level_of_the_last_days_is_no_change(night, day):
    seq: list[tuple[float, str, float | None]] = []
    for d in range(7):
        start = d * 24 * 60
        seq += levels(day, day, day, every=180, start=start)
        seq += levels(night, night, night, night, every=180, start=start + 540)
    verdicts, _ = run(seq)
    assert verdicts == []


def test_freezer_defrost_for_three_hours_is_no_change():
    seq = known(r.LEVEL, 35) + levels(35, 35, 65, 66, 65, 35, 35, every=60)
    verdicts, _ = run(seq)
    assert verdicts == []


def test_charging_polled_every_twenty_minutes_is_no_change():
    """Rear speaker charging in the soundbar: it was full yesterday."""
    seq = (
        known(r.LEVEL, 100)
        + levels(80, 60, 40, 20, 20, 20, 20, every=60)
        + levels(45, 70, 95, 100, start=420, every=20)
    )
    verdicts, _ = run(seq)
    assert verdicts == []


def test_button_silent_for_days_after_the_swap_counts_after_a_calm_day():
    seq = [*known(r.LEVEL, 20), (10, r.LEVEL, NA), (30, r.LEVEL, 100)]
    verdicts, _ = run(seq, tail=26 * HOUR)
    assert len(verdicts) == 1 and verdicts[0].at == 30 * MIN


def test_device_dropping_out_every_ninety_minutes_still_gets_its_swap():
    """Zigbee2MQTT flapping: every value comes right after unavailable, cached 91 first, then the real one."""
    seq = known(r.LEVEL, 40)
    t = 0.0
    for _ in range(20):
        seq += [(t, r.LEVEL, NA), (t + 0.1, r.LEVEL, 91), (t + 1, r.LEVEL, 40)]
        t += 97
    swap = t
    for _ in range(10):
        seq += [(t, r.LEVEL, NA), (t + 0.1, r.LEVEL, 91), (t + 1, r.LEVEL, 100)]
        t += 97
    verdicts, _ = run(seq)
    assert len(verdicts) == 1 and verdicts[0].at == (swap + 1) * MIN


def test_first_day_without_history_counts_nothing():
    verdicts, _ = run(levels(15, 15, 15, every=10) + levels(100, 100, every=60, start=40))
    assert verdicts == []


# ── Second review of the rebuild ──


def test_mark_by_hand_then_the_button_reports_days_later_counts_once():
    """Button at 10 %, swapped and marked; its next press (the new battery) comes 4 days later."""
    seq = [*levels(*([10] * 7), every=12 * 60), (7 * 24 * 60, r.LEVEL, 100), (7 * 24 * 60 + 60, r.LEVEL, 100)]
    alone, _ = run(seq, [])
    assert len(alone) == 1
    verdicts, _ = run(seq, [(3 * 24 * 60 + 60) * MIN])
    assert verdicts == []


def test_voltage_confirming_a_day_late_keeps_the_level_step_and_its_low():
    """Level 100 for days, cliff to 5 within a day, swap; the voltage only steps a day later (ZHA)."""
    seq: list[tuple[float, str, float | None]] = []
    for h in range(13 * 24):
        level = 100.0 if h < 240 else 5.0 if h < 264 else 100.0
        seq.append((h * 60.0, r.LEVEL, level))
        if h % 6 == 3:  # the voltage on its own interval (ZHA): low before the swap, new after it
            seq.append((h * 60.0 + 1, r.VOLTAGE, 3000.0 if h < 240 else 2400.0 if h < 264 else 3200.0))
    verdicts, _ = run(seq)
    assert len(verdicts) == 1
    assert verdicts[0].at == 264 * HOUR and verdicts[0].level_before == 5.0


def test_a_clock_once_ahead_does_not_block_later_changes():
    """One report while the clock was a year ahead (wrong at boot): after a day of history again (like a new
    setup) the real swap still counts."""
    seq = [*known(r.LEVEL, 20), (400 * 24 * 60, r.LEVEL, 100), *levels(*([20] * 30), 100, 100, every=60, start=60)]
    verdicts, _ = run(seq)
    assert len(verdicts) == 1 and verdicts[0].at == 31 * HOUR


def test_going_back_and_up_again_keeps_the_history():
    """An older version writes minor 12 over the store; updating again must not wipe the history."""
    from custom_components.pulse.store import migrate

    record: dict[str, Any] = {"last_level": 30.0}
    _, history = run([*known(r.LEVEL, 30)])
    record["battery_history"] = history["battery_history"]
    samples = list(record["battery_history"][r.LEVEL]["samples"])
    data = migrate(12, {"devices": {"a": record}})
    assert data["devices"]["a"]["battery_history"][r.LEVEL]["samples"] == samples
