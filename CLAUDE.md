# Pulse – Projektregeln

Home-Assistant-Integration (Python) + Seitenleisten-Panel (Lit). Pulse überwacht Batteriegeräte **rein passiv**:
es hört nur zu (Zustände, „gemeldet ohne Änderung“, Zigbee2MQTT-Nachrichten) und fragt nie ein Gerät ab.

## Aufbau

**Python** (`custom_components/pulse/`) – ein Eintrag „Pulse“ (single_config_entry):

- `__init__.py` Einstieg, `config_flow.py` ein Klick. `monitor.py` = der Wächter: Geräte finden, Meldungen sammeln
  (State-Events, state_reported, Z2M), aus dem Recorder lernen, jede Minute bewerten, Reparatur-Hinweise, Snapshot.
- Reine Logik ohne HA, hier zuerst testen: `rhythm.py` (Takt, Grenzen, Stille, Ausfälle, Status mit Begründung),
  `battery.py`, `replacement.py` (Batteriewechsel), `texts.py` (de/en – Panel, Push und Reparatur sagen dasselbe),
  `forecast.py`, `partners.py`, `snapshot.py`.
- `discovery.py` (welche Geräte: Batterie, Beta Netzgeräte, von Hand; Kind-Geräte zählen zum Elterngerät), `z2m.py`,
  `history.py` (Recorder), `notifier.py` (Mitteilungen), `store.py` (.storage/pulse.devices), `entity.py`/
  `binary_sensor.py`/`sensor.py` (hängen am Gerät der anderen Integration, kein eigenes Gerät), `services.py`,
  `ws.py` (Lesen für alle, Schreiben nur Admins), `panel.py`.

**Panel** (`frontend/src/`): Lit. Aufbau, Optik und Begriffe stehen in `frontend/CLAUDE.md` (lädt automatisch,
sobald Claude dort arbeitet).

## Warum es so ist (steht nicht im Code)

- Neustart-Echos zählen nie als Lebenszeichen: HA schreibt beim Start jeden Zustand neu in den Recorder, Z2M
  wiederholt nach Bridge-Neustart alte Nachrichten. Ohne Bridge-Option `last_seen` schickt Z2M einen eingefrorenen
  Stempel mit; ein neuer Stempel ist nie ein Echo. HA-Pausen zählen nie als Stille.
- Cloud-Geräte: nur echte Wertänderungen sind Lebenszeichen (state_reported kommt vom Abruf). Werden mehrere Geräte
  derselben Cloud gleichzeitig still, ist es ein Cloud-Ausfall mit einer gedämpften Mitteilung.
- Laut Integration erreichbare Ereignisgeräte: Stille zählt nicht – ein Lecksensor hat ohne Wasser nichts zu melden.
- Tagespause im Takt, weil Lichtsensoren nachts still sind.
- Netzgeräte: Abrufe lassen sich nicht allgemein erkennen (kleine Integrationen nicht trennbar, ZHA meldet
  `local_polling`), manche Integrationen schreiben bei jedem Abruf alle Entitäten neu. Darum zählt nur `unavailable`
  als weg; `unknown` ist da (Sirene!).
- Batteriewechsel aus einem kurzen Verlauf je Größe (Prozent, mV; `replacement.py`, Feld-Daten im Docstring), nie
  aus Paaren von Meldungen (26.11.6/7 scheiterten daran, #5): BLE-Ausreißer, Z2M wiederholt den Batteriewert mit
  jeder Nachricht und zeigt nach `unavailable` erst einen alten Wert, manche Geräte schreiben nur bei Änderung.
  Gefüttert wird mit jeder echten Meldung (Änderung, `state_reported`, auch der Wert nach `unavailable`), nie mit
  Neustart-/Registry-Echos; der Minutentakt bestätigt einen gehaltenen Sprung. Gespeichert wird der Zeitpunkt des
  Sprungs, nicht der Bestätigung. > 3 Wechsel in 10 Min. sind ein Neustart-Artefakt (keine Mitteilung).
- `async_delay_save` plant nur, wenn nichts ansteht: HA verschiebt sonst bei jedem Aufruf, es wurde nie gespeichert.
- Aufräumen nicht mehr überwachter Geräte erst nach `CLEANUP_GRACE` (Z2M/ESPHome legen Entitäten kurz neu an),
  deaktivierte Geräte nie (HA brächte die Entitäten deaktiviert zurück). MQTT löscht ein Gerät nicht, solange
  Pulse-Entitäten daran hängen.
- Entitäten schreiben nur bei Änderung, Attribute stabil, keine laufend wechselnden Sätze (Recorder).
- `problem_since` übersteht Neustarts, weil Casoras Glocke es als Zeitpunkt nimmt (sonst zählte ein Ausfall als
  schon gelesen).
- Von Hand hinzugefügte Geräte: der automatische Weg in `discover` darf sich dadurch nie ändern.
- Neuladen während des Starts darf keinen zweiten Wächter/Listener hinterlassen (`_stopped` + `_z2m_lock`).
- Offen: Z2M-Geräte ohne eingeschaltete Entität werden nicht erkannt, auch nicht von Hand wählbar.

## Regeln

- **Nie ein Gerät abfragen oder Funkverkehr auslösen.** Einzige Schreibzugriffe: Z2M-Bridge-Optionen
  `last_seen` + `availability` (`pulse/enable_z2m`) und die Health-Prüfung `health` (`pulse/enable_z2m_health`) –
  beides nur nach Bestätigung im Panel; die Bridge veröffentlicht dann nur eigene Stempel/Zähler.
- TypeScript strict, kein `any`, keine `as`-Casts (außer `as const`), keine IIFEs.
- Vor „fertig“: im Frontend `corepack yarn typecheck && corepack yarn test && corepack yarn check && corepack yarn build`;
  in Python `pytest` (Abdeckung ≥ 95 %), `uvx ruff@0.16.9 check . && uvx ruff@0.16.9 format --check .` (dieselbe
  Version wie in ci.yml), `uvx mypy@2.3.1 --python-executable <venv>/bin/python`,
  `python tools/pruefe-uebersetzungen.py` (strings.json gegen translations/*.json), hassfest per Docker.
- Tests laufen mit der Repo-venv: `LC_ALL=en_US.UTF-8 TZ=UTC .venv/bin/python -m pytest -q -p no:logging`.
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
- Betas: `YY.M.NbK` (z. B. `26.11.11b1`, K ab 1) als GitHub-Vorabversion (`--prerelease`), ohne eigene
  Release-Nummer; das stabile Release danach heißt `YY.M.N`. Alte `-beta.K`-Tags bleiben. (`b` ist PEP 440, HA und
  HACS sortieren es richtig; `frontend/package.json` ist privat und wird nur als Text gelesen.)
- CHANGELOG: neue Einträge oben unter `## Unreleased`, beim Release wird daraus die Versionsüberschrift.
- **Erst Prod, dann Release:** Änderung ins Prod-HA kopieren (`/Volumes/config/custom_components/pulse`, HA-Neustart
  nur nach Rücksprache), warten bis Pulse den Verlauf gelesen hat (1–2 Min.), Status, Log und betroffene Geräte
  prüfen, erst dann releasen; danach die Workflows bis grün beobachten. Die Versionsdatei steht dabei schon auf der
  nächsten Release-Nummer. Ausnahme nur auf Nachfrage: ein kleiner Fix, der nur einen Absturz verhindert (kein neues
  Verhalten), darf direkt raus (so bei 26.11.2, #6).
- **Trockenlauf:** Code, der gespeicherte Daten beim Start löscht, kürzt oder umdeutet (Store-Bereinigung, Migration,
  Zurückdatieren), vor dem Release gegen Daniels echte Prod-Daten trocken laufen lassen (Kopie im Scratchpad, echten
  Repo-Code importieren, ausgeben, was gelöscht würde; DB-Kopie mit `pragma quick_check` prüfen) und das Ergebnis
  nennen. Anlass: 26.10.12 löschte 10 Tage Meldungen einer Kamera, weil eine Sirene normal `unknown` ist.

## Issues

- Commits und PRs nennen Issues mit `Refs #n`, nie `Fixes/Closes/Resolves #n` (GitHub schließt sonst beim Push).
- Status-Labels (`geplant` → `in-arbeit` → `in-beta` → `erledigt` usw.) laut globaler CLAUDE.md selbstständig
  setzen.
- Nach einer Beta: behobene Issues auf `in-beta`, in der Sprache des Melders kommentieren (Link zur Beta, Bitte um
  Rückmeldung, Wiederöffnen erwünscht) und schließen. Nur diese Kommentare ohne Rückfrage, alle anderen erst nach
  Daniels OK. Nach dem stabilen Release auf `erledigt`.
- `docs/ha-annahmen.md` mitpflegen, wenn eine Änderung eine Annahme über HA hinzufügt oder ändert.
