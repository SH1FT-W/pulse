"""Batterie-Wissen: Typen bekannter Modelle und Wechsel-Erkennung – ohne HA-Abhängigkeit."""

from __future__ import annotations

from dataclasses import dataclass

NIMH = "nimh"
ALKALINE = "alkaline"
LITHIUM = "lithium"
CHEMISTRIES = (NIMH, ALKALINE, LITHIUM)

BATTERY_TYPES = ("AAA", "AA", "CR2032", "CR2450", "CR2477", "CR123A", "CR1632", "9V", "LR44")


@dataclass(frozen=True)
class BatteryInfo:
    type: str
    count: int
    chemistry: str | None = None


# Nur Modelle, deren Batterie sicher bekannt ist. Schlüssel: Hersteller-Teil, Modell-Teil (klein geschrieben).
# IKEA liefert diese Sensoren für die LADDA-Akkus (NiMH) aus.
LIBRARY: tuple[tuple[str, str, BatteryInfo], ...] = (
    ("ikea", "parasoll", BatteryInfo("AAA", 1, NIMH)),
    ("ikea", "badring", BatteryInfo("AAA", 1, NIMH)),
    ("ikea", "vallhorn", BatteryInfo("AAA", 3, NIMH)),
    ("eve", "eve motion", BatteryInfo("AA", 2, ALKALINE)),
)


def lookup(manufacturer: str | None, model: str | None) -> BatteryInfo | None:
    maker = (manufacturer or "").lower()
    name = (model or "").lower()
    for maker_part, model_part, info in LIBRARY:
        if maker_part in maker and model_part in name:
            return info
        # Matter-Geräte melden den Hersteller manchmal nur im Modellnamen
        if not maker and model_part in name:
            return info
    return None


def level_trusted(chemistry: str | None) -> bool:
    """NiMH hält die Spannung bis kurz vor leer – der Prozentwert sagt dann nichts."""
    return chemistry != NIMH


# Spannungssprung, der als Wechsel zählt: relativ UND absolut – NiMH-Rauschen (1,2 ↔ 1,3 V) und
# Zigbee2MQTTs erst gerundete, dann genaue Spannung nach einem Neustart zählen nie
VOLTAGE_JUMP_REL = 0.15
VOLTAGE_JUMP_ABS = 150.0  # mV
LEVEL_JUMP = 25
LEVEL_JUMP_FROM = 75


def is_replacement(
    old_level: float | None,
    new_level: float | None,
    old_voltage: float | None,
    new_voltage: float | None,
) -> bool:
    """Ein Sprung nach oben, den keine normale Schwankung erklärt."""
    if (
        old_level is not None
        and new_level is not None
        and old_level <= LEVEL_JUMP_FROM
        and new_level - old_level >= LEVEL_JUMP
    ):
        return True
    return bool(
        old_voltage is not None
        and new_voltage is not None
        and old_voltage > 0
        and new_voltage - old_voltage >= VOLTAGE_JUMP_ABS
        and (new_voltage - old_voltage) / old_voltage >= VOLTAGE_JUMP_REL
    )


def shopping_list(items: list[BatteryInfo]) -> str:
    """„2× AAA, 1× CR2032“ – gleiche Typen zusammengezählt."""
    totals: dict[str, int] = {}
    for info in items:
        totals[info.type] = totals.get(info.type, 0) + info.count
    return ", ".join(f"{count}× {kind}" for kind, count in sorted(totals.items(), key=lambda kv: (-kv[1], kv[0])))


# Schwellen der Statuslogik – Übersicht, Mitteilung und Status sagen dasselbe
LEVEL_LOW = 10  # Prüfen
LEVEL_SOON = 20  # Beobachten / „bald fällig“
