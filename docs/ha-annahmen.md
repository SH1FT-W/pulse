# HA-Annahmen

<!-- Vorlage aus repo-vorlagen/vorlagen/ha-annahmen.md. Liegt im Repo als docs/ha-annahmen.md.
     Der HA-Beta-Bericht (repo-vorlagen/ha-beta-bericht.md) gleicht diese Liste jeden Monat mit den
     Neuerungen der HA-Beta ab. Nur festhalten, was bei einer Änderung in HA still kaputtginge. -->

Worauf sich dieses Repo bei Home Assistant verlässt. Bei jeder Änderung am Code mitpflegen.

**Getestet mit:** HA 2026.10, 2026.11.0b1 · **Mindestversion:** siehe `hacs.json` / `manifest.json`

## Annahmen

| Annahme | Wo im Code | Abgesichert durch |
|---|---|---|
| `EVENT_STATE_REPORTED` kommt bei gleichem Wert erneut (Lebenszeichen ohne Änderung), mit `event_filter` | `monitor.py` `_state_reported` | `tests/test_integration.py` |
| `DeviceEntry.config_entry_id` (ab 2026.10), davor die Menge `config_entries` | `discovery.py` `_entry_ids` | `tests/test_integration.py` (Discovery) |
| Batterie = `sensor` bzw. `binary_sensor` mit `device_class: battery`; Erreichbarkeit = `binary_sensor` `connectivity` derselben Integration | `discovery.py` `discover` | `tests/test_reachable.py`, `tests/test_mains_templates.py` |
| Hauptintegration eines Geräts = `platform` mit den meisten Entitäten (Fremde wie powercalc/template zählen nicht) | `discovery.py` `discover` | `tests/test_mains_templates.py` |
| Netzgeräte: `DeviceEntry.entry_type` (Dienst) und `RegistryEntry.entity_category`; Lampen/Steckdosen gehen bei Ausfall auf `unavailable` | `discovery.py`, `monitor.py` `_check_availability` | `tests/test_mains_learned.py` |
| Von Hand hinzugefügte Geräte: „nicht erreichbar“ = alle entscheidenden Entitäten `unavailable` (Media-Player `idle`/`off`/`playing` ist da); Router-`device_tracker` meldet offline als `not_home` mit `source_type` ≠ `gps`; `DeviceEntry.entry_type` kennzeichnet Dienste | `discovery.py` `_manual`, `monitor.py` `_offline` | `tests/test_manual_devices.py` |
| Labels hängen an `DeviceEntry.labels` und `RegistryEntry.labels` | `discovery.py` | `tests/test_labels.py` |
| Kind-Geräte (`DeviceRegistry.child_devices`, `ChildDeviceEntry.parent_device_id`, ab 2026.11 von Tuya, Z-Wave, ESPHome, MQTT, Reolink genutzt) sind Teile ihres Elterngeräts: ihre Entitäten liefert `async_entries_for_device(parent)` nicht, Pulse rechnet sie dem Elterngerät zu | `discovery.py` `discover` | `tests/test_child_devices.py` |
| Recorder: `history.get_significant_states` und `statistics_during_period` (Executor) | `history.py` | `tests/test_z2m_history.py` (Verlauf), `tests/test_v11.py` (Statistik) |
| Push nur über `notify.mobile_app_*`, Aktionen über Ereignis `mobile_app_notification_action` | `notifier.py` | `tests/test_integration.py` |
| HA schreibt beim Start jeden Zustand neu (Neustart-Echos) | `rhythm.py` `restart_echoes` | `tests/test_reachable.py` |

## Fremde Integrationen

Integrationen, deren Entitäten oder Attribute dieses Repo liest (Domain, was genau, wo):

- `mqtt` / Zigbee2MQTT: Themen `<base>/bridge/devices|info|state|event|health` und `<base>/#`, Feld `last_seen` (`z2m.py`).
- `matter`: Gerät gilt als erreichbar, solange es nicht `unavailable` ist (`discovery.py` `reachable_via`).
- `govee` (Govee-Cloud, eigene Integration): Lampe wird `unavailable`, Konnektivitäts-Sensor bleibt dabei „on“, Diagnose-Sensoren melden weiter (`monitor.py` `_check_availability`, `tests/test_mains_templates.py`).
- Konnektivitäts-Sensoren fremder Integrationen bei von Hand hinzugefügten Geräten: Übersetzungsschlüssel/Entity-ID mit `attach`, `cloud`, `wan`, `mop` … sagen nichts über die Erreichbarkeit (Roborock `mop_attached`, Shelly `cloud`, IOmeter `attachment_status`; `discovery.py` `NOT_REACHABILITY`).
- `powercalc`, `template` u. a. (`const.py` `HELPER_PLATFORMS`): hängen eigene Entitäten an fremde Geräte, zählen nie als deren Integration.
- Cloud-Integrationen aus `const.py` `CLOUD_INTEGRATIONS` (Netatmo u. a.): nur Wertänderungen zählen.

## Prüfbefehl

Befehl, der die Annahmen gegen eine bestimmte HA-Version prüft (`HA_VERSION=beta` o. ä.), oder „keiner“:

```sh
LC_ALL=en_US.UTF-8 TZ=UTC ~/Software/recall/.venv/bin/python -m pytest -q -p no:logging
```
