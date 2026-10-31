"""WebSocket-API fürs Panel."""

from __future__ import annotations

from typing import Any

from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers.dispatcher import async_dispatcher_connect
import voluptuous as vol

from .battery import BATTERY_TYPES, CHEMISTRIES
from .const import DOMAIN, NOTIFY_DAILY, NOTIFY_NOW, NOTIFY_OFF, SIGNAL_UPDATE, SNOOZE_MAX_HOURS
from .monitor import PulseMonitor
from .store import merge_settings
from .texts import TEMPLATE_KEYS

LEVEL = vol.In([NOTIFY_NOW, NOTIFY_DAILY, NOTIFY_OFF])
TIME = vol.Match(r"^([01]\d|2[0-3]):[0-5]\d$")
# MQTT-Thema ohne Platzhalter und ohne Schrägstrich am Rand
TEMPLATE = vol.All(str, vol.Strip, vol.Length(max=300))
TOPIC = vol.All(str, vol.Strip, vol.Match(r"^[^#+/\s]([^#+]*[^#+/\s])?$"))


def _monitor(hass: HomeAssistant) -> PulseMonitor | None:
    entries = hass.config_entries.async_loaded_entries(DOMAIN)
    if not entries:
        return None
    monitor: PulseMonitor = entries[0].runtime_data
    return monitor


def _need(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> PulseMonitor | None:
    monitor = _monitor(hass)
    if monitor is None:
        connection.send_error(msg["id"], "not_loaded", "Pulse is not set up")
    return monitor


def _need_device(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> PulseMonitor | None:
    monitor = _need(hass, connection, msg)
    if monitor is not None and msg["device_id"] not in monitor.devices:
        connection.send_error(msg["id"], "unknown_device", "Unknown device")
        return None
    return monitor


@callback
def async_register(hass: HomeAssistant) -> None:
    for handler in (
        ws_subscribe,
        ws_device_update,
        ws_replaced,
        ws_replaced_undo,
        ws_snooze,
        ws_settings,
        ws_enable_z2m,
        ws_enable_z2m_health,
        ws_partner_dismiss,
        ws_test,
        ws_summary,
        ws_heartbeat,
        ws_manual_candidates,
        ws_manual_device,
    ):
        websocket_api.async_register_command(hass, handler)


def _without_recipients(payload: dict[str, Any]) -> dict[str, Any]:
    """Nicht-Admins: Empfänger (notify-Dienste) und Personen bleiben draußen, Zeiten und Stufen sind sichtbar."""
    settings = dict(payload.get("settings") or {})
    settings["targets"] = None
    settings["arrive_home"] = {**(settings.get("arrive_home") or {}), "persons": []}
    return {**payload, "settings": settings, "targets": [], "persons": []}


# Lesen dürfen alle angemeldeten Nutzer (Mitbewohner tippen auf die Mitteilung), Ändern nur Admins
@websocket_api.websocket_command({vol.Required("type"): "pulse/subscribe", vol.Optional("language"): str})
@websocket_api.async_response
async def ws_subscribe(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    # Begründungen in der Sprache des Nutzers (das Panel schickt sie mit), sonst in der des Servers
    language = msg.get("language")

    @callback
    def send(fresh: bool = False) -> None:
        monitor = _monitor(hass)
        payload: dict[str, Any] = {"loaded": False}
        if monitor is not None:
            # Gleicher Stand für alle offenen Panels: einmal je Update gebaut (Kopie oben, Geräte geteilt)
            payload = dict(monitor.snapshot(language) if fresh else monitor.snapshot_cached(language))
            if not connection.user.is_admin:
                payload = _without_recipients(payload)
        payload["battery_types"] = list(BATTERY_TYPES)
        payload["chemistries"] = list(CHEMISTRIES)
        connection.send_message(websocket_api.event_message(msg["id"], payload))

    connection.subscriptions[msg["id"]] = async_dispatcher_connect(hass, SIGNAL_UPDATE, send)
    connection.send_result(msg["id"])
    send(fresh=True)


@websocket_api.websocket_command(
    {
        vol.Required("type"): "pulse/device",
        vol.Required("device_id"): str,
        vol.Optional("ignored"): bool,
        vol.Optional("critical"): vol.Any(None, bool),
        vol.Optional("battery_type"): vol.Any(None, str),
        vol.Optional("battery_count"): vol.Any(None, vol.All(int, vol.Range(min=1, max=12))),
        vol.Optional("chemistry"): vol.Any(None, vol.In(CHEMISTRIES)),
        vol.Optional("partner"): vol.Any(None, str),
    }
)
@websocket_api.require_admin
@callback
def ws_device_update(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    if (monitor := _need_device(hass, connection, msg)) is None:
        return
    device_id = msg["device_id"]
    if msg.get("partner") == device_id:
        connection.send_error(msg["id"], "invalid_partner", "A device cannot be its own partner")
        return
    changes = {k: v for k, v in msg.items() if k not in ("id", "type", "device_id")}
    monitor.update_device(device_id, changes)
    connection.send_result(msg["id"])


@websocket_api.websocket_command({vol.Required("type"): "pulse/replaced", vol.Required("device_id"): str})
@websocket_api.require_admin
@callback
def ws_replaced(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    if (monitor := _need_device(hass, connection, msg)) is None:
        return
    monitor.mark_replaced(msg["device_id"], "manual")
    connection.send_result(msg["id"])


@websocket_api.websocket_command({vol.Required("type"): "pulse/replaced_undo", vol.Required("device_id"): str})
@websocket_api.require_admin
@callback
def ws_replaced_undo(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    """„Rückgängig“ im Hinweis nach „Batterie gewechselt“."""
    if (monitor := _need(hass, connection, msg)) is None:
        return
    connection.send_result(msg["id"], {"undone": monitor.undo_replaced(msg["device_id"])})


@websocket_api.websocket_command(
    {
        vol.Required("type"): "pulse/snooze",
        vol.Required("device_id"): str,
        vol.Required("hours"): vol.All(vol.Coerce(float), vol.Range(min=0, max=SNOOZE_MAX_HOURS)),
    }
)
@websocket_api.require_admin
@callback
def ws_snooze(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    if (monitor := _need_device(hass, connection, msg)) is None:
        return
    monitor.snooze(msg["device_id"], msg["hours"])
    connection.send_result(msg["id"])


SETTINGS_SCHEMA = vol.Schema(
    {
        vol.Optional("targets"): vol.Any(None, [str]),
        vol.Optional("levels"): {
            vol.Optional("failed"): LEVEL,
            vol.Optional("check"): LEVEL,
            vol.Optional("battery"): LEVEL,
        },
        vol.Optional("summary_time"): TIME,
        vol.Optional("quiet"): {
            vol.Optional("enabled"): bool,
            vol.Optional("start"): TIME,
            vol.Optional("end"): TIME,
        },
        vol.Optional("critical_alerts"): bool,
        vol.Optional("arrive_home"): {vol.Optional("enabled"): bool, vol.Optional("persons"): [str]},
        vol.Optional("recovered"): bool,
        vol.Optional("z2m_base"): TOPIC,
        vol.Optional("mains_beta"): bool,
        vol.Optional("templates"): {vol.Optional(key): vol.Any(None, TEMPLATE) for key in TEMPLATE_KEYS},
    }
)


@websocket_api.websocket_command({vol.Required("type"): "pulse/settings", vol.Required("settings"): SETTINGS_SCHEMA})
@websocket_api.require_admin
@callback
def ws_settings(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    if (monitor := _need(hass, connection, msg)) is None:
        return
    base = monitor.store.settings.get("z2m_base")
    mains = monitor.store.settings.get("mains_beta")
    monitor.store.settings = merge_settings(monitor.store.settings, msg["settings"])
    monitor.store.async_delay_save()
    if monitor.store.settings.get("mains_beta") != mains:
        monitor.async_rediscover()
    if monitor.store.settings.get("z2m_base") != base:
        # Im Hintergrund: ohne Broker wartet das Abonnieren bis zu 30 s
        hass.async_create_task(monitor.async_restart_z2m(), eager_start=True)
    monitor.async_update()
    connection.send_result(msg["id"], {"settings": monitor.store.settings})


@websocket_api.websocket_command({vol.Required("type"): "pulse/enable_z2m"})
@websocket_api.require_admin
@websocket_api.async_response
async def ws_enable_z2m(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    if (monitor := _need(hass, connection, msg)) is None:
        return
    if monitor.z2m is None:
        connection.send_error(msg["id"], "no_z2m", "Zigbee2MQTT not found")
        return
    await monitor.async_enable_z2m()
    connection.send_result(msg["id"])


@websocket_api.websocket_command({vol.Required("type"): "pulse/enable_z2m_health"})
@websocket_api.require_admin
@websocket_api.async_response
async def ws_enable_z2m_health(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    """Health-Prüfung (Funk-Zähler) in Zigbee2MQTT einschalten – das Panel fragt vorher nach."""
    if (monitor := _need(hass, connection, msg)) is None:
        return
    if monitor.z2m is None:
        connection.send_error(msg["id"], "no_z2m", "Zigbee2MQTT not found")
        return
    await monitor.async_enable_z2m_health()
    connection.send_result(msg["id"])


@websocket_api.websocket_command(
    {
        vol.Required("type"): "pulse/partner_suggestion_dismiss",
        vol.Required("device_id"): str,
        vol.Required("partner_id"): str,
    }
)
@websocket_api.require_admin
@callback
def ws_partner_dismiss(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    """Partner-Vorschlag dauerhaft verwerfen."""
    if (monitor := _need_device(hass, connection, msg)) is None:
        return
    monitor.dismiss_suggestion(msg["device_id"], msg["partner_id"])
    connection.send_result(msg["id"])


@websocket_api.websocket_command({vol.Required("type"): "pulse/test"})
@websocket_api.require_admin
@callback
def ws_test(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    if (monitor := _need(hass, connection, msg)) is None:
        return
    connection.send_result(msg["id"], {"targets": monitor.notifier.send_test()})


@websocket_api.websocket_command({vol.Required("type"): "pulse/summary"})
@websocket_api.require_admin
@callback
def ws_summary(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    """Zusammenfassung jetzt schicken (Vorschau in den Einstellungen)."""
    if (monitor := _need(hass, connection, msg)) is None:
        return
    connection.send_result(msg["id"], {"sent": monitor.notifier.send_summary()})


@websocket_api.websocket_command(
    {vol.Required("type"): "pulse/heartbeat", vol.Required("device_ids"): vol.All([str], vol.Length(max=8))}
)
@callback
def ws_heartbeat(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    """Herzschlag-Kalender fürs Gerätedetail – auf Anfrage, aus dem Zwischenspeicher."""
    if (monitor := _need(hass, connection, msg)) is None:
        return
    connection.send_result(msg["id"], monitor.heartbeats(msg["device_ids"]))


@websocket_api.websocket_command({vol.Required("type"): "pulse/manual_candidates"})
@websocket_api.require_admin
@callback
def ws_manual_candidates(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    """Devices that can be added by hand: everything Pulse does not watch yet (on request, for the picker)."""
    if (monitor := _need(hass, connection, msg)) is None:
        return
    names: dict[str, str] = {}
    devices = [
        {
            "id": spec.device_id,
            "name": spec.name,
            "area": spec.area,
            "manufacturer": spec.manufacturer,
            "model": spec.model,
            "integration": spec.integration,
            "integration_name": names.setdefault(spec.integration, monitor.integration_name(spec.integration)),
            "icon": spec.icon,
        }
        for spec in monitor.candidates()
    ]
    devices.sort(key=lambda d: (str(d["area"] or "~").lower(), str(d["name"]).lower()))
    connection.send_result(msg["id"], {"devices": devices})


@websocket_api.websocket_command(
    {vol.Required("type"): "pulse/manual_device", vol.Required("device_id"): str, vol.Required("add"): bool}
)
@websocket_api.require_admin
@callback
def ws_manual_device(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    """Add a device by hand or remove it again (only devices that exist; removing always works)."""
    if (monitor := _need(hass, connection, msg)) is None:
        return
    device_id = msg["device_id"]
    if msg["add"] and dr.async_get(hass).async_get(device_id) is None:
        connection.send_error(msg["id"], "unknown_device", "Unknown device")
        return
    monitor.set_manual(device_id, msg["add"])
    connection.send_result(msg["id"], {"watched": device_id in monitor.devices})
