/** Was der Server über `pulse/subscribe` schickt (siehe monitor.py → snapshot()). */

export type Status = 'ok' | 'learning' | 'watch' | 'check' | 'failed';
export type Level = 'now' | 'daily' | 'off';

export interface Battery {
  level: number | null;
  /** Nur ein Warn-Sensor („Batterie schwach“ an/aus) – `low` ist sein Zustand */
  flag: boolean;
  low: boolean;
  /** in mV (der Server rechnet V → mV um) */
  voltage: number | null;
  type: string | null;
  count: number | null;
  chemistry: string | null;
  trusted: boolean;
  replaced: number[];
  entity: string | null;
  /** Laufzeit-Vorhersage (1.1); null/fehlend = keine möglich */
  forecast?: Forecast | null;
  /** Warum keine Vorhersage (nur wenn forecast null und das Gerät Prozent meldet) */
  forecast_reason?: ForecastReason | null;
  /** Batterie-Entität seit … dauerhaft nicht verfügbar, der Rest meldet (Grund `battery_missing`) */
  missing_since?: number | null;
  /** Gerät meldet „schwach“, der Prozentwert widerspricht */
  flag_conflict?: boolean;
}

export interface Forecast {
  days_min: number;
  days_max: number;
  /** Mitte des Bereichs (Zeitstempel) */
  until: number;
  /** Verbrauch in Prozentpunkten je Woche */
  rate_per_week: number;
  threshold: number;
}

export type ForecastReason = 'too_short' | 'flat' | 'coarse' | 'untrusted' | 'noisy';

export interface PartnerSuggestion {
  id: string;
  name: string;
  /** 0..1 */
  score: number;
  /** gemeinsame Ereignisse */
  together: number;
}

export interface DueBattery {
  id: string;
  name: string;
  type: string | null;
  count: number | null;
  until: number | null;
}

export interface CloudOutage {
  integration: string;
  count: number;
  since: number | null;
}

export interface Device {
  id: string;
  name: string;
  area: string | null;
  manufacturer: string | null;
  model: string | null;
  integration: string;
  icon: string;
  status: Status;
  reason: string;
  reason_key: string | null;
  critical: boolean;
  critical_auto: boolean;
  critical_manual: boolean | null;
  ignored: boolean;
  /** Set by an HA label (pulse_important / pulse_ignore); the panel switch is locked then */
  label: 'important' | 'ignore' | null;
  /** Beta: mains-powered, no battery (only with the setting `mains_beta`) */
  mains?: boolean;
  last_activity: number | null;
  /**
   * Ab hier zählt die Stille: letzte Meldung oder ein späterer manueller Wechsel. Fehlt bei älteren
   * Servern – dann gilt last_activity (siehe silenceStart() in logic.ts).
   */
  silence_from?: number | null;
  typical: number | null;
  samples: number;
  unavailable_since: number | null;
  battery: Battery;
  partner: string | null;
  partner_name: string | null;
  snooze_until: number | null;
  /** Genau 12 Fenster je Kalendertag (Fensterlänge = Tageslänge / 12); Tag i = strip[12i : 12i + 12] */
  strip: (number | null)[];
  zigbee: boolean;
  exact: boolean;
  /** Beginn der Stille nach der Ausreißer-Regel (letzte regelmäßige Meldung, 1.1) */
  silence_start?: number | null;
  /** Vereinzelte Meldungen seit `silence_start` (0 = echte Stille) */
  strays?: number;
  /** Cloud-Gerät (Takt = Abfragetakt der Cloud) */
  cloud?: boolean;
  /** Funkt (Z2M-Health-Zähler steigt), schickt aber keine Werte */
  radio_only?: boolean;
  /** Höchstens 3, nur ohne gesetzten Partner */
  partner_suggestions?: PartnerSuggestion[];
}

export interface Settings {
  targets: string[] | null;
  levels: { failed: Level; check: Level; battery: Level };
  summary_time: string;
  quiet: { enabled: boolean; start: string; end: string };
  critical_alerts: boolean;
  arrive_home: { enabled: boolean; persons: string[] };
  recovered: boolean;
  z2m_base: string;
  /** Beta: also watch mains-powered devices */
  mains_beta?: boolean;
  /** Own notification texts; null = Pulse's sentence (`template_defaults`) */
  templates?: Partial<Record<TemplateKey, string | null>>;
}

export type TemplateKind = 'failed' | 'check' | 'battery' | 'recovered';
export type TemplateKey = `${TemplateKind}_${'title' | 'message'}`;

export interface Snapshot {
  loaded?: true;
  now: number;
  strip_start: number;
  /** Echte lokale Mitternächte (HA-Zeitzone), strip_days + 1 Einträge; der letzte = Ende von heute */
  day_starts?: number[];
  strip_days: number;
  bucket_hours: number;
  /** Zeiten ohne Daten (Pulse/HA lief nicht) im 7-Tage-Fenster: [von, bis] in Sekunden */
  no_data?: [number, number][];
  language: string;
  bootstrapped: boolean;
  devices: Device[];
  summary: {
    total: number;
    problems: number;
    watch: number;
    learning: number;
    next_battery: string | null;
    low_batteries?: string[];
    /** Fällig in den nächsten 8 Wochen (Vorhersage + schwach) */
    due_batteries?: DueBattery[];
    cloud_outages?: CloudOutage[];
  };
  settings: Settings;
  targets: string[];
  persons: string[];
  z2m: {
    present: boolean;
    last_seen: boolean;
    availability: boolean;
    version: string | null;
    devices: number;
    requested_at: number | null;
    /** Health-Prüfung in Zigbee2MQTT aktiv (Zähler kommen an) */
    health?: boolean;
    health_requested_at?: number | null;
  };
  battery_types: string[];
  chemistries: string[];
  /** Pulse's own notification sentences as templates, in the language of the notifications */
  template_defaults?: Record<TemplateKey, string>;
  template_vars?: string[];
}

/** Antwort, solange der Pulse-Eintrag nicht geladen ist (z. B. beim Neuladen der Integration). */
export interface NotLoaded {
  loaded: false;
  battery_types: string[];
  chemistries: string[];
}

export type SnapshotMessage = Snapshot | NotLoaded;
