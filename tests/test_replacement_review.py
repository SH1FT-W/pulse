"""Battery change detection: cases from the adversarial review of the rebuild (26.11.8)."""

from __future__ import annotations

import random

import pytest

from custom_components.pulse import replacement as r

M = 60.0
H = 3600.0
D = 86400.0
L, V = r.LEVEL, r.VOLTAGE


def run(events, tick=60.0, settled=lambda t: True, changes=None):
    """events: (t_seconds, kind, value|None|'mark'|'undo')"""
    events = sorted(events, key=lambda e: e[0])
    rec, ch, out = {}, (changes if changes is not None else []), []
    last = None
    for t, kind, val in events:
        if last is not None:
            k = last + tick
            while k < t:
                for kk in r.KINDS:
                    if v := r.tick(rec, kk, k, ch, settled(k)):
                        out.append(v)
                        ch.append(v.at)
                k += tick
        last = t
        if val == "mark":
            ch.append(t)
            continue
        if val == "undo":
            ch.pop()
            continue
        if val is None:
            if v := r.unavailable(rec, kind, ch, settled(t)):
                out.append(v)
                ch.append(v.at)
            continue
        if v := r.report(rec, kind, t, float(val), ch, settled(t)):
            out.append(v)
            ch.append(v.at)
    # tick 2 days on
    k = last + tick
    while k < last + 2 * D:
        for kk in r.KINDS:
            if v := r.tick(rec, kk, k, ch, settled(k)):
                out.append(v)
                ch.append(v.at)
        k += tick
    return out, rec


def series(a, b, every, base, wobble=0, kind=L, seed=1):
    rng = random.Random(seed)
    t = a
    ev = []
    while t < b:
        ev.append((t, kind, base + (rng.randint(-wobble, wobble) if wobble else 0)))
        t += every
    return ev


T0 = 10 * D


def test_button_weekly_press():
    # Button reports battery only on press, pressed once a week; 15 % for weeks, swap, next press 100
    ev = [(i * 7 * D, L, 15) for i in range(4)] + [(4 * 7 * D, L, 100), (5 * 7 * D, L, 100)]
    out, _rec = run(ev, tick=600)
    assert len(out) == 1, out


def test_button_press_every_4_days():
    ev = [(i * 4 * D, L, 15) for i in range(6)] + [(6 * 4 * D, L, 100), (6 * 4 * D + 60, L, 100)]
    out, _rec = run(ev, tick=600)
    assert len(out) == 1, out


def test_cloud_change_only_quiet_4_days():
    # Cloud device writing only on change: 22 % since 4 days, then the new battery 100 (no more changes)
    ev = [(0, L, 30), (2 * D, L, 26), (6 * D, L, 22), (10 * D, L, 100)]
    out, _rec = run(ev, tick=600)
    assert len(out) == 1, out


def test_dense_ble_10s_wobble():
    # BLE every 10 s, level wobbling 14/15/16, then new battery ~100
    ev = series(0, T0, 10, 15, wobble=1) + series(T0, T0 + D, 10, 99, wobble=1, seed=2)
    out, _rec = run(ev, tick=60)
    assert len(out) == 1, out


def test_dense_ble_voltage_20s():
    ev = series(0, T0, 20, 2400, wobble=8, kind=V) + series(T0, T0 + D, 20, 3050, wobble=8, kind=V, seed=2)
    out, _rec = run(ev, tick=60)
    assert len(out) == 1, out


@pytest.mark.xfail(strict=True, reason="accepted: a flip lasting longer than the 3-day peak window looks new")
def test_trv_flip_50_for_4_days():
    # Tuya TRV: 100 for days, flips to 50 for 4 days, back to 100: no battery change
    ev = series(0, 5 * D, 3600, 100) + series(5 * D, 9 * D, 3600, 50) + series(9 * D, 12 * D, 3600, 100)
    out, _rec = run(ev, tick=600)
    assert out == [], out


def test_matter_mark_swap_undo():
    # Matter device goes unavailable during swap; mark by hand before, undo 20 min later -> real change stays
    ev = [
        *series(0, T0, 9000, 15),
        (T0 - 600, L, "mark"),
        (T0, L, None),
        (T0 + 60, L, 100),
        (T0 + 400, L, 100),
        (T0 + 1200, L, "undo"),
        *series(T0 + 9000, T0 + 3 * D, 9000, 100),
    ]
    out, _rec = run(ev, tick=60)
    assert len(out) == 1, out


def test_voltage_first_level_before_lost():
    # Shelly-BLU-like: level and voltage in each packet every 60 s, voltage processed first; 12 % / 2400 mV
    rec, ch, verdicts = {}, [], []
    t = 0.0
    while t < T0 + D:
        lvl, mv = (12.0, 2400.0) if t < T0 else (100.0, 3050.0)
        for kind, val in ((V, mv), (L, lvl)):
            if v := r.report(rec, kind, t, val, ch):
                verdicts.append(v)
                ch.append(v.at)
        t += 60
    assert verdicts and verdicts[0].kind == V, verdicts
    assert verdicts[0].level_before is not None and verdicts[0].level_before <= 20, verdicts


def test_dead_battery_gone_a_week_then_swap():
    # Battery runs flat, device unavailable for 5 days until the user buys a battery; back with 100 % (every 1 h)
    ev = [*series(0, T0, 3600, 4), (T0, L, None), *series(T0 + 5 * D, T0 + 8 * D, 3600, 100)]
    out, _rec = run(ev, tick=600)
    assert len(out) == 1, out


def test_dead_battery_gone_a_week_then_swap_z2m_cached():
    ev = [
        *series(0, T0, 3600, 4),
        (T0, L, None),
        (T0 + 5 * D, L, 4),
        (T0 + 5 * D + 60, L, 100),
        *series(T0 + 5 * D + 3600, T0 + 8 * D, 3600, 100),
    ]
    out, _rec = run(ev, tick=600)
    assert len(out) == 1, out


def test_dead_battery_gone_2_days_then_swap():
    ev = [*series(0, T0, 3600, 4), (T0, L, None), *series(T0 + 2 * D, T0 + 5 * D, 3600, 100)]
    out, _rec = run(ev, tick=600)
    assert len(out) == 1, out


def test_single_outlier_during_hold_kills_change():
    # BLE every minute: 12 % for days, new battery 100 %, 2 h later ONE outlier 15 % (docstring: BLE sends those)
    ev = series(0, T0, 60, 12) + series(T0, T0 + D, 60, 100)
    ev = [e for e in ev if e[0] != T0 + 2 * H] + [(T0 + 2 * H, L, 15)]
    out, _rec = run(ev, tick=60)
    assert len(out) == 1, out


def test_coin_cell_tx_sag_during_hold_kills_change():
    # voltage-only coin cell every 15 min: 2500 mV, new cell 3050 mV, one TX sag 2580 mV 1 h later
    ev = series(0, T0, 900, 2500, kind=V) + series(T0, T0 + D, 900, 3050, kind=V)
    ev = [e for e in ev if e[0] != T0 + 4 * 900] + [(T0 + 4 * 900, V, 2580)]
    out, _rec = run(ev, tick=60)
    assert len(out) == 1, out


# ── Third review round ──

T6 = 10 * D


def ztrv_hist(end):
    """Device with level 60 / voltage 2700 every 30 min for days, both quantities."""
    ev = []
    t = T6 - 4 * D
    while t < end:
        ev.append((t, L, 60))
        ev.append((t + 1, V, 2700))
        t += 30 * M
    return ev


def test_stale_rise_dates_voltage_change_days_early():
    # a single level dip/outlier return 2.5 days before the swap sets `rise`
    ev = ztrv_hist(T6)
    ev.append((T6 - 2.5 * D + 5 * M, L, 30))  # outlier
    ev.append((T6 - 2.5 * D + 6 * M, L, 60))  # return: jump from samples[-1] -> rise set
    # swap at T6: voltage first (ZHA reports separately), level a day later
    t = T6
    while t < T6 + 2 * D:
        ev.append((t + 1, V, 3200))
        if t >= T6 + D:
            ev.append((t, L, 100))
        else:
            ev.append((t, L, 60))
        t += 30 * M
    ev = [e for e in ev if not (T6 <= e[0] < T6 + D and e[1] == L and e[2] == 60) or True]
    out, _rec = run(ev)
    print([(v.at - T6) / H for v in out], [v.kind for v in out])
    assert len(out) == 1
    assert abs(out[0].at - T6) < H, f"dated {(out[0].at - T6) / D:.2f} days from the swap"


def test_stale_rise_plus_manual_mark_after_swap_counts_twice():
    ev = ztrv_hist(T6)
    ev.append((T6 - 2.9 * D + 5 * M, L, 30))
    ev.append((T6 - 2.9 * D + 6 * M, L, 60))
    t = T6
    while t < T6 + 2 * D:
        ev.append((t + 1, V, 3200))
        ev.append((t, L, 100 if t >= T6 + D else 60))
        t += 30 * M
    ev.append((T6 + 3 * H, None, "mark"))  # user marks after seeing the new value
    out, _rec = run(ev)
    print([(v.at - T6) / H for v in out])
    assert out == []


def test_level_before_takes_single_outlier():
    # BLE outlier 15 % two days ago, level 70 otherwise; voltage swap -> notification decision sees 15
    ev = ztrv_hist(T6)
    ev = [(t, k, 70 if k == L else v) for t, k, v in ev]
    ev.append((T6 - 2 * D + 1 * M, L, 15))
    t = T6
    while t < T6 + D:
        ev.append((t + 1, V, 3200))
        ev.append((t, L, 70))  # level does not step (>= 75 rule / small)
        t += 30 * M
    out, _rec = run(ev)
    print(out)
    assert out and out[0].level_before >= 60


def test_outdoor_cold_dropout_for_days_returns_to_old_level():
    # outdoor sensor: 60 % by day, 30 % in cold nights (seen every night), reports every 30 min
    ev = []
    t = T6 - 5 * D
    while t < T6 - 6 * H:
        hour = (t % D) / H
        ev.append((t, L, 30 if hour < 8 else 60))
        t += 30 * M
    # last cold night: from 18:00 cold again, then the radio dies in the frost for 4 days
    t = T6 - 6 * H
    while t < T6 + 2 * H:
        ev.append((t, L, 30))
        t += 30 * M
    ev.append((T6 + 2 * H + 1, L, None))
    # back on a warm day, 4 days later, at its normal 60 %
    t = T6 + 4 * D
    while t < T6 + 5 * D:
        ev.append((t, L, 60))
        t += 30 * M
    out, _rec = run(ev)
    print([(v.at - T6) / D for v in out])
    assert out == []


def test_outdoor_cold_silent_for_days_no_unavailable():
    ev = []
    t = T6 - 5 * D
    while t < T6 - 6 * H:
        hour = (t % D) / H
        ev.append((t, L, 30 if hour < 8 else 60))
        t += 30 * M
    t = T6 - 6 * H
    while t < T6 + 2 * H:
        ev.append((t, L, 30))
        t += 30 * M
    t = T6 + 4 * D
    while t < T6 + 5 * D:
        ev.append((t, L, 60))
        t += 30 * M
    out, _rec = run(ev)
    print([(v.at - T6) / D for v in out])
    assert out == []


def freezer(returns, real_between=1):
    """Freezer at 40 % for days, Z2M cached 91; drops out every 1.3 h.

    returns: list of 'n' (cached first) / 'r' (reversed)."""
    ev = series(T6 - 4 * D, T6, 20 * M, 40)
    t = T6
    for kind in returns:
        ev.append((t, L, None))
        a, b = (91, 40) if kind == "n" else (40, 91)
        ev.append((t + 10, L, a))
        ev.append((t + 11, L, b))
        for i in range(real_between):
            ev.append((t + 30 * M + i * 20 * M, L, 40))
        t += 1.3 * H
    return ev


@pytest.mark.xfail(strict=True, reason="accepted: Zigbee2MQTT cache in reversed order twice in a row")
def test_freezer_reversed_twice_counts():
    out, _ = run(freezer(["n", "n", "r", "r", "n", "n"], real_between=0))
    print([(v.at - T6) / H for v in out])
    assert out == []


def test_freezer_reversed_low_report_reversed_counts():
    out, _ = run(freezer(["n", "r", "n", "r", "n", "n"], real_between=1))
    print([(v.at - T6) / H for v in out])
    assert out == []


@pytest.mark.xfail(strict=True, reason="accepted: Zigbee2MQTT cache in reversed order twice in a row")
def test_freezer_reversed_one_low_report_reversed():
    out, _ = run(freezer(["r", "r"], real_between=1) + series(T6 + 3 * H, T6 + 2 * D, 20 * M, 40))
    print([(v.at - T6) / H for v in out])
    assert out == []


@pytest.mark.xfail(strict=True, reason="accepted: Zigbee2MQTT cache in reversed order twice in a row")
def test_real_swap_then_reversed_cached_twice_is_lost():
    # swap 20 -> 100 by a normal report; the device keeps dropping out every 1.3 h,
    # Z2M reversed twice (real, cached old 20)
    ev = series(T6 - 4 * D, T6, 20 * M, 20)
    ev.append((T6, L, 100))
    t = T6 + 20 * M
    for _ in range(2):
        ev.append((t, L, None))
        ev.append((t + 10, L, 100))
        ev.append((t + 11, L, 20))
        t += 1.3 * H
    ev += series(t, T6 + 2 * D, 20 * M, 100)
    out, _ = run(ev)
    print([(v.at - T6) / H for v in out])
    assert len(out) == 1
