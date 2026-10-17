"""Gespeichertes: Meldungen, Einstellungen pro Gerät, Mitteilungs-Einstellungen."""

from __future__ import annotations

import copy
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store

from .const import DEFAULT_SETTINGS, STORE_KEY, STORE_MINOR, STORE_VERSION

SAVE_DELAY = 60
# Meldungen kommen laufend: sie dürfen länger warten (beim Stoppen wird ohnehin sofort gespeichert)
SAVE_DELAY_EVENTS = 600


def default_record() -> dict[str, Any]:
    return {
        "events": [],
        "actions": [],
        "ignored": False,
        "critical": None,  # None = automatisch
        "battery_type": None,
        "battery_count": None,
        "chemistry": None,
        "partner": None,
        "replaced": [],
        "replaced_source": [],  # je Wechsel: manual / auto / announce
        "pending_jump": None,  # Batteriesprung, der sich bei der nächsten echten Meldung bestätigen muss
        "snooze_until": None,
        "last_level": None,
        "last_voltage": None,
        "notified": None,
        "notified_before_replace": None,  # für „Rückgängig“ nach „Batterie gewechselt“
        "told": False,  # eine Problem-Mitteilung wurde wirklich zugestellt (nicht nur vorgemerkt)
        "first_seen": None,
        "partner_dismissed": [],  # verworfene Partner-Vorschläge (Geräte-IDs)
        "battery_missing_since": None,  # Batterie-Entität ohne Wert seit
    }


def merge_settings(base: dict[str, Any], update: dict[str, Any]) -> dict[str, Any]:
    """Teil-Update in die Einstellungen mischen (eine Ebene tief für Unterobjekte)."""
    result = copy.deepcopy(base)
    for key, value in update.items():
        if key not in DEFAULT_SETTINGS:
            continue
        default = DEFAULT_SETTINGS[key]
        if isinstance(value, dict) and isinstance(result.get(key), dict) and isinstance(default, dict):
            result[key] = {**result[key], **{k: v for k, v in value.items() if k in default}}
        else:
            result[key] = value
    return result


class _VersionedStore(Store[dict[str, Any]]):
    async def _async_migrate_func(
        self, old_major_version: int, old_minor_version: int, old_data: dict[str, Any]
    ) -> dict[str, Any]:
        return migrate(old_minor_version, old_data)


def migrate(old_minor: int, data: dict[str, Any]) -> dict[str, Any]:
    """Speicher auf den aktuellen Stand bringen (nur Minor-Versionen, rückwärts lesbar)."""
    if old_minor < 3:
        # Bis 1.2 wurde nicht gespeichert, woher ein Wechsel kam – und nach Neustarts wurden Wechsel
        # fälschlich erkannt. Alte Einträge verwerfen; ab jetzt mit Quelle.
        for record in data.get("devices", {}).values():
            record["replaced"] = []
            record["replaced_source"] = []
            record["pending_jump"] = None
    if old_minor < 4:
        # Bis 1.3 wurden Volt-Sensoren (z. B. ZHA) als Volt gespeichert – ab jetzt immer mV
        for record in data.get("devices", {}).values():
            if (volt := record.get("last_voltage")) is not None and volt < 100:
                record["last_voltage"] = volt * 1000
        # Heimkommen: eine Person → Liste
        arrive = data.get("settings", {}).get("arrive_home")
        if isinstance(arrive, dict) and "person" in arrive:
            person = arrive.pop("person")
            arrive["persons"] = [person] if person else []
    if old_minor < 6:
        # 1.1: verworfene Partner-Vorschläge, Batterie fehlt seit, gemeldete Cloud-Ausfälle
        for record in data.get("devices", {}).values():
            record.setdefault("partner_dismissed", [])
            record.setdefault("battery_missing_since", None)
        data.setdefault("cloud_notified", {})
        data.setdefault("z2m_health_at", None)
    return data


class PulseStore:
    def __init__(self, hass: HomeAssistant) -> None:
        self._hass = hass
        self._store: Store[dict[str, Any]] = _VersionedStore(hass, STORE_VERSION, STORE_KEY, minor_version=STORE_MINOR)
        self.devices: dict[str, dict[str, Any]] = {}
        self.settings: dict[str, Any] = copy.deepcopy(DEFAULT_SETTINGS)
        self.z2m_enabled_at: float | None = None
        # Eigene Laufzeit: [Start, zuletzt gesehen] je Lauf – zeigt im Panel, wann Pulse keine Daten hatte
        self.uptime: list[list[float]] = []
        # Tag (ISO) der zuletzt geschickten Tageszusammenfassung – und einer noch zurückgehaltenen
        self.summary_sent: str | None = None
        self.summary_pending: str | None = None
        # Cloud-Integrationen, deren Ausfall schon gemeldet ist (Integration → seit)
        self.cloud_notified: dict[str, float] = {}
        self.z2m_health_at: float | None = None
        # Ein verzögertes Speichern steht an – nicht erneut planen (HA würde es sonst immer weiter schieben)
        self._save_pending = False
        self._save_due: float | None = None

    async def async_load(self) -> None:
        data = await self._store.async_load()
        if not data:
            return
        for device_id, record in data.get("devices", {}).items():
            self.devices[device_id] = {**default_record(), **record}
        self.settings = merge_settings(copy.deepcopy(DEFAULT_SETTINGS), data.get("settings", {}))
        self.z2m_enabled_at = data.get("z2m_enabled_at")
        self.uptime = [list(span) for span in data.get("uptime", []) if len(span) == 2]
        self.summary_sent = data.get("summary_sent")
        self.summary_pending = data.get("summary_pending")
        self.cloud_notified = dict(data.get("cloud_notified") or {})
        self.z2m_health_at = data.get("z2m_health_at")

    def record(self, device_id: str) -> dict[str, Any]:
        if device_id not in self.devices:
            self.devices[device_id] = default_record()
        return self.devices[device_id]

    def async_delay_save(self, delay: float = SAVE_DELAY) -> None:
        """Spätestens nach `delay` Sekunden speichern.

        HAs `Store.async_delay_save` verschiebt ein anstehendes Speichern bei jedem Aufruf nach hinten –
        Pulse ruft es bei jeder Meldung, im Betrieb würde nie gespeichert. Deshalb nur neu planen, wenn
        nichts ansteht oder das Anstehende später käme als jetzt gewünscht; der Stand wird erst beim
        Schreiben gelesen. Meldungen warten länger (SAVE_DELAY_EVENTS), Einstellungen kurz (SAVE_DELAY).
        """
        due = self._hass.loop.time() + delay
        if self._save_pending and self._save_due is not None and self._save_due <= due:
            return
        self._save_pending = True
        self._save_due = due
        self._store.async_delay_save(self._write_data, delay)

    def _write_data(self) -> dict[str, Any]:
        self._save_pending = False
        self._save_due = None
        return self._data()

    async def async_save(self) -> None:
        self._save_pending = False
        self._save_due = None
        await self._store.async_save(self._data())

    def _data(self) -> dict[str, Any]:
        return {
            "devices": self.devices,
            "settings": self.settings,
            "z2m_enabled_at": self.z2m_enabled_at,
            "uptime": self.uptime,
            "summary_sent": self.summary_sent,
            "summary_pending": self.summary_pending,
            "cloud_notified": self.cloud_notified,
            "z2m_health_at": self.z2m_health_at,
        }

    async def async_remove(self) -> None:
        """Integration entfernt: nichts liegen lassen (Meldungen, Einstellungen, Wechsel-Historie)."""
        await self._store.async_remove()
