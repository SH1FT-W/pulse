"""Reine Rechenlogik: Takt lernen, Grenzen, Status, Rhythmusleiste."""

from custom_components.pulse.const import STATUS_CHECK, STATUS_FAILED, STATUS_LEARNING, STATUS_OK, STATUS_WATCH
from custom_components.pulse.rhythm import (
    DAY,
    HEARTBEAT_CAP,
    HOUR,
    MINUTE,
    BinCache,
    Facts,
    Rhythm,
    evaluate,
    heartbeat_days,
    is_ok,
    learn,
    limits,
    merge_event,
    no_data,
    percentile,
    strip,
)

NOW = 1_800_000_000.0


def periodic(every: float, count: int, end: float = NOW) -> list[float]:
    return [end - every * i for i in range(count, 0, -1)]


def test_percentile():
    assert percentile([5.0], 0.9) == 5.0
    assert percentile([0.0, 10.0], 0.5) == 5.0
    assert percentile([1.0, 2.0, 3.0, 4.0, 5.0], 1.0) == 5.0


def test_merge_event_dedupes_sorts_and_trims():
    events: list[float] = []
    assert merge_event(events, 100.0)
    assert not merge_event(events, 102.0)  # dieselbe Funknachricht
    assert merge_event(events, 200.0)
    assert merge_event(events, 150.0)  # Verlauf kommt später, wird einsortiert
    assert events == [100.0, 150.0, 200.0]
    assert not merge_event(events, 151.0)
    assert merge_event(events, 300.0, keep_from=160.0)
    assert events == [200.0, 300.0]
    for i in range(10):
        merge_event(events, 400.0 + i * 10, limit=5)
    assert len(events) == 5


def test_learn_needs_enough_data():
    assert not learn(periodic(60, 4)).known
    rhythm = learn(periodic(30 * MINUTE, 50))
    assert rhythm.known
    assert rhythm.typical is not None and abs(rhythm.typical - 30 * MINUTE) < 1


def test_learn_ignores_old_outage_with_many_samples():
    events = periodic(30 * MINUTE, 200)
    events.insert(50, events[49] + 1)  # Doppel innerhalb der Merge-Zeit zählt nicht
    gap = [*periodic(30 * MINUTE, 100, NOW - 4 * DAY), *periodic(30 * MINUTE, 100)]
    rhythm = learn(gap)
    assert rhythm.longest is not None and rhythm.longest < DAY  # der eine Ausfall bläst nichts auf


def test_limits_critical_is_stricter():
    rhythm = Rhythm(30 * MINUTE, 40 * MINUTE, 100)
    normal, critical = limits(rhythm, False), limits(rhythm, True)
    assert critical.failed < normal.failed
    assert normal.failed == 6 * HOUR  # Untergrenze
    assert limits(Rhythm(None, None, 0), False).watch >= 45 * MINUTE


def facts(**kwargs) -> Facts:
    base = {"now": NOW, "last_activity": NOW - 60, "rhythm": Rhythm(30 * MINUTE, 40 * MINUTE, 100)}
    return Facts(**{**base, **kwargs})


def test_evaluate_ok_and_learning():
    assert evaluate(facts()).status == STATUS_OK
    verdict = evaluate(facts(rhythm=Rhythm(None, None, 2)))
    assert verdict.status == STATUS_LEARNING
    assert verdict.reason["key"] == "learning"
    assert is_ok(STATUS_LEARNING)


def test_evaluate_silence_steps():
    assert evaluate(facts(last_activity=NOW - HOUR * 1.5)).status == STATUS_WATCH
    assert evaluate(facts(last_activity=NOW - 3 * HOUR)).status == STATUS_CHECK
    verdict = evaluate(facts(last_activity=NOW - 5 * DAY))
    assert verdict.status == STATUS_FAILED
    assert verdict.reason == {"key": "silent", "params": {"since": 5 * DAY, "every": 30 * MINUTE}}
    # Wichtige Geräte schon früher
    assert evaluate(facts(last_activity=NOW - 4 * HOUR, critical=True)).status == STATUS_FAILED


def test_evaluate_without_rhythm_but_long_silence():
    verdict = evaluate(facts(rhythm=Rhythm(None, None, 0), last_activity=NOW - 3 * DAY))
    assert verdict.status == STATUS_CHECK
    assert verdict.reason["key"] == "silent_new"
    never = evaluate(facts(rhythm=Rhythm(None, None, 0), last_activity=None, observed_since=NOW - 3 * DAY))
    assert never.status == STATUS_CHECK


def test_evaluate_unavailable():
    assert evaluate(facts(unavailable_since=NOW - 30 * MINUTE)).status == STATUS_CHECK
    assert evaluate(facts(unavailable_since=NOW - 3 * HOUR)).status == STATUS_FAILED
    assert evaluate(facts(unavailable_since=NOW - 15 * MINUTE, critical=True)).status == STATUS_CHECK
    assert evaluate(facts(unavailable_since=NOW - 5 * MINUTE)).status == STATUS_OK


def test_evaluate_partner():
    verdict = evaluate(
        facts(partner_name="Türschloss", partner_actions=4, own_last_action=NOW - 5 * HOUR, name="Türkontakt")
    )
    assert verdict.status == STATUS_CHECK
    assert verdict.reason["params"] == {"partner": "Türschloss", "count": 4, "name": "Türkontakt"}
    # Gerade erst selbst ausgelöst → kein Befund
    assert evaluate(facts(partner_name="X", partner_actions=4, own_last_action=NOW - 60)).status == STATUS_OK
    assert evaluate(facts(partner_name="X", partner_actions=2, own_last_action=NOW - DAY)).status == STATUS_OK


def test_evaluate_battery_only_when_trusted():
    assert evaluate(facts(battery_level=8)).status == STATUS_CHECK
    assert evaluate(facts(battery_level=18)).status == STATUS_WATCH
    assert evaluate(facts(battery_level=8, battery_trusted=False)).status == STATUS_OK
    # Der schlimmste Befund gewinnt
    assert evaluate(facts(battery_level=8, last_activity=NOW - 5 * DAY)).status == STATUS_FAILED


def test_strip_buckets():
    start = NOW - 7 * DAY
    starts = [start + i * DAY for i in range(8)]
    events = sorted([start + 1, start + 2 * HOUR, start + 5 * HOUR, NOW - 10, start - 100])
    buckets = strip(events, starts, 6, NOW - 1)  # 6 Fenster je Tag = 4 h
    assert len(buckets) == 42
    assert buckets[0] == 2
    assert buckets[1] == 1
    assert buckets[-1] == 1
    future = strip(events, starts, 6, start + 9 * HOUR)
    assert future[3] is None
    assert future[2] == 0
    # Tag mit Zeitumstellung (25 h): weiter 12 Fenster, nur etwas länger; nichts fällt heraus
    starts[-1] += HOUR
    late = strip([starts[-1] - 60], starts, 12, starts[-1])
    assert len(late) == 84 and late[-1] == 1


def test_heartbeat_bins_cap_and_future():
    start = NOW - 7 * DAY
    starts = [start + i * DAY for i in range(8)]
    starts[-1] += HOUR  # letzter Tag mit Zeitumstellung: 25 Stunden
    events = [start + 60, start + 14 * MINUTE, start + 16 * MINUTE, start - 5]
    events += [start + 2 * HOUR + i for i in range(20)]  # sehr gesprächig: gekappt
    events.sort()
    days = heartbeat_days(events, starts, 15, NOW + 2 * HOUR)
    assert [len(d) for d in days] == [96] * 6 + [100]
    assert days[0][0] == 2
    assert days[0][1] == 1
    assert days[0][8] == HEARTBEAT_CAP
    assert days[-1][-1] == 0
    partial = heartbeat_days(events, starts, 15, start + 30 * MINUTE)
    assert partial[0][2] == 0
    assert partial[0][3] is None
    assert partial[1] == [None] * 96


def test_bin_cache_only_rebuilds_on_change():
    cache = BinCache()
    events = [NOW - 3 * HOUR, NOW - HOUR]
    calls: list[int] = []

    def build() -> list[int | None]:
        calls.append(1)
        return [len(events)]

    start = NOW - 7 * DAY
    first = cache.get("strip", "a", events, start, HOUR, NOW, build)
    again = cache.get("strip", "a", events, start, HOUR, NOW + 60, build)
    assert first is again
    assert len(calls) == 1
    assert cache.hits == 1
    events.append(NOW)  # neue Meldung
    assert cache.get("strip", "a", events, start, HOUR, NOW + 60, build) == [3]
    cache.get("strip", "a", events, start, HOUR, NOW + 2 * HOUR, build)  # neues Fenster
    cache.get("strip", "a", events, start + DAY, HOUR, NOW + 2 * HOUR, build)  # neuer Tag
    assert len(calls) == 4
    cache.get("heartbeat", "a", events, start + DAY, HOUR, NOW + 2 * HOUR, build)
    cache.forget("a")
    cache.get("strip", "a", events, start + DAY, HOUR, NOW + 2 * HOUR, build)
    assert len(calls) == 6


def test_no_data_from_uptime_gaps():
    start = NOW - 7 * DAY
    uptime = [[NOW - 5 * DAY, NOW - 4 * DAY], [NOW - 4 * DAY + 5 * MINUTE, NOW - 2 * DAY], [NOW - DAY, NOW]]
    # kurzer Neustart (5 min) zählt nicht, der Tag dazwischen schon
    assert no_data(uptime, [], start, NOW, chatty=False) == [[NOW - 2 * DAY, NOW - DAY]]


def test_no_data_before_first_run_needs_chatty_devices():
    start = NOW - 7 * DAY
    uptime = [[NOW - DAY, NOW]]
    events = periodic(30 * MINUTE, 48, end=NOW - 5 * DAY) + periodic(30 * MINUTE, 40, end=NOW - DAY - HOUR)
    gaps = no_data(uptime, sorted(events), start, NOW, chatty=True)
    # Vor dem ersten Ereignis, zwischen den Verlaufsblöcken – aber nicht die letzte Stunde vor dem Start
    assert gaps[0] == [start, events[0]]
    assert any(a < NOW - 3 * DAY < b for a, b in gaps)
    assert all(b - a >= 3 * HOUR for a, b in gaps)
    # Ohne gesprächige Geräte lässt sich eine ruhige Nacht nicht von fehlenden Daten unterscheiden
    assert no_data(uptime, sorted(events), start, NOW, chatty=False) == []


def test_no_data_clipped_to_window():
    start = NOW - 7 * DAY
    uptime = [[NOW - 9 * DAY, NOW - 8 * DAY], [NOW - 6 * DAY, NOW]]
    assert no_data(uptime, [], start, NOW, chatty=False) == [[start, NOW - 6 * DAY]]
