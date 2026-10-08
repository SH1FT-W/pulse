"""Sätze für Begründungen und Mitteilungen (Deutsch/Englisch) – ohne HA-Abhängigkeit.

Begründungen entstehen im Server, damit Panel, Mitteilung und Reparatur-Hinweis dasselbe sagen.
"""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any

TEXTS: dict[str, dict[str, str]] = {
    "de": {
        "silent": "Seit {since} still. Meldet sich sonst etwa {every}.",
        "silent_new": "Seit über {since} keine Meldung.",
        "unavailable": "Seit {since} nicht erreichbar.",
        "partner": "{partner} war {count}× aktiv, {name} hat sich seitdem nicht gemeldet.",
        "battery_low": "Batterie fast leer ({level} %).",
        "battery_soon": "Batterie bei {level} %.",
        "battery_low_flag": "Das Gerät meldet eine schwache Batterie.",
        "waiting_first": "Batterie gewechselt, wartet auf die erste Meldung.",
        "learning": "Lernt noch, wie oft sich das Gerät meldet.",
        "ok": "Meldet sich wie gewohnt.",
        "ok_rhythm": "Meldet sich wie gewohnt, etwa {every}.",
        "every_minutes": "alle {n} Minuten",
        "every_minute": "jede Minute",
        "every_hours": "alle {n} Stunden",
        "every_hour": "jede Stunde",
        "every_days": "alle {n} Tage",
        "every_day": "einmal am Tag",
        "since_minutes": "{n} Minuten",
        "since_minute": "einer Minute",
        "since_hours": "{n} Stunden",
        "since_hour": "einer Stunde",
        "since_days": "{n} Tagen",
        "since_day": "einem Tag",
        # Mitteilungen
        "push_failed": "{name} antwortet nicht",
        "push_check": "{name} prüfen",
        "push_battery": "{name}: Batterie fast leer",
        "push_recovered": "{name} läuft wieder",
        "push_recovered_msg": "Meldet sich wieder wie gewohnt.",
        "push_replaced": "Batteriewechsel erkannt",
        "push_replaced_msg": "{name} läuft mit neuer Batterie.",
        "push_replaced_many": "{count} Batteriewechsel erkannt",
        "push_burst": "{count} Geräte auf einmal still",
        "push_burst_msg": "Vermutlich ist eine Bridge oder ein Hub ausgefallen: {names}.",
        "push_summary": "Heute: {count} Gerät prüfen",
        "push_summary_many": "Heute: {count} Geräte prüfen",
        "push_summary_battery": "Bald fällig: {list}.",
        "push_summary_more": "Und {count} weitere.",
        "push_batteries": "Batterien bald fällig",
        "push_test": "Pulse-Testmitteilung",
        "push_test_msg": "So sehen Mitteilungen von Pulse aus.",
        "action_replaced": "Batterie gewechselt",
        "action_later": "Morgen erinnern",
    },
    "en": {
        "silent": "Silent for {since}. Usually reports {every}.",
        "silent_new": "No report for more than {since}.",
        "unavailable": "Unreachable for {since}.",
        "partner": "{partner} was active {count}×, {name} hasn't reported since.",
        "battery_low": "Battery almost empty ({level}%).",
        "battery_soon": "Battery at {level}%.",
        "battery_low_flag": "The device reports a low battery.",
        "waiting_first": "Battery replaced, waiting for the first report.",
        "learning": "Still learning how often this device reports.",
        "ok": "Reporting as usual.",
        "ok_rhythm": "Reporting as usual, about {every}.",
        "every_minutes": "every {n} minutes",
        "every_minute": "every minute",
        "every_hours": "every {n} hours",
        "every_hour": "every hour",
        "every_days": "every {n} days",
        "every_day": "once a day",
        "since_minutes": "{n} minutes",
        "since_minute": "a minute",
        "since_hours": "{n} hours",
        "since_hour": "an hour",
        "since_days": "{n} days",
        "since_day": "a day",
        "push_failed": "{name} isn't responding",
        "push_check": "Check {name}",
        "push_battery": "{name}: battery almost empty",
        "push_recovered": "{name} is back",
        "push_recovered_msg": "Reporting as usual again.",
        "push_replaced": "Battery change detected",
        "push_replaced_msg": "{name} is running on a new battery.",
        "push_replaced_many": "{count} battery changes detected",
        "push_burst": "{count} devices went silent at once",
        "push_burst_msg": "A bridge or hub is probably down: {names}.",
        "push_summary": "Today: {count} device to check",
        "push_summary_many": "Today: {count} devices to check",
        "push_summary_battery": "Due soon: {list}.",
        "push_summary_more": "And {count} more.",
        "push_batteries": "Batteries due soon",
        "push_test": "Pulse test notification",
        "push_test_msg": "This is what notifications from Pulse look like.",
        "action_replaced": "Battery replaced",
        "action_later": "Remind tomorrow",
    },
}


def lang(language: str | None) -> str:
    return "de" if (language or "").lower().startswith("de") else "en"


def text(language: str | None, key: str, **params: Any) -> str:
    return TEXTS[lang(language)][key].format(**params)


def _unit(seconds: float) -> tuple[str, int]:
    # Grenzen nach dem Runden: 59,6 Minuten sind „1 Stunde“, nicht „60 Minuten“
    if round(seconds / 60) < 60:
        return "minute", max(1, round(seconds / 60))
    if round(seconds / 3600) < 48:
        return "hour", max(1, round(seconds / 3600))
    return "day", max(1, round(seconds / 86400))


def every(language: str | None, seconds: float) -> str:
    unit, n = _unit(seconds)
    return text(language, f"every_{unit}" if n == 1 else f"every_{unit}s", n=n)


def since(language: str | None, seconds: float) -> str:
    unit, n = _unit(seconds)
    return text(language, f"since_{unit}" if n == 1 else f"since_{unit}s", n=n)


def reason_text(language: str | None, reason: Mapping[str, Any]) -> str:
    """Begründung (Schlüssel + Werte) als Satz."""
    key = str(reason["key"])
    params: dict[str, Any] = dict(reason.get("params", {}))
    for name in ("since", "every"):
        if name in params and isinstance(params[name], int | float):
            params[name] = (since if name == "since" else every)(language, float(params[name]))
    return text(language, key, **params)
