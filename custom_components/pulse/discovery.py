"""Find battery devices in the device and entity registries."""

from __future__ import annotations

from collections.abc import Collection
from dataclasses import dataclass, field, replace
import re
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
    MANUAL_DOMAINS,
    OFFLINE_TRACKER,
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
    # Added by hand in the panel (`settings.manual_devices`) and only watched because of that: watched like a mains
    # device (reachable or not), whatever Pulse would otherwise think of it
    manual: bool = False

    @property
    def connectivity(self) -> str | None:
        """The integration's reachability sensor (None for Matter, which reports through availability)."""
        return None if self.reachable_via in (None, "matter") else self.reachable_via

    @property
    def offline_state(self) -> str:
        """State of `connectivity` that means unreachable: "off", for a router's device tracker "not_home"."""
        via = self.connectivity or ""
        return OFFLINE_TRACKER if via.startswith("device_tracker.") else "off"

    @property
    def cloud(self) -> bool:
        """Polling cloud integration: its rhythm is the cloud's, not the device's."""
        return self.integration in CLOUD_INTEGRATIONS


# Connectivity sensors that say nothing about the device being reachable (seen in real homes): a robot vacuum's
# mop "attached", a meter's attachment, a Shelly's cloud link, a router's WAN, a mounted share
NOT_REACHABILITY = re.compile(r"attach|cloud|backend|wan|internet|mount|mop|water_box", re.IGNORECASE)


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
# Devices added by hand: also what automatic discovery leaves out (EXCLUDED_DOMAINS), and plain network devices
MANUAL_ICONS: tuple[tuple[str, str | None, str], ...] = (
    ("vacuum", None, "mdi:robot-vacuum"),
    ("lawn_mower", None, "mdi:robot-mower-outline"),
    ("media_player", None, "mdi:speaker"),
    *MAINS_ICONS,
    ("device_tracker", None, "mdi:lan-connect"),
    ("binary_sensor", "connectivity", "mdi:lan-connect"),
)
DEFAULT_ICON = "mdi:battery-heart-variant"
MAINS_ICON = "mdi:power-plug-outline"


def icon_for(entries: list[er.RegistryEntry], mains: bool = False, manual: bool = False) -> str:
    # What the device is: first its regular entities (a camera's diagnostic chip temperature is no thermometer),
    # only then all (a smoke detector whose smoke sensor its integration files under diagnostics)
    rules = ICONS + MANUAL_ICONS if manual else ICONS + MAINS_ICONS if mains else ICONS
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


def discover(hass: HomeAssistant, mains: bool = False, manual: Collection[str] = ()) -> dict[str, DeviceSpec]:
    """Battery devices; with `mains` (beta) also mains-powered devices (lamps, plugs, covers … see MAINS_DOMAINS).

    Devices in `manual` (added by hand in the panel) are always watched, also when automatic discovery leaves them
    out (camera, media player, robot vacuum, any network device): like a mains device, whether it is reachable.
    """
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
        parts = children.get(device.id, [])
        entries = [
            e
            for part in (device, *parts)
            for e in er.async_entries_for_device(entities, part.id)
            if e.disabled_by is None
        ]
        own = [e for e in entries if e.platform != DOMAIN]
        if not own or {e.platform for e in own} & EXCLUDED_PLATFORMS:
            continue
        area = areas.async_get_area(device.area_id) if device.area_id else None
        labels = set(device.labels).union(*(p.labels for p in parts), *(e.labels for e in entries))
        base = DeviceSpec(
            device_id=device.id,
            name=device.name_by_user or device.name or device.id,
            area=area.name if area else None,
            manufacturer=device.manufacturer,
            model=device.model,
            integration="",
            identifiers=set(device.identifiers),
            connections=set(device.connections),
            ieee=ieee_of(device),
            label="ignore" if LABEL_IGNORE in labels else "important" if LABEL_IMPORTANT in labels else None,
        )
        media = device.via_device_id in media_devices or bool(_entry_ids(device) & media_entries)
        spec = None if media else _automatic(base, device, own, mains)
        if spec is None and device.id in manual:
            spec = _manual(hass, base, device, own)
        if spec is not None:
            found[device.id] = spec
    return found


def _main_integration(own: list[er.RegistryEntry]) -> str:
    """The one with the most entities; helpers on top (template, powercalc) don't count."""
    counts: dict[str, int] = {}
    for e in own:
        counts[e.platform] = counts.get(e.platform, 0) + 1
    real = {p: n for p, n in counts.items() if p not in HELPER_PLATFORMS} or counts
    return max(real, key=lambda p: real[p])


def _critical(own: list[er.RegistryEntry]) -> bool:
    return any(e.domain == "lock" for e in own) or any(
        e.domain == "binary_sensor" and _device_class(e) in CRITICAL_BINARY_CLASSES for e in own
    )


def _actions(mine: list[er.RegistryEntry]) -> list[str]:
    return [
        e.entity_id
        for e in mine
        if e.domain in ACTION_DOMAINS and e.entity_category is None and _device_class(e) != "battery"
    ]


def _automatic(base: DeviceSpec, device: dr.DeviceEntry, own: list[er.RegistryEntry], mains: bool) -> DeviceSpec | None:
    """What Pulse watches by itself: battery devices, with `mains` also mains-powered devices."""
    if any(e.domain in EXCLUDED_DOMAINS for e in own):
        return None
    percent = next(
        (e.entity_id for e in own if e.domain == "sensor" and _device_class(e) == "battery"),
        None,
    )
    flag = next((e.entity_id for e in own if e.domain == "binary_sensor" and _device_class(e) == "battery"), None)
    battery = percent or flag
    integration = _main_integration(own)
    if battery is None:
        # Beta: mains-powered devices: a real device (no service, no helper) whose own integration gives it a
        # lamp, plug, cover …, or any device of a local hardware integration (MQTT only Zigbee2MQTT)
        if not mains or device.entry_type is not None or integration in HELPER_PLATFORMS:
            return None
        if integration not in MAINS_INTEGRATIONS and not any(
            e.platform == integration and e.domain in MAINS_DOMAINS and e.entity_category is None for e in own
        ):
            return None
        if integration == "mqtt" and base.ieee is None:
            return None
    elif any(e.domain == "sensor" and _device_class(e) in EXCLUDED_SENSOR_CLASSES for e in own):
        return None  # home battery / power station, not a battery sensor
    mine = [e for e in own if e.platform == integration and e.domain not in INACTIVE_DOMAINS]
    # The integration's own reachability flag tells whether the device is reachable, it is no sign of life
    connectivity = next(
        (e.entity_id for e in mine if e.domain == "binary_sensor" and _device_class(e) == "connectivity"),
        None,
    )
    mine = [e for e in mine if e.entity_id != connectivity]
    if battery is None and not mine:
        return None  # mains device without anything that could report
    return replace(
        base,
        integration=integration,
        entities=[e.entity_id for e in mine],
        actions=_actions(mine),
        battery=battery,
        battery_low=flag if percent else None,
        voltage=next((e.entity_id for e in mine if e.domain == "sensor" and _device_class(e) == "voltage"), None),
        critical=_critical(own),
        icon=icon_for(own, mains=battery is None),
        reachable_via="matter" if integration == "matter" else connectivity,
        mains=battery is None,
        main_entities=[e.entity_id for e in mine if e.domain in MAINS_DOMAINS and e.entity_category is None],
    )


def _gps(hass: HomeAssistant, entity_id: str) -> bool:
    """A GPS tracker's "not_home" only means away; not known yet (HA starting): `monitor._offline` checks again."""
    state = hass.states.get(entity_id)
    return state is not None and state.attributes.get("source_type") == "gps"


def _manual(
    hass: HomeAssistant, base: DeviceSpec, device: dr.DeviceEntry, own: list[er.RegistryEntry]
) -> DeviceSpec | None:
    """A device added by hand: watched like a mains device, from all of its (non-helper) integrations.

    Its battery is ignored (a robot vacuum charges, that is no battery change). Reachable or not decides: a
    connectivity sensor (preferably of its own integration) or a router's device tracker, else its main entities
    (lamp, camera, media player, vacuum …), else all of them. A media player that is idle or off is there.
    """
    if device.entry_type is not None:
        return None  # a service (weather, sun), not a device
    integration = _main_integration(own)
    if integration in HELPER_PLATFORMS:
        return None
    mine = [e for e in own if e.platform not in HELPER_PLATFORMS and e.domain not in INACTIVE_DOMAINS]
    flags = [
        e
        for e in mine
        if e.domain == "binary_sensor"
        and _device_class(e) == "connectivity"
        and not NOT_REACHABILITY.search(e.translation_key or e.entity_id)
    ]
    trackers = [e for e in mine if e.domain == "device_tracker" and not _gps(hass, e.entity_id)]
    reach = sorted(flags, key=lambda e: e.platform != integration) or trackers
    connectivity = reach[0].entity_id if reach else None
    mine = [e for e in mine if e.entity_id != connectivity]
    if not mine and connectivity is None:
        return None  # nothing that could tell whether it is there
    return replace(
        base,
        integration=integration,
        entities=[e.entity_id for e in mine],
        actions=_actions(mine),
        critical=_critical(own),
        icon=icon_for(own, mains=True, manual=True),
        reachable_via="matter" if integration == "matter" else connectivity,
        mains=True,
        main_entities=_main_of_manual(mine),
        manual=True,
    )


def _main_of_manual(mine: list[er.RegistryEntry]) -> list[str]:
    regular = [e for e in mine if e.entity_category is None]
    for domains in (MANUAL_DOMAINS, MAINS_DOMAINS | {"remote"}):
        if found := [e.entity_id for e in regular if e.domain in domains]:
            return found
    return []


def candidates(hass: HomeAssistant, watched: Collection[str]) -> list[DeviceSpec]:
    """Devices that can be added by hand: everything Pulse could watch that it does not watch yet."""
    every = {d.id for d in dr.async_get(hass).devices}
    found = discover(hass, mains=False, manual=every - set(watched))
    return [spec for spec in found.values() if spec.manual]


def _entry_ids(device: dr.DeviceEntry) -> set[str]:
    """The device's entries: from HA 2026.10 exactly one (`config_entry_id`), before that the set `config_entries`."""
    if hasattr(device, "config_entry_id"):
        return {device.config_entry_id} if device.config_entry_id else set()
    return set(device.config_entries)
