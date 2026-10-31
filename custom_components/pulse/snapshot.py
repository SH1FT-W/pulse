"""Snapshot fürs Panel: alles, was das Panel über die Geräte wissen muss (aus dem Wächter ausgelagert)."""

from __future__ import annotations

import time
from typing import TYPE_CHECKING, Any

from . import battery as batt
from .const import SEVERITY, STATUS_LEARNING, STRIP_BUCKET_HOURS, STRIP_DAYS, STRIP_PER_DAY
from .rhythm import BATTERY_MISSING_AFTER
from .texts import TEMPLATE_VARS, template_defaults

if TYPE_CHECKING:
    from .monitor import Device, PulseMonitor


def _battery(monitor: PulseMonitor, device: Device, now: float) -> dict[str, Any]:
    record = device.record
    info = device.battery_info
    percent = monitor.battery_percent(device)
    flag = monitor.battery_flag(device)
    missing = record.get("battery_missing_since")
    forecast = device.forecast
    return {
        "level": percent,
        "flag": flag,
        "low": flag and monitor.battery_level(device) is not None,
        "voltage": monitor.voltage(device),
        "type": info.type if info else None,
        "count": info.count if info else None,
        "chemistry": record.get("chemistry"),
        "trusted": batt.level_trusted(record.get("chemistry")),
        "replaced": list(record["replaced"]),
        "entity": device.spec.battery,
        "forecast": forecast.as_dict() if forecast else None,
        "forecast_reason": device.forecast_reason if forecast is None and percent is not None else None,
        "missing_since": missing if missing is not None and now - missing >= BATTERY_MISSING_AFTER else None,
        # Das Gerät meldet „schwach“, der Prozentwert sagt etwas anderes
        "flag_conflict": bool(device.spec.battery_low)
        and monitor.flag_on(device)
        and percent is not None
        and percent > batt.LEVEL_SOON,
    }


def _suggestions(monitor: PulseMonitor, device: Device) -> list[dict[str, Any]]:
    if device.record.get("partner"):
        return []
    dismissed = set(device.record.get("partner_dismissed") or ())
    result: list[dict[str, Any]] = []
    for suggestion in device.suggestions:
        partner = monitor.devices.get(suggestion.id)
        if partner is not None and suggestion.id not in dismissed:
            result.append(
                {"id": suggestion.id, "name": partner.name, "score": suggestion.score, "together": suggestion.together}
            )
    return result


def serialize(
    monitor: PulseMonitor, device: Device, now: float, starts: list[float] | None = None, language: str | None = None
) -> dict[str, Any]:
    record = device.record
    if starts is None:
        starts = monitor.day_starts()
    partner = monitor.devices.get(record.get("partner") or "")
    z2m = monitor.z2m
    return {
        "id": device.device_id,
        "name": device.name,
        "area": device.spec.area,
        "manufacturer": device.spec.manufacturer,
        "model": device.spec.model,
        "integration": device.spec.integration,
        "icon": device.spec.icon,
        "status": device.status,
        "reason": monitor.reason(device, language),
        "reason_key": device.reason.get("key"),
        "critical": device.critical,
        "critical_auto": device.spec.critical,
        "critical_manual": record.get("critical"),
        "ignored": device.ignored,
        "label": device.spec.label,
        "mains": device.spec.mains,
        "manual": device.spec.manual,
        "last_activity": device.last_activity,
        "silence_from": monitor.silence_from(device),
        "silence_start": monitor.silence_start(device),
        "strays": device.strays,
        "typical": device.rhythm.typical,
        "samples": device.rhythm.samples,
        "unavailable_since": device.unavailable_since,
        "cloud": device.cloud,
        "radio_only": device.reason.get("key") == "radio_only",
        "battery": _battery(monitor, device, now),
        "partner": partner.device_id if partner else None,
        "partner_name": partner.name if partner else None,
        "partner_suggestions": _suggestions(monitor, device),
        "snooze_until": record.get("snooze_until"),
        "strip": monitor.strip_of(device, starts, now),
        "zigbee": bool(device.spec.ieee),
        "exact": bool(device.spec.ieee and z2m and z2m.last_seen_enabled),
    }


def snapshot(monitor: PulseMonitor, language: str | None = None) -> dict[str, Any]:
    now = time.time()
    starts = monitor.day_starts()
    day_start = starts[0]
    devices = [serialize(monitor, d, now, starts, language) for d in monitor.devices.values()]
    devices.sort(key=lambda d: (-SEVERITY[d["status"]], d["area"] or "~", d["name"].lower()))
    monitored = monitor.monitored()
    z2m = monitor.z2m
    notifier = monitor.notifier
    return {
        "now": now,
        "strip_start": day_start,
        "day_starts": starts,
        "strip_per_day": STRIP_PER_DAY,
        "strip_days": STRIP_DAYS,
        "bucket_hours": STRIP_BUCKET_HOURS,
        "no_data": monitor.no_data(day_start, now),
        "language": language or monitor.hass.config.language,
        "bootstrapped": monitor.bootstrapped,
        "devices": devices,
        "summary": {
            "total": len(monitored),
            "problems": len([d for d in monitored if d.problem]),
            "watch": len([d for d in monitored if SEVERITY[d.status] == 1]),
            "learning": len([d for d in monitored if d.status == STATUS_LEARNING]),
            "next_battery": notifier.battery_due_text(),
            "low_batteries": [d.name for d in notifier.due_batteries()],
            "due_batteries": [
                {
                    "id": d.device_id,
                    "name": d.name,
                    "type": d.battery_info.type if d.battery_info else None,
                    "count": d.battery_info.count if d.battery_info else None,
                    "until": until,
                }
                for d, until in notifier.due_soon()
            ],
            "cloud_outages": [
                {"integration": outage["name"], "count": outage["count"], "since": outage["since"]}
                for outage in monitor.cloud_outages.values()
            ],
        },
        "settings": monitor.store.settings,
        # Own notification texts start from these (in the language of the notifications, not of the panel)
        "template_defaults": template_defaults(monitor.notifier.language),
        "template_vars": list(TEMPLATE_VARS),
        "targets": notifier.available_targets(),
        "persons": sorted(monitor.hass.states.async_entity_ids("person")),
        "z2m": {
            "present": bool(z2m and z2m.present),
            "last_seen": bool(z2m and z2m.last_seen_enabled),
            "availability": bool(z2m and z2m.availability_enabled),
            "health": bool(z2m and z2m.health),
            "version": z2m.version if z2m else None,
            "devices": len([d for d in monitor.devices.values() if d.spec.ieee]),
            "requested_at": monitor.store.z2m_enabled_at,
            "health_requested_at": monitor.store.z2m_health_at,
        },
    }
