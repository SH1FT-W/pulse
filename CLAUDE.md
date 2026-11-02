# Pulse – Projektregeln

Home-Assistant-Integration (Python) + Seitenleisten-Panel (Lit). Pulse überwacht Batteriegeräte **rein passiv**:
es hört nur zu (Zustände, „gemeldet ohne Änderung“, Zigbee2MQTT-Nachrichten) und fragt nie ein Gerät ab.

## Aufbau

**Python** (`custom_components/pulse/`) – ein Eintrag „Pulse“ (single_config_entry):

- `__init__.py` Einstieg (Store laden, Monitor starten, Plattformen, Panel), `config_flow.py` ein Klick.
- `monitor.py` = der Wächter: Geräte finden (`discovery.py`), Meldungen sammeln (State-Events, state_reported,
  `z2m.py`), aus dem Recorder lernen (`history.py`), jede Minute bewerten, Reparatur-Hinweise, Ereignisse,
  Snapshot fürs Panel. Neustart-Echos zählen nie (Wert direkt nach unavailable/unknown, Z2M-Bridge-Neustart).
- Reine Logik ohne HA, hier zuerst testen: `rhythm.py` (Takt lernen, Grenzen, Status mit Begründung,
  Rhythmusleiste), `battery.py` (Bibliothek nur sicherer Modelle, Wechsel-Erkennung, Einkaufsliste),
  `texts.py` (Sätze de/en – Panel, Push und Reparatur sagen dasselbe), `forecast.py` (Laufzeit-Vorhersage),
  `partners.py` (Partner-Vorschläge). `snapshot.py` baut Snapshot/serialize fürs Panel (aus `monitor.py` ausgelagert).
- Stille: ein Bezugspunkt `silence_start` + `strays` (`rhythm.silence_start`, Ausreißer-Regel: nach einer Lücke
  ≥ max(6 h, 3× Takt, längster Abstand) zählen ≤ 2 vereinzelte Meldungen nicht – zwei im üblichen Takt = läuft
  wieder; eine echte Aktion nach der Lücke oder „Batterie gewechselt“ beendet die Stille sofort). Gilt für Status, `silent_since`, Texte
  (`silent_strays`) und Panel. HA-Pausen (Lücken in `store.uptime` ≥ `UPTIME_SLACK`) zählen nie als Stille
  (`Facts.downtime`); bis der eigene Takt seit dem Start um ist: `startup_waiting` (watch, keine Mitteilung).
- Cloud-Geräte (`CLOUD_INTEGRATIONS`, `DeviceSpec.cloud`): nur echte Wertänderungen sind Lebenszeichen (kein
  state_reported), einzeln erst nach ≥ 1 Tag `failed`; größte Gruppe ≥ 2 Geräte derselben Cloud, deren Stille im
  2-h-Fenster begann → `cloud_outage` (watch; hält, solange seine Geräte still sind) + eine gedämpfte Mitteilung (`store.cloud_notified`), `summary.cloud_outages`.
- Erreichbarkeit von der Integration (`DeviceSpec.reachable_via`: `"matter"` oder Konnektivitäts-binary_sensor derselben
  Integration, `spec.connectivity`): ist das Gerät laut Integration erreichbar (`Facts.reachable`) und meldet nur bei
  Ereignissen (längster normaler Abstand > `REGULAR_LONGEST` 3 h oder kein Takt), zählt Stille gar nicht (`ok_reachable`;
  ein Lecksensor hat ohne Wasser nichts zu melden). Meldet es regelmäßig von selbst (Präsenzmelder), zählt Stille weiter,
  aber als `radio_only` (höchstens check: erreichbar, schickt aber keine Werte). Konnektivität aus →
  `unavailable_since`; der Sensor selbst ist kein Lebenszeichen (nicht in `spec.entities`).
- Neustart-Zeilen im Recorder: HA schreibt beim Start jeden Zustand neu → `rhythm.restart_echoes` (erste Zeile je Start
  in [Start − 2 Min., Start + 5 Min.] nach einer früheren) zählt in `history.real_reports` nicht.
- Batterie: Warn-Sensor neben Prozent (`spec.battery_low`) an → `battery_low_flag` gewinnt (`battery.flag_conflict`);
  Batterie-Entität ≥ 24 h ohne Wert, Rest meldet → `battery_missing` (`record["battery_missing_since"]`).
  Vorhersage einmal am Tag (`_async_daily`, nach Bootstrap): Stundenmittel der Langzeitstatistik
  (`history.load_forecasts`, Recorder-Executor) ab letztem Wechsel → `device.forecast` bzw. `forecast_reason`;
  `notifier.due_soon` = Einkaufsliste (8 Wochen), löst die Zusammenfassung aber nur bei jetzt fälliger Batterie aus.
- Partner-Vorschläge (gleicher Lauf, letzte 7 Tage, ≤ 300 Aktionen je Gerät): Aktionen ≤ 120 s zusammen, ≥ 3× an
  ≥ 2 Tagen, Wert ≥ 0,8 (anderer Raum × 0,75), max. 3; „Batterie gewechselt“ löscht die Vorhersage; verworfene in
  `record["partner_dismissed"]` (`pulse/partner_suggestion_dismiss`).
- Batteriewechsel (`_check_battery`): nur aus echten Übergängen (alter + neuer Zustand real, kein Echo, nicht in den
  ersten 5 Min. nach HA-Start), Sprung muss sich bei einer späteren echten Meldung bestätigen (`pending_jump`,
  ≥ `MERGE_SECONDS` später – nicht dieselbe Funknachricht; bewertet wird nur die gerade meldende Entität);
  Spannung ≥ 15 % UND ≥ 150 mV. Neuanmeldung zählt nur nach echter Stille, nicht im Bridge-Echo. Quelle je Wechsel in
  `replaced_source`. Mitteilung nur bei vorherigem Problem/schwacher Batterie, gesammelt (3 Min.), ≥ 3 in 10 Min. eine
  gemeinsame, > 3 keine (Neustart-Artefakt).
- Zeiten ohne Daten (`no_data`): eigene Laufzeit (`store.uptime`), davor Lücken ≥ 3 h ohne jede Meldung (nur mit
  gesprächigen Geräten) – Panel schraffiert sie in Leisten und Kalender.
- Zigbee2MQTT (`z2m.py`): ein Abo `<base>/#` (Namen mit `/`), `last_seen` aus Nachrichten nur, wenn die Bridge-Option
  an ist (sonst schickt Z2M einen eingefrorenen Stempel mit). Basis-Thema `z2m_base` im Panel einstellbar.
  Echos: Fenster `ECHO_WINDOW` 180 s nach „online“; bis 10 Min. nach „online“/Abo-Start zusätzlich Echo, wenn (Option
  an) `last_seen` nicht neuer als der bekannte ist bzw. (Option aus) die Nachricht Wort für Wort der letzten gleicht.
  Neuer Stempel ist nie ein Echo; Umschalten der Option leert die Stempel.
  Ein erkanntes Echo gilt auch für HAs Entitäten derselben Nachricht (`echo_marked`; State-Events von Z2M-Geräten
  werden dafür per `call_soon` nach dem MQTT-Durchlauf ausgewertet). `bridge/health` (Z2M 2.x, passiv): steigt der
  Nachrichtenzähler ≥ 2× mindestens 15 Min. nach der letzten Meldung (die eigene Wert-Nachricht zählt mit) und
  frisch (< Watch-Grenze) → `radio_only` (höchstens check, nie failed; kein Lebenszeichen für die Stille).
  Spannung immer in mV (`_millivolts`, Volt-Sensoren werden umgerechnet).
- Nach „Batterie gewechselt“ zählt die Stille ab dem Wechsel (`silence_from`, auch im Snapshot), Status „wartet auf
  die erste Meldung“ (`waiting_first`, watch); Rückgängig stellt `notified` wieder her (`notified_before_replace`).
- Tagespause (`rhythm.daily_quiet`, `Rhythm.quiet`): Median des längsten Abstands je 24-h-Scheibe (ab 3 vollen Tagen); `Rhythm.span` = max(longest, quiet) zählt für `limits` und die Ausreißer-Regel, „regelmäßig“ (`REGULAR_LONGEST`) bleibt am Perzentil `longest`. Grund: Lichtsensoren sind nachts still.
- Takt je Gerät aus `RhythmCache` (neu gelernt nur bei neuen Meldungen). Meldungen werden auf eine je 120 s
  ausgedünnt (`THIN_SECONDS`, `MAX_EVENTS` 6000 = 7 Tage auch für BLE). Rhythmusleiste: 12 Fenster je Kalendertag.
- Start/Stopp: `_stopped` + `_z2m_lock` – ein Neuladen während des Starts hinterlässt keinen zweiten Wächter/Listener.
- Symbol (`discovery.icon_for`): erst normale Entitäten, dann alle (Diagnose-Chiptemperatur ≠ Thermometer, Techem-Rauchmelder
  mit Rauch als Diagnose-Entität bleibt Rauchmelder); Kamera → `mdi:cctv`. Grund bei Ausfall: gleich schwer → „nicht erreichbar“
  schlägt Stille (`rhythm.SILENCE_KEYS`).
- Entitäten schreiben nur bei Änderung (`PulseEntity._handle_update`); Attribute stabil (`reason_key`, `silent_since` –
  bei `unavailable`/`unavailable_usual` der Ausfallbeginn, `unavailable_since`),
  keine laufend wechselnden Sätze. Lesen (Panel, `pulse/subscribe`, `pulse/heartbeat`) für alle, Schreiben nur Admins.
- Sturm-Bremse: während `_tick` sammelt der Notifier Problem-Mitteilungen (`async_begin_tick`/`async_end_tick`);
  ab `PROBLEM_BURST_MIN` (3) im selben Takt eine gemeinsame, nie kritische (`push_burst` bei still/weg, sonst
  `push_burst_mixed`; Batterie-Gründe immer einzeln). Wartende gemeinsame kennen ihre Geräte (`device_ids`/`members`):
  `_waiting`/`_drop_queued` sehen sie, Erholung nimmt das Gerät heraus (bleibt eins, kommt dessen eigene). `notified` ohne `told`
  = eingereiht, aber nie zugestellt (Warteschlange ist flüchtig) → nach Neustart erneut einreihen. Erholung ohne
  beobachteten Übergang (`_evaluate`, `announce=False`/vor Bootstrap) → `notifier.forget` löscht die Merker.
  Zusammenfassung: `store.summary_pending` (Tag) solange sie zurückgehalten wird, Nachholen bis `SUMMARY_WINDOW`.
- Warn-Batteriesensoren (binary_sensor, nur an/aus): `battery_flag` in Facts, Grund `battery_low_flag`, kein
  Prozentwert (`_battery_percent` = None, Snapshot `battery.flag/low`). `BATTERY_REASONS` = Stufe „Batterie“.
- Begründungen in Nutzersprache: `pulse/subscribe {language}` → `snapshot(language)`; das Panel abonniert bei
  Sprachwechsel neu. Zeitformat aus `hass.locale.time_format` (`timeFormatOf`, `formatWhen`).
- Zigbee2MQTT nicht da beim Start (Broker langsam): `_tick` versucht es alle `Z2M_RETRY` (5 Min.) erneut.
- Kind-Geräte (`DeviceRegistry.child_devices`, ab HA 2026.11 Tuya-Kanäle, Z-Wave-Endpunkte, Objektive …): `discover` rechnet ihre
  Entitäten und Labels dem Elterngerät zu, sie werden nie eigene Pulse-Geräte (abgeschaltete Kinder zählen nicht).
- Labels (`LABEL_IMPORTANT`/`LABEL_IGNORE` an Gerät oder Entität, auch eigenen) → `spec.label`, schlägt den Panel-Schalter
  (Panel sperrt ihn), `pulse_ignore` schlägt `pulse_important`; Label-Wechsel → `_reobserve` wie Ignorieren per Schalter.
- Beta Netzgeräte (`settings.mains_beta`, Standard an): `discover(mains=True)` nimmt Geräte ohne Batterie: kein
  Dienst-Gerät (`entry_type`), Hauptintegration (meiste Entitäten ohne `HELPER_PLATFORMS` wie template/powercalc) ist
  eine lokale Hardware-Integration (`MAINS_INTEGRATIONS`, auch ohne Lampe: BLE-Proxy, Zigbee-Router) oder gibt ihm eine
  `MAINS_DOMAINS`-Entität ohne entity_category (jede Integration, z. B. Govee-Cloud, Chihiros) (MQTT nur mit IEEE =
  Z2M), `spec.mains`. Erreichbar: nur `spec.main_entities` zählen (`MAINS_DOMAINS` ohne entity_category; Diagnose-Sensoren
  und Einstellungs-Schalter bleiben bei Govee da, Konnektivität bleibt „on“), Meldungen heben „unavailable“ nicht auf und zählen währenddessen nicht als Lebenszeichen (`_activity`;
  manche Integrationen schreiben bei jedem Abruf alle Entitäten neu); beim Start entfernt `_async_learn_outages`
  gespeicherte Meldungen aus Ausfallzeiten (`rhythm.without_spans`). Ausfall = alle entscheidenden Entitäten gleichzeitig
  `unavailable` (`rhythm.device_outages`; Netzgerät: `main_entities`, sonst Konnektivität, sonst alle); nur `unavailable`
  ist weg, `unknown` ist da (Sirene!). Löschen laufender Ausfälle nur, wenn das Gerät jetzt nicht erreichbar ist.
  Abrufe allgemein erkennen (Gleichschritt, iot_class) geht nicht: kleine Integrationen nicht trennbar, ZHA meldet
  `local_polling`. Bewertung: nicht regelmäßig →
  `ok_mains`, Stille zählt nicht, nur `unavailable`; regelmäßig (≤ `REGULAR_LONGEST`) → Stille zählt normal.
  Gelernte Erreichbarkeit: `record["outages"]` ([Start, Ende] ≥ `OUTAGE_MIN`, live in `_reachable_again`, beim Start aus
  dem Recorder `history.async_load_outages`; ein noch laufender Ausfall (`history.running_outage`) setzt
  `unavailable_since` auf den echten Beginn vor dem Neustart – für jedes beim Start nicht erreichbare Gerät, auch
  Batteriegeräte (`_gone_now`); gemerkt in `_gone_before`, `_mark_unavailable` nutzt ihn auch für spätere
  Z2M-„offline“; Beginn im Neustart-Fenster zählt nicht), ≥ `OUTAGE_HABIT` in `KEEP_DAYS` ohne HA-Pause und nicht im Neustart-Fenster
  (`rhythm.near_start`: Integration lädt; ein vor dem Neustart begonnener Ausfall kommt mit echtem Start aus dem Recorder)
  → `rhythm.usual_outage`;
  dann weg = `unavailable_usual` (watch), erst > max(2× längster, 1 Tag) `unavailable` check, nie failed.
  Push ohne „Batterie gewechselt“. Ausschalten → `_remove_vanished` entfernt die Entitäten.
- Wichtiges Gerät nicht erreichbar: „Prüfen“ nach `settings.important_unreachable_minutes` (2/5/10/20, Standard 10,
  `IMPORTANT_UNREACHABLE_CHOICES`, `Facts.critical_unreachable`), „Ausgefallen“ bleibt bei 1 Std., normale Geräte 20 Min./2 Std. (#4).
- `problem_since` am Status-Sensor (`record["problem_since"]`/`problem_of` = „status|reason“, `monitor._track_problem`):
  seit wann Pulse das aktuelle Problem meldet, übersteht Neustarts; ein nicht beobachteter Beginn (erste Bewertung nach
  Start/Update) nimmt `silent_since`. Casoras Glocke nimmt es als Zeitpunkt (sonst zählte ein Ausfall als schon gelesen).
- Von Hand hinzugefügte Geräte: `settings.manual_devices` (Liste von device_ids, kein Minor nötig – neuer
  Einstellungs-Schlüssel mit Vorgabe), nur über `pulse/manual_device {device_id, add}` änderbar (nicht über `pulse/settings`),
  Auswahl `pulse/manual_candidates` (= `discovery.candidates`: alles, was der Hand-Weg baut und noch nicht überwacht ist).
  `discover(manual=…)`: erst der automatische Weg (`_automatic`, darf sich dadurch
  nie ändern), nur wenn der ablehnt `_manual` (`spec.manual`, `mains=True`, Batterie ignoriert): unabhängig von
  `mains_beta`, umgeht EXCLUDED_DOMAINS und Medien-Zubehör, nicht `EXCLUDED_PLATFORMS`/Dienste/Helfer. Entitäten aller
  Nicht-Helfer-Integrationen; Erreichbarkeit = Konnektivitäts-Sensor (ohne `NOT_REACHABILITY`: mop/attach/cloud/wan …) oder
  Router-`device_tracker` (`spec.offline_state` „not_home“, GPS zählt nie: `monitor._offline`, `_reachable` „home“);
  `main_entities` = `MANUAL_DOMAINS` (Kamera, Media-Player, Sauger …), sonst MAINS_DOMAINS + remote, sonst leer (= alle).
  Grund `ok_manual`, Panel: Einstellungen → „Von Hand hinzugefügt“ (`pulse-add-sheet.ts`, Chip/Notiz im Detail),
  Netzgeräte-Zähler/Filter ohne Hand-Geräte. Neu hinzugefügt + bootstrapped → `async_bootstrap({id})` liest nur dessen Verlauf.
- Mehr Geräte von selbst: Media-Player einer `MAINS_INTEGRATIONS`-Integration (ESPHome Voice PE) = Netzgerät,
  `main_entities` = Media-Player (nur wenn das einzige ausgeschlossene Domain `media_player` ist und keine Batterie), `smlight` in
  `MAINS_INTEGRATIONS`; `NOT_REACHABILITY` auch ethernet/wifi/wlan/vpn (SLZB im WLAN: ethernet aus).
  Offen: Z2M-Geräte ohne eingeschaltete Entität (`if not own: continue`, auch nicht von Hand wählbar).
- Eigene Texte (`settings.templates`, je `TEMPLATE_KEYS` None = Standard): `notifier.compose` → `texts.render`
  (Platzhalter `TEMPLATE_VARS`, leere Werte verschwinden samt „ · “, `{area}` leer, wenn schon im Namen).
  Standard = `template_defaults(Sprache der Mitteilungen)`, im Snapshot `template_defaults`/`template_vars`.
- `notifier.py` = Mitteilungen (Stufen sofort/täglich/aus, Ruhezeit mit Nachliefern – je Gerät nur die neueste,
  Problem + „läuft wieder“ in derselben Nacht heben sich auf, außer es kam vorher schon eine an (`told`); wichtige Geräte
  „Prüfen“ sofort, kritisch nur bei Ausfall; Zusammenfassung wartet Ruhezeit/Heimkommen ab (mehrere Personen); Tag der Zusammenfassung in `store.summary_sent`, kritisch für wichtige
  Geräte, erst beim Heimkommen, keine Wiederholungen über `record["notified"]`, Aktionen aus der App).
- `store.py` (.storage/pulse.devices: Meldungen, Einstellungen pro Gerät, Mitteilungs-Einstellungen; Minor 8: `outages`).
  `async_delay_save` plant nur, wenn nichts ansteht (HA verschiebt sonst bei jedem Aufruf – es wurde nie gespeichert).
  Nicht mehr überwachte Geräte (noch in der Registry, auch ganz ohne eigene Entitäten – MQTT löscht ein Gerät nicht, solange Pulse-Entitäten daran hängen) erst nach `CLEANUP_GRACE` (1 Std., Z2M/ESPHome legen Entitäten kurz neu an; `_vanished_since`, `_tick` schaut nach), bei Nutzeraktionen nur für die betroffenen Geräte sofort (`at_once`); deaktivierte Geräte nie (HA brächte die Entitäten sonst deaktiviert zurück): Pulse-Entitäten
  entfernen, Datensatz gekürzt behalten, `SIGNAL_REMOVED_DEVICES` → Plattformen vergessen sie (kommen neu wieder).
  Snapshot fürs Abo einmal je Update und Sprache (`snapshot_cached`).
  `entity.py`/`binary_sensor.py`/`sensor.py` (Entitäten hängen über `device_entry` am Gerät der anderen
  Integration – kein eigenes Gerät pro Sensor), `services.py`, `ws.py`, `panel.py`.

**Panel** (`frontend/src/`): Lit. Aufbau, Optik und Begriffe stehen in `frontend/CLAUDE.md` (lädt automatisch,
sobald Claude dort arbeitet).

## Regeln

- **Nie ein Gerät abfragen oder Funkverkehr auslösen.** Einzige Schreibzugriffe: Z2M-Bridge-Optionen
  `last_seen` + `availability` (`pulse/enable_z2m`) und die Health-Prüfung `health` (`pulse/enable_z2m_health`) –
  beides nur nach Bestätigung im Panel; die Bridge veröffentlicht dann nur eigene Stempel/Zähler.
- TypeScript strict, kein `any`, keine `as`-Casts (außer `as const`), keine IIFEs.
- Vor „fertig“: im Frontend `corepack yarn typecheck && corepack yarn test && corepack yarn check && corepack yarn build`;
  in Python `pytest` (Abdeckung ≥ 95 %), `uvx ruff@0.16.9 check . && uvx ruff@0.16.9 format --check .` (dieselbe
  Version wie in ci.yml), `uvx mypy@2.3.1 --python-executable <venv>/bin/python`,
  `python tools/pruefe-uebersetzungen.py` (strings.json gegen translations/*.json), hassfest per Docker.
- Tests laufen mit der Recall-venv: `LC_ALL=en_US.UTF-8 TZ=UTC ~/Software/recall/.venv/bin/python -m pytest -q -p no:logging`.
- UI im eigenen Docker-Test-HA `pulse-test` (Port 8126, siehe ~/pulse-test/ZUGANG.txt) ansehen.
  flode-test, casora-test, evenlight-test gehören anderen Projekten.
- unique_ids nicht ändern (`<device_id>_problem|status|last_report`, Hub `<entry_id>_problems|monitored`). Entity-IDs
  werden nach dem Gerät vorgeschlagen (`binary_sensor.<gerät>_pulse_problem`, `entity.py` add_to_platform_start);
  schon registrierte behalten ihre ID (HA stellt auch gelöschte mit gleicher unique_id wieder her).
- Speicherformat nur über Minor-Version ändern. Nichts ungefragt ins Produktiv-HA kopieren, nicht ungefragt committen.

## Release

- Versionen `YY.M.N` nur über `tools/next-version` (Regeln in der globalen CLAUDE.md), nie führende Nullen.
- Version gleich in `custom_components/pulse/manifest.json` und `frontend/package.json`, Panel danach neu bauen
  (Version kommt über vite.config ins Panel), CHANGELOG-Abschnitt `## <version> – <datum>`, WHATS_NEW in
  `pulse-welcome.ts` (zeigt sich einmal pro Version).
- Tag und Release-Titel ohne „v“ (`gh release create 26.10.4 --title "26.10.4"`), Notizen englisch.
