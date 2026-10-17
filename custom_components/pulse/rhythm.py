"""Rhythmus lernen und Status bestimmen – reine Rechenlogik ohne HA-Abhängigkeit.

Ein Gerät meldet sich in seinem eigenen Takt. Aus den Abständen der letzten Tage entsteht ein
„typischer“ Abstand (90. Perzentil) und ein „längster normaler“ (98. Perzentil, damit ein früherer
Ausfall die Grenzen nicht für immer aufbläst). Wird die aktuelle Stille deutlich länger, steigt der Status.
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

# Herzschlag-Kalender: höchstens so viele Meldungen je Fenster
HEARTBEAT_CAP = 9

# Mindestens so viele Abstände, bevor Pulse einem Rhythmus traut
MIN_GAPS = 6

# Funkt ohne Werte: der Health-Zähler steigt auch durch normale Wert-Nachrichten (beim nächsten Health-Takt, ≤ 10 Min.).
# Erst Anstiege mit diesem Abstand nach der letzten Meldung zählen – mehrere davon, und frisch.
RADIO_BUFFER = 15 * MINUTE
RADIO_MIN_RISES = 2

# Batterie-Entität so lange ohne Wert (Rest meldet) → eigener Grund
BATTERY_MISSING_AFTER = DAY

# Ohne gelernten Takt (Gerät meldet nur bei Aktionen, z. B. eine selten geöffnete Tür): nach zwei Tagen Stille
# „im Blick“, erst nach einer Woche „prüfen“ – sonst stünde jede ruhige Tür täglich in der Zusammenfassung
SILENT_NEW_WATCH = 2 * DAY
SILENT_NEW_CHECK = 7 * DAY


@dataclass(frozen=True)
class Rhythm:
    """Gelernter Takt in Sekunden (None = noch zu wenig Daten)."""

    typical: float | None
    longest: float | None
    samples: int

    @property
    def known(self) -> bool:
        return self.typical is not None and self.longest is not None


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
    """Perzentil mit linearer Interpolation (values nicht leer)."""
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
    """Meldung einsortieren; dicht aufeinanderfolgende (< window) zählen als eine. True = neu aufgenommen."""
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


def learn(events: Sequence[float]) -> Rhythm:
    gaps = sorted(b - a for a, b in itertools.pairwise(events) if b - a >= MERGE_SECONDS)
    if len(gaps) < MIN_GAPS:
        return Rhythm(None, None, len(gaps))
    typical = percentile(gaps, 0.9, presorted=True)
    longest = percentile(gaps, 0.98, presorted=True) if len(gaps) >= 20 else gaps[-1]
    return Rhythm(typical, max(longest, typical), len(gaps))


class RhythmCache:
    """Gelernter Takt je Gerät – neu gelernt nur, wenn sich die Meldungen geändert haben (nicht jede Minute)."""

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


# Cloud-Geräte: der Takt ist der Abfragetakt der Cloud – einzeln erst deutlich später „ausgefallen“
CLOUD_CHECK_MIN = 6 * HOUR
CLOUD_FAILED_MIN = DAY


def limits(rhythm: Rhythm, critical: bool, cloud: bool = False) -> Limits:
    """Ab welcher Stille welcher Status gilt."""
    typical = rhythm.typical or HOUR
    longest = rhythm.longest or typical
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


# Ausreißer-Regel (ein Bezugspunkt für Status, Panel, `silent_since`): kamen nach einer langen Lücke nur noch
# ein, zwei vereinzelte Meldungen (ein sterbender Sensor), beginnt die Stille schon vor der Lücke.
MAX_STRAYS = 2
STRAY_GAP_MIN = 6 * HOUR
# Zwei Meldungen nach der Lücke im üblichen Takt: das Gerät läuft wieder (keine Ausreißer)
STRAY_RESUME = 1.5


def downtime_gaps(uptime: Sequence[Sequence[float]]) -> list[tuple[float, float]]:
    """Lücken in der eigenen Laufzeit (HA lief nicht), ab UPTIME_SLACK."""
    spans = sorted((float(a), float(b)) for a, b in uptime if b >= a)
    return [(end, nxt) for (_, end), (nxt, _) in itertools.pairwise(spans) if nxt - end >= UPTIME_SLACK]


def overlap(gaps: Sequence[tuple[float, float]], start: float, end: float) -> float:
    """Wie viel der Zeit [start, end] in Lücken ohne Daten lag."""
    return sum(max(0.0, min(end, b) - max(start, a)) for a, b in gaps)


def silence_start(
    events: Sequence[float],
    rhythm: Rhythm,
    replaced_at: float | None = None,
    gaps: Sequence[tuple[float, float]] = (),
    actions: Sequence[float] = (),
) -> tuple[float | None, int]:
    """(Beginn der Stille, Zahl vereinzelter Meldungen seitdem).

    Ohne Ausreißer ist das die letzte Meldung (oder ein späterer „Batterie gewechselt“). Lücken, in denen
    Home Assistant nicht lief, zählen nicht als Lücke. Eine echte Aktion nach der Lücke (Taster gedrückt, Tür auf)
    beendet die Stille sofort – die Regel gilt nur für reine Zustandsmeldungen.
    """
    if not events:
        return replaced_at, 0
    last = events[-1]
    if replaced_at is not None and replaced_at > last:
        return replaced_at, 0
    if rhythm.typical is None or len(events) < 2:
        return last, 0
    limit = max(STRAY_GAP_MIN, 3 * rhythm.typical, rhythm.longest or 0.0)
    n = len(events)
    for k in range(n - 2, max(-1, n - 2 - MAX_STRAYS), -1):
        here, nxt = events[k], events[k + 1]
        if replaced_at is not None and replaced_at >= here:
            break  # nach einem Wechsel ist jede Meldung neues Leben
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
    """Was Pulse gerade über ein Gerät weiß."""

    now: float
    last_activity: float | None
    rhythm: Rhythm
    critical: bool = False
    observed_since: float | None = None  # seit wann Pulse überhaupt Daten hat
    unavailable_since: float | None = None
    battery_level: float | None = None
    battery_trusted: bool = True  # NiMH-Akkus: Prozentwert sagt nichts
    battery_flag: bool = False  # nur ein Warn-Sensor („Batterie schwach“ an/aus), kein Prozentwert
    partner_name: str | None = None
    partner_actions: int = 0  # Aktionen des Partners seit der letzten eigenen Aktion
    own_last_action: float | None = None
    name: str = ""
    waiting_first: bool = False  # „Batterie gewechselt“ eingetragen, noch keine Meldung danach
    downtime: float = 0.0  # Zeit seit `last_activity` (bzw. `observed_since`), in der HA nicht lief
    strays: int = 0  # vereinzelte Meldungen seit `last_activity` (Ausreißer-Regel)
    last_report: float | None = None  # wirklich letzte Meldung (bei Ausreißern später als last_activity)
    cloud: bool = False  # Takt der Cloud, nicht des Geräts
    radio_last: float | None = None  # Zigbee2MQTT-Health: Nachrichtenzähler zuletzt gestiegen
    radio_rises: int = 0  # so oft ist der Zähler seit der letzten Meldung (+ Puffer) gestiegen
    flag_on: bool = False  # Warn-Sensor „Batterie schwach“ an (zusätzlich zum Prozentwert)
    battery_missing_since: float | None = None  # Batterie-Entität dauerhaft ohne Wert


def _worse(a: Verdict, b: Verdict) -> Verdict:
    return b if SEVERITY[b.status] > SEVERITY[a.status] else a


def _silent_new(real: float, silence: float) -> Verdict | None:
    """Stille ohne gelernten Takt: Grund `silent_new`, Stufe nach Dauer (ohne HA-Pausen)."""
    if silence >= SILENT_NEW_CHECK:
        return Verdict(STATUS_CHECK, {"key": "silent_new", "params": {"since": real}})
    if silence >= SILENT_NEW_WATCH:
        return Verdict(STATUS_WATCH, {"key": "silent_new", "params": {"since": real}})
    return None


def evaluate(facts: Facts) -> Verdict:
    """Status mit Begründung. Der schlimmste Befund gewinnt."""
    now = facts.now
    rhythm = facts.rhythm
    if rhythm.known:
        verdict = Verdict(STATUS_OK, {"key": "ok_rhythm", "params": {"every": rhythm.typical}})
    else:
        verdict = Verdict(STATUS_LEARNING, {"key": "learning", "params": {}})

    # 1. Stille im Vergleich zum eigenen Takt – Zeiten, in denen HA nicht lief, zählen nicht mit
    silent: Verdict | None = None
    waiting = False  # nach einer HA-Pause: noch keine Meldung, aber der eigene Takt ist noch nicht um
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
            # Kaum Daten, aber lange still: vorsichtig, erst „im Blick“, nach einer Woche „prüfen“
            silent = _silent_new(real, silence)
            waiting = silent is None and real >= SILENT_NEW_WATCH
    elif facts.observed_since is not None:
        observed = now - facts.observed_since
        silent = _silent_new(observed, observed - facts.downtime)
    if (
        silent is not None
        and facts.radio_last is not None
        and facts.radio_rises >= RADIO_MIN_RISES
        and now - facts.radio_last < limits(rhythm, facts.critical, facts.cloud).watch + RADIO_BUFFER
    ):
        # Zigbee2MQTT zählt noch Funk, nur keine Werte: nie „ausgefallen“
        status = STATUS_CHECK if SEVERITY[silent.status] >= SEVERITY[STATUS_CHECK] else silent.status
        silent = Verdict(status, {"key": "radio_only", "params": {"since": silent.reason["params"]["since"]}})
    if silent is not None:
        verdict = _worse(verdict, silent)
    elif waiting and facts.downtime > 0:
        verdict = _worse(verdict, Verdict(STATUS_WATCH, {"key": "startup_waiting", "params": {}}))

    # 2. Nicht erreichbar (Zigbee-Verfügbarkeit, Matter)
    if facts.unavailable_since is not None:
        gone = now - facts.unavailable_since
        params = {"since": gone}
        if gone >= (HOUR if facts.critical else 2 * HOUR):
            verdict = _worse(verdict, Verdict(STATUS_FAILED, {"key": "unavailable", "params": params}))
        elif gone >= (10 * MINUTE if facts.critical else 20 * MINUTE):
            verdict = _worse(verdict, Verdict(STATUS_CHECK, {"key": "unavailable", "params": params}))

    # 3. Gegenprobe: der Partner war mehrfach aktiv, dieses Gerät nicht
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

    # Nach einem eingetragenen Wechsel: im Blick, bis die erste Meldung kommt (Stille zählt ab dem Wechsel)
    if facts.waiting_first:
        verdict = _worse(verdict, Verdict(STATUS_WATCH, {"key": "waiting_first", "params": {}}))

    # 4. Batterie – Warn-Sensor ohne Prozent, sonst nur, wenn der Prozentwert etwas aussagt.
    # Meldet das Gerät selbst „schwach“, gewinnt das gegen einen (widersprechenden) Prozentwert.
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
    # Batterie-Entität seit einem Tag ohne Wert, das Gerät meldet aber weiter
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
    """Meldungen je Zeitfenster für die Rhythmusleiste: `per_day` Fenster je Kalendertag (Tage mit
    Zeitumstellung haben etwas längere/kürzere Fenster); Fenster in der Zukunft sind None."""
    buckets: list[int | None] = []
    for start, end in itertools.pairwise(day_starts):
        buckets += _bins(events, start, per_day, (end - start) / per_day, now, cap=None)
    return buckets


def heartbeat_days(
    events: Sequence[float], day_starts: Sequence[float], bin_minutes: int, now: float
) -> list[list[int | None]]:
    """Herzschlag-Kalender: Meldungen je kleinem Fenster (z. B. 15 min), gekappt auf 9 je Fenster.

    Genug, um im Panel einen Strich pro Meldung zu zeichnen, ohne bei sehr gesprächigen Geräten
    tausende Zeitpunkte zu übertragen. Eine Zeile je Kalendertag (Tage mit Zeitumstellung haben
    23 oder 25 Stunden), Fenster in der Zukunft sind None.
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


# Lücken in der eigenen Laufzeit unter dieser Länge sind ein normaler Neustart, keine fehlenden Daten
UPTIME_SLACK = 10 * MINUTE
# Vor der ersten eigenen Laufzeit (Verlauf aus dem Recorder): so lange hat kein Gerät etwas gemeldet → HA lief nicht
HISTORY_GAP = 3 * HOUR


def no_data(
    uptime: Sequence[Sequence[float]],
    events: Sequence[float],
    window_start: float,
    now: float,
    chatty: bool,
) -> list[list[float]]:
    """Zeiten ohne Daten im Fenster [window_start, now] – Pulse bzw. Home Assistant lief nicht.

    Seit Pulse läuft, steht das in der eigenen Laufzeit (`uptime`: [Start, zuletzt gesehen]).
    Davor (Verlauf aus dem Recorder) zählt eine Lücke von mindestens drei Stunden, in der kein
    einziges Gerät etwas gemeldet hat – aber nur, wenn es gesprächige Geräte gibt (`chatty`), sonst
    wäre eine ruhige Nacht nicht von fehlenden Daten zu unterscheiden.
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
    """Zwischenspeicher für Leisten und Kalender: neu gerechnet wird nur, wenn sich die Meldungen,
    der Tag oder das aktuelle Fenster geändert haben – nicht bei jedem Senden an das Panel."""

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
    "silence_start",
    "strip",
]
