# Pulse – Panel

Gilt zusätzlich zur `CLAUDE.md` im Repo-Stamm.

**Panel** (`frontend/src/`): Lit, ein Element pro Datei (`pulse-*.ts`), `static properties` + `declare`, keine
Decorators. Optik „Puls“ (Richtung C): Kopf = Zeichen + „Pulse“ + Reiter mit Unterstrich (`pulse-segmented`)
Übersicht/Geräte/Mitteilungen/Einstellungen (`/pulse`, `/pulse/devices`, `/pulse/settings`, `/pulse/options`; beide letzten
`pulse-settings` mit `page` notify|options, Einstellungen = Netzgeräte + Zigbee2MQTT; Reiterleiste wischt bei Platzmangel); Übersicht = große Schlagzeile
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
`pulse.seenVersion`; bei jedem Release WHATS_NEW ersetzen). Anzeige-Logik in `logic.ts` (getestet). Texte nur in `strings-<sprache>.ts` (en, de, fr, es, nl – neue Schlüssel immer in allen fünf; Server-Sätze: `texts.py` de/en + `texts_i18n.py` fr/es/nl, `translations/*.json`). Farben aus
HA-Theme-Variablen (`styles.ts`, Akzent `--pulse-accent`). `www/pulse-panel.js` ist Build-Ausgabe.
Schlagzeile stellt Probleme vorn („3 Geräte / brauchen dich.“ rot/orange, „7 von 10 im Takt.“ darunter,
Verlauf nur wenn alle im Takt; `hero().tone/sub`). Zeiten über `formatWhen(…, now)`: heute nur Uhrzeit, < 6 Tage
Wochentag, sonst Datum. Begriffe: Ausgefallen/Prüfen (= „Braucht dich“), Im Blick, Im Takt, Nicht überwacht.
Stille aus `silence_start`/`strays` (Rückfall: eigene `silentIndex`-Rechnung), Stille-Linie spart `no_data` aus
(`subtractSpans`). Neue Gründe `radio_only`, `battery_missing`, `startup_waiting`, `cloud_outage` (Cloud-Geräte nie
Einzelalarm: grau, „Im Blick“, Sammelhinweis aus `summary.cloud_outages`). Vorhersage nur als grober Bereich
(`forecastText`), Einkaufsliste aus `summary.due_batteries` (`dueLine`), Batterie-Kachel antippbar (Filter
`battery`), wichtige Geräte mit Stern + Filter `important`. Funk-Zähler (`pulse/enable_z2m_health`) und
Zigbee-Lebenszeichen auch unter Einstellungen → Zigbee2MQTT, nur nach Rückfrage. Partner-Vorschläge im Detail
(`pulse/device {partner}` / `pulse/partner_suggestion_dismiss`). Abo-Fehler: letzter Stand bleibt + Hinweis.
Panel-Version kommt aus `manifest.json` (vite.config) – nach dem Versionssprung neu bauen.
