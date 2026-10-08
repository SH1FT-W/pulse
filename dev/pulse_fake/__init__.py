"""Simulierte Batteriegeräte für den Pulse-Test-HA.

1. Eine Fake-Zigbee2MQTT-Bridge über MQTT: bridge/info, bridge/devices, bridge/state, HA-Discovery,
   Gerätenachrichten (mit `last_seen`, sobald über bridge/request/options eingeschaltet),
   Neustart mit Echo alter Werte.
2. Zwei Geräte ohne MQTT (Türschloss, Präsenzmelder) als normale Entitäten – wie Matter.

Aktionen: pulse_fake.restart_bridge, pulse_fake.replace_battery (name), pulse_fake.set_silent (name, silent).
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
import json
import logging
import random
from typing import Any

from homeassistant.components import mqtt
from homeassistant.config_entries import SOURCE_IMPORT, ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant, ServiceCall, callback
from homeassistant.helpers.event import async_call_later
from homeassistant.helpers.typing import ConfigType
from homeassistant.util import dt as dt_util
import voluptuous as vol

DOMAIN = "pulse_fake"
BASE = "zigbee2mqtt"
_LOGGER = logging.getLogger(__name__)

CONFIG_SCHEMA = vol.Schema({DOMAIN: vol.Any(None, dict)}, extra=vol.ALLOW_EXTRA)


@dataclass
class FakeZigbee:
    name: str
    ieee: str
    manufacturer: str
    model: str
    kinds: list[str]  # temperature, contact, leak, occupancy
    interval: tuple[float, float]  # Sekunden zwischen Meldungen (live)
    silent: bool = False
    battery: int = 80
    voltage: int = 2900
    state: dict[str, Any] = field(default_factory=dict)


ZIGBEE = [
    FakeZigbee(
        "Aquarium Temperatur",
        "0x00158d0000000001",
        "Tuya",
        "Waterproof temperature sensor",
        ["temperature"],
        (60, 90),
        silent=True,
        battery=100,
        voltage=3000,
    ),
    FakeZigbee(
        "Thermometer Bad",
        "0x00158d0000000002",
        "Aqara",
        "WSDCGQ11LM",
        ["temperature"],
        (45, 75),
        battery=87,
        voltage=2950,
    ),
    FakeZigbee(
        "Fensterkontakt Schlafzimmer",
        "0x00158d0000000003",
        "IKEA",
        "PARASOLL door/window sensor",
        ["contact"],
        (120, 300),
        battery=94,
        voltage=1300,
    ),
    FakeZigbee(
        "Türkontakt Wohnungstür",
        "0x00158d0000000004",
        "IKEA",
        "PARASOLL door/window sensor",
        ["contact"],
        (90, 200),
        silent=True,
        battery=94,
        voltage=1300,
    ),
    FakeZigbee(
        "Lecksensor Bad",
        "0x00158d0000000005",
        "IKEA",
        "BADRING water leakage sensor",
        ["leak"],
        (100, 140),
        battery=32,
        voltage=1250,
    ),
    FakeZigbee(
        "Bewegungsmelder Terrasse",
        "0x00158d0000000006",
        "IKEA",
        "VALLHORN wireless motion sensor",
        ["occupancy"],
        (60, 240),
        battery=40,
        voltage=1260,
    ),
    FakeZigbee(
        "Thermometer Keller",
        "0x00158d0000000007",
        "Aqara",
        "WSDCGQ11LM",
        ["temperature"],
        (45, 75),
        silent=True,
        battery=12,
        voltage=2650,
    ),
    FakeZigbee(
        "Kontaktsensor Gefrierschrank",
        "0x00158d0000000008",
        "IKEA",
        "PARASOLL door/window sensor",
        ["contact"],
        (300, 600),
        battery=41,
        voltage=1120,
    ),
]

ENTITY_DEFS: dict[str, list[tuple[str, str, dict[str, Any]]]] = {
    "temperature": [
        (
            "sensor",
            "temperature",
            {
                "device_class": "temperature",
                "unit_of_measurement": "°C",
                "state_class": "measurement",
                "name": "Temperatur",
            },
        )
    ],
    "contact": [
        (
            "binary_sensor",
            "contact",
            {"device_class": "door", "payload_on": False, "payload_off": True, "name": "Kontakt"},
        )
    ],
    "leak": [
        (
            "binary_sensor",
            "water_leak",
            {"device_class": "moisture", "payload_on": True, "payload_off": False, "name": "Wasserleck"},
        )
    ],
    "occupancy": [
        (
            "binary_sensor",
            "occupancy",
            {"device_class": "occupancy", "payload_on": True, "payload_off": False, "name": "Belegung"},
        )
    ],
}
COMMON = [
    (
        "sensor",
        "battery",
        {
            "device_class": "battery",
            "unit_of_measurement": "%",
            "state_class": "measurement",
            "entity_category": "diagnostic",
            "name": "Batterie",
        },
    ),
    (
        "sensor",
        "voltage",
        {
            "device_class": "voltage",
            "unit_of_measurement": "mV",
            "state_class": "measurement",
            "entity_category": "diagnostic",
            "name": "Spannung",
        },
    ),
    (
        "sensor",
        "linkquality",
        {
            "unit_of_measurement": "lqi",
            "state_class": "measurement",
            "entity_category": "diagnostic",
            "name": "Linkquality",
            "icon": "mdi:signal",
        },
    ),
]


class FakeBridge:
    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass
        self.last_seen = False
        self.availability = False
        self.online = True
        self.cache: dict[str, dict[str, Any]] = {}
        self._cancel: dict[str, Any] = {}

    def info(self) -> dict[str, Any]:
        return {
            "version": "2.6.1",
            "coordinator": {"type": "zStack3x0"},
            "config": {
                "advanced": {"last_seen": "ISO_8601" if self.last_seen else "disable"},
                "availability": {"enabled": self.availability},
            },
        }

    async def publish(self, topic: str, payload: Any, retain: bool = False) -> None:
        await mqtt.async_publish(
            self.hass, topic, json.dumps(payload) if not isinstance(payload, str) else payload, retain=retain
        )

    async def start(self) -> None:
        await mqtt.async_subscribe(self.hass, f"{BASE}/bridge/request/options", self._options)
        devices = [{"ieee_address": "0x00124b0000000000", "type": "Coordinator", "friendly_name": "Coordinator"}]
        for dev in ZIGBEE:
            devices.append(
                {
                    "ieee_address": dev.ieee,
                    "type": "EndDevice",
                    "friendly_name": dev.name,
                    "power_source": "Battery",
                    "definition": {"vendor": dev.manufacturer, "model": dev.model},
                }
            )
        await self.publish(f"{BASE}/bridge/devices", devices, retain=True)
        await self.publish(f"{BASE}/bridge/info", self.info(), retain=True)
        await self.publish(f"{BASE}/bridge/state", {"state": "online"}, retain=True)
        for dev in ZIGBEE:
            await self.discovery(dev)
        await asyncio.sleep(2)
        # Beim Start schickt Zigbee2MQTT den letzten bekannten Stand aller Geräte – auch der stillen
        for dev in ZIGBEE:
            await self.report(dev)
            self.schedule(dev)

    async def discovery(self, dev: FakeZigbee) -> None:
        device = {
            "identifiers": [f"zigbee2mqtt_{dev.ieee}"],
            "name": dev.name,
            "manufacturer": dev.manufacturer,
            "model": dev.model,
            "via_device": "zigbee2mqtt_bridge_0x00124b0000000000",
        }
        defs = [d for k in dev.kinds for d in ENTITY_DEFS[k]] + COMMON
        for component, key, extra in defs:
            config = {
                **extra,
                "object_id": f"{dev.name.lower()}_{key}",
                "unique_id": f"{dev.ieee}_{key}_zigbee2mqtt",
                "state_topic": f"{BASE}/{dev.name}",
                "value_template": f"{{{{ value_json.{key} }}}}",
                "availability": [{"topic": f"{BASE}/bridge/state", "value_template": "{{ value_json.state }}"}],
                "device": device,
                "origin": {"name": "Zigbee2MQTT (Fake)"},
            }
            await self.publish(f"homeassistant/{component}/{dev.ieee}/{key}/config", config, retain=True)

    def payload(self, dev: FakeZigbee) -> dict[str, Any]:
        state = dev.state
        if "temperature" in dev.kinds:
            state["temperature"] = round(state.get("temperature", 24.0) + random.uniform(-0.3, 0.3), 1)
        if "contact" in dev.kinds:
            state["contact"] = not state.get("contact", True)
        if "leak" in dev.kinds:
            state["water_leak"] = False
        if "occupancy" in dev.kinds:
            state["occupancy"] = not state.get("occupancy", False)
        state["battery"] = dev.battery
        state["voltage"] = dev.voltage
        state["linkquality"] = random.randint(40, 180)
        out = dict(state)
        if self.last_seen:
            out["last_seen"] = dt_util.now().isoformat(timespec="milliseconds")
        return out

    async def report(self, dev: FakeZigbee) -> None:
        payload = self.payload(dev)
        self.cache[dev.name] = payload
        await self.publish(f"{BASE}/{dev.name}", payload)

    def schedule(self, dev: FakeZigbee) -> None:
        delay = random.uniform(*dev.interval)

        @callback
        def fire(_now: Any) -> None:
            if not dev.silent and self.online:
                self.hass.async_create_task(self.report(dev))
            self.schedule(dev)

        self._cancel[dev.name] = async_call_later(self.hass, delay, fire)

    @callback
    def _options(self, msg: Any) -> None:
        try:
            data = json.loads(msg.payload)
        except ValueError:
            return
        options = data.get("options", {})
        if (options.get("advanced") or {}).get("last_seen") not in (None, "disable"):
            self.last_seen = True
        if (options.get("availability") or {}).get("enabled"):
            self.availability = True
        _LOGGER.info("Fake-Bridge: Optionen gesetzt last_seen=%s availability=%s", self.last_seen, self.availability)

        async def answer() -> None:
            await self.publish(f"{BASE}/bridge/info", self.info(), retain=True)
            await self.publish(f"{BASE}/bridge/response/options", {"status": "ok", "data": {"restart_required": False}})
            if self.availability:
                for dev in ZIGBEE:
                    await self.publish(
                        f"{BASE}/{dev.name}/availability", {"state": "offline" if dev.silent else "online"}, retain=True
                    )

        self.hass.async_create_task(answer())

    async def restart(self) -> None:
        """Neustart wie echt: offline, online, dann alle zwischengespeicherten Werte noch einmal."""
        self.online = False
        await self.publish(f"{BASE}/bridge/state", {"state": "offline"}, retain=True)
        await asyncio.sleep(3)
        self.online = True
        await self.publish(f"{BASE}/bridge/state", {"state": "online"}, retain=True)
        await asyncio.sleep(0.5)
        for name, payload in self.cache.items():
            await self.publish(f"{BASE}/{name}", payload)

    async def replace_battery(self, name: str) -> None:
        dev = next(d for d in ZIGBEE if d.name == name)
        dev.voltage = 1400 if "IKEA" in dev.manufacturer else 3100
        dev.battery = 100
        dev.silent = False
        if self.availability:
            await self.publish(f"{BASE}/{dev.name}/availability", {"state": "online"}, retain=True)
        await self.publish(
            f"{BASE}/bridge/event",
            {"type": "device_announce", "data": {"friendly_name": dev.name, "ieee_address": dev.ieee}},
        )
        await self.report(dev)


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    if DOMAIN in config:
        hass.async_create_task(hass.config_entries.flow.async_init(DOMAIN, context={"source": SOURCE_IMPORT}, data={}))
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    if not await mqtt.async_wait_for_mqtt_client(hass):
        return False
    bridge = FakeBridge(hass)
    hass.data[DOMAIN] = bridge
    await hass.config_entries.async_forward_entry_setups(
        entry, [Platform.LOCK, Platform.SENSOR, Platform.BINARY_SENSOR]
    )
    hass.async_create_task(bridge.start())

    async def restart(_call: ServiceCall) -> None:
        await bridge.restart()

    async def replace(call: ServiceCall) -> None:
        await bridge.replace_battery(call.data["name"])

    async def set_silent(call: ServiceCall) -> None:
        dev = next(d for d in ZIGBEE if d.name == call.data["name"])
        dev.silent = bool(call.data.get("silent", True))

    async def fake_push(call: ServiceCall) -> None:
        # Stellvertreter für die iPhone-App: Pulse findet ihn wie einen echten mobile_app-Dienst
        _LOGGER.warning(
            "FAKE-PUSH an iPhone: %s | %s | %s",
            call.data.get("title"),
            call.data.get("message"),
            json.dumps(call.data.get("data", {}), ensure_ascii=False),
        )
        hass.data.setdefault(f"{DOMAIN}_pushes", []).append(dict(call.data))

    hass.services.async_register("notify", "mobile_app_fake_iphone", fake_push)
    # Anzeigename des Empfängers im Panel (wie der device_tracker der echten Companion-App)
    hass.states.async_set("device_tracker.fake_iphone", "home", {"friendly_name": "Alex’ iPhone", "source_type": "gps"})
    hass.services.async_register(DOMAIN, "restart_bridge", restart)
    hass.services.async_register(DOMAIN, "replace_battery", replace)
    hass.services.async_register(DOMAIN, "set_silent", set_silent)
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    return await hass.config_entries.async_unload_platforms(
        entry, [Platform.LOCK, Platform.SENSOR, Platform.BINARY_SENSOR]
    )
