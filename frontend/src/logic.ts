/** Display logic without UI; tested here. */

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
 * Remembers the last result and only recalculates when an argument changed (compared by
 * identity). This way child elements get the same arrays and do not re-render needlessly.
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

/** Color of the rhythm bar: ignored devices and devices of a silent cloud gray, otherwise by status. */
export function rhythmTone(device: Device): Tone {
  return device.ignored || isCloudOutage(device) ? 'muted' : tone(device.status);
}

/** Silent because the integration's cloud is not responding (collective notice instead of single alarm). */
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

/** Check + offline, worst first (without devices of a silent cloud). */
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

/** All monitored devices by room (rooms alphabetical, "ohne Raum" (no room) last). */
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

/** Bar heights 0–1. Cap outliers (90th percentile) so quiet devices do not vanish. */
export function stripHeights(buckets: (number | null)[]): (number | null)[] {
  const values = buckets.filter((b): b is number => b !== null && b > 0).sort((a, b) => a - b);
  if (!values.length) return buckets.map((b) => (b === null ? null : 0));
  const cap = values[Math.min(values.length - 1, Math.floor(values.length * 0.9))] ?? 1;
  return buckets.map((b) => (b === null ? null : Math.min(1, b / cap)));
}

const zoneFormats = new Map<string, Intl.DateTimeFormat>();

/** Formatter for date parts in a time zone (invalid zone → browser time zone). */
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

/** Home Assistant time zone if the browser knows it, otherwise undefined (browser time zone). */
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

/** Valid time zone for Intl options (invalid ones fall back to the browser). */
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

/** Calendar day as a number (days since 1970) in the time zone; differences are DST-safe. */
export function dayNumber(ts: number, timeZone?: string): number {
  const p = zoned(ts, timeZone);
  return Date.UTC(p.year, p.month - 1, p.day) / 86_400_000;
}

/** Time of day as hours (0–24) in the time zone, e.g. 18:30 → 18.5. */
export function hourOfDay(ts: number, timeZone?: string): number {
  const p = zoned(ts, timeZone);
  return p.hour + p.minute / 60;
}

/** Day boundaries (strip_days + 1 midnights): from the server, otherwise evenly from strip_start. */
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

/** Short weekdays for the axis (middle of each day); the last day is called "heute" (today). */
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
 * Axis columns: equally wide days. The server splits every calendar day into exactly 12 windows,
 * also on DST changes (23/25 h), so every day in the bar is equally wide.
 */
export function axisColumns(dayStarts: number[]): string {
  const days = Math.max(1, dayStarts.length - 1);
  return `repeat(${days}, minmax(0, 1fr))`;
}

/** Windows per calendar day in the rhythm bar (`strip`). */
export const WINDOWS_PER_DAY = 12;

/**
 * Index of the bar window for a point in time (12 per day, window length = day length / 12).
 * −1 before the first day, days × 12 after the last.
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

/** Point in time as a fraction of the bar (0–1) with equally wide days; position in the day by real length. */
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
 * Where the hours of a day really lie (fraction 0–1 of the real day length), e.g. 3/6/…/21 h
 * for the grid lines in the calendar. On 23/25 h days they shift with the DST change.
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

/** HA's time format setting → fixed hour cycle; 'language'/'system' let the language decide. */
export type TimeFormat = '12' | '24' | undefined;

export function timeFormatOf(setting: string | undefined): TimeFormat {
  if (setting === '12' || setting === 'am_pm') return '12';
  if (setting === '24') return '24';
  return undefined;
}

/**
 * Point in time without ambiguity: today only the time, up to 5 days away weekday + time,
 * otherwise date + time ("04.10., 19:30"). Also applies to the future (reminders).
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

/** Voltage (mV): from 1000 on as volts with two decimals, otherwise as mV. */
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

/** Validate the Zigbee2MQTT base topic: not empty, no # or +, no leading/trailing slash. */
export function cleanZ2mBase(value: string): string | null {
  const base = value.trim();
  if (!base || base.includes('#') || base.includes('+')) return null;
  if (base.startsWith('/') || base.endsWith('/')) return null;
  return base;
}

/** Can it be offered in the partner picker? (not the device itself, not ignored) */
export function partnerOptions(devices: Device[], self: Device): Device[] {
  return monitored(devices)
    .filter((d) => d.id !== self.id)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export type GroupBy = 'area' | 'status' | 'none';

/** Search across name, area, manufacturer and model (case-insensitive). */
export function search(devices: Device[], query: string): Device[] {
  const q = query.trim().toLowerCase();
  if (!q) return devices;
  return devices.filter((d) =>
    [d.name, d.area, d.manufacturer, d.model].some((v) => v?.toLowerCase().includes(q))
  );
}

const STATUS_ORDER: Status[] = ['failed', 'check', 'watch', 'learning', 'ok'];

/** Groups for the device list. Without grouping, one group with an empty title. */
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

/** Times in 24 h format on a half-hour grid (plus a differing stored value). */
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

/** The most recently recorded battery change across all devices. */
export function lastReplaced(devices: Device[]): { device: Device; at: number } | null {
  let best: { device: Device; at: number } | null = null;
  for (const device of devices) {
    const at = device.battery.replaced.at(-1);
    if (at !== undefined && (best === null || at > best.at)) best = { device, at };
  }
  return best;
}

/** Swipe the sheet away: dragged far enough or flicked down quickly (px, px/ms). */
export function shouldDismiss(dy: number, velocity: number): boolean {
  return dy > 120 || (dy > 24 && velocity > 0.5);
}

/** Device list filter (from overview/notifications): a status, "ignored", important, battery, mains (beta). */
export type DeviceFilter = Status | 'ignored' | 'important' | 'battery' | 'mains';

/** Battery topic: low/missing battery or due in the coming weeks (`due` = device IDs). */
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
  if (filter === 'mains') return monitored(devices).filter((d) => d.mains);
  return monitored(devices).filter((d) => d.status === filter);
}

/** Important devices (monitored). */
export function importantCount(devices: Device[]): number {
  return monitored(devices).filter((d) => d.critical).length;
}

/** Short date as in iOS lists: "Heute", "Gestern", "3. Okt.", with the year only if not the current one. */
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

/** Who needs something right now: check/offline get actions (change, remind). */
export function needsAction(device: Device): boolean {
  return !device.ignored && SEVERITY[device.status] >= 2;
}

/** Reasons of the "Batterie" (battery) level (like `BATTERY_REASONS` on the server). */
export const BATTERY_REASONS: ReadonlySet<string> = new Set(['battery_low', 'battery_low_flag']);

/** "Batterie gewechselt" (battery changed) is the main action only for a battery reason, else "Morgen erinnern". */
export function batteryFirst(device: Device): boolean {
  const b = device.battery;
  // A silent battery that was already low is almost certainly empty too (same 20 % as the server)
  const weak = (b.flag && b.low) || (b.trusted && b.level !== null && b.level <= 20);
  return BATTERY_REASONS.has(device.reason_key ?? '') || weak;
}

/** Toggle important: back to the automatic value = null (the server decides again by itself). */
export function criticalChange(device: Device, on: boolean): boolean | null {
  return on === device.critical_auto ? null : on;
}

/** Line under "Batterien" (batteries): how many are low (same threshold as the status) and which. */
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

// ── Direction "Puls": headline, monitor, day band, heartbeat ────────────────

/** May the logged-in user change anything? Admins only (the server checks this as well). */
export function canEdit(user: HassUser | undefined): boolean {
  return user?.is_admin === true;
}

/** When silence starts counting: `silence_from` from the server, for older servers the last report. */
export function silenceStart(device: Device): number | null {
  return device.silence_from === undefined ? device.last_activity : device.silence_from;
}

/**
 * Start of the silence for headline and bar: `silence_start` from the server (last *regular*
 * report, sporadic ones after it do not count), otherwise `silenceStart` as before.
 */
export function quietSince(device: Device): number | null {
  return typeof device.silence_start === 'number' ? device.silence_start : silenceStart(device);
}

/** Sporadic reports since the start of the silence (0 = real silence or older server). */
export function strays(device: Device): number {
  return typeof device.strays === 'number' && device.strays > 0 ? device.strays : 0;
}

/** After "Batterie gewechselt" (battery changed): waiting for the first real report (status watch). */
export function isWaiting(device: Device): boolean {
  return !device.ignored && device.reason_key === 'waiting_first';
}

/** Reasons concerning the rhythm (not just the battery). */
const OFF_RHYTHM = new Set([
  'silent',
  'silent_new',
  'unavailable',
  'unavailable_usual',
  'partner',
  'radio_only',
]);
const SILENT = new Set(['silent', 'silent_new']);

/** Duration as a phrase for "seit …" (since …): 12 Minuten, 5 Stunden, 4 Tagen. */
export function span(language: string, seconds: number): string {
  // Same rounding as the server (texts.py), so pill, headline and reason name the same number
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

/** "gestern" (yesterday) or weekday if the silence began 1–6 calendar days ago; otherwise null. */
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

/** Is the device silent (and not just the battery low)? */
export function isSilent(device: Device): boolean {
  return (
    !device.ignored &&
    SEVERITY[device.status] >= 1 &&
    quietSince(device) !== null &&
    SILENT.has(device.reason_key ?? '')
  );
}

/** Out of rhythm: silence, unreachable or partner active (a low battery does not count). */
export function offRhythm(device: Device): boolean {
  return SEVERITY[device.status] >= 1 && OFF_RHYTHM.has(device.reason_key ?? '');
}

export interface Hero {
  line1: string;
  line1Short: string;
  line2: string;
  line2Short: string;
  /** Color of the second line: gradient only when all are in rhythm */
  tone: 'accent' | 'warn' | 'crit' | 'plain';
  /** Subline ("2 von 10 im Takt.", 2 of 10 in rhythm), empty when there is nothing to say */
  sub: string;
}

function plainHero(line1: string, line2: string, heroTone: Hero['tone'], sub = ''): Hero {
  return { line1, line1Short: line1, line2, line2Short: line2, tone: heroTone, sub };
}

/**
 * Large headline of the overview. If a device needs you, that comes first ("8 Geräte / brauchen
 * dich." in warning/red tone) with "2 von 10 im Takt." below; otherwise "Alle 10 Geräte / schlagen im
 * Takt." (with gradient) or "9 von 10 Geräten / schlagen im Takt." (without gradient).
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
    // Singular: "Dein einziges Gerät / schlägt im Takt." or "… / braucht dich." / "… / ist still."
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

/** One sentence per conspicuous device (at most two), with the name highlighted. */
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
  // Learning devices do not count as "im Takt" (in rhythm); they get their own sentence
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
      // Dying sensor: hardly anything for days, a sporadic report now and then
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
    if (key === 'unavailable' || key === 'unavailable_usual')
      return mention(language, 'sent_unavailable', d, {});
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

/** "Ein Gerät / 3 Geräte lernt Pulse noch kennen." (Pulse is still learning one device / 3 devices) */
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

/** Monitor sections: Braucht dich / Im Blick / Im Takt / Lernt noch (empty ones are dropped). */
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

/** From this many devices on, "Im Takt" (in rhythm) shows collapsible rooms. */
export const ROOMS_FROM = 12;

/** "Seit 4 Tagen still" (silent for 4 days) for the breaking-off bar; only on silence, not on low battery. */
export function silenceFlag(language: string, device: Device, now: number): string | null {
  const since = quietSince(device);
  if (!isSilent(device) || since === null) return null;
  return t(language, strays(device) ? 'flag_strays' : 'flag_silent', {
    span: span(language, now - since),
  });
}

/** Pill in the bar: "Seit 4 Tagen still", "Wartet" (after a battery change) or "Lernt noch". */
export function rhythmPill(language: string, device: Device, now: number): string {
  if (device.ignored) return '';
  const flag = silenceFlag(language, device, now);
  if (flag) return flag;
  if (isWaiting(device)) return t(language, 'pill_waiting');
  if (device.status === 'learning') return t(language, 'pill_learning');
  return '';
}

/** Status word on the right in the monitor (null = only the time). */
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

/** Condense the bar into fewer bars (phone): sums per group, entirely in the future = null. */
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

/** "22:00" → 22, "07:30" → 7.5 */
export function hoursOf(time: string): number {
  const [h = '0', m = '0'] = time.split(':');
  return Number(h) + Number(m) / 60;
}

/** Quiet time as ranges in hours 0–24 (across midnight = two ranges). */
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

/** Short headline in the device detail with color. */
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
  if (key === 'unavailable' || key === 'unavailable_usual')
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

/** Sentence under the headline: on silence rhythm + last report, otherwise the reason from the server. */
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

/** Sentence under the partner comparison. */
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
  /** Real local midnights: day i covers [dayStarts[i], dayStarts[i+1]) */
  dayStarts: number[];
  /** Per device one list per day (92/96/100 windows for 23/24/25 h) */
  devices: Record<string, (number | null)[][]>;
  /** Times without data: [from, to] in seconds */
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

/** Validate time spans without data (without casts); unusable ones are dropped. */
export function parseSpans(value: unknown): [number, number][] {
  return Array.isArray(value) ? value.filter(isSpan) : [];
}

/**
 * Times without data as fractions of a bar (0–1), e.g. for the hatching in the rhythm bar.
 * Every day is equally wide; within a day its real length counts. Empty if nothing falls into the
 * window.
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

/** Validate the `pulse/heartbeat` response (without casts). */
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
 * Strokes of the heartbeat calendar for one day: position as a fraction of the day (0–1, by real
 * day length) and strength per window.
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

/** Height of a calendar stroke in px: 1 report 12, 2 reports 18, 3 or more reports 22. */
export function tickHeight(count: number): number {
  if (count >= 3) return 22;
  return count === 2 ? 18 : 12;
}

/** At most this many sporadic reports after the break-off still count as "silent". */
const MAX_STRAYS = 2;

/**
 * First silent window of the bar (−1 = not silent): the window after the last *regular* report.
 * If after a long gap only one or two sporadic reports came (a dying sensor), the silence already
 * starts before the gap; the strays then appear as bars on the dashed line.
 */
export function silentIndex(device: Device, dayStarts: number[]): number {
  const since = silenceStart(device);
  if (!isSilent(device) || since === null || dayStarts.length < 2) return -1;
  // New server: the start of the silence is fixed (stray rule there); window after that report
  if (typeof device.silence_start === 'number') {
    const at = stripIndex(device.silence_start, dayStarts);
    return at < 0 ? 0 : at + 1;
  }
  const days = dayStarts.length - 1;
  // Mean window length (for the gap in windows); hardly different on DST changes
  const size = ((dayStarts[days] ?? 0) - (dayStarts[0] ?? 0)) / (days * WINDOWS_PER_DAY);
  const last = stripIndex(since, dayStarts);
  if (last < 0) return 0;
  const active: number[] = [];
  device.strip.forEach((count, i) => {
    if (count && i <= last) active.push(i);
  });
  // Gap from which a report counts as sporadic: three windows or three times the usual rhythm
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
 * Start of the dashed silence in the heartbeat calendar (−1 = not silent). The silence starts after
 * the last report: `silence_from`, but never before the end of the last window with a report;
 * otherwise strokes would sit on the silence line. (Previously the start came from the 2 h bar:
 * rounded down to its window boundary and pulled before the gap for sporadic reports, hence violet
 * strokes on the red line.)
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

/** Text line in the day band: "18:00 Zusammenfassung · Ruhe 22:00 bis 07:30". */
export function daybandLine(language: string, settings: Settings): string {
  const q = settings.quiet;
  return [
    t(language, 'day_line_summary', { time: settings.summary_time }),
    q.enabled
      ? t(language, 'day_line_quiet', { start: q.start, end: q.end })
      : t(language, 'day_line_no_quiet'),
  ].join(' · ');
}

/** Selected persons for arriving home (older servers still send `person`). */
export function arrivePersons(settings: Settings): string[] {
  const persons: unknown = Reflect.get(settings.arrive_home, 'persons');
  if (Array.isArray(persons)) return persons.filter((p): p is string => typeof p === 'string');
  const person: unknown = Reflect.get(settings.arrive_home, 'person');
  return typeof person === 'string' ? [person] : [];
}

/**
 * Headline of the notifications page: "Pulse meldet sich um 18:00. / Ruhe 22:00–07:30." and a sentence
 * on what comes when, in the style of the overview instead of a bare form.
 */
export function settingsHero(
  language: string,
  settings: Settings
): { line1: string; line2: string; sub: string } {
  const q = settings.quiet;
  // Merge equal levels: "Ausfälle sofort, Prüfen und Batterien in der Zusammenfassung."
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
    // Recipients are already in the day band next to it; here only what comes when
    sub: levels,
  };
}

/**
 * Range [from, to] without the gaps (e.g. times when Pulse was not running): the silence line is
 * interrupted there instead of lying over the hatching. All values in the same unit (0–1 or similar).
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

// ── 1.1: forecast, due batteries, cloud outages ────────────────────────────

const FORECAST_REASONS: Record<ForecastReason, StringKey> = {
  too_short: 'forecast_too_short',
  flat: 'forecast_flat',
  coarse: 'forecast_coarse',
  untrusted: 'forecast_untrusted',
  noisy: 'forecast_noisy',
};

/**
 * Runtime as a rough range, never to the day: "Hält noch ca. 3–5 Wochen", "… 2–4 Monate",
 * "… 1–2 Jahre", under ~10 days "Hält nur noch wenige Tage". Without a forecast the short reason
 * (or empty if the server gives none).
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

/** "2× CR2032, 1× AA": due batteries summed up by type (unknown type last). */
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
  // Without a known type: name the device so one knows where to look
  if (untyped.length) items.push(t(language, 'due_untyped', { names: untyped.join(', ') }));
  return t(language, 'due_line', { items: items.join(', ') });
}

/** Display name of an integration from its domain: netatmo → Netatmo, tado_x → Tado x. */
export function integrationName(domain: string): string {
  const name = domain.replaceAll('_', ' ').trim();
  return name ? `${name.charAt(0).toUpperCase()}${name.slice(1)}` : domain;
}

/** Calm collective notice per silent cloud: "Netatmo-Cloud antwortet nicht – 3 Geräte betroffen". */
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

/** Partner suggestions that are offered: only without a set partner, at most 3. */
export function partnerSuggestions(device: Device): { id: string; name: string }[] {
  if (device.partner || device.ignored) return [];
  // One suggestion at a time (the strongest); once dismissed, the next one comes
  return (device.partner_suggestions ?? []).slice(0, 1);
}

/** Subscription retry after an error: 2 s, then doubled up to at most 60 s; a success resets it. */
export const RETRY_FIRST = 2000;
export const RETRY_MAX = 60_000;

export function nextRetryDelay(delay: number): number {
  return Math.min(Math.max(delay, RETRY_FIRST) * 2, RETRY_MAX);
}

const SEPARATOR = ' · ';

/**
 * Own notification text filled in like the server does (texts.render): known placeholders replaced, empty
 * values vanish with their " · " separator, unknown placeholders stay as written.
 */
export function renderTemplate(
  template: string,
  values: Record<string, string | null>,
  known: string[]
): string {
  const filled = template.replace(/\{(\w+)\}/g, (match, name: string) =>
    known.includes(name) ? (values[name] ?? '') : match
  );
  return filled
    .split('\n')
    .map((line) =>
      line
        .split(SEPARATOR)
        .filter((part) => part.trim())
        .join(SEPARATOR)
    )
    .join('\n')
    .trim();
}

/** Example values for the template preview: a real device (room only if not already in its name). */
export function templateExample(device: Device | undefined): Record<string, string | null> {
  if (!device) return {};
  const area =
    device.area && !device.name.toLocaleLowerCase().includes(device.area.toLocaleLowerCase())
      ? device.area
      : null;
  return {
    name: device.name,
    area,
    reason: device.reason,
    model: device.model,
    manufacturer: device.manufacturer,
    integration: device.integration,
  };
}
