"""Zigbee2MQTT mithören: „zuletzt gesehen“, Verfügbarkeit, Bridge-Neustarts, Neuanmeldungen.

Pulse liest nur mit, was die Bridge ohnehin veröffentlicht. Einziger Schreibzugriff: auf ausdrücklichen
Wunsch die Bridge-Optionen `last_seen` und `availability` einschalten – das kostet keine Batterie,
weil die Bridge nur eigene Zeitstempel anhängt.
"""

from __future__ import annotations

from collections.abc import Callable
from datetime import datetime
import json
import logging
import time
from typing import Any

from homeassistant.core import HomeAssistant, callback
from homeassistant.util import dt as dt_util

from .const import ECHO_WINDOW

_LOGGER = logging.getLogger(__name__)

AVAILABILITY = "/availability"


def parse_last_seen(value: Any) -> float | None:
    """ISO-Zeit, Epoch in ms oder s → Sekunden seit Epoch."""
    if isinstance(value, bool):
        return None
    if isinstance(value, int | float):
        return float(value) / 1000 if value > 1e11 else float(value)
    if isinstance(value, str):
        parsed: datetime | None = dt_util.parse_datetime(value)
        if parsed is None:
            return None
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=dt_util.get_default_time_zone())
        return parsed.timestamp()
    return None


class Z2MListener:
    """Hört auf `<base>/…` und meldet Lebenszeichen pro IEEE-Adresse."""

    def __init__(
        self,
        hass: HomeAssistant,
        base: str,
        on_seen: Callable[[str, float, bool], None],
        on_availability: Callable[[str, bool], None],
        on_announce: Callable[[str], None],
        on_change: Callable[[], None],
    ) -> None:
        self.hass = hass
        self.base = base
        self._on_seen = on_seen
        self._on_availability = on_availability
        self._on_announce = on_announce
        self._on_change = on_change
        self._unsubs: list[Callable[[], None]] = []
        self.names: dict[str, str] = {}  # friendly_name → ieee
        self.present = False
        self.last_seen_enabled = False
        self.availability_enabled = False
        self.version: str | None = None
        self.echo_until = 0.0

    @property
    def in_echo_window(self) -> bool:
        return time.time() < self.echo_until

    async def async_start(self) -> bool:
        from homeassistant.components import mqtt

        if "mqtt" not in self.hass.config.components:
            return False
        if not await mqtt.async_wait_for_mqtt_client(self.hass):
            return False
        base = self.base
        self._unsubs.append(await mqtt.async_subscribe(self.hass, f"{base}/bridge/devices", self._devices))
        self._unsubs.append(await mqtt.async_subscribe(self.hass, f"{base}/bridge/info", self._info))
        self._unsubs.append(await mqtt.async_subscribe(self.hass, f"{base}/bridge/state", self._state))
        self._unsubs.append(await mqtt.async_subscribe(self.hass, f"{base}/bridge/event", self._event))
        # „#“ statt „+“: Gerätenamen dürfen Schrägstriche enthalten (z. B. „Küche/Fenster“)
        self._unsubs.append(await mqtt.async_subscribe(self.hass, f"{base}/#", self._topic))
        return True

    @callback
    def async_stop(self) -> None:
        while self._unsubs:
            self._unsubs.pop()()

    async def async_enable_options(self) -> None:
        """Bridge-Optionen setzen: Zeitstempel an jeder Nachricht + Verfügbarkeit."""
        from homeassistant.components import mqtt

        payload = {"options": {"advanced": {"last_seen": "ISO_8601"}, "availability": {"enabled": True}}}
        await mqtt.async_publish(self.hass, f"{self.base}/bridge/request/options", json.dumps(payload))

    @staticmethod
    def _json(payload: Any) -> Any:
        if isinstance(payload, bytes):
            payload = payload.decode("utf-8", "replace")
        if not isinstance(payload, str) or not payload:
            return None
        try:
            return json.loads(payload)
        except ValueError:
            return payload

    @callback
    def _devices(self, msg: Any) -> None:
        data = self._json(msg.payload)
        if not isinstance(data, list):
            return
        self.names = {
            str(d["friendly_name"]): str(d["ieee_address"])
            for d in data
            if isinstance(d, dict) and "friendly_name" in d and "ieee_address" in d
        }
        self.present = True
        self._on_change()

    @callback
    def _info(self, msg: Any) -> None:
        data = self._json(msg.payload)
        if not isinstance(data, dict):
            return
        config = data.get("config") or {}
        advanced = config.get("advanced") or {}
        availability = config.get("availability")
        self.last_seen_enabled = advanced.get("last_seen") not in (None, "disable", False)
        if isinstance(availability, dict):
            self.availability_enabled = bool(availability.get("enabled", False))
        else:
            self.availability_enabled = bool(availability)
        self.version = data.get("version")
        self.present = True
        self._on_change()

    @callback
    def _state(self, msg: Any) -> None:
        data = self._json(msg.payload)
        state = data.get("state") if isinstance(data, dict) else data
        if state == "online":
            # Die Bridge schickt jetzt ihre zwischengespeicherten Werte noch einmal
            self.echo_until = time.time() + ECHO_WINDOW.total_seconds()
            _LOGGER.debug("Zigbee2MQTT online – Echo-Fenster %ss", ECHO_WINDOW.total_seconds())

    @callback
    def _event(self, msg: Any) -> None:
        data = self._json(msg.payload)
        if not isinstance(data, dict) or data.get("type") not in ("device_announce", "device_joined"):
            return
        ieee = (data.get("data") or {}).get("ieee_address")
        if ieee:
            self._on_announce(str(ieee))

    @callback
    def _topic(self, msg: Any) -> None:
        rest = msg.topic[len(self.base) + 1 :]
        if rest in self.names:
            self._message(self.names[rest], msg.payload, bool(getattr(msg, "retain", False)))
        elif rest.endswith(AVAILABILITY) and rest[: -len(AVAILABILITY)] in self.names:
            self._availability(self.names[rest[: -len(AVAILABILITY)]], msg.payload)

    def _message(self, ieee: str, payload: Any, retained: bool = False) -> None:
        data = self._json(payload)
        if not isinstance(data, dict):
            return
        # Den Zeitstempel der Bridge nur glauben, wenn die Option an ist – sonst schickt Zigbee2MQTT
        # den zuletzt gespeicherten (eingefrorenen) Wert immer wieder mit
        seen = parse_last_seen(data.get("last_seen")) if self.last_seen_enabled else None
        if seen is not None:
            # Zeitstempel der Bridge ist exakt – auch ein Echo trägt den alten Wert
            self._on_seen(ieee, seen, True)
        elif not self.in_echo_window and not retained:
            # Gespeicherte Nachrichten (retain) kommen beim Abonnieren alle auf einmal – das ist kein Lebenszeichen
            self._on_seen(ieee, time.time(), False)

    def _availability(self, ieee: str, payload: Any) -> None:
        data = self._json(payload)
        state = data.get("state") if isinstance(data, dict) else data
        if state in ("online", "offline"):
            self._on_availability(ieee, state == "online")
