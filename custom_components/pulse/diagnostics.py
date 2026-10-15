"""Diagnose-Download: Zustand des Wächters ohne Mitteilungs-Empfänger und Personen."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from homeassistant.components.diagnostics import async_redact_data
from homeassistant.core import HomeAssistant
from homeassistant.util import dt as dt_util

if TYPE_CHECKING:
    from . import PulseConfigEntry
    from .monitor import Device, PulseMonitor

TO_REDACT = {"targets", "persons"}


def _iso(ts: float | None) -> str | None:
    return dt_util.utc_from_timestamp(ts).isoformat() if ts else None


def _device(monitor: PulseMonitor, device: Device) -> dict[str, Any]:
    spec, record, rhythm = device.spec, device.record, device.rhythm
    return {
        "integration": spec.integration,
        "manufacturer": spec.manufacturer,
        "model": spec.model,
        "entities": len(spec.entities),
        "battery_entity": spec.battery is not None,
        "voltage_entity": spec.voltage is not None,
        "zigbee2mqtt": spec.ieee is not None,
        "status": device.status,
        "reason_key": device.reason.get("key"),
        "rhythm": {"typical": rhythm.typical, "longest": rhythm.longest, "samples": rhythm.samples},
        "last_activity": _iso(device.last_activity),
        "silence_from": _iso(monitor.silence_from(device)),
        "unavailable_since": _iso(device.unavailable_since),
        "battery_level": monitor.battery_level(device),
        "cloud": device.cloud,
        "strays": device.strays,
        "silence_start": _iso(monitor.silence_start(device)),
        "radio_last": _iso(device.radio_last),
        "forecast": device.forecast.as_dict() if device.forecast else None,
        "forecast_reason": device.forecast_reason,
        "partner_suggestions": len(device.suggestions),
        "events": len(record["events"]),
        "actions": len(record["actions"]),
        "record": {k: v for k, v in record.items() if k not in ("events", "actions")},
    }


async def async_get_config_entry_diagnostics(hass: HomeAssistant, entry: PulseConfigEntry) -> dict[str, Any]:
    monitor = entry.runtime_data
    z2m = monitor.z2m
    return {
        "settings": async_redact_data(monitor.store.settings, TO_REDACT),
        "started_at": _iso(monitor.started_at),
        "bootstrapped": monitor.bootstrapped,
        "zigbee2mqtt": {
            "active": monitor.z2m_active,
            "present": z2m.present if z2m else False,
            "version": z2m.version if z2m else None,
            "last_seen_enabled": z2m.last_seen_enabled if z2m else False,
            "availability_enabled": z2m.availability_enabled if z2m else False,
            "enabled_at": _iso(monitor.store.z2m_enabled_at),
            "health": z2m.health if z2m else False,
            "health_requested_at": _iso(monitor.store.z2m_health_at),
        },
        "uptime_spans": len(monitor.store.uptime),
        "downtime_gaps": len(monitor.downtime_gaps()),
        "cloud_outages": [{"count": o["count"], "since": _iso(o["since"])} for o in monitor.cloud_outages.values()],
        "summary_sent": monitor.store.summary_sent,
        "summary_pending": monitor.store.summary_pending,
        # Gerätenamen und -IDs bleiben draußen: durchnummeriert reicht zur Fehlersuche
        "devices": [_device(monitor, d) for d in monitor.devices.values()],
    }
