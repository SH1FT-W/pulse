"""Konstanten für Pulse."""

from __future__ import annotations

from datetime import timedelta
from typing import Any, Final

from homeassistant.const import Platform

DOMAIN: Final = "pulse"
PLATFORMS: Final = [Platform.BINARY_SENSOR, Platform.SENSOR]

STORE_KEY: Final = "pulse.devices"
STORE_VERSION: Final = 1
# 2: Laufzeit (uptime), 3: Quelle je Batteriewechsel, Fehl-Wechsel verworfen, 4: Tag der Zusammenfassung
STORE_MINOR: Final = 5

# Dispatcher: etwas hat sich geändert (Panel neu senden, Entitäten aktualisieren)
SIGNAL_UPDATE: Final = "pulse_update"
# Neue überwachte Geräte (Plattformen legen ihre Entitäten an)
SIGNAL_NEW_DEVICES: Final = "pulse_new_devices"

EVENT_STATUS_CHANGED: Final = "pulse_device_status_changed"
EVENT_BATTERY_REPLACED: Final = "pulse_battery_replaced"

# Status, sortiert nach Ernst
STATUS_OK: Final = "ok"
STATUS_LEARNING: Final = "learning"
STATUS_WATCH: Final = "watch"
STATUS_CHECK: Final = "check"
STATUS_FAILED: Final = "failed"
STATUSES: Final = [STATUS_OK, STATUS_LEARNING, STATUS_WATCH, STATUS_CHECK, STATUS_FAILED]
SEVERITY: Final = {STATUS_OK: 0, STATUS_LEARNING: 0, STATUS_WATCH: 1, STATUS_CHECK: 2, STATUS_FAILED: 3}

# Wie weit Pulse zurückschaut (Lernen) und was die Rhythmusleiste zeigt
HISTORY_DAYS: Final = 10
KEEP_DAYS: Final = 14
STRIP_DAYS: Final = 7
STRIP_BUCKET_HOURS: Final = 2
# Herzschlag-Kalender im Gerätedetail: Meldungen je 15 Minuten (nur auf Anfrage, zwischengespeichert)
HEARTBEAT_MINUTES: Final = 15
# Meldungen, die so dicht aufeinander folgen, zählen als eine (eine Funknachricht ändert mehrere Entitäten)
MERGE_SECONDS: Final = 5.0
# Gespeicherte Meldungen je Gerät; gesprächige Geräte werden auf eine je THIN_SECONDS ausgedünnt (7 Tage passen)
MAX_EVENTS: Final = 6000
THIN_SECONDS: Final = 120.0
# Rhythmusleiste: Fenster je Kalendertag (2 Stunden, an Tagen mit Zeitumstellung etwas mehr/weniger)
STRIP_PER_DAY: Final = 12

TICK: Final = timedelta(seconds=60)
# Nach einem Neustart der Zigbee2MQTT-Bridge schickt sie alte Werte noch einmal – die zählen nicht
ECHO_WINDOW: Final = timedelta(seconds=90)

Z2M_BASE: Final = "zigbee2mqtt"

# Integrationen und Gerätearten, die keine Sensoren mit Batterie im Sinne von Pulse sind
EXCLUDED_PLATFORMS: Final = {"mobile_app", DOMAIN}
EXCLUDED_DOMAINS: Final = {"vacuum", "media_player", "lawn_mower", "device_tracker"}
EXCLUDED_SENSOR_CLASSES: Final = {"power", "energy", "energy_storage"}
# Funk-Brücken mit vielen fremden Geräten in einem Eintrag: ein Mediaplayer dort sagt nichts über die übrigen Geräte
HUB_PLATFORMS: Final = {
    "mqtt",
    "zha",
    "matter",
    "zwave_js",
    "deconz",
    "hue",
    "homekit_controller",
    "esphome",
    "tuya",
    "tuya_local",
    "shelly",
    "switchbot",
    "bthome",
    "xiaomi_ble",
    "knx",
    "homematicip_cloud",
    "fritz",
    "fritzbox",
}
# Diese Domänen sagen nichts darüber, ob das Gerät funkt
INACTIVE_DOMAINS: Final = {"update", "button", "scene", "text", "image"}
# Wichtige Geräte: strengere Grenzen, sofortige (auf Wunsch kritische) Mitteilung
CRITICAL_BINARY_CLASSES: Final = {"moisture", "smoke", "gas", "carbon_monoxide", "safety"}

# Mitteilungs-Stufen
NOTIFY_NOW: Final = "now"
NOTIFY_DAILY: Final = "daily"
NOTIFY_OFF: Final = "off"

ACTION_REPLACED: Final = "PULSE_REPLACED"
ACTION_LATER: Final = "PULSE_LATER"

DEFAULT_SETTINGS: Final[dict[str, Any]] = {
    "targets": None,  # None = alle mobile_app-Dienste
    "levels": {"failed": NOTIFY_NOW, "check": NOTIFY_DAILY, "battery": NOTIFY_DAILY},
    "summary_time": "18:00",
    "quiet": {"enabled": True, "start": "22:00", "end": "07:30"},
    "critical_alerts": True,
    "arrive_home": {"enabled": False, "persons": []},  # erst zustellen, wenn eine der Personen zu Hause ist
    "recovered": True,
    "z2m_base": Z2M_BASE,
}

# Begründungen, die von der Stufe „Batterie“ (statt „Prüfen“) gemeldet werden
BATTERY_REASONS: Final = frozenset({"battery_low", "battery_low_flag"})
# „Später“ höchstens ein Jahr (sonst landen unendliche Zeitstempel in den Entitäten)
SNOOZE_MAX_HOURS: Final = 8760
