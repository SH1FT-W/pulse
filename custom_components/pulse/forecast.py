"""Laufzeit-Vorhersage der Batterie – reine Rechenlogik ohne HA-Abhängigkeit.

Grundlage sind die stündlichen Mittelwerte der Langzeitstatistik (Recorder) seit dem letzten Wechsel.
Pulse rechnet vorsichtig: Tagesmedian statt Einzelwerten, Ausreißer und Neustart-Echos (83 → 100 → 83)
fliegen raus, zu kurze, flache, grob gestufte oder verrauschte Verläufe ergeben keine Vorhersage, sondern
einen Grund. Ergebnis ist ein Bereich (frühestens/spätestens) bis zur Schwelle „fast leer“.
"""

from __future__ import annotations

from collections import Counter
from collections.abc import Sequence
from dataclasses import asdict, dataclass
import statistics
from typing import Any

DAY = 86400.0
# Mindestens so lange Daten seit dem Wechsel
MIN_DAYS = 14
# Mindestens so viel Abfall (Prozentpunkte) – oder eine klar erkennbare Steigung
MIN_DROP = 10.0
SLOPE_DROP = 3.0
SLOPE_R2 = 0.6
NOISY_R2 = 0.3
# Sprung nach oben zwischen zwei Tagen: ein (nicht eingetragener) Batteriewechsel – erst danach rechnen
JUMP_UP = 25.0
# Tagesmedian weicht so weit vom Median der Nachbartage ab → Ausreißer
SPIKE = 8.0
SPIKE_WIDTH = 2
# Höchstens so viele verschiedene Werte (die oft vorkommen) → grobe Stufen (z. B. 100/50/0)
COARSE_VALUES = 3
# Die letzten Wochen: fallen sie deutlich schneller als der ganze Verlauf, gilt das (Knick am Lebensende)
RECENT_DAYS = 21
KNEE = 1.5
# Sicherheitsabstand für den Bereich
FAST = 1.2
SLOW = 0.85
MAX_DAYS = 3 * 365.0
# „Bald fällig“ für die Einkaufsliste
DUE_DAYS = 56

REASONS = ("too_short", "flat", "coarse", "untrusted", "noisy")


@dataclass(frozen=True)
class Forecast:
    days_min: float
    days_max: float
    until: float  # Zeitpunkt (Mitte des Bereichs)
    rate_per_week: float  # Prozentpunkte je Woche
    threshold: float

    def as_dict(self) -> dict[str, Any]:
        return asdict(self)

    def due_within(self, days: float) -> bool:
        return self.days_min <= days


def daily_medians(points: Sequence[tuple[float, float]]) -> list[tuple[float, float]]:
    """Median je UTC-Tag (Zeit = Tagesmitte)."""
    days: dict[int, list[float]] = {}
    for ts, value in points:
        days.setdefault(int(ts // DAY), []).append(value)
    return [(day * DAY + DAY / 2, statistics.median(values)) for day, values in sorted(days.items())]


def last_segment(days: Sequence[tuple[float, float]]) -> list[tuple[float, float]]:
    """Nur der Verlauf nach dem letzten großen Sprung nach oben (Wechsel, den niemand eingetragen hat)."""
    start = 0
    for i in range(1, len(days)):
        if days[i][1] - days[i - 1][1] >= JUMP_UP:
            start = i
    return list(days[start:])


def despike(days: Sequence[tuple[float, float]]) -> list[tuple[float, float]]:
    """Tage, die weit vom Median ihrer Nachbarn abweichen, verwerfen (Echos, Messfehler)."""
    kept: list[tuple[float, float]] = []
    for i, (ts, value) in enumerate(days):
        around = [v for _, v in days[max(0, i - SPIKE_WIDTH) : i + SPIKE_WIDTH + 1]]
        if len(around) < 3 or abs(value - statistics.median(around)) <= SPIKE:
            kept.append((ts, value))
    return kept


def fit(days: Sequence[tuple[float, float]]) -> tuple[float, float]:
    """(Steigung je Tag, Bestimmtheitsmaß r²) der Ausgleichsgeraden."""
    xs = [ts / DAY for ts, _ in days]
    ys = [v for _, v in days]
    mean_x, mean_y = statistics.fmean(xs), statistics.fmean(ys)
    sxx = sum((x - mean_x) ** 2 for x in xs)
    syy = sum((y - mean_y) ** 2 for y in ys)
    if sxx == 0:
        return 0.0, 0.0
    sxy = sum((x - mean_x) * (y - mean_y) for x, y in zip(xs, ys, strict=True))
    slope = sxy / sxx
    r2 = (sxy * sxy) / (sxx * syy) if syy else 0.0
    return slope, r2


def _coarse(values: Sequence[float]) -> bool:
    counts = Counter(round(v) for v in values)
    floor = max(2, 0.02 * len(values))
    return len([v for v, c in counts.items() if c >= floor]) <= COARSE_VALUES


def predict(
    points: Sequence[tuple[float, float]],
    now: float,
    threshold: float = 10.0,
    trusted: bool = True,
) -> tuple[Forecast | None, str | None]:
    """Vorhersage aus (Zeit, Stundenmittel) – oder (None, Grund)."""
    if not trusted:
        return None, "untrusted"
    clean = sorted((float(ts), min(100.0, max(0.0, float(v)))) for ts, v in points)
    days = despike(last_segment(daily_medians(clean)))
    if len(days) < 2 or days[-1][0] - days[0][0] < MIN_DAYS * DAY:
        return None, "too_short"
    start = days[0][0] - DAY / 2
    raw = [v for ts, v in clean if ts >= start]
    levels = [v for _, v in days]
    week_first = statistics.fmean(levels[:7])
    week_last = statistics.fmean(levels[-7:])
    drop = week_first - week_last
    if _coarse(raw) and max(levels) - min(levels) >= MIN_DROP:
        return None, "coarse"
    slope, r2 = fit(days)
    if slope >= 0 or drop <= 0:
        return None, "flat"
    if r2 < NOISY_R2 and drop >= MIN_DROP:
        return None, "noisy"
    if drop < MIN_DROP and not (drop >= SLOPE_DROP and r2 >= SLOPE_R2):
        return None, "flat"
    rate = -slope
    recent = [d for d in days if d[0] >= days[-1][0] - RECENT_DAYS * DAY]
    recent_rate = -fit(recent)[0] if len(recent) >= 7 else 0.0
    if recent_rate > KNEE * rate:
        # Knick: die letzten Wochen fallen deutlich schneller – nur noch die zählen
        shown, fast, slow = recent_rate, recent_rate * FAST, recent_rate * SLOW
    elif recent_rate > 0:
        shown, fast, slow = rate, max(rate, recent_rate) * FAST, min(rate, recent_rate) * SLOW
    else:
        shown, fast, slow = rate, rate * FAST, rate * SLOW
    level = statistics.median(levels[-3:])
    remaining = level - threshold
    elapsed = max(0.0, (now - days[-1][0]) / DAY)
    if remaining <= 0:
        days_min = days_max = 0.0
    else:
        days_min = max(0.0, remaining / fast - elapsed)
        days_max = max(days_min, min(MAX_DAYS, remaining / slow - elapsed))
    return (
        Forecast(
            days_min=round(days_min, 1),
            days_max=round(days_max, 1),
            until=now + (days_min + days_max) / 2 * DAY,
            rate_per_week=round(7 * shown, 2),
            threshold=threshold,
        ),
        None,
    )
