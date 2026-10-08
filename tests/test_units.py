"""Batterie-Wissen, Texte, Zeitfenster, Zeitstempel von Zigbee2MQTT."""

from custom_components.pulse.battery import (
    BatteryInfo,
    is_replacement,
    level_trusted,
    lookup,
    shopping_list,
)
from custom_components.pulse.notifier import in_window
from custom_components.pulse.texts import every, reason_text, since, text
from custom_components.pulse.z2m import parse_last_seen


def test_lookup_known_models_only():
    assert lookup("IKEA of Sweden", "PARASOLL door/window sensor") == BatteryInfo("AAA", 1, "nimh")
    assert lookup("IKEA", "VALLHORN wireless motion sensor") == BatteryInfo("AAA", 3, "nimh")
    assert lookup(None, "Eve Motion 20EBY9901") == BatteryInfo("AA", 2, "alkaline")
    assert lookup("Aqara", "WSDCGQ11LM") is None


def test_replacement_detection():
    assert is_replacement(20, 100, None, None)
    assert not is_replacement(90, 100, None, None)  # war nicht leer
    assert not is_replacement(50, 60, None, None)
    assert is_replacement(None, None, 1120, 1400)
    assert not is_replacement(None, None, 1300, 1320)
    assert not is_replacement(None, None, 0, 1300)


def test_level_trust_and_shopping_list():
    assert not level_trusted("nimh")
    assert level_trusted(None)
    items = [BatteryInfo("AAA", 1), BatteryInfo("CR2032", 1), BatteryInfo("AAA", 3)]
    assert shopping_list(items) == "4× AAA, 1× CR2032"
    assert shopping_list([]) == ""


def test_texts_de_en():
    assert every("de", 1800) == "alle 30 Minuten"
    assert every("de", 3600) == "jede Stunde"
    assert every("en", 3 * 86400) == "every 3 days"
    assert every("de", 86400) == "alle 24 Stunden"
    assert since("de", 5 * 86400) == "5 Tagen"
    assert since("de", 86400 * 2) == "2 Tagen"
    assert since("de", 60) == "einer Minute"
    assert since("en", 3600) == "an hour"
    assert text("en", "push_test") == "Pulse test notification"
    reason = {"key": "silent", "params": {"since": 5 * 86400, "every": 1800}}
    assert reason_text("de", reason) == "Seit 5 Tagen still. Meldet sich sonst etwa alle 30 Minuten."
    assert reason_text("en-GB", reason) == "Silent for 5 days. Usually reports every 30 minutes."


def test_quiet_window():
    assert in_window(23 * 60, 22 * 60, 7 * 60 + 30)
    assert in_window(6 * 60, 22 * 60, 7 * 60 + 30)
    assert not in_window(12 * 60, 22 * 60, 7 * 60 + 30)
    assert in_window(12 * 60, 9 * 60, 17 * 60)
    assert not in_window(12 * 60, 9 * 60, 9 * 60)


def test_parse_last_seen():
    assert parse_last_seen("2026-10-03T12:00:00+02:00") == 1791021600.0
    assert parse_last_seen(1791021600000) == 1791021600.0
    assert parse_last_seen(1791021600) == 1791021600.0
    assert parse_last_seen("kaputt") is None
    assert parse_last_seen(True) is None
    assert parse_last_seen(None) is None
    assert parse_last_seen("2026-10-03T12:00:00") is not None


def test_entry_ids_old_and_new_device_registry():
    """HA ≤ 2026.9: Menge `config_entries`; ab 2026.10: ein `config_entry_id` (die Menge ist veraltet)."""
    from types import SimpleNamespace

    from custom_components.pulse.discovery import _entry_ids

    assert _entry_ids(SimpleNamespace(config_entries={"a", "b"})) == {"a", "b"}
    assert _entry_ids(SimpleNamespace(config_entry_id="a", config_entries={"a"})) == {"a"}
    assert _entry_ids(SimpleNamespace(config_entry_id=None)) == set()
