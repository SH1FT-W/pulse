/** Anzeige-Logik ohne UI – hier wird getestet. */

import type { HassUser } from './ha';
import { type StringKey, t } from './strings';
import type {
  CloudOutage,
  Device,
  DueBattery,
  Forecast,
  ForecastReason,
  Level,
  Settings,
  Snapshot,
  Status,
} from './types';

/**
 * Merkt sich das letzte Ergebnis und rechnet nur neu, wenn sich ein Argument geändert hat (Vergleich
 * nach Identität). So bekommen Kind-Elemente dieselben Arrays und rendern nicht unnötig neu.
 */
export function memoize<A extends readonly unknown[], R>(fn: (...args: A) => R): (...args: A) => R {
  let last: { args: A; value: R } | null = null;
  return (...args: A): R => {
    if (
      last !== null &&
      last.args.length === args.length &&
      last.args.every((a, i) => Object.is(a, args[i]))
    )
      return last.value;
    const value = fn(...args);
    last = { args, value };
    return value;
  };
}

export const SEVERITY: Record<Status, number> = {
  ok: 0,
  learning: 0,
  watch: 1,
  check: 2,
  failed: 3,
};

export type Tone = 'ok' | 'warn' | 'crit' | 'muted';

export function tone(status: Status): Tone {
  if (status === 'failed') return 'crit';
  if (status === 'check' || status === 'watch') return 'warn';
  if (status === 'learning') return 'muted';
  return 'ok';
}

/** Farbe der Rhythmusleiste: Ignorierte und Geräte einer schweigenden Cloud grau, sonst nach Status. */
export function rhythmTone(device: Device): Tone {
  return device.ignored || isCloudOutage(device) ? 'muted' : tone(device.status);
}

/** Still, weil die Cloud der Integration gerade nicht antwortet (Sammelhinweis statt Einzelalarm). */
export function isCloudOutage(device: Device): boolean {
  return !device.ignored && device.reason_key === 'cloud_outage';
}

export function statusKey(status: Status): StringKey {
  const keys: Record<Status, StringKey> = {
    ok: 'status_ok',
    learning: 'status_learning',
    watch: 'status_watch',
    check: 'status_check',
    failed: 'status_failed',
  };
  return keys[status];
}

export function monitored(devices: Device[]): Device[] {
  return devices.filter((d) => !d.ignored);
}

/** Prüfen + Ausgefallen, schlimmste zuerst (ohne Geräte einer schweigenden Cloud). */
export function attention(devices: Device[]): Device[] {
  return monitored(devices)
    .filter((d) => SEVERITY[d.status] >= 2 && !isCloudOutage(d))
    .sort((a, b) => SEVERITY[b.status] - SEVERITY[a.status] || a.name.localeCompare(b.name));
}

export function watched(devices: Device[]): Device[] {
  return monitored(devices).filter((d) => d.status === 'watch');
}

export interface Group {
  area: string;
  devices: Device[];
}

/** Alle überwachten Geräte nach Raum (Räume alphabetisch, „ohne Raum“ zuletzt). */
export function groups(devices: Device[], noArea: string): Group[] {
  const map = new Map<string, Device[]>();
  for (const device of monitored(devices)) {
    const area = device.area ?? noArea;
    const list = map.get(area) ?? [];
    list.push(device);
    map.set(area, list);
  }
  return [...map.entries()]
    .sort(([a], [b]) => (a === noArea ? 1 : b === noArea ? -1 : a.localeCompare(b)))
    .map(([area, list]) => ({ area, devices: list.sort((a, b) => a.name.localeCompare(b.name)) }));
}

export function ago(language: string, ts: number | null, now: number): string {
  if (ts === null) return t(language, 'unknown');
  const seconds = Math.max(0, now - ts);
  if (seconds < 60) return t(language, 'just_now');
  if (seconds < 3600) return t(language, 'minutes_ago', { n: Math.round(seconds / 60) });
  if (seconds < 86400) return t(language, 'hours_ago', { n: Math.round(seconds / 3600) });
  const days = Math.round(seconds / 86400);
  return days === 1 ? t(language, 'day_ago') : t(language, 'days_ago', { n: days });
}

export function every(language: string, seconds: number | null): string {
  if (seconds === null) return t(language, 'unknown');
  if (seconds < 3600)
    return t(language, 'every_minutes', { n: Math.max(1, Math.round(seconds / 60)) });
  if (seconds < 2 * 86400) return t(language, 'every_hours', { n: Math.round(seconds / 3600) });
  return t(language, 'every_days', { n: Math.round(seconds / 86400) });
}

/** Balkenhöhen 0–1. Ausreißer kappen (90. Perzentil), damit ruhige Geräte nicht verschwinden. */
export function stripHeights(buckets: (number | null)[]): (number | null)[] {
  const values = buckets.filter((b): b is number => b !== null && b > 0).sort((a, b) => a - b);
  if (!values.length) return buckets.map((b) => (b === null ? null : 0));
  const cap = values[Math.min(values.length - 1, Math.floor(values.length * 0.9))] ?? 1;
  return buckets.map((b) => (b === null ? null : Math.min(1, b / cap)));
}

const zoneFormats = new Map<string, Intl.DateTimeFormat>();

/** Formatierer für Datumsteile in einer Zeitzone (ungültige Zone → Zeitzone des Browsers). */
function zoneFormat(timeZone: string | undefined): Intl.DateTimeFormat {
  const key = timeZone ?? '';
  const cached = zoneFormats.get(key);
  if (cached) return cached;
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
  };
  const format = new Intl.DateTimeFormat('en-US', { ...options, ...zoneOption(timeZone) });
  zoneFormats.set(key, format);
  return format;
}

/** Zeitzone von Home Assistant, wenn der Browser sie kennt – sonst undefined (Browser-Zeitzone). */
const knownZones = new Map<string, boolean>();

export function validTimeZone(timeZone: string | undefined): string | undefined {
  if (!timeZone) return undefined;
  let known = knownZones.get(timeZone);
  if (known === undefined) {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone });
      known = true;
    } catch {
      known = false;
    }
    knownZones.set(timeZone, known);
  }
  return known ? timeZone : undefined;
}

/** Gültige Zeitzone für Intl-Optionen (ungültige fallen auf den Browser zurück). */
function zoneOption(timeZone: string | undefined): { timeZone?: string } {
  const zone = validTimeZone(timeZone);
  return zone ? { timeZone: zone } : {};
}

interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

function zoned(ts: number, timeZone: string | undefined): ZonedParts {
  const parts: ZonedParts = { year: 1970, month: 1, day: 1, hour: 0, minute: 0 };
  for (const part of zoneFormat(timeZone).formatToParts(new Date(ts * 1000))) {
    const value = Number(part.value);
    if (part.type === 'year') parts.year = value;
    else if (part.type === 'month') parts.month = value;
    else if (part.type === 'day') parts.day = value;
    else if (part.type === 'hour') parts.hour = value % 24;
    else if (part.type === 'minute') parts.minute = value;
  }
  return parts;
}

/** Kalendertag als Zahl (Tage seit 1970) in der Zeitzone – Differenzen sind sommerzeitfest. */
export function dayNumber(ts: number, timeZone?: string): number {
  const p = zoned(ts, timeZone);
  return Date.UTC(p.year, p.month - 1, p.day) / 86_400_000;
}

/** Uhrzeit als Stunden (0–24) in der Zeitzone, z. B. 18:30 → 18.5. */
export function hourOfDay(ts: number, timeZone?: string): number {
  const p = zoned(ts, timeZone);
  return p.hour + p.minute / 60;
}

/** Tagesgrenzen (strip_days + 1 Mitternächte) – vom Server, sonst gleichmäßig ab strip_start. */
export function dayStartsOf(snapshot: Snapshot): number[] {
  return validDayStarts(snapshot.day_starts, snapshot.strip_start, snapshot.strip_days);
}

function validDayStarts(value: unknown, start: number, days: number): number[] {
  if (
    Array.isArray(value) &&
    value.length === days + 1 &&
    value.every((v, i) => typeof v === 'number' && (i === 0 || v > value[i - 1]))
  )
    return value.filter((v): v is number => typeof v === 'number');
  return Array.from({ length: days + 1 }, (_, i) => start + i * 86400);
}

/** Kurze Wochentage für die Achse (Tagesmitte je Tag); der letzte Tag heißt „heute“. */
export function dayLabels(language: string, dayStarts: number[], timeZone?: string): string[] {
  const format = new Intl.DateTimeFormat(language, { weekday: 'short', ...zoneOption(timeZone) });
  const days = Math.max(0, dayStarts.length - 1);
  return Array.from({ length: days }, (_, i) =>
    i === days - 1
      ? t(language, 'today')
      : format.format(new Date((((dayStarts[i] ?? 0) + (dayStarts[i + 1] ?? 0)) / 2) * 1000))
  );
}

/**
 * Spalten der Achse: gleich breite Tage. Der Server teilt jeden Kalendertag in genau 12 Fenster –
 * auch an der Zeitumstellung (23/25 h) –, also ist jeder Tag in der Leiste gleich breit.
 */
export function axisColumns(dayStarts: number[]): string {
  const days = Math.max(1, dayStarts.length - 1);
  return `repeat(${days}, minmax(0, 1fr))`;
}

/** Fenster je Kalendertag in der Rhythmusleiste (`strip`). */
export const WINDOWS_PER_DAY = 12;

/**
 * Index des Leistenfensters für einen Zeitpunkt (12 je Tag, Fensterlänge = Tageslänge / 12).
 * −1 vor dem ersten Tag, Tage × 12 nach dem letzten.
 */
export function stripIndex(ts: number, dayStarts: number[]): number {
  const days = dayStarts.length - 1;
  const first = dayStarts[0];
  if (days <= 0 || first === undefined || ts < first) return -1;
  for (let i = 0; i < days; i++) {
    const a = dayStarts[i] ?? 0;
    const b = dayStarts[i + 1] ?? a;
    if (ts < b) {
      const size = (b - a) / WINDOWS_PER_DAY;
      return i * WINDOWS_PER_DAY + Math.min(WINDOWS_PER_DAY - 1, Math.floor((ts - a) / size));
    }
  }
  return days * WINDOWS_PER_DAY;
}

/** Zeitpunkt als Anteil der Leiste (0–1) bei gleich breiten Tagen – Lage im Tag nach echter Länge. */
export function timeFraction(ts: number, dayStarts: number[]): number {
  const days = dayStarts.length - 1;
  const first = dayStarts[0];
  if (days <= 0 || first === undefined || ts <= first) return 0;
  for (let i = 0; i < days; i++) {
    const a = dayStarts[i] ?? 0;
    const b = dayStarts[i + 1] ?? a;
    if (ts < b) return (i + (ts - a) / (b - a)) / days;
  }
  return 1;
}

/**
 * Wo die Stunden eines Tages wirklich liegen (Anteil 0–1 der echten Tageslänge), z. B. 3/6/…/21 Uhr
 * für die Gitterlinien im Kalender. An 23/25-h-Tagen verschieben sie sich mit der Zeitumstellung.
 */
export function hourMarks(
  dayStart: number,
  dayEnd: number,
  hours: number[],
  timeZone?: string
): number[] {
  const length = dayEnd - dayStart;
  if (length <= 0) return [];
  const found = new Map<number, number>();
  for (let ts = dayStart; ts < dayEnd; ts += 3600) {
    const h = Math.round(hourOfDay(ts, timeZone));
    if (hours.includes(h) && !found.has(h)) found.set(h, (ts - dayStart) / length);
  }
  return hours.flatMap((h) => {
    const at = found.get(h);
    return at === undefined ? [] : [at];
  });
}

export function formatDate(language: string, ts: number, timeZone?: string): string {
  return new Intl.DateTimeFormat(language, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...zoneOption(timeZone),
  }).format(new Date(ts * 1000));
}

/** HAs Zeitformat-Einstellung → feste Stundenzählung; 'language'/'system' lassen die Sprache entscheiden. */
export type TimeFormat = '12' | '24' | undefined;

export function timeFormatOf(setting: string | undefined): TimeFormat {
  if (setting === '12' || setting === 'am_pm') return '12';
  if (setting === '24') return '24';
  return undefined;
}

/**
 * Zeitpunkt ohne Mehrdeutigkeit: heute nur die Uhrzeit, bis 5 Tage entfernt Wochentag + Uhrzeit,
 * sonst Datum + Uhrzeit („04.10., 19:30“). Gilt auch für die Zukunft (Erinnerungen).
 */
export function formatWhen(
  language: string,
  ts: number,
  now: number,
  timeZone?: string,
  timeFormat?: TimeFormat
): string {
  const diff = Math.abs(dayNumber(now, timeZone) - dayNumber(ts, timeZone));
  const day: Intl.DateTimeFormatOptions =
    diff === 0 ? {} : diff < 6 ? { weekday: 'short' } : { day: '2-digit', month: '2-digit' };
  const cycle: Intl.DateTimeFormatOptions = timeFormat
    ? { hourCycle: timeFormat === '12' ? 'h12' : 'h23' }
    : {};
  return new Intl.DateTimeFormat(language, {
    ...day,
    hour: 'numeric',
    minute: '2-digit',
    ...cycle,
    ...zoneOption(timeZone),
  }).format(new Date(ts * 1000));
}

/** Spannung (mV): ab 1000 als Volt mit zwei Nachkommastellen, sonst als mV. */
export function formatVoltage(language: string, mv: number): string {
  if (Math.abs(mv) >= 1000) {
    const value = new Intl.NumberFormat(language, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(mv / 1000);
    return t(language, 'unit_volt', { value });
  }
  return t(language, 'unit_millivolt', { value: Math.round(mv) });
}

/** Basisthema von Zigbee2MQTT prüfen: nicht leer, ohne # und +, ohne Schrägstrich am Rand. */
export function cleanZ2mBase(value: string): string | null {
  const base = value.trim();
  if (!base || base.includes('#') || base.includes('+')) return null;
  if (base.startsWith('/') || base.endsWith('/')) return null;
  return base;
}

/** Kann der Partner-Auswahl angeboten werden? (nicht das Gerät selbst, nicht ignoriert) */
export function partnerOptions(devices: Device[], self: Device): Device[] {
  return monitored(devices)
    .filter((d) => d.id !== self.id)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export type GroupBy = 'area' | 'status' | 'none';

/** Suche über Name, Bereich, Hersteller und Modell (Groß/klein egal). */
export function search(devices: Device[], query: string): Device[] {
  const q = query.trim().toLowerCase();
  if (!q) return devices;
  return devices.filter((d) =>
    [d.name, d.area, d.manufacturer, d.model].some((v) => v?.toLowerCase().includes(q))
  );
}

const STATUS_ORDER: Status[] = ['failed', 'check', 'watch', 'learning', 'ok'];

/** Gruppen für die Geräteliste. Ohne Gruppierung eine Gruppe mit leerem Titel. */
export function groupDevices(
  devices: Device[],
  by: GroupBy,
  language: string,
  noArea: string
): Group[] {
  if (by === 'none')
    return [{ area: '', devices: [...devices].sort((a, b) => a.name.localeCompare(b.name)) }];
  if (by === 'area') return groups(devices, noArea);
  return STATUS_ORDER.map((status) => ({
    area: t(language, statusKey(status)),
    devices: monitored(devices)
      .filter((d) => d.status === status)
      .sort((a, b) => a.name.localeCompare(b.name)),
  })).filter((g) => g.devices.length > 0);
}

/** Uhrzeiten im 24-h-Format im Halbstundenraster (plus ein abweichender gespeicherter Wert). */
export function timeOptions(current?: string): string[] {
  const list: string[] = [];
  for (let minutes = 0; minutes < 24 * 60; minutes += 30) {
    list.push(
      `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
    );
  }
  if (current && !list.includes(current)) list.push(current);
  return list.sort();
}

/** Der zuletzt eingetragene Batteriewechsel über alle Geräte. */
export function lastReplaced(devices: Device[]): { device: Device; at: number } | null {
  let best: { device: Device; at: number } | null = null;
  for (const device of devices) {
    const at = device.battery.replaced.at(-1);
    if (at !== undefined && (best === null || at > best.at)) best = { device, at };
  }
  return best;
}

/** Blatt wegwischen: weit genug gezogen oder schnell nach unten geschnippt (px, px/ms). */
export function shouldDismiss(dy: number, velocity: number): boolean {
  return dy > 120 || (dy > 24 && velocity > 0.5);
}

/** Filter der Geräteliste (aus Übersicht/Mitteilungen): ein Status, „ignoriert“, wichtig, Batterie. */
export type DeviceFilter = Status | 'ignored' | 'important' | 'battery';

/** Batterie-Thema: schwache/fehlende Batterie oder in den nächsten Wochen fällig (`due` = Geräte-IDs). */
export function batteryDevices(devices: Device[], due: string[] = []): Device[] {
  return monitored(devices)
    .filter(
      (d) =>
        due.includes(d.id) ||
        (d.battery.flag && d.battery.low) ||
        (SEVERITY[d.status] >= 1 && (d.reason_key ?? '').startsWith('battery'))
    )
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function applyFilter(
  devices: Device[],
  filter: DeviceFilter | null,
  due: string[] = []
): Device[] {
  if (filter === null) return devices;
  if (filter === 'ignored') return devices.filter((d) => d.ignored);
  if (filter === 'important') return monitored(devices).filter((d) => d.critical);
  if (filter === 'battery') return batteryDevices(devices, due);
  return monitored(devices).filter((d) => d.status === filter);
}

/** Wichtige Geräte (überwacht). */
export function importantCount(devices: Device[]): number {
  return monitored(devices).filter((d) => d.critical).length;
}

/** Kurzes Datum wie in iOS-Listen: „Heute“, „Gestern“, „3. Okt.“, mit Jahr nur wenn nicht dieses. */
export function shortDate(language: string, ts: number, now: number, timeZone?: string): string {
  const diff = dayNumber(now, timeZone) - dayNumber(ts, timeZone);
  if (diff === 0) return t(language, 'today_cap');
  if (diff === 1) return t(language, 'yesterday_cap');
  const sameYear = zoned(ts, timeZone).year === zoned(now, timeZone).year;
  return new Intl.DateTimeFormat(language, {
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
    ...zoneOption(timeZone),
  }).format(new Date(ts * 1000));
}

/** Wer gerade etwas braucht: Prüfen/Ausgefallen bekommen Aktionen (Wechsel, Erinnern). */
export function needsAction(device: Device): boolean {
  return !device.ignored && SEVERITY[device.status] >= 2;
}

/** Begründungen der Stufe „Batterie“ (wie `BATTERY_REASONS` im Server). */
export const BATTERY_REASONS: ReadonlySet<string> = new Set(['battery_low', 'battery_low_flag']);

/** „Batterie gewechselt“ ist nur bei einem Batterie-Grund die Hauptaktion, sonst „Morgen erinnern“. */
export function batteryFirst(device: Device): boolean {
  const b = device.battery;
  // Auch eine stille Batterie, die schon schwach war, ist fast sicher leer (gleiche 20 % wie der Server)
  const weak = (b.flag && b.low) || (b.trusted && b.level !== null && b.level <= 20);
  return BATTERY_REASONS.has(device.reason_key ?? '') || weak;
}

/** Wichtig umschalten: zurück auf den Automatik-Wert = null (Server entscheidet wieder selbst). */
export function criticalChange(device: Device, on: boolean): boolean | null {
  return on === device.critical_auto ? null : on;
}

/** Zeile unter „Batterien“: wie viele schwach sind (gleiche Schwelle wie der Status) und welche. */
export function batteryLine(
  language: string,
  low: string[]
): { label: string; value: string; tone: 'ok' | 'warn' } {
  if (!low.length) return { label: t(language, 'battery_none_low'), value: '', tone: 'ok' };
  return {
    label: t(language, low.length === 1 ? 'battery_low_one' : 'battery_low_many', {
      count: low.length,
    }),
    value: low.join(', '),
    tone: 'warn',
  };
}

// ── Richtung „Puls“: Schlagzeile, Monitor, Tagesband, Herzschlag ─────────────

/** Darf der angemeldete Benutzer etwas ändern? Nur Admins (der Server prüft das ebenso). */
export function canEdit(user: HassUser | undefined): boolean {
  return user?.is_admin === true;
}

/** Ab wann die Stille zählt: `silence_from` vom Server, bei älteren Servern die letzte Meldung. */
export function silenceStart(device: Device): number | null {
  return device.silence_from === undefined ? device.last_activity : device.silence_from;
}

/**
 * Beginn der Stille für Schlagzeile und Leiste: `silence_start` vom Server (letzte *regelmäßige*
 * Meldung, vereinzelte danach zählen nicht), sonst wie bisher `silenceStart`.
 */
export function quietSince(device: Device): number | null {
  return typeof device.silence_start === 'number' ? device.silence_start : silenceStart(device);
}

/** Vereinzelte Meldungen seit Beginn der Stille (0 = echte Stille oder älterer Server). */
export function strays(device: Device): number {
  return typeof device.strays === 'number' && device.strays > 0 ? device.strays : 0;
}

/** Nach „Batterie gewechselt“: wartet auf die erste echte Meldung (Status Beobachten). */
export function isWaiting(device: Device): boolean {
  return !device.ignored && device.reason_key === 'waiting_first';
}

/** Begründungen, die den Takt betreffen (nicht nur die Batterie). */
const OFF_RHYTHM = new Set(['silent', 'silent_new', 'unavailable', 'partner', 'radio_only']);
const SILENT = new Set(['silent', 'silent_new']);

/** Dauer als Wortgruppe für „seit …“: 12 Minuten, 5 Stunden, 4 Tagen. */
export function span(language: string, seconds: number): string {
  // Gleiche Rundung wie der Server (texts.py), damit Pille, Schlagzeile und Begründung dieselbe Zahl nennen
  const s = Math.max(0, seconds);
  if (Math.round(s / 60) < 60)
    return t(language, 'span_minutes', { n: Math.max(1, Math.round(s / 60)) });
  if (Math.round(s / 3600) < 48) {
    const h = Math.round(s / 3600);
    return h <= 1 ? t(language, 'span_hour') : t(language, 'span_hours', { n: h });
  }
  const d = Math.round(s / 86400);
  return d <= 1 ? t(language, 'span_day') : t(language, 'span_days', { n: d });
}

/** „gestern“ oder Wochentag, wenn die Stille vor 1–6 Kalendertagen begann; sonst null. */
export function sinceDay(
  language: string,
  ts: number,
  now: number,
  timeZone?: string
): string | null {
  const diff = dayNumber(now, timeZone) - dayNumber(ts, timeZone);
  if (diff === 1) return t(language, 'yesterday');
  if (diff >= 2 && diff <= 6)
    return new Intl.DateTimeFormat(language, { weekday: 'long', ...zoneOption(timeZone) }).format(
      new Date(ts * 1000)
    );
  return null;
}

/** Ist das Gerät still (und nicht nur die Batterie schwach)? */
export function isSilent(device: Device): boolean {
  return (
    !device.ignored &&
    SEVERITY[device.status] >= 1 &&
    quietSince(device) !== null &&
    SILENT.has(device.reason_key ?? '')
  );
}

/** Aus dem Takt: Stille, nicht erreichbar oder Partner aktiv (eine schwache Batterie zählt nicht). */
export function offRhythm(device: Device): boolean {
  return SEVERITY[device.status] >= 1 && OFF_RHYTHM.has(device.reason_key ?? '');
}

export interface Hero {
  line1: string;
  line1Short: string;
  line2: string;
  line2Short: string;
  /** Farbe der zweiten Zeile: Verlauf nur, wenn alle im Takt sind */
  tone: 'accent' | 'warn' | 'crit' | 'plain';
  /** Unterzeile („2 von 10 im Takt.“), leer wenn nichts zu sagen ist */
  sub: string;
}

function plainHero(line1: string, line2: string, heroTone: Hero['tone'], sub = ''): Hero {
  return { line1, line1Short: line1, line2, line2Short: line2, tone: heroTone, sub };
}

/**
 * Große Schlagzeile der Übersicht. Braucht ein Gerät dich, steht das vorn („8 Geräte / brauchen
 * dich.“ in Warn-/Rot-Ton) und „2 von 10 im Takt.“ darunter; sonst „Alle 10 Geräte / schlagen im
 * Takt.“ (mit Verlauf) bzw. „9 von 10 Geräten / schlagen im Takt.“ (ohne Verlauf).
 */
export function hero(language: string, devices: Device[]): Hero {
  const list = monitored(devices);
  const rated = list.filter((d) => d.status !== 'learning');
  if (!list.length)
    return plainHero(t(language, 'hero_none1'), t(language, 'hero_none2'), 'accent');
  if (!rated.length)
    return plainHero(t(language, 'hero_learn1'), t(language, 'hero_learn2'), 'accent');
  const off = rated.filter(offRhythm).length;
  const ok = rated.length - off;
  const need = attention(rated);
  const needTone = need.some((d) => d.status === 'failed') ? 'crit' : 'warn';
  if (rated.length === 1) {
    // Einzahl: „Dein einziges Gerät / schlägt im Takt.“ bzw. „… / braucht dich.“ / „… / ist still.“
    const line1 = t(language, 'hero_one');
    if (need.length) return plainHero(line1, t(language, 'hero_need_one'), needTone);
    return plainHero(
      line1,
      t(language, off ? 'hero_beat_off' : 'hero_beat_one'),
      off ? 'plain' : 'accent'
    );
  }
  const sub = t(language, 'hero_sub', { ok, total: rated.length });
  if (need.length) {
    const one = need.length === 1;
    return plainHero(
      one ? t(language, 'hero_need1_one') : t(language, 'hero_need1', { count: need.length }),
      t(language, one ? 'hero_need_one' : 'hero_need'),
      needTone,
      sub
    );
  }
  const line2 = t(language, 'hero_beat');
  const line2Short = t(language, 'hero_beat_short');
  if (!off) {
    const line1 = t(language, 'hero_all', { count: rated.length });
    return { line1, line1Short: line1, line2, line2Short, tone: 'accent', sub: '' };
  }
  return {
    line1: t(language, 'hero_some', { ok, total: rated.length }),
    line1Short: t(language, 'hero_some_short', { ok, total: rated.length }),
    line2,
    line2Short,
    tone: 'plain',
    sub: '',
  };
}

export interface Mention {
  before: string;
  name: string;
  after: string;
  tone: Tone;
}

const MARK = '\u0000';

function mention(
  language: string,
  key: StringKey,
  device: Device,
  vars: Record<string, string>
): Mention {
  const [before = '', after = ''] = t(language, key, { ...vars, name: MARK }).split(MARK);
  return { before, name: device.name, after, tone: tone(device.status) };
}

/** Ein Satz pro auffälligem Gerät (höchstens zwei), mit hervorgehobenem Namen. */
export function heroSentences(
  language: string,
  devices: Device[],
  now: number,
  timeZone?: string
): { mentions: Mention[]; more: number; text: string } {
  const list = monitored(devices)
    .filter((d) => SEVERITY[d.status] >= 1 && !isCloudOutage(d))
    .sort((a, b) => SEVERITY[b.status] - SEVERITY[a.status] || a.name.localeCompare(b.name));
  const all = monitored(devices);
  const learning = all.filter((d) => d.status === 'learning').length;
  // Lernende Geräte zählen nicht als „im Takt“ – sie bekommen einen eigenen Satz
  const learnText = learning ? learningLine(language, learning) : '';
  if (!list.length) {
    const allLearning = learning > 0 && learning === all.length;
    return {
      mentions: [],
      more: 0,
      text: allLearning
        ? t(language, 'sent_learning')
        : [learning < all.length ? t(language, 'sent_all_good') : '', learnText]
            .filter(Boolean)
            .join(' '),
    };
  }
  const mentions = list.slice(0, 2).map((d) => {
    const key = d.reason_key ?? '';
    const since = quietSince(d);
    if (SILENT.has(key) && since !== null && strays(d) > 0) {
      // Sterbender Sensor: seit Tagen kaum noch, zwischendurch eine vereinzelte Meldung
      const day = sinceDay(language, since, now, timeZone);
      const last = ago(language, d.last_activity, now).replace(/\.$/, '');
      return day
        ? mention(language, 'sent_strays_since', d, { day, last })
        : mention(language, 'sent_strays_for', d, { span: span(language, now - since), last });
    }
    if (SILENT.has(key) && since !== null) {
      const day = sinceDay(language, since, now, timeZone);
      return day
        ? mention(language, 'sent_silent_since', d, { day })
        : mention(language, 'sent_silent_for', d, { span: span(language, now - since) });
    }
    if (key === 'waiting_first') return mention(language, 'sent_waiting', d, {});
    if (key === 'battery_low') return mention(language, 'sent_battery_low', d, {});
    if (key === 'battery_soon') return mention(language, 'sent_battery', d, {});
    if (key === 'unavailable') return mention(language, 'sent_unavailable', d, {});
    if (key === 'startup_waiting') return mention(language, 'sent_startup', d, {});
    if (key === 'radio_only') return mention(language, 'sent_radio_only', d, {});
    if (key === 'battery_missing') return mention(language, 'sent_battery_missing', d, {});
    if (key === 'partner')
      return mention(language, 'sent_partner', d, { partner: d.partner_name ?? '' });
    return mention(language, 'sent_other', d, { reason: d.reason });
  });
  const more = list.length - mentions.length;
  return {
    mentions,
    more,
    text: [more ? t(language, 'sent_more', { count: more }) : '', learnText]
      .filter(Boolean)
      .join(' '),
  };
}

/** „Ein Gerät / 3 Geräte lernt Pulse noch kennen.“ */
export function learningLine(language: string, count: number): string {
  return count === 1 ? t(language, 'learning_one') : t(language, 'learning_many', { count });
}

export type MonitorKey = 'need' | 'watch' | 'rhythm' | 'learning';

const MONITOR_TITLES: Record<MonitorKey, StringKey> = {
  need: 'group_need',
  watch: 'group_watch',
  rhythm: 'group_rhythm',
  learning: 'group_learning',
};

export function monitorTitle(key: MonitorKey): StringKey {
  return MONITOR_TITLES[key];
}

/** Abschnitte des Monitors: Braucht dich / Im Blick / Im Takt / Lernt noch (leere fallen weg). */
export function monitorGroups(devices: Device[]): { key: MonitorKey; devices: Device[] }[] {
  const list = monitored(devices);
  const byName = (a: Device, b: Device) => a.name.localeCompare(b.name);
  const sections: { key: MonitorKey; devices: Device[] }[] = [
    { key: 'need', devices: attention(list) },
    {
      key: 'watch',
      devices: list.filter((d) => d.status === 'watch' || isCloudOutage(d)).sort(byName),
    },
    { key: 'rhythm', devices: list.filter((d) => d.status === 'ok').sort(byName) },
    { key: 'learning', devices: list.filter((d) => d.status === 'learning').sort(byName) },
  ];
  return sections.filter((s) => s.devices.length > 0);
}

/** Ab so vielen Geräten zeigt „Im Takt“ Räume zum Einklappen. */
export const ROOMS_FROM = 12;

/** „Seit 4 Tagen still“ für die abbrechende Leiste – nur bei Stille, nicht bei schwacher Batterie. */
export function silenceFlag(language: string, device: Device, now: number): string | null {
  const since = quietSince(device);
  if (!isSilent(device) || since === null) return null;
  return t(language, strays(device) ? 'flag_strays' : 'flag_silent', {
    span: span(language, now - since),
  });
}

/** Pille in der Leiste: „Seit 4 Tagen still“, „Wartet“ (nach Batteriewechsel) oder „Lernt noch“. */
export function rhythmPill(language: string, device: Device, now: number): string {
  if (device.ignored) return '';
  const flag = silenceFlag(language, device, now);
  if (flag) return flag;
  if (isWaiting(device)) return t(language, 'pill_waiting');
  if (device.status === 'learning') return t(language, 'pill_learning');
  return '';
}

/** Statuswort rechts im Monitor (null = nur die Zeit). */
export function statusWord(
  language: string,
  device: Device,
  now: number
): { text: string; tone: Tone } | null {
  if (device.ignored) return { text: t(language, 'ignored'), tone: 'muted' };
  if (isCloudOutage(device)) return { text: t(language, 'status_cloud'), tone: 'muted' };
  if (isWaiting(device)) return { text: t(language, 'status_waiting'), tone: 'warn' };
  const level = device.battery.level;
  if (device.status === 'watch' && device.reason_key?.startsWith('battery') && level !== null)
    return { text: t(language, 'status_battery', { level: Math.round(level) }), tone: 'warn' };
  if (SEVERITY[device.status] >= 1)
    return { text: t(language, statusKey(device.status)), tone: tone(device.status) };
  if (device.status === 'learning') return { text: t(language, 'status_learning'), tone: 'muted' };
  const replaced = device.battery.replaced.at(-1);
  if (replaced !== undefined && now - replaced < 2 * 86400)
    return { text: t(language, 'new_battery'), tone: 'ok' };
  return null;
}

/** Leiste auf weniger Balken zusammenfassen (Handy): Summen je Gruppe, ganz in der Zukunft = null. */
export function resample(buckets: (number | null)[], count: number): (number | null)[] {
  if (count <= 0 || buckets.length <= count) return buckets;
  const factor = Math.ceil(buckets.length / count);
  const out: (number | null)[] = [];
  for (let i = 0; i < buckets.length; i += factor) {
    const part = buckets.slice(i, i + factor);
    out.push(
      part.every((b) => b === null) ? null : part.reduce<number>((sum, b) => sum + (b ?? 0), 0)
    );
  }
  return out;
}

/** „22:00“ → 22, „07:30“ → 7.5 */
export function hoursOf(time: string): number {
  const [h = '0', m = '0'] = time.split(':');
  return Number(h) + Number(m) / 60;
}

/** Ruhezeit als Bereiche in Stunden 0–24 (über Mitternacht = zwei Bereiche). */
export function quietRanges(start: string, end: string): [number, number][] {
  const a = hoursOf(start);
  const b = hoursOf(end);
  if (a === b) return [];
  return a < b
    ? [[a, b]]
    : [
        [0, b],
        [a, 24],
      ];
}

/** Kurze Schlagzeile im Gerätedetail mit Farbe. */
export function detailHeadline(
  language: string,
  device: Device,
  now: number
): { text: string; tone: Tone | 'accent' } {
  if (device.ignored) return { text: t(language, 'dh_ignored'), tone: 'muted' };
  const key = device.reason_key ?? '';
  const since = quietSince(device);
  if (isSilent(device) && since !== null) {
    const text =
      SEVERITY[device.status] >= 2
        ? t(language, strays(device) ? 'dh_strays' : 'dh_silent', {
            span: span(language, now - since),
          })
        : t(language, 'dh_watch');
    return { text, tone: tone(device.status) };
  }
  if (isCloudOutage(device)) return { text: t(language, 'dh_cloud'), tone: 'muted' };
  if (isWaiting(device)) return { text: t(language, 'dh_waiting'), tone: 'warn' };
  if (key === 'startup_waiting') return { text: t(language, 'dh_startup'), tone: 'warn' };
  if (key === 'radio_only')
    return { text: t(language, 'dh_radio_only'), tone: tone(device.status) };
  if (key === 'battery_missing')
    return { text: t(language, 'dh_battery_missing'), tone: tone(device.status) };
  if (key === 'unavailable')
    return { text: t(language, 'dh_unavailable'), tone: tone(device.status) };
  if (key === 'partner') return { text: t(language, 'dh_partner'), tone: tone(device.status) };
  if (key.startsWith('battery') && device.battery.level !== null)
    return {
      text: t(language, 'dh_battery', { level: Math.round(device.battery.level) }),
      tone: tone(device.status),
    };
  if (device.status === 'learning') return { text: t(language, 'dh_learning'), tone: 'muted' };
  return { text: t(language, 'dh_ok'), tone: 'accent' };
}

/** Satz unter der Schlagzeile: bei Stille Takt + letzte Meldung, sonst die Begründung vom Server. */
export function detailText(
  language: string,
  device: Device,
  now: number,
  timeZone?: string,
  timeFormat?: TimeFormat
): string {
  if (isSilent(device) && device.typical !== null && device.last_activity !== null)
    return t(language, 'detail_every', {
      every: every(language, device.typical).replace(/\.$/, ''),
      when: formatWhen(language, device.last_activity, now, timeZone, timeFormat),
    });
  if (device.status === 'learning' && !device.ignored) return t(language, 'learning_hint');
  return device.reason;
}

/** Satz unter dem Partner-Vergleich. */
export function partnerLine(language: string, device: Device, partner: Device): string {
  if (isSilent(device) && !offRhythm(partner))
    return t(language, 'partner_quiet', { partner: partner.name, name: device.name });
  if (!offRhythm(device) && !offRhythm(partner)) return t(language, 'partner_both');
  return '';
}

export interface HeartbeatData {
  start: number;
  days: number;
  binMinutes: number;
  /** Echte lokale Mitternächte: Tag i deckt [dayStarts[i], dayStarts[i+1]) ab */
  dayStarts: number[];
  /** Je Gerät eine Liste pro Tag (92/96/100 Fenster bei 23/24/25 h) */
  devices: Record<string, (number | null)[][]>;
  /** Zeiten ohne Daten: [von, bis] in Sekunden */
  noData: [number, number][];
}

function isSpan(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === 'number' &&
    typeof value[1] === 'number'
  );
}

/** Zeitspannen ohne Daten prüfen (ohne Casts) – Unbrauchbares fällt weg. */
export function parseSpans(value: unknown): [number, number][] {
  return Array.isArray(value) ? value.filter(isSpan) : [];
}

/**
 * Zeiten ohne Daten als Anteile einer Leiste (0–1), z. B. für die Schraffur in der Rhythmusleiste.
 * Jeder Tag ist gleich breit; innerhalb eines Tages zählt seine echte Länge. Leer, wenn nichts ins
 * Fenster fällt.
 */
export function gapFractions(spans: [number, number][], dayStarts: number[]): [number, number][] {
  if (dayStarts.length < 2) return [];
  return spans
    .map(([a, b]): [number, number] => [timeFraction(a, dayStarts), timeFraction(b, dayStarts)])
    .filter(([a, b]) => b > a);
}

function isBins(value: unknown): value is (number | null)[] {
  return Array.isArray(value) && value.every((v) => v === null || typeof v === 'number');
}

function isDayBins(value: unknown): value is (number | null)[][] {
  return Array.isArray(value) && value.every(isBins);
}

/** Antwort von `pulse/heartbeat` prüfen (ohne Casts). */
export function parseHeartbeat(value: unknown): HeartbeatData | null {
  if (typeof value !== 'object' || value === null) return null;
  const start: unknown = Reflect.get(value, 'start');
  const days: unknown = Reflect.get(value, 'days');
  const binMinutes: unknown = Reflect.get(value, 'bin_minutes');
  const raw: unknown = Reflect.get(value, 'devices');
  if (typeof start !== 'number' || typeof days !== 'number' || typeof binMinutes !== 'number')
    return null;
  if (binMinutes <= 0 || typeof raw !== 'object' || raw === null) return null;
  const devices: Record<string, (number | null)[][]> = {};
  for (const [id, bins] of Object.entries(raw)) if (isDayBins(bins)) devices[id] = bins;
  return {
    start,
    days,
    binMinutes,
    dayStarts: validDayStarts(Reflect.get(value, 'day_starts'), start, days),
    devices,
    noData: parseSpans(Reflect.get(value, 'no_data')),
  };
}

/**
 * Striche des Herzschlag-Kalenders für einen Tag: Position als Anteil des Tages (0–1, nach echter
 * Tageslänge) und Stärke je Fenster.
 */
export function dayTicks(
  bins: (number | null)[],
  dayLength: number,
  binMinutes: number
): { at: number; count: number }[] {
  const size = binMinutes * 60;
  const ticks: { at: number; count: number }[] = [];
  if (dayLength <= 0) return ticks;
  bins.forEach((count, i) => {
    if (count) ticks.push({ at: ((i + 0.5) * size) / dayLength, count });
  });
  return ticks;
}

/** Höhe eines Kalender-Strichs in px: 1 Meldung 12, 2 Meldungen 18, ab 3 Meldungen 22. */
export function tickHeight(count: number): number {
  if (count >= 3) return 22;
  return count === 2 ? 18 : 12;
}

/** Höchstens so viele vereinzelte Meldungen nach dem Abreißen gelten noch als „still“. */
const MAX_STRAYS = 2;

/**
 * Erstes stilles Fenster der Leiste (−1 = nicht still): das Fenster nach der letzten *regelmäßigen*
 * Meldung. Kamen nach einer langen Lücke nur noch ein, zwei vereinzelte Meldungen (ein sterbender
 * Sensor), beginnt die Stille schon vor der Lücke – die Ausreißer stehen dann als Balken auf der
 * gestrichelten Linie.
 */
export function silentIndex(device: Device, dayStarts: number[]): number {
  const since = silenceStart(device);
  if (!isSilent(device) || since === null || dayStarts.length < 2) return -1;
  // Neuer Server: Beginn der Stille steht fest (Ausreißer-Regel dort) – Fenster nach dieser Meldung
  if (typeof device.silence_start === 'number') {
    const at = stripIndex(device.silence_start, dayStarts);
    return at < 0 ? 0 : at + 1;
  }
  const days = dayStarts.length - 1;
  // Mittlere Fensterlänge (für die Lücke in Fenstern) – an der Zeitumstellung kaum anders
  const size = ((dayStarts[days] ?? 0) - (dayStarts[0] ?? 0)) / (days * WINDOWS_PER_DAY);
  const last = stripIndex(since, dayStarts);
  if (last < 0) return 0;
  const active: number[] = [];
  device.strip.forEach((count, i) => {
    if (count && i <= last) active.push(i);
  });
  // Lücke, ab der eine Meldung als vereinzelt gilt: drei Fenster oder dreimal der übliche Takt
  const gapLimit = Math.max(3, Math.ceil((3 * (device.typical ?? 0)) / size));
  for (let k = active.length - 2; k >= 0 && active.length - 1 - k <= MAX_STRAYS; k--) {
    const here = active[k];
    const next = active[k + 1];
    if (here === undefined || next === undefined) break;
    if (next - here - 1 >= gapLimit) return here + 1;
  }
  return last + 1;
}

/**
 * Beginn der gestrichelten Stille im Herzschlag-Kalender (−1 = nicht still). Die Stille beginnt nach
 * der letzten Meldung: `silence_from`, aber nie vor dem Ende des letzten Fensters mit einer Meldung –
 * sonst stünden Striche auf der Stille-Linie. (Früher kam der Beginn aus der 2-h-Leiste: auf deren
 * Fenstergrenze abgerundet und bei vereinzelten Meldungen vor die Lücke gezogen – daher violette
 * Striche auf der roten Linie.)
 */
export function heartbeatSilence(
  device: Device,
  bins: (number | null)[][],
  dayStarts: number[],
  binMinutes: number
): number {
  const since = silenceStart(device);
  if (!isSilent(device) || since === null) return -1;
  const size = binMinutes * 60;
  let lastTick = -1;
  bins.forEach((day, i) => {
    const start = dayStarts[i];
    const end = dayStarts[i + 1];
    if (start === undefined || end === undefined) return;
    day.forEach((count, j) => {
      if (count) lastTick = Math.max(lastTick, Math.min(end, start + (j + 1) * size));
    });
  });
  return Math.max(since, lastTick);
}

const LEVEL_WORD: Record<Level, StringKey> = {
  now: 'set_level_now',
  daily: 'set_level_daily',
  off: 'set_level_off',
};

/** Textzeile im Tagesband: „18:00 Zusammenfassung · Ruhe 22:00 bis 07:30“. */
export function daybandLine(language: string, settings: Settings): string {
  const q = settings.quiet;
  return [
    t(language, 'day_line_summary', { time: settings.summary_time }),
    q.enabled
      ? t(language, 'day_line_quiet', { start: q.start, end: q.end })
      : t(language, 'day_line_no_quiet'),
  ].join(' · ');
}

/** Gewählte Personen fürs Heimkommen (ältere Server schicken noch `person`). */
export function arrivePersons(settings: Settings): string[] {
  const persons: unknown = Reflect.get(settings.arrive_home, 'persons');
  if (Array.isArray(persons)) return persons.filter((p): p is string => typeof p === 'string');
  const person: unknown = Reflect.get(settings.arrive_home, 'person');
  return typeof person === 'string' ? [person] : [];
}

/**
 * Schlagzeile der Mitteilungen: „Pulse meldet sich um 18:00. / Ruhe 22:00–07:30.“ und ein Satz,
 * was wann kommt – im Stil der Übersicht statt eines nackten Formulars.
 */
export function settingsHero(
  language: string,
  settings: Settings
): { line1: string; line2: string; sub: string } {
  const q = settings.quiet;
  // Gleiche Stufen zusammenfassen: „Ausfälle sofort, Prüfen und Batterien in der Zusammenfassung.“
  const names: Record<keyof Settings['levels'], StringKey> = {
    failed: 'set_failed',
    check: 'set_check',
    battery: 'set_battery',
  };
  const byLevel = new Map<Level, string[]>();
  for (const key of ['failed', 'check', 'battery'] as const) {
    const level = settings.levels[key];
    byLevel.set(level, [...(byLevel.get(level) ?? []), t(language, names[key])]);
  }
  const list = new Intl.ListFormat(language, { type: 'conjunction' });
  const parts = [...byLevel].map(([level, items]) =>
    t(language, 'set_group', { names: list.format(items), level: t(language, LEVEL_WORD[level]) })
  );
  const first = parts.join(', ');
  const levels = `${first.charAt(0).toUpperCase()}${first.slice(1)}.`;
  return {
    line1: t(language, 'set_head', { time: settings.summary_time }),
    line2: q.enabled
      ? t(language, 'set_quiet', { start: q.start, end: q.end })
      : t(language, 'set_no_quiet'),
    // Empfänger stehen schon im Tagesband daneben – hier nur, was wann kommt
    sub: levels,
  };
}

/**
 * Strecke [from, to] ohne die Lücken (z. B. Zeiten, in denen Pulse nicht lief): die Stille-Linie
 * wird dort unterbrochen, statt über der Schraffur zu liegen. Alle Werte im selben Maß (0–1 o. Ä.).
 */
export function subtractSpans(
  from: number,
  to: number,
  gaps: [number, number][]
): [number, number][] {
  let parts: [number, number][] = to > from ? [[from, to]] : [];
  for (const [a, b] of gaps) {
    parts = parts.flatMap(([x, y]): [number, number][] => {
      if (b <= x || a >= y) return [[x, y]];
      const out: [number, number][] = [];
      if (a > x) out.push([x, a]);
      if (b < y) out.push([b, y]);
      return out;
    });
  }
  return parts;
}

// ── 1.1: Vorhersage, fällige Batterien, Cloud-Ausfälle ─────────────────────

const FORECAST_REASONS: Record<ForecastReason, StringKey> = {
  too_short: 'forecast_too_short',
  flat: 'forecast_flat',
  coarse: 'forecast_coarse',
  untrusted: 'forecast_untrusted',
  noisy: 'forecast_noisy',
};

/**
 * Laufzeit als grober Bereich – nie tagesgenau: „Hält noch ca. 3–5 Wochen“, „… 2–4 Monate“,
 * „… 1–2 Jahre“, unter ~10 Tagen „Hält nur noch wenige Tage“. Ohne Vorhersage der kurze Grund
 * (oder leer, wenn der Server keinen nennt).
 */
export function forecastText(
  language: string,
  forecast: Forecast | null | undefined,
  reason?: ForecastReason | null
): string {
  if (!forecast)
    return reason && reason in FORECAST_REASONS ? t(language, FORECAST_REASONS[reason]) : '';
  const lo = Math.max(0, Math.min(forecast.days_min, forecast.days_max));
  const hi = Math.max(forecast.days_min, forecast.days_max);
  if (hi <= 10) return t(language, 'forecast_days');
  const range = (unit: number): { lo: number; hi: number } => {
    const a = Math.max(1, Math.floor(lo / unit));
    return { lo: a, hi: Math.max(a + 1, Math.ceil(hi / unit)) };
  };
  if (hi <= 70) return t(language, 'forecast_weeks', range(7));
  if (hi <= 540) return t(language, 'forecast_months', range(30.44));
  return t(language, 'forecast_years', range(365.25));
}

/** „2× CR2032, 1× AA“ – fällige Batterien nach Typ zusammengezählt (unbekannter Typ zuletzt). */
export function dueLine(language: string, due: DueBattery[] | undefined): string {
  if (!due?.length) return '';
  const byType = new Map<string, number>();
  const untyped: string[] = [];
  for (const item of due) {
    if (!item.type) untyped.push(item.name);
    else byType.set(item.type, (byType.get(item.type) ?? 0) + Math.max(1, item.count ?? 1));
  }
  const items = [...byType.entries()]
    .sort(([a, x], [b, y]) => y - x || a.localeCompare(b))
    .map(([type, count]) => t(language, 'battery_count_type', { count, type }));
  // Ohne bekannten Typ: das Gerät nennen, damit man weiß, wo man nachsehen muss
  if (untyped.length) items.push(t(language, 'due_untyped', { names: untyped.join(', ') }));
  return t(language, 'due_line', { items: items.join(', ') });
}

/** Anzeigename einer Integration aus ihrer Domain: netatmo → Netatmo, tado_x → Tado x. */
export function integrationName(domain: string): string {
  const name = domain.replaceAll('_', ' ').trim();
  return name ? `${name.charAt(0).toUpperCase()}${name.slice(1)}` : domain;
}

/** Ruhiger Sammelhinweis je schweigender Cloud: „Netatmo-Cloud antwortet nicht – 3 Geräte betroffen“. */
export function cloudLines(language: string, outages: CloudOutage[] | undefined): string[] {
  return (outages ?? [])
    .filter((o) => o.count > 0)
    .map((o) =>
      t(language, o.count === 1 ? 'cloud_outage_one' : 'cloud_outage_many', {
        name: integrationName(o.integration),
        count: o.count,
      })
    );
}

/** Partner-Vorschläge, die angeboten werden: nur ohne gesetzten Partner, höchstens 3. */
export function partnerSuggestions(device: Device): { id: string; name: string }[] {
  if (device.partner || device.ignored) return [];
  // Ein Vorschlag auf einmal (der stärkste) – verworfen kommt der nächste
  return (device.partner_suggestions ?? []).slice(0, 1);
}

/** Abo-Neuversuch nach einem Fehler: 2 s, dann verdoppelt bis höchstens 60 s; ein Erfolg setzt zurück. */
export const RETRY_FIRST = 2000;
export const RETRY_MAX = 60_000;

export function nextRetryDelay(delay: number): number {
  return Math.min(Math.max(delay, RETRY_FIRST) * 2, RETRY_MAX);
}
