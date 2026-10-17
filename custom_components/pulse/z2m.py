"""Zigbee2MQTT mithören: „zuletzt gesehen“, Verfügbarkeit, Bridge-Neustarts, Neuanmeldungen.

Pulse liest nur mit, was die Bridge ohnehin veröffentlicht. Einzige Schreibzugriffe: auf ausdrücklichen
Wunsch die Bridge-Optionen `last_seen` und `availability` bzw. die Health-Prüfung (`health`) einschalten –
das kostet keine Batterie, weil die Bridge nur eigene Zeitstempel/Zähler veröffentlicht.

Echos: Nach einem Neustart schickt die Bridge zwischengespeicherte Werte noch einmal (in Prod zwei Mal, das
zweite bis zu 142 s später). Sie zählen nie als Lebenszeichen – im Echo-Fenster ohnehin nicht, und danach
nicht, wenn der mitgeschickte `last_seen` nicht neuer ist als der bekannte (sofern sich der Stempel bewegt;
ein eingefrorener Stempel bei ausgeschalteter Option sagt nichts) oder die Nachricht kurz nach dem Neustart
Wort für Wort der letzten gleicht.
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
HEALTH = "bridge/health"
# So lange nach „online“ ist eine Nachricht, die Wort für Wort der letzten gleicht, ein Echo
ECHO_SUSPECT = 10 * 60
# So lange gilt ein erkanntes Echo auch für die Entitäten derselben Nachricht (gleicher Durchlauf)
ECHO_MARK = 2.0


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
        on_radio: Callable[[str, float], None] | None = None,
    ) -> None:
        self.hass = hass
        self.base = base
        self._on_seen = on_seen
        self._on_availability = on_availability
        self._on_announce = on_announce
        self._on_change = on_change
        self._on_radio = on_radio
        self._unsubs: list[Callable[[], None]] = []
        self.names: dict[str, str] = {}  # friendly_name → ieee
        self.present = False
        self.last_seen_enabled = False
        self.availability_enabled = False
        self.version: str | None = None
        self.echo_until = 0.0
        self.online_at: float | None = None
        # Echo-Erkennung je Gerät: letzter bekannter Stempel, ob er sich je bewegt hat, letzte Nachricht
        self._stamps: dict[str, float] = {}
        self.started_at = time.time()
        self._last_payload: dict[str, str] = {}
        self._echo_marks: dict[str, float] = {}
        # Health (Z2M 2.x): Nachrichtenzähler je Gerät
        self.health = False
        self._counters: dict[str, int] = {}

    @property
    def in_echo_window(self) -> bool:
        return time.time() < self.echo_until

    async def async_start(self) -> bool:
        from homeassistant.components import mqtt

        if "mqtt" not in self.hass.config.components:
            return False
        if not await mqtt.async_wait_for_mqtt_client(self.hass):
            return False
        self.started_at = time.time()
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

    def echo_marked(self, ieee: str) -> bool:
        """Gerade ein Echo für dieses Gerät erkannt – gilt auch für HAs Entitäten derselben Nachricht."""
        mark = self._echo_marks.get(ieee)
        return mark is not None and abs(time.time() - mark) < ECHO_MARK

    async def async_enable_health(self) -> None:
        """Health-Prüfung der Bridge einschalten (Z2M 2.x): veröffentlicht Zähler, fragt kein Gerät ab."""
        from homeassistant.components import mqtt

        payload = {"options": {"health": {"interval": 10, "reset_on_check": False}}}
        await mqtt.async_publish(self.hass, f"{self.base}/bridge/request/options", json.dumps(payload))

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
        enabled = advanced.get("last_seen") not in (None, "disable", False)
        if enabled != self.last_seen_enabled:
            self._stamps.clear()  # Option umgeschaltet: alte Stempel sagen nichts mehr
        self.last_seen_enabled = enabled
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
            self.online_at = time.time()
            self.echo_until = self.online_at + ECHO_WINDOW.total_seconds()
            _LOGGER.debug("Zigbee2MQTT online, echo window %ss", ECHO_WINDOW.total_seconds())

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
        if rest == HEALTH:
            self._health(msg.payload)
        elif rest in self.names:
            self._message(self.names[rest], msg.payload, bool(getattr(msg, "retain", False)))
        elif rest.endswith(AVAILABILITY) and rest[: -len(AVAILABILITY)] in self.names:
            self._availability(self.names[rest[: -len(AVAILABILITY)]], msg.payload)

    def _message(self, ieee: str, payload: Any, retained: bool = False) -> None:
        data = self._json(payload)
        if not isinstance(data, dict):
            return
        now = time.time()
        if self._is_echo(ieee, data, now):
            self._echo_marks[ieee] = now
            return
        self._echo_marks.pop(ieee, None)
        # Den Zeitstempel der Bridge nur glauben, wenn die Option an ist – sonst schickt Zigbee2MQTT
        # den zuletzt gespeicherten (eingefrorenen) Wert immer wieder mit
        seen = parse_last_seen(data.get("last_seen")) if self.last_seen_enabled else None
        if seen is not None:
            # Zeitstempel der Bridge ist exakt – auch ein Echo trägt den alten Wert
            self._on_seen(ieee, seen, True)
        elif not self.in_echo_window and not retained:
            # Gespeicherte Nachrichten (retain) kommen beim Abonnieren alle auf einmal – das ist kein Lebenszeichen
            self._on_seen(ieee, now, False)

    def _is_echo(self, ieee: str, data: dict[str, Any], now: float) -> bool:
        """Zwischengespeicherte Nachricht noch einmal geschickt – nur kurz nach „online“ bzw. dem Abo-Start.

        Mit eingeschalteter `last_seen`-Option: Stempel nicht neuer als der bekannte. Ohne (eingefrorener Stempel):
        Wort für Wort dieselbe Nachricht wie zuletzt. Außerhalb des Fensters ist nichts ein Echo (Uhrsprung,
        Option zur Laufzeit umgeschaltet).
        """
        body = json.dumps({k: v for k, v in data.items() if k != "last_seen"}, sort_keys=True, default=str)
        same = self._last_payload.get(ieee) == body
        self._last_payload[ieee] = body
        if self.last_seen_enabled and (stamp := parse_last_seen(data.get("last_seen"))) is not None:
            known = self._stamps.get(ieee)
            self._stamps[ieee] = stamp if known is None else max(known, stamp)
            if known is None or stamp > known:
                return False  # neuer Stempel: sicher eine neue Nachricht
            return self._near_restart(now)
        return same and self._near_restart(now)

    def _near_restart(self, now: float) -> bool:
        return now - max(self.online_at or 0.0, self.started_at) < ECHO_SUSPECT

    def _health(self, payload: Any) -> None:
        """`bridge/health`: Nachrichtenzähler je Gerät – steigt er, funkt das Gerät noch."""
        data = self._json(payload)
        devices = data.get("devices") if isinstance(data, dict) else None
        if not isinstance(devices, dict):
            return
        now = time.time()
        self.health = True
        for key, info in devices.items():
            ieee = self.names.get(str(key), str(key))
            count = info.get("messages") if isinstance(info, dict) else None
            if not isinstance(count, int) or isinstance(count, bool):
                continue
            before = self._counters.get(ieee)
            self._counters[ieee] = count
            # Kleiner geworden = Zähler zurückgesetzt (Neustart): neuer Ausgangswert
            if before is not None and count > before and self._on_radio is not None:
                self._on_radio(ieee, now)

    def _availability(self, ieee: str, payload: Any) -> None:
        data = self._json(payload)
        state = data.get("state") if isinstance(data, dict) else data
        if state in ("online", "offline"):
            self._on_availability(ieee, state == "online")
