"""Find battery devices in the device and entity registries."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers import area_registry as ar, device_registry as dr, entity_registry as er

from .const import (
    CLOUD_INTEGRATIONS,
    CRITICAL_BINARY_CLASSES,
    DOMAIN,
    EXCLUDED_DOMAINS,
    EXCLUDED_PLATFORMS,
    EXCLUDED_SENSOR_CLASSES,
    HELPER_PLATFORMS,
    HUB_PLATFORMS,
    INACTIVE_DOMAINS,
    LABEL_IGNORE,
    LABEL_IMPORTANT,
    MAINS_DOMAINS,
    MAINS_INTEGRATIONS,
)


def _device_class(entry: er.RegistryEntry) -> str | None:
    return entry.device_class or entry.original_device_class


# Entities whose state changes are a real action of the device (for the cross-check)
ACTION_DOMAINS = {"binary_sensor", "lock", "event"}


@dataclass
class DeviceSpec:
    """What Pulse knows about a device from the registries."""

    device_id: str
    name: str
    area: str | None
    manufacturer: str | None
    model: str | None
    integration: str
    identifiers: set[tuple[str, str]] = field(default_factory=set)
    connections: set[tuple[str, str]] = field(default_factory=set)
    entities: list[str] = field(default_factory=list)  # count as signs of life
    actions: list[str] = field(default_factory=list)  # count for the cross-check
    battery: str | None = None
    battery_low: str | None = None  # "battery low" warning sensor next to a percentage
    voltage: str | None = None
    critical: bool = False
    ieee: str | None = None
    icon: str = "mdi:battery-heart-variant"
    # The integration itself knows whether the device is reachable: "matter" (subscription) or a connectivity sensor
    reachable_via: str | None = None
    # Set by an HA label (LABEL_IMPORTANT/LABEL_IGNORE): "important", "ignore" or None
    label: str | None = None
    # Beta: no battery, powered from the mains (only with the setting `mains_beta`)
    mains: bool = False
    # Mains devices: the lamp/plug/cover itself (no config switch); they decide whether the device is reachable
    main_entities: list[str] = field(default_factory=list)

    @property
    def connectivity(self) -> str | None:
        """The integration's reachability sensor (None for Matter, which reports through availability)."""
        return None if self.reachable_via in (None, "matter") else self.reachable_via

    @property
    def cloud(self) -> bool:
        """Polling cloud integration: its rhythm is the cloud's, not the device's."""
        return self.integration in CLOUD_INTEGRATIONS


# Icon by what the device measures (first matching rule wins)
ICONS: tuple[tuple[str, str | None, str], ...] = (
    ("lock", None, "mdi:lock-outline"),
    ("camera", None, "mdi:cctv"),
    ("binary_sensor", "moisture", "mdi:water-alert-outline"),
    ("binary_sensor", "smoke", "mdi:smoke-detector-variant"),
    ("binary_sensor", "gas", "mdi:gas-cylinder"),
    ("binary_sensor", "door", "mdi:door"),
    ("binary_sensor", "garage_door", "mdi:garage-variant"),
    ("binary_sensor", "window", "mdi:window-closed-variant"),
    ("binary_sensor", "opening", "mdi:window-closed-variant"),
    ("binary_sensor", "occupancy", "mdi:motion-sensor"),
    ("binary_sensor", "motion", "mdi:motion-sensor"),
    ("binary_sensor", "presence", "mdi:account-eye-outline"),
    ("binary_sensor", "vibration", "mdi:vibrate"),
    ("sensor", "moisture", "mdi:sprout-outline"),
    ("sensor", "temperature", "mdi:thermometer"),
    ("sensor", "humidity", "mdi:water-percent"),
    ("climate", None, "mdi:radiator"),
    ("event", None, "mdi:gesture-tap-button"),
)


# Mains-powered devices that measure nothing of the above
MAINS_ICONS: tuple[tuple[str, str | None, str], ...] = (
    ("light", None, "mdi:lightbulb-outline"),
    ("cover", None, "mdi:blinds-horizontal"),
    ("fan", None, "mdi:fan"),
    ("switch", None, "mdi:power-socket-eu"),
)
DEFAULT_ICON = "mdi:battery-heart-variant"
MAINS_ICON = "mdi:power-plug-outline"


def icon_for(entries: list[er.RegistryEntry], mains: bool = False) -> str:
    # What the device is: first its regular entities (a camera's diagnostic chip temperature is no thermometer),
    # only then all (a smoke detector whose smoke sensor its integration files under diagnostics)
    rules = ICONS + MAINS_ICONS if mains else ICONS
    regular = [e for e in entries if e.entity_category is None]
    for candidates in (regular, entries):
        for domain, device_class, icon in rules:
            for e in candidates:
                if e.domain == domain and (device_class is None or _device_class(e) == device_class):
                    return icon
    return MAINS_ICON if mains else DEFAULT_ICON


def ieee_of(device: dr.DeviceEntry) -> str | None:
    for domain, ident in device.identifiers:
        if domain == "mqtt" and ident.startswith("zigbee2mqtt_0x"):
            return ident.removeprefix("zigbee2mqtt_")
    return None


def discover(hass: HomeAssistant, mains: bool = False) -> dict[str, DeviceSpec]:
    """Battery devices; with `mains` (beta) also mains-powered devices (lamps, plugs, covers … see MAINS_DOMAINS)."""
    devices = dr.async_get(hass)
    entities = er.async_get(hass)
    areas = ar.async_get(hass)
    found: dict[str, DeviceSpec] = {}
    # Accessories of media devices (e.g. battery rear speakers of a soundbar) are no battery sensors:
    # devices under a media player or from an entry that has media players (except radio bridges)
    media_devices: set[str] = set()
    media_entries: set[str] = set()
    # Child devices (a lens, a channel, an endpoint) are lightweight parts of their parent device in a registry of
    # their own (`DeviceRegistry.child_devices`, used by Tuya, Z-Wave, ESPHome … from HA 2026.11); their entities
    # belong to the parent here. getattr: older HA versions have no child devices.
    children: dict[str, list[Any]] = {}  # ChildDeviceEntry
    parent_of: dict[str, str] = {}
    for child in getattr(devices, "child_devices", ()):
        parent_of[child.id] = child.parent_device_id
        if child.disabled_by is None:
            children.setdefault(child.parent_device_id, []).append(child)
    for e in entities.entities.values():
        if e.domain == "media_player":
            if e.device_id:
                media_devices.add(parent_of.get(e.device_id, e.device_id))
            if e.config_entry_id and e.platform not in HUB_PLATFORMS:
                media_entries.add(e.config_entry_id)
    for device in devices.devices:
        if device.disabled_by is not None:
            continue
        if device.via_device_id in media_devices or _entry_ids(device) & media_entries:
            continue
        parts = children.get(device.id, [])
        entries = [
            e
            for part in (device, *parts)
            for e in er.async_entries_for_device(entities, part.id)
            if e.disabled_by is None
        ]
        own = [e for e in entries if e.platform != DOMAIN]
        if not own:
            continue
        platforms = {e.platform for e in own}
        if platforms & EXCLUDED_PLATFORMS:
            continue
        if any(e.domain in EXCLUDED_DOMAINS for e in own):
            continue
        percent = next(
            (e.entity_id for e in own if e.domain == "sensor" and _device_class(e) == "battery"),
            None,
        )
        flag = next((e.entity_id for e in own if e.domain == "binary_sensor" and _device_class(e) == "battery"), None)
        battery = percent or flag
        # Main integration = the one with the most entities; helpers on top (template, powercalc) don't count
        counts: dict[str, int] = {}
        for e in own:
            counts[e.platform] = counts.get(e.platform, 0) + 1
        real = {p: n for p, n in counts.items() if p not in HELPER_PLATFORMS} or counts
        integration = max(real, key=lambda p: real[p])
        if battery is None:
            # Beta: mains-powered devices: a real device (no service, no helper) whose own integration gives it a
            # lamp, plug, cover …, or any device of a local hardware integration (MQTT only Zigbee2MQTT)
            if not mains or device.entry_type is not None or integration in HELPER_PLATFORMS:
                continue
            if integration not in MAINS_INTEGRATIONS and not any(
                e.platform == integration and e.domain in MAINS_DOMAINS and e.entity_category is None for e in own
            ):
                continue
            if integration == "mqtt" and ieee_of(device) is None:
                continue
        elif any(e.domain == "sensor" and _device_class(e) in EXCLUDED_SENSOR_CLASSES for e in own):
            continue  # home battery / power station, not a battery sensor
        mine = [e for e in own if e.platform == integration and e.domain not in INACTIVE_DOMAINS]
        # The integration's own reachability flag tells whether the device is reachable, it is no sign of life
        connectivity = next(
            (e.entity_id for e in mine if e.domain == "binary_sensor" and _device_class(e) == "connectivity"),
            None,
        )
        mine = [e for e in mine if e.entity_id != connectivity]
        if battery is None and not mine:
            continue  # mains device without anything that could report
        voltage = next(
            (e.entity_id for e in mine if e.domain == "sensor" and _device_class(e) == "voltage"),
            None,
        )
        actions = [
            e.entity_id
            for e in mine
            if e.domain in ACTION_DOMAINS and e.entity_category is None and _device_class(e) != "battery"
        ]
        critical = any(e.domain == "lock" for e in own) or any(
            e.domain == "binary_sensor" and _device_class(e) in CRITICAL_BINARY_CLASSES for e in own
        )
        area = areas.async_get_area(device.area_id) if device.area_id else None
        labels = set(device.labels).union(*(p.labels for p in parts), *(e.labels for e in entries))
        label = "ignore" if LABEL_IGNORE in labels else "important" if LABEL_IMPORTANT in labels else None
        found[device.id] = DeviceSpec(
            device_id=device.id,
            name=device.name_by_user or device.name or device.id,
            area=area.name if area else None,
            manufacturer=device.manufacturer,
            model=device.model,
            integration=integration,
            identifiers=set(device.identifiers),
            connections=set(device.connections),
            entities=[e.entity_id for e in mine],
            actions=actions,
            battery=battery,
            battery_low=flag if percent else None,
            voltage=voltage,
            critical=critical,
            ieee=ieee_of(device),
            icon=icon_for(own, mains=battery is None),
            reachable_via="matter" if integration == "matter" else connectivity,
            label=label,
            mains=battery is None,
            main_entities=[e.entity_id for e in mine if e.domain in MAINS_DOMAINS and e.entity_category is None],
        )
    return found


def _entry_ids(device: dr.DeviceEntry) -> set[str]:
    """The device's entries: from HA 2026.10 exactly one (`config_entry_id`), before that the set `config_entries`."""
    if hasattr(device, "config_entry_id"):
        return {device.config_entry_id} if device.config_entry_id else set()
    return set(device.config_entries)
