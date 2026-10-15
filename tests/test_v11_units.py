"""Pulse 1.1 – reine Logik: Vorhersage, Partner-Vorschläge, Ausreißer, HA-Pausen, neue Gründe, Speicher."""

from __future__ import annotations

import pytest

from custom_components.pulse import forecast as fc
from custom_components.pulse.partners import PartnerInput, suggest
from custom_components.pulse.rhythm import (
    Facts,
    Rhythm,
    downtime_gaps,
    evaluate,
    limits,
    overlap,
    silence_start,
)
from custom_components.pulse.store import default_record, migrate
from custom_components.pulse.texts import reason_text

DAY = 86400.0
HOUR = 3600.0
NOW = 1_800_000_000.0
RHYTHM = Rhythm(1800.0, 1800.0, 200)


def hourly(days: float, start_level: float, per_day: float, end: float = NOW) -> list[tuple[float, float]]:
    """Stündliche Mittelwerte, die gleichmäßig fallen."""
    hours = int(days * 24)
    return [(end - (hours - i) * HOUR, start_level - per_day * i / 24) for i in range(hours + 1)]


# ── Vorhersage ───────────────────────────────────────────────────────────


def test_forecast_linear_decline_gives_range():
    forecast, reason = fc.predict(hourly(30, 80, 0.5), NOW)
    assert reason is None and forecast is not None
    # 65 % übrig, 10 % Schwelle, 0,5 %/Tag → etwa 110 Tage, als Bereich darum
    assert forecast.days_min < 110 < forecast.days_max
    assert forecast.rate_per_week == pytest.approx(3.5, abs=0.05)
    assert forecast.threshold == 10
    assert NOW + forecast.days_min * DAY <= forecast.until <= NOW + forecast.days_max * DAY
    assert not forecast.due_within(fc.DUE_DAYS)
    assert forecast.as_dict()["days_min"] == forecast.days_min


def test_forecast_reasons():
    assert fc.predict(hourly(30, 80, 0.5), NOW, trusted=False) == (None, "untrusted")
    assert fc.predict(hourly(10, 80, 2), NOW) == (None, "too_short")
    assert fc.predict([], NOW) == (None, "too_short")
    # Kaum Abfall
    assert fc.predict(hourly(30, 80, 0.05), NOW) == (None, "flat")
    assert fc.predict([(NOW - (720 - i) * HOUR, 90.0) for i in range(721)], NOW) == (None, "flat")
    # Grobe Stufen: 100 → 50 (nur zwei Werte)
    steps = [(NOW - (720 - i) * HOUR, 100.0 if i < 400 else 50.0) for i in range(721)]
    assert fc.predict(steps, NOW) == (None, "coarse")
    # Verrauscht: Tageswerte springen wild, der Trend erklärt fast nichts
    noisy = [(NOW - (720 - i) * HOUR, 80.0 - i / 36 + (10 if (i // 72) % 2 else -10)) for i in range(721)]
    assert fc.predict(noisy, NOW) == (None, "noisy")


def test_forecast_ignores_echoes_and_old_battery():
    points = hourly(30, 80, 0.5)
    # Neustart-Echo: ein Tag mit dem alten Wert 100 mittendrin
    for i in range(300, 324):
        points[i] = (points[i][0], 100.0)
    clean, _ = fc.predict(hourly(30, 80, 0.5), NOW)
    echoed, reason = fc.predict(points, NOW)
    assert reason is None and echoed is not None and clean is not None
    assert abs(echoed.days_min - clean.days_min) < 5
    # Nicht eingetragener Wechsel vor 40 Tagen: nur der Verlauf danach zählt
    before = hourly(30, 60, 1.0, end=NOW - 31 * DAY)
    forecast, reason = fc.predict(before + hourly(30, 100, 0.5), NOW)
    assert reason is None and forecast is not None
    assert forecast.rate_per_week == pytest.approx(3.5, abs=0.05)


def test_forecast_knee_is_conservative_and_due():
    # 40 Tage langsam, die letzten 3 Wochen schnell (Lebensende)
    slow = hourly(40, 60, 0.2, end=NOW - 21 * DAY)
    fast = hourly(21, slow[-1][1], 1.5)
    forecast, reason = fc.predict(slow + fast[1:], NOW)
    assert reason is None and forecast is not None
    assert forecast.rate_per_week > 7  # die schnelle Phase zählt
    assert forecast.due_within(fc.DUE_DAYS)
    # Schon unter der Schwelle → sofort
    low, _ = fc.predict(hourly(30, 30, 1), NOW)
    assert low is not None and low.days_min == low.days_max == 0


# ── Partner-Vorschläge ───────────────────────────────────────────────────


def test_partner_suggestions():
    door = [NOW - d * DAY + h * HOUR for d in range(5) for h in (8, 18)]
    lock = [ts + 30 for ts in door]  # Schloss 30 s nach der Tür
    motion = [NOW - d * DAY + h * HOUR + 600 for d in range(5) for h in range(24)]  # oft, aber nie zusammen
    devices = {
        "door": PartnerInput(door, "Flur"),
        "lock": PartnerInput(lock, "Flur"),
        "motion": PartnerInput(motion, "Wohnzimmer"),
        "other": PartnerInput(lock, "Bad", wants=False),
    }
    result = suggest(devices)
    assert [s.id for s in result["door"]][:1] == ["lock"]
    assert result["door"][0].together == 10 and result["door"][0].score == 1.0
    # anderer Raum zählt weniger – unter MIN_SCORE (0,8) kein Vorschlag
    assert "other" not in [s.id for s in result["door"]]
    assert "other" not in result  # hat schon einen Partner
    assert "motion" not in result
    # Verworfen bleibt verworfen
    devices["door"] = PartnerInput(door, "Flur", dismissed=frozenset({"lock", "other"}))
    assert "door" not in suggest(devices)
    # Nur an einem Tag zusammen: kein Vorschlag
    one_day = [NOW + h * 60 for h in range(5)]
    assert suggest({"a": PartnerInput(one_day), "b": PartnerInput([t + 5 for t in one_day])}) == {}


# ── Ausreißer, HA-Pausen, neue Gründe ────────────────────────────────────


def test_silence_start_strays_and_resume():
    events = [NOW - 10 * HOUR - i * 1800 for i in range(50, -1, -1)]
    assert silence_start(events, RHYTHM) == (events[-1], 0)
    assert silence_start([], RHYTHM, None) == (None, 0)
    assert silence_start([], RHYTHM, NOW) == (NOW, 0)
    assert silence_start(events, Rhythm(None, None, 0)) == (events[-1], 0)
    # Nach 10 h Lücke eine vereinzelte Meldung → Stille beginnt vor der Lücke
    stray = [*events, NOW - 60]
    assert silence_start(stray, RHYTHM) == (events[-1], 1)
    # Zwei vereinzelte, weit auseinander
    assert silence_start([*events, NOW - 4 * HOUR, NOW - 60], RHYTHM) == (events[-1], 2)
    # Zwei im üblichen Takt → läuft wieder
    assert silence_start([*events, NOW - 1800, NOW - 60], RHYTHM) == (NOW - 60, 0)
    # Nach „Batterie gewechselt“ ist jede Meldung neues Leben
    assert silence_start(stray, RHYTHM, NOW - 120) == (NOW - 60, 0)
    # Die Lücke war eine HA-Pause → keine Ausreißer
    gaps = [(events[-1] + 60, NOW - 120)]
    assert silence_start(stray, RHYTHM, None, gaps) == (NOW - 60, 0)


def test_downtime_gaps_and_overlap():
    uptime = [[NOW - 20 * HOUR, NOW - 10 * HOUR], [NOW - 3 * HOUR, NOW - 2 * HOUR], [NOW - 2 * HOUR + 60, NOW]]
    gaps = downtime_gaps(uptime)
    assert gaps == [(NOW - 10 * HOUR, NOW - 3 * HOUR)]  # kurze Neustarts zählen nicht
    assert overlap(gaps, NOW - 12 * HOUR, NOW) == 7 * HOUR
    assert overlap(gaps, NOW - 2 * HOUR, NOW) == 0


def test_startup_waiting_after_downtime():
    # Letzte Meldung kurz vor einer 7-h-Pause, HA seit 10 min wieder da
    last = NOW - 7 * HOUR - 11 * 60
    facts = Facts(now=NOW, last_activity=last, rhythm=RHYTHM, downtime=7 * HOUR, last_report=last)
    verdict = evaluate(facts)
    assert (verdict.status, verdict.reason["key"]) == ("watch", "startup_waiting")
    assert reason_text("de", verdict.reason) == "Seit dem Neustart noch keine Meldung."
    # Ohne Pause wäre das ausgefallen
    assert evaluate(Facts(now=NOW, last_activity=last, rhythm=RHYTHM)).status == "failed"
    # Nach Ablauf des eigenen Takts seit dem Start: normale Stille (ohne die Pause gerechnet)
    later = Facts(now=NOW + 3 * HOUR, last_activity=last, rhythm=RHYTHM, downtime=7 * HOUR)
    assert evaluate(later).reason["key"] == "silent"
    # Schon vor der Pause ausgefallen → bleibt ausgefallen
    dead = Facts(now=NOW, last_activity=NOW - 20 * HOUR, rhythm=RHYTHM, downtime=7 * HOUR)
    assert evaluate(dead).status == "failed"
    # Ohne gelernten Takt
    new = Facts(now=NOW, last_activity=NOW - 3 * DAY, rhythm=Rhythm(None, None, 0), downtime=2 * DAY)
    assert evaluate(new).reason["key"] == "startup_waiting"
    observed = Facts(now=NOW, last_activity=None, rhythm=Rhythm(None, None, 0), observed_since=NOW - 3 * DAY)
    assert evaluate(observed).reason["key"] == "silent_new"
    observed = Facts(
        now=NOW, last_activity=None, rhythm=Rhythm(None, None, 0), observed_since=NOW - 3 * DAY, downtime=2 * DAY
    )
    assert evaluate(observed).status == "learning"


def test_radio_only_cloud_flag_missing():
    last = NOW - 10 * HOUR
    silent = Facts(now=NOW, last_activity=last, rhythm=RHYTHM, last_report=last)
    assert evaluate(silent).status == "failed"
    radio = Facts(now=NOW, last_activity=last, rhythm=RHYTHM, radio_last=NOW - 600, radio_rises=2)
    verdict = evaluate(radio)
    assert (verdict.status, verdict.reason["key"]) == ("check", "radio_only")
    assert reason_text("de", verdict.reason) == "Funkt noch, schickt aber seit 10 Stunden keine Werte."
    # Zähler zuletzt vor der letzten Meldung gestiegen → zählt nicht
    assert evaluate(Facts(now=NOW, last_activity=last, rhythm=RHYTHM, radio_last=last - 60)).status == "failed"
    # Prüfung #1: ein Anstieg reicht nicht, und ein alter Anstieg hält ein totes Gerät nicht ewig bei „check“
    assert evaluate(Facts(now=NOW, last_activity=last, rhythm=RHYTHM, radio_last=NOW - 600, radio_rises=1)).status == (
        "failed"
    )
    stale = Facts(now=NOW, last_activity=last, rhythm=RHYTHM, radio_last=NOW - 5 * HOUR, radio_rises=5)
    assert evaluate(stale).status == "failed"
    # Cloud: einzeln erst nach einem Tag ausgefallen
    assert limits(RHYTHM, False, cloud=True).failed == DAY
    assert evaluate(Facts(now=NOW, last_activity=last, rhythm=RHYTHM, cloud=True)).status == "check"
    # Warn-Sensor an gewinnt gegen 89 %
    flag = Facts(now=NOW, last_activity=NOW - 60, rhythm=RHYTHM, battery_level=89, flag_on=True)
    assert evaluate(flag).reason["key"] == "battery_low_flag"
    # Batterie-Entität seit über einem Tag ohne Wert, das Gerät meldet weiter
    missing = Facts(
        now=NOW, last_activity=NOW - 60, rhythm=RHYTHM, last_report=NOW - 60, battery_missing_since=NOW - 25 * HOUR
    )
    verdict = evaluate(missing)
    assert (verdict.status, verdict.reason["key"]) == ("watch", "battery_missing")
    assert reason_text("en", verdict.reason) == "No battery value for 25 hours, but the device still reports."
    short = Facts(
        now=NOW, last_activity=NOW - 60, rhythm=RHYTHM, last_report=NOW - 60, battery_missing_since=NOW - HOUR
    )
    assert evaluate(short).status == "ok"


def test_new_texts():
    strays = {"key": "silent", "params": {"since": 2 * DAY, "every": 1800, "strays": 1, "last": 3 * HOUR}}
    assert reason_text("de", strays) == (
        "Seit 2 Tagen kaum noch Meldungen, zuletzt vor 3 Stunden. Meldet sich sonst etwa alle 30 Minuten."
    )
    assert reason_text("en", strays).startswith("Hardly any reports for 2 days, last one 3 hours ago.")
    cloud = {"key": "cloud_outage", "params": {"integration": "Netatmo", "count": 3}}
    assert reason_text("de", cloud) == "Netatmo: 3 Geräte gleichzeitig still, vermutlich die Cloud."
    assert reason_text("en", {"key": "startup_waiting", "params": {}}) == "No report since the restart yet."


def test_store_migration_minor_6():
    data = {"devices": {"a": {"events": [], "partner": None}}, "settings": {}}
    migrated = migrate(5, data)
    assert migrated["devices"]["a"]["partner_dismissed"] == []
    assert migrated["devices"]["a"]["battery_missing_since"] is None
    assert migrated["cloud_notified"] == {} and migrated["z2m_health_at"] is None
    assert default_record()["partner_dismissed"] == []


def test_real_action_after_gap_ends_silence():
    """Prüfung #4: Taster nach dem Urlaub gedrückt – das ist kein Ausreißer, sondern läuft wieder."""
    events = [NOW - 10 * HOUR - i * 1800 for i in range(50, -1, -1)]
    stray = [*events, NOW - 60]
    assert silence_start(stray, RHYTHM, None, (), [events[-5]]) == (events[-1], 1)
    assert silence_start(stray, RHYTHM, None, (), [NOW - 60]) == (NOW - 60, 0)


def test_partner_only_recent_actions():
    """Prüfung #7: nur die letzten 7 Tage (und begrenzt viele Aktionen) – sonst sekundenlang CPU."""
    old = [NOW - (10 + d) * DAY + h * HOUR for d in range(5) for h in (8, 18)]
    devices = {
        "a": PartnerInput([*old, NOW], "Flur"),
        "b": PartnerInput([*(t + 30 for t in old), NOW + 5000], "Flur"),
    }
    assert suggest(devices) == {}
