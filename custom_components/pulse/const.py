"""Constants for Pulse."""

from __future__ import annotations

from datetime import timedelta
from typing import Any, Final

from homeassistant.const import Platform

DOMAIN: Final = "pulse"
PLATFORMS: Final = [Platform.BINARY_SENSOR, Platform.SENSOR]

STORE_KEY: Final = "pulse.devices"
STORE_VERSION: Final = 1
# 2: uptime, 3: source per battery change, false changes dropped, 4: volts → mV, arrive home as a list,
# 5: summary day (summary_sent/summary_pending), 6: dismissed partner suggestions, battery missing since,
# cloud outage reported, Z2M health requested, 7: restart echoes dropped, cloud reports rebuilt
STORE_MINOR: Final = 8

# Dispatcher: something changed (resend the panel, update entities)
SIGNAL_UPDATE: Final = "pulse_update"
# Newly monitored devices (platforms create their entities)
SIGNAL_NEW_DEVICES: Final = "pulse_new_devices"
# Devices no longer monitored (platforms forget them so they are recreated when they return)
SIGNAL_REMOVED_DEVICES: Final = "pulse_removed_devices"

EVENT_STATUS_CHANGED: Final = "pulse_device_status_changed"
EVENT_BATTERY_REPLACED: Final = "pulse_battery_replaced"

# Status, sorted by severity
STATUS_OK: Final = "ok"
STATUS_LEARNING: Final = "learning"
STATUS_WATCH: Final = "watch"
STATUS_CHECK: Final = "check"
STATUS_FAILED: Final = "failed"
STATUSES: Final = [STATUS_OK, STATUS_LEARNING, STATUS_WATCH, STATUS_CHECK, STATUS_FAILED]
SEVERITY: Final = {STATUS_OK: 0, STATUS_LEARNING: 0, STATUS_WATCH: 1, STATUS_CHECK: 2, STATUS_FAILED: 3}

# How far back Pulse looks (learning) and what the rhythm bar shows
HISTORY_DAYS: Final = 10
KEEP_DAYS: Final = 14
STRIP_DAYS: Final = 7
STRIP_BUCKET_HOURS: Final = 2
# Heartbeat calendar in the device detail: reports per 15 minutes (on request only, cached)
HEARTBEAT_MINUTES: Final = 15
# Reports this close together count as one (one radio message changes several entities)
MERGE_SECONDS: Final = 5.0
# Stored reports per device; chatty devices are thinned to one per THIN_SECONDS (7 days fit)
MAX_EVENTS: Final = 6000
THIN_SECONDS: Final = 120.0
# Rhythm bar: windows per calendar day (2 hours, slightly more/less on DST change days)
STRIP_PER_DAY: Final = 12

TICK: Final = timedelta(seconds=60)
# After a restart the Zigbee2MQTT bridge resends old values; those do not count.
# In prod the second echo came up to 142 s after "unknown", hence generous.
ECHO_WINDOW: Final = timedelta(seconds=180)

Z2M_BASE: Final = "zigbee2mqtt"

# Integrations and device kinds that are not battery sensors in Pulse's sense
EXCLUDED_PLATFORMS: Final = {"mobile_app", DOMAIN}
EXCLUDED_DOMAINS: Final = {"vacuum", "media_player", "lawn_mower", "device_tracker"}
EXCLUDED_SENSOR_CLASSES: Final = {"power", "energy", "energy_storage"}
# Radio bridges with many unrelated devices in one entry: a media player there says nothing about the other devices
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
# Polling cloud integrations: their rhythm is the cloud's, not the device's. If several devices of the
# same cloud drop out at once, it is the cloud (one collective reason instead of many outages).
CLOUD_INTEGRATIONS: Final = frozenset(
    {
        "netatmo",
        "ring",
        "nest",
        "ecobee",
        "tado",
        "blink",
        "august",
        "yale",
        "ezviz",
        "simplisafe",
        "smartthings",
        "tuya",
        "airthings",
        "switchbot_cloud",
        "sensibo",
        "withings",
        "honeywell",
        "lyric",
        "totalconnect",
        "home_connect",
        "miele",
        "eufy",
        "wyze",
        "myq",
        "hydrawise",
        "rachio",
        "awair",
        "mill",
        "plugwise_cloud",
    }
)
# These domains say nothing about whether the device is transmitting
INACTIVE_DOMAINS: Final = {"update", "button", "scene", "text", "image"}
# Important devices: stricter limits, immediate (optionally critical) notification
CRITICAL_BINARY_CLASSES: Final = {"moisture", "smoke", "gas", "carbon_monoxide", "safety"}
# Beta "mains-powered devices": recognised by what they are (lamp, plug, cover …), from any integration.
# A device counts if its own integration gives it one of these (not as a config/diagnostic entity) ...
MAINS_DOMAINS: Final = frozenset(
    {"light", "switch", "fan", "cover", "climate", "valve", "humidifier", "water_heater", "siren", "lock"}
)
# ... or if it comes from a local integration whose devices are always hardware, also without a lamp or plug
# (Zigbee router, ESPHome Bluetooth proxy, Shelly input). Zigbee2MQTT devices come through "mqtt" with an
# IEEE address.
MAINS_INTEGRATIONS: Final = frozenset(
    {
        "zha",
        "mqtt",
        "zwave_js",
        "matter",
        "hue",
        "deconz",
        "tradfri",
        "esphome",
        "shelly",
        "tasmota",
        "tplink",
        "wled",
        "homekit_controller",
        "lifx",
        "nanoleaf",
        "yeelight",
        "wiz",
        "govee_light_local",
        "twinkly",
        "elgato",
        "fritzbox",
        "bond",
        "lutron_caseta",
        "insteon",
    }
)
# Helpers built on top of other devices: never the device's own integration (Govee lamp + powercalc sensors)
HELPER_PLATFORMS: Final = frozenset(
    {
        "template",
        "group",
        "powercalc",
        "switch_as_x",
        "adaptive_lighting",
        "universal",
        "min_max",
        "utility_meter",
        "derivative",
        "integration",
        "threshold",
        "statistics",
        "filter",
        "trend",
        "generic_thermostat",
        "generic_hygrostat",
        "better_thermostat",
    }
)
# Learned availability (mains devices): a device that went unavailable by itself at least OUTAGE_HABIT times
# within KEEP_DAYS (each ≥ OUTAGE_MIN, HA pauses excluded) is often switched off (standby, plug); being gone is
# then its habit (at most "watch"), until it stays away for more than twice its longest outage (at least a day)
OUTAGE_MIN: Final = 20 * 60.0
OUTAGE_HABIT: Final = 3
OUTAGES_KEPT: Final = 100

# HA labels on the device or one of its entities; they win over the panel switches, "ignore" over "important"
LABEL_IMPORTANT: Final = "pulse_important"
LABEL_IGNORE: Final = "pulse_ignore"

# Notification levels
NOTIFY_NOW: Final = "now"
NOTIFY_DAILY: Final = "daily"
NOTIFY_OFF: Final = "off"

ACTION_REPLACED: Final = "PULSE_REPLACED"
ACTION_LATER: Final = "PULSE_LATER"

DEFAULT_SETTINGS: Final[dict[str, Any]] = {
    "targets": None,  # None = all mobile_app services
    "levels": {"failed": NOTIFY_NOW, "check": NOTIFY_DAILY, "battery": NOTIFY_DAILY},
    "summary_time": "18:00",
    "quiet": {"enabled": True, "start": "22:00", "end": "07:30"},
    "critical_alerts": True,
    "arrive_home": {"enabled": False, "persons": []},  # deliver only once one of the persons is home
    "recovered": True,
    "z2m_base": Z2M_BASE,
    "mains_beta": True,  # beta (on since 26.10.9): also watch mains-powered devices (see MAINS_DOMAINS)
    # Own notification texts, None = Pulse's sentence in the user's language (texts.TEMPLATE_KEYS)
    "templates": {
        "failed_title": None,
        "failed_message": None,
        "check_title": None,
        "check_message": None,
        "battery_title": None,
        "battery_message": None,
        "recovered_title": None,
        "recovered_message": None,
    },
}

# Reasons reported by the "Batterie" (battery) level instead of "Prüfen" (check)
BATTERY_REASONS: Final = frozenset({"battery_low", "battery_low_flag"})
# Reasons that mean "silent/gone" (storm brake: bridge/hub; cloud collective reason)
SILENT_REASONS: Final = frozenset({"silent", "silent_new", "unavailable"})
# "Später" (later) at most one year (otherwise infinite timestamps end up in the entities)
SNOOZE_MAX_HOURS: Final = 8760
