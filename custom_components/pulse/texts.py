"""Sentences for reasons and notifications (en, de; fr, es, nl in texts_i18n), without HA dependency.

Reasons are built on the server so panel, notification and repair issue say the same thing.
"""

from __future__ import annotations

from collections.abc import Mapping
import re
from typing import Any

from .texts_i18n import MORE_TEXTS

TEXTS: dict[str, dict[str, str]] = {
    "de": {
        "silent": "Seit {since} still. Meldet sich sonst etwa {every}.",
        "silent_strays": "Seit {since} kaum noch Meldungen, zuletzt vor {last}. Meldet sich sonst etwa {every}.",
        "startup_waiting": "Seit dem Neustart noch keine Meldung.",
        "radio_only": "Funkt noch, schickt aber seit {since} keine Werte.",
        "battery_missing": "Seit {since} kein Batteriewert, das Gerät meldet sich aber.",
        "cloud_outage": "{integration}: {count} Geräte gleichzeitig still, vermutlich die Cloud.",
        "silent_new": "Seit über {since} keine Meldung.",
        "unavailable": "Seit {since} nicht erreichbar.",
        "unavailable_usual": "Seit {since} nicht erreichbar. Normal bei diesem Gerät, es ist oft aus oder im Standby.",
        "partner": "{partner} war {count}× aktiv, {name} hat sich seitdem nicht gemeldet.",
        "battery_low": "Batterie fast leer ({level} %).",
        "battery_soon": "Batterie bei {level} %.",
        "battery_low_flag": "Das Gerät meldet eine schwache Batterie.",
        "waiting_first": "Batterie gewechselt, wartet auf die erste Meldung.",
        "learning": "Lernt noch, wie oft sich das Gerät meldet.",
        "ok_rhythm": "Meldet sich wie gewohnt, etwa {every}.",
        "ok_reachable": "Laut {via} erreichbar. Stille heißt hier nur: gerade nichts zu melden.",
        "ok_mains": "Am Strom und erreichbar. Meldet sich nur bei Benutzung, Stille ist hier normal.",
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
        # Notifications
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
        "push_burst_mixed": "{count} Geräte auffällig",
        "push_burst_mixed_msg": "Bitte prüfen: {names}.",
        "push_cloud": "{integration}: {count} Geräte still",
        "push_cloud_msg": "Vermutlich hakt die Cloud-Verbindung, nicht die Geräte.",
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
        "silent_strays": "Hardly any reports for {since}, last one {last} ago. Usually reports {every}.",
        "startup_waiting": "No report since the restart yet.",
        "radio_only": "Still on the air, but no values for {since}.",
        "battery_missing": "No battery value for {since}, but the device still reports.",
        "cloud_outage": "{integration}: {count} devices went silent at once, probably the cloud.",
        "silent_new": "No report for more than {since}.",
        "unavailable": "Unreachable for {since}.",
        "unavailable_usual": "Unreachable for {since}. Normal for this device, it is often off or in standby.",
        "partner": "{partner} was active {count}×, {name} hasn't reported since.",
        "battery_low": "Battery almost empty ({level}%).",
        "battery_soon": "Battery at {level}%.",
        "battery_low_flag": "The device reports a low battery.",
        "waiting_first": "Battery replaced, waiting for the first report.",
        "learning": "Still learning how often this device reports.",
        "ok_rhythm": "Reporting as usual, about {every}.",
        "ok_reachable": "Reachable according to {via}. Silence here only means there is nothing to report.",
        "ok_mains": "Powered and reachable. Only reports when used, so silence is normal here.",
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
        "push_burst_mixed": "{count} devices need attention",
        "push_burst_mixed_msg": "Please check: {names}.",
        "push_cloud": "{integration}: {count} devices silent",
        "push_cloud_msg": "Probably the cloud connection, not the devices.",
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


TEXTS.update(MORE_TEXTS)


def lang(language: str | None) -> str:
    code = (language or "").lower()[:2]
    return code if code in TEXTS else "en"


def text(language: str | None, key: str, **params: Any) -> str:
    return TEXTS[lang(language)][key].format(**params)


def _unit(seconds: float) -> tuple[str, int]:
    # Limits after rounding: 59.6 minutes are "1 Stunde" (1 hour), not "60 Minuten" (60 minutes)
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
    """Reason (key + values) as a sentence."""
    key = str(reason["key"])
    params: dict[str, Any] = dict(reason.get("params", {}))
    if key == "silent" and params.get("strays") and "last" in params:
        key = "silent_strays"  # same reason, just more precise: a dying sensor reports sporadically
    for name in ("since", "every", "last"):
        if name in params and isinstance(params[name], int | float):
            params[name] = (every if name == "every" else since)(language, float(params[name]))
    return text(language, key, **params)


# ── Own notification texts ───────────────────────────────────────────────

# Templateable notifications about one device: <kind>_title / <kind>_message
TEMPLATE_KINDS = ("failed", "check", "battery", "recovered")
TEMPLATE_KEYS = tuple(f"{kind}_{part}" for kind in TEMPLATE_KINDS for part in ("title", "message"))
# Placeholders a template may use; unknown ones stay as written
TEMPLATE_VARS = ("name", "area", "reason", "model", "manufacturer", "integration")
SEPARATOR = " · "
_PLACEHOLDER = re.compile(r"\{(\w+)\}")


def template_defaults(language: str | None) -> dict[str, str]:
    """Pulse's own sentences as templates (shown in the panel as the starting point)."""
    reason = SEPARATOR.join(("{area}", "{reason}"))
    return {
        "failed_title": TEXTS[lang(language)]["push_failed"],
        "failed_message": reason,
        "check_title": TEXTS[lang(language)]["push_check"],
        "check_message": reason,
        "battery_title": TEXTS[lang(language)]["push_battery"],
        "battery_message": reason,
        "recovered_title": TEXTS[lang(language)]["push_recovered"],
        "recovered_message": SEPARATOR.join(("{area}", TEXTS[lang(language)]["push_recovered_msg"])),
    }


def render(template: str, values: Mapping[str, str | None]) -> str:
    """Fill in a template. Empty values vanish together with their " · " separator."""
    filled = _PLACEHOLDER.sub(
        lambda m: (values.get(m.group(1)) or "") if m.group(1) in TEMPLATE_VARS else m.group(0), template
    )
    lines = [SEPARATOR.join(part for part in line.split(SEPARATOR) if part.strip()) for line in filled.split("\n")]
    return "\n".join(lines).strip()
