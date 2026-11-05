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
| `DeviceEntry.identifiers` sind Tupel beliebiger Länge (nicht immer Paare: `hvv_departures` legt 4-Tupel an); Pulse liest nur Element 0 und 1 | `discovery.py` `ieee_of` | `tests/test_identifiers.py` |
| Labels hängen an `DeviceEntry.labels` und `RegistryEntry.labels` | `discovery.py` | `tests/test_labels.py` |
| Kind-Geräte (`DeviceRegistry.child_devices`, `ChildDeviceEntry.parent_device_id`, ab 2026.11 von Tuya, Z-Wave, ESPHome, MQTT, Reolink genutzt) sind Teile ihres Elterngeräts: ihre Entitäten liefert `async_entries_for_device(parent)` nicht, Pulse rechnet sie dem Elterngerät zu | `discovery.py` `discover` | `tests/test_child_devices.py` |
| Recorder: `history.get_significant_states` und `statistics_during_period` (Executor) | `history.py` | `tests/test_z2m_history.py` (Verlauf), `tests/test_v11.py` (Statistik) |
| Push nur über `notify.mobile_app_*`, Aktionen über Ereignis `mobile_app_notification_action`; höchstens 3 Aktionen je Mitteilung (Android zeigt nicht mehr) | `notifier.py` | `tests/test_integration.py`, `tests/test_mains_templates.py` |
| HA-MQTT (Zigbee2MQTT) entfernt ein Gerät nach dem Löschen nur, wenn keine aktivierte Entität mehr daran hängt – auch fremde wie Pulses zählen (`mqtt/util.py` `async_cleanup_device_registry`); eine nicht geladene Integration behält ihre Registry-Einträge. Zigbee2MQTT (Umbenennen mit neuen Entity-IDs, Discovery aus/an) und ESPHome entfernen alle Entitäten eines Geräts und legen sie binnen Sekunden einzeln neu an. Darum: Gerät noch in der Registry, aber nicht mehr gefunden → Pulse entfernt seine Entitäten erst nach `CLEANUP_GRACE` (1 Std., `time.monotonic`), bei Nutzeraktionen nur für die betroffenen Geräte sofort (Netzgeräte bei der Beta, das von Hand gewählte); das leere Gerät selbst bleibt (löscht der Nutzer) | `monitor.py` `_remove_vanished` | `tests/test_integration.py` `test_device_without_own_entities_loses_pulse_entities`, `test_entities_recreated_quickly_keep_pulse_entities`, `test_helper_entity_left_still_waits`, `test_user_action_spares_unrelated_waiting_device`, `test_unloaded_integration_keeps_pulse_entities` |
| Deaktiviertes Gerät: HA deaktiviert auch fremde Entitäten daran (`disabled_by=device`) und aktiviert beim Wiederaktivieren nur vorhandene; gelöschte kommen aus `deleted_entities` mit `disabled_by=device` zurück und bleiben aus. Darum räumt Pulse deaktivierte Geräte nicht auf | `monitor.py` `_remove_vanished` | `tests/test_integration.py` `test_disabled_device_keeps_pulse_entities_for_return` |
| Gerät umbenannt (`name`/`name_by_user`) oder Entitäts-Registereintrag geändert (Name, Symbol, Bereich, Aliase …): HA schreibt den Zustand der Entitäten sofort neu – mit neuem `friendly_name`/`icon` als `state_changed` mit gleichem Wert, sonst als `state_reported`. `DeviceEntry.modified_at` und `RegistryEntry.modified_at` sind dann gerade erst gesetzt; der Recorder speichert die Zeile mit nur geänderten Attributen. Darum zählt gleicher Wert mit nur Metadaten-Attributen (`history.py` `METADATA`) oder binnen `REGISTRY_ECHO` (2 s) nach einer Registeränderung nicht als Lebenszeichen. `modified_at` steigt auch bei Änderungen durch Integrationen (sw_version, capabilities): eine gleichwertige Meldung in diesen 2 s geht verloren (hingenommen). Beim Nachlesen nicht erkannt: Registeränderung an einer `force_update`-Entität ohne Namensänderung (Zeile identisch) und Einheitenwechsel (Wert ändert sich mit). Gleicher Wert mit `force_update` ist ein neuer Zustand (`last_changed == last_updated`, wie die Startzeile und wie eine neu angelegte Entität nach geänderter Entity-ID) und zählt; reine Attribut-Zeilen haben `last_changed < last_updated`. Nur solche lösen das Lesen mit Attributen aus, höchstens bei `ATTRIBUTE_ROWS` (30) solcher Zeilen und `ATTRIBUTE_READ_MAX` (2000) Zeilen insgesamt; Thermostate und gesprächige Sensoren werden nicht nachgelesen (eine Zeile mehr ändert dort nichts). Offen: Entity-ID geändert zählt beim Nachlesen nach Neustart (Recorder hängt die neue Zeile ohne Leerzeile an, von `force_update` nicht unterscheidbar), live nicht | `monitor.py` `_state_changed_now`, `_state_reported_now`, `_registry_echo`; `history.py` `real_reports`, `same_value_rows` | `tests/test_registry_echo.py` |
| HA schreibt beim Start jeden Zustand neu (Neustart-Echos) | `rhythm.py` `restart_echoes` | `tests/test_reachable.py` |

## Fremde Integrationen

Integrationen, deren Entitäten oder Attribute dieses Repo liest (Domain, was genau, wo):

- `mqtt` / Zigbee2MQTT: Themen `<base>/bridge/devices|info|state|event|health` und `<base>/#`, Feld `last_seen` (`z2m.py`).
- `matter`: Gerät gilt als erreichbar, solange es nicht `unavailable` ist (`discovery.py` `reachable_via`).
- `govee` (Govee-Cloud, eigene Integration): Lampe wird `unavailable`, Konnektivitäts-Sensor bleibt dabei „on“, Diagnose-Sensoren melden weiter (`monitor.py` `_check_availability`, `tests/test_mains_templates.py`).
- Konnektivitäts-Sensoren fremder Integrationen bei von Hand hinzugefügten Geräten: Übersetzungsschlüssel/Entity-ID mit `attach`, `cloud`, `wan`, `mop` … sagen nichts über die Erreichbarkeit (Roborock `mop_attached`, Shelly `cloud`, IOmeter `attachment_status`; `discovery.py` `NOT_REACHABILITY`). Gilt seit 26.10.16 auch für automatisch gefundene Geräte, dazu Sensoren für die Verbindungsart `ethernet`, `wifi`, `vpn` (`tests/test_local_media.py`).
- `smlight`: Konnektivitäts-Sensoren `ethernet` (standardmäßig an), `wifi`, `vpn` (standardmäßig aus) und `internet`, alle Diagnose; ein SLZB im WLAN hat `ethernet` aus. Sonst nur Diagnose-Sensoren und Einstellungs-Schalter (`const.py` `MAINS_INTEGRATIONS`, `tests/test_local_media.py`).
- `esphome`: Sprachassistenten (Voice PE) bringen einen `media_player` mit; Geräte mit Media-Player aus lokalen Hardware-Integrationen sind Netzgeräte (`discovery.py` `_automatic`, `tests/test_local_media.py`).
- `powercalc`, `template` u. a. (`const.py` `HELPER_PLATFORMS`): hängen eigene Entitäten an fremde Geräte, zählen nie als deren Integration.
- Cloud-Integrationen aus `const.py` `CLOUD_INTEGRATIONS` (Netatmo u. a.): nur Wertänderungen zählen.

## Prüfbefehl

Befehl, der die Annahmen gegen eine bestimmte HA-Version prüft (`HA_VERSION=beta` o. ä.), oder „keiner“:

```sh
LC_ALL=en_US.UTF-8 TZ=UTC ~/Software/recall/.venv/bin/python -m pytest -q -p no:logging
```
