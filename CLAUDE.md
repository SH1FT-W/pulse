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
  `texts.py` (Sätze de/en – Panel, Push und Reparatur sagen dasselbe).
- Batteriewechsel (`_check_battery`): nur aus echten Übergängen (alter + neuer Zustand real, kein Echo, nicht in den
  ersten 5 Min. nach HA-Start), Sprung muss sich bei der nächsten echten Meldung bestätigen (`pending_jump`);
  Spannung ≥ 15 % UND ≥ 150 mV. Neuanmeldung zählt nur nach echter Stille, nicht im Bridge-Echo. Quelle je Wechsel in
  `replaced_source`. Mitteilung nur bei vorherigem Problem/schwacher Batterie, gesammelt (3 Min.), ≥ 3 in 10 Min. eine
  gemeinsame, > 3 keine (Neustart-Artefakt).
- Zeiten ohne Daten (`no_data`): eigene Laufzeit (`store.uptime`), davor Lücken ≥ 3 h ohne jede Meldung (nur mit
  gesprächigen Geräten) – Panel schraffiert sie in Leisten und Kalender.
- Zigbee2MQTT (`z2m.py`): ein Abo `<base>/#` (Namen mit `/`), `last_seen` aus Nachrichten nur, wenn die Bridge-Option
  an ist (sonst schickt Z2M einen eingefrorenen Stempel mit). Basis-Thema `z2m_base` im Panel einstellbar.
  Spannung immer in mV (`_millivolts`, Volt-Sensoren werden umgerechnet).
- Nach „Batterie gewechselt“ zählt die Stille ab dem Wechsel (`silence_from`, auch im Snapshot), Status „wartet auf
  die erste Meldung“ (`waiting_first`, watch); Rückgängig stellt `notified` wieder her (`notified_before_replace`).
- Takt je Gerät aus `RhythmCache` (neu gelernt nur bei neuen Meldungen). Meldungen werden auf eine je 120 s
  ausgedünnt (`THIN_SECONDS`, `MAX_EVENTS` 6000 = 7 Tage auch für BLE). Rhythmusleiste: 12 Fenster je Kalendertag.
- Start/Stopp: `_stopped` + `_z2m_lock` – ein Neuladen während des Starts hinterlässt keinen zweiten Wächter/Listener.
- Entitäten schreiben nur bei Änderung (`PulseEntity._handle_update`); Attribute stabil (`reason_key`, `silent_since`),
  keine laufend wechselnden Sätze. Lesen (Panel, `pulse/subscribe`, `pulse/heartbeat`) für alle, Schreiben nur Admins.
- Sturm-Bremse: während `_tick` sammelt der Notifier Problem-Mitteilungen (`async_begin_tick`/`async_end_tick`);
  ab `PROBLEM_BURST_MIN` (3) im selben Takt eine gemeinsame, nie kritische (`push_burst`). `notified` ohne `told`
  = eingereiht, aber nie zugestellt (Warteschlange ist flüchtig) → nach Neustart erneut einreihen. Erholung ohne
  beobachteten Übergang (`_evaluate`, `announce=False`/vor Bootstrap) → `notifier.forget` löscht die Merker.
  Zusammenfassung: `store.summary_pending` (Tag) solange sie zurückgehalten wird, Nachholen bis `SUMMARY_WINDOW`.
- Warn-Batteriesensoren (binary_sensor, nur an/aus): `battery_flag` in Facts, Grund `battery_low_flag`, kein
  Prozentwert (`_battery_percent` = None, Snapshot `battery.flag/low`). `BATTERY_REASONS` = Stufe „Batterie“.
- Begründungen in Nutzersprache: `pulse/subscribe {language}` → `snapshot(language)`; das Panel abonniert bei
  Sprachwechsel neu. Zeitformat aus `hass.locale.time_format` (`timeFormatOf`, `formatWhen`).
- Zigbee2MQTT nicht da beim Start (Broker langsam): `_tick` versucht es alle `Z2M_RETRY` (5 Min.) erneut.
- `notifier.py` = Mitteilungen (Stufen sofort/täglich/aus, Ruhezeit mit Nachliefern – je Gerät nur die neueste,
  Problem + „läuft wieder“ in derselben Nacht heben sich auf, außer es kam vorher schon eine an (`told`); wichtige Geräte
  „Prüfen“ sofort, kritisch nur bei Ausfall; Zusammenfassung wartet Ruhezeit/Heimkommen ab (mehrere Personen); Tag der Zusammenfassung in `store.summary_sent`, kritisch für wichtige
  Geräte, erst beim Heimkommen, keine Wiederholungen über `record["notified"]`, Aktionen aus der App).
- `store.py` (.storage/pulse.devices: Meldungen, Einstellungen pro Gerät, Mitteilungs-Einstellungen),
  `entity.py`/`binary_sensor.py`/`sensor.py` (Entitäten hängen über `device_entry` am Gerät der anderen
  Integration – kein eigenes Gerät pro Sensor), `services.py`, `ws.py`, `panel.py`.

**Panel** (`frontend/src/`): Lit, ein Element pro Datei (`pulse-*.ts`), `static properties` + `declare`, keine
Decorators. Optik „Puls“ (Richtung C): Kopf = Zeichen + „Pulse“ + Reiter mit Unterstrich (`pulse-segmented`)
Übersicht/Geräte/Mitteilungen (`/pulse`, `/pulse/devices`, `/pulse/settings`); Übersicht = große Schlagzeile
(`hero`/`heroSentences` in `logic.ts`), „Dein Tag mit Pulse“ (`pulse-dayband`), Monitor mit einer Rhythmusleiste je
Gerät (`pulse-rhythm`: bricht bei Stille ab, rot gestrichelt + „Seit X still“; „Im Takt“ ab 12 Geräten nach Raum
einklappbar), Detail mit Herzschlag-Kalender (`pulse-heartbeat`, Daten per `pulse/heartbeat`, 15-min-Fenster je Kalendertag
ab `day_starts` (Zeitumstellung: 92/100 Fenster) aus `BinCache` – nur bei neuer Meldung/neuem Tag neu gerechnet) und Partner-Vergleich. Dunkel leuchten die Leisten
(`--pulse-glow`). Systemschrift, Container-Queries für schmale Panels, Pillen-Knöpfe + ⋮ (`ha-dropdown`),
Listen als iOS-Inset-Listen (`.section`/`.list`/`.row` in `styles.ts`; Schalter-Zeilen sind als Ganzes tippbar,
`.row.tappable`), Auswahl rechts in Zeilen über `pulse-picker` (ha-dropdown mit Haken; ab 13 Einträgen ein Blatt, das
beim gewählten Wert steht – z. B. Uhrzeiten 24 h). `pulse-sheet` = Blatt (Desktop Dialog, Handy Bottom-Sheet mit
Wischen, Seite dahinter gesperrt). Dunkel setzt das Panel `[dark]` → erhöhte Flächen (`--pulse-sheet-*`, `--pulse-raised`).
Eine Akzentfarbe: das Panel überschreibt `--primary-color` und HAs Schalter-Farben mit Pulse-Violett. Touch-Ziele
≥ 44 px über `--pu-hit`, Hover nur unter `@media (hover: hover)`. Zigbee-Lebenszeichen nur nach Rückfrage
(Blatt im Panel), „Batterie gewechselt“ mit Rückgängig (`pulse/replaced_undo`, schließt das Blatt, sonst läge es
über HAs Hinweis). Kopf ohne Hauptaktion; ⋮ in der App-Leiste. Willkommen/„Neu in Pulse“ in `pulse-welcome.ts` + `welcome.ts` (localStorage
`pulse.seenVersion`; bei jedem Release WHATS_NEW ersetzen). Anzeige-Logik in `logic.ts` (getestet). Texte nur in `strings-de.ts`/`strings-en.ts`. Farben aus
HA-Theme-Variablen (`styles.ts`, Akzent `--pulse-accent`). `www/pulse-panel.js` ist Build-Ausgabe.

## Regeln

- **Nie ein Gerät abfragen oder Funkverkehr auslösen.** Einziger Schreibzugriff: Z2M-Bridge-Optionen
  `last_seen` + `availability` – nur nach Bestätigung im Panel.
- TypeScript strict, kein `any`, keine `as`-Casts (außer `as const`), keine IIFEs.
- Vor „fertig“: im Frontend `corepack yarn typecheck && corepack yarn test && corepack yarn check && corepack yarn build`;
  in Python `pytest` (Abdeckung ≥ 95 %), `uvx ruff check . && uvx ruff format --check .`,
  `uvx mypy@2.3.1 --python-executable <venv>/bin/python`, hassfest per Docker.
- Tests laufen mit der Evenlight-venv (gleiche HA-Version): `~/Software/evenlight/.venv/bin/python -m pytest -q -p no:logging`.
- UI im eigenen Docker-Test-HA `pulse-test` (Port 8126, siehe ~/pulse-test/ZUGANG.txt) ansehen.
  flode-test, casora-test, evenlight-test gehören anderen Projekten.
- unique_ids nicht ändern (`<device_id>_problem|status|last_report`, Hub `<entry_id>_problems|monitored`). Entity-IDs
  werden nach dem Gerät vorgeschlagen (`binary_sensor.<gerät>_pulse_problem`, `entity.py` add_to_platform_start);
  schon registrierte behalten ihre ID (HA stellt auch gelöschte mit gleicher unique_id wieder her).
- Speicherformat nur über Minor-Version ändern. Nichts ungefragt ins Produktiv-HA kopieren, nicht ungefragt committen.
