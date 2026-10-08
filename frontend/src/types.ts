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
}

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
  };
  battery_types: string[];
  chemistries: string[];
}

/** Antwort, solange der Pulse-Eintrag nicht geladen ist (z. B. beim Neuladen der Integration). */
export interface NotLoaded {
  loaded: false;
  battery_types: string[];
  chemistries: string[];
}

export type SnapshotMessage = Snapshot | NotLoaded;
