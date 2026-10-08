import { describe, expect, it } from 'vitest';
import {
  ago,
  applyFilter,
  arrivePersons,
  attention,
  axisColumns,
  batteryLine,
  canEdit,
  cleanZ2mBase,
  daybandLine,
  dayLabels,
  dayNumber,
  dayStartsOf,
  dayTicks,
  detailHeadline,
  detailText,
  every,
  formatVoltage,
  formatWhen,
  gapFractions,
  groupDevices,
  groups,
  heartbeatSilence,
  hero,
  heroSentences,
  hourMarks,
  hourOfDay,
  hoursOf,
  isSilent,
  isWaiting,
  lastReplaced,
  learningLine,
  memoize,
  monitorGroups,
  needsAction,
  offRhythm,
  parseHeartbeat,
  partnerLine,
  partnerOptions,
  quietRanges,
  resample,
  rhythmPill,
  rhythmTone,
  search,
  settingsHero,
  shortDate,
  shouldDismiss,
  silenceFlag,
  silenceStart,
  silentIndex,
  sinceDay,
  span,
  statusWord,
  stripHeights,
  stripIndex,
  tickHeight,
  timeFormatOf,
  timeFraction,
  timeOptions,
  tone,
  validTimeZone,
} from '../logic';
import { t } from '../strings';
import type { Device, Settings, Snapshot } from '../types';

function device(id: string, extra: Partial<Device> = {}): Device {
  return {
    id,
    name: id,
    area: null,
    manufacturer: null,
    model: null,
    integration: 'mqtt',
    icon: 'mdi:battery',
    status: 'ok',
    reason: '',
    reason_key: 'ok',
    critical: false,
    critical_auto: false,
    critical_manual: null,
    ignored: false,
    last_activity: null,
    typical: null,
    samples: 0,
    unavailable_since: null,
    battery: {
      level: null,
      flag: false,
      low: false,
      voltage: null,
      type: null,
      count: null,
      chemistry: null,
      trusted: true,
      replaced: [],
      entity: null,
    },
    partner: null,
    partner_name: null,
    snooze_until: null,
    strip: [],
    zigbee: false,
    exact: false,
    ...extra,
  };
}

function snapshot(devices: Device[], summary: Partial<Snapshot['summary']> = {}): Snapshot {
  return {
    now: 0,
    strip_start: 0,
    strip_days: 7,
    bucket_hours: 4,
    language: 'de',
    bootstrapped: true,
    devices,
    summary: {
      total: devices.length,
      problems: 0,
      watch: 0,
      learning: 0,
      next_battery: null,
      ...summary,
    },
    settings: {
      targets: null,
      levels: { failed: 'now', check: 'daily', battery: 'daily' },
      summary_time: '18:00',
      quiet: { enabled: true, start: '22:00', end: '07:30' },
      critical_alerts: true,
      arrive_home: { enabled: false, persons: [] },
      recovered: true,
      z2m_base: 'zigbee2mqtt',
    },
    targets: [],
    persons: [],
    z2m: {
      present: false,
      last_seen: false,
      availability: false,
      version: null,
      devices: 0,
      requested_at: null,
    },
    battery_types: [],
    chemistries: [],
  };
}

describe('Status und Listen', () => {
  it('ordnet Töne zu', () => {
    expect(tone('failed')).toBe('crit');
    expect(tone('check')).toBe('warn');
    expect(tone('watch')).toBe('warn');
    expect(tone('learning')).toBe('muted');
    expect(tone('ok')).toBe('ok');
  });

  it('zeigt nur Prüfen/Ausgefallen als Aufmerksamkeit, Ausgefallen zuerst, ohne Ignorierte', () => {
    const list = attention([
      device('b', { status: 'check' }),
      device('a', { status: 'failed' }),
      device('c', { status: 'watch' }),
      device('d', { status: 'failed', ignored: true }),
    ]);
    expect(list.map((d) => d.id)).toEqual(['a', 'b']);
  });

  it('gruppiert nach Raum, ohne Raum zuletzt', () => {
    const result = groups(
      [
        device('x', { area: 'Bad' }),
        device('y'),
        device('z', { area: 'Küche' }),
        device('w', { area: 'Bad' }),
      ],
      'Ohne Raum'
    );
    expect(result.map((g) => g.area)).toEqual(['Bad', 'Küche', 'Ohne Raum']);
    expect(result[0]?.devices.map((d) => d.id)).toEqual(['w', 'x']);
  });

  it('bietet als Partner alle anderen überwachten Geräte an', () => {
    const self = device('a');
    const options = partnerOptions(
      [self, device('c'), device('b'), device('d', { ignored: true })],
      self
    );
    expect(options.map((d) => d.id)).toEqual(['b', 'c']);
  });
});

describe('Texte', () => {
  it('Batteriezeile: keine schwach oder wie viele und welche', () => {
    expect(batteryLine('de', [])).toEqual({ label: 'Keine schwach', value: '', tone: 'ok' });
    expect(batteryLine('de', ['Thermometer Keller'])).toEqual({
      label: '1 schwach',
      value: 'Thermometer Keller',
      tone: 'warn',
    });
    expect(batteryLine('de', ['A', 'B']).label).toBe('2 schwach');
  });

  it('formatiert Abstände', () => {
    expect(ago('de', null, 100)).toBe('—');
    expect(ago('de', 100, 120)).toBe('gerade eben');
    expect(ago('de', 0, 600)).toBe('vor 10 Min.');
    expect(ago('de', 0, 7200)).toBe('vor 2 Std.');
    expect(ago('de', 0, 86400)).toBe('gestern');
    expect(ago('en', 0, 5 * 86400)).toBe('5 days ago');
    expect(every('de', 1800)).toBe('alle 30 Min.');
    expect(every('de', 3 * 3600)).toBe('alle 3 Std.');
    expect(every('de', 3 * 86400)).toBe('alle 3 Tage');
  });

  it('ersetzt Platzhalter und lässt unbekannte stehen', () => {
    expect(t('de', 'battery_low_many', { count: 3 })).toBe('3 schwach');
    expect(t('en', 'battery_low_many')).toBe('{count} low');
  });

  it('beschriftet die Achse mit heute am Ende', () => {
    const starts = Array.from({ length: 8 }, (_, i) => i * 86400);
    const labels = dayLabels('de', starts, 'UTC');
    expect(labels).toHaveLength(7);
    expect(labels[0]).toMatch(/^Do/); // 1. 1. 1970
    expect(labels[6]).toBe('heute');
  });
});

describe('Rhythmusleiste', () => {
  it('normiert auf das 90. Perzentil und behält Zukunft als null', () => {
    const h = stripHeights([0, 2, 4, 100, null]);
    expect(h[0]).toBe(0);
    expect(h[3]).toBe(1);
    expect(h[4]).toBeNull();
    expect(h[1]).toBeGreaterThan(0);
  });

  it('leere Leiste bleibt leer', () => {
    expect(stripHeights([0, 0, null])).toEqual([0, 0, null]);
  });
});

describe('Geräteliste', () => {
  const list = [
    device('Thermo', { area: 'Bad', status: 'failed', model: 'WSDCGQ11LM' }),
    device('Kontakt', { area: 'Flur', status: 'ok' }),
    device('Schloss', { area: 'Flur', status: 'check' }),
    device('Alt', { ignored: true }),
  ];

  it('sucht in Name, Bereich und Modell', () => {
    expect(search(list, 'flur').map((d) => d.id)).toEqual(['Kontakt', 'Schloss']);
    expect(search(list, 'wsdc').map((d) => d.id)).toEqual(['Thermo']);
    expect(search(list, '  ')).toHaveLength(4);
  });

  it('gruppiert nach Status in fester Reihenfolge, ohne Ignorierte', () => {
    const g = groupDevices(list, 'status', 'de', 'Ohne Bereich');
    expect(g.map((x) => x.area)).toEqual(['Ausgefallen', 'Prüfen', 'Gut']);
    expect(groupDevices(list, 'none', 'de', '-')[0]?.devices.map((d) => d.id)).toEqual([
      'Alt',
      'Kontakt',
      'Schloss',
      'Thermo',
    ]);
    expect(groupDevices(list, 'area', 'de', 'Ohne Bereich').map((x) => x.area)).toEqual([
      'Bad',
      'Flur',
    ]);
  });

  it('findet den letzten Batteriewechsel', () => {
    const battery = (replaced: number[]) => ({ ...device('x').battery, replaced });
    const result = lastReplaced([
      device('a', { battery: battery([5, 50]) }),
      device('b', { battery: battery([20]) }),
    ]);
    expect(result?.device.id).toBe('a');
    expect(result?.at).toBe(50);
    expect(lastReplaced([device('c')])).toBeNull();
  });

  it('bietet Uhrzeiten im 24-h-Raster an', () => {
    const times = timeOptions();
    expect(times).toHaveLength(48);
    expect(times[0]).toBe('00:00');
    expect(times).toContain('18:00');
    expect(timeOptions('07:45')).toContain('07:45');
  });
});

describe('Bedienung', () => {
  it('Blatt schließt bei weitem oder schnellem Wischen', () => {
    expect(shouldDismiss(130, 0.1)).toBe(true);
    expect(shouldDismiss(40, 0.8)).toBe(true);
    expect(shouldDismiss(40, 0.2)).toBe(false);
    expect(shouldDismiss(10, 2)).toBe(false);
    expect(shouldDismiss(-50, 1)).toBe(false);
  });

  it('filtert nach Status oder Ignorierten, ohne Filter alles', () => {
    const list = [
      device('a', { status: 'failed' }),
      device('b', { status: 'ok' }),
      device('c', { status: 'failed', ignored: true }),
    ];
    expect(applyFilter(list, null)).toHaveLength(3);
    expect(applyFilter(list, 'failed').map((d) => d.id)).toEqual(['a']);
    expect(applyFilter(list, 'ignored').map((d) => d.id)).toEqual(['c']);
  });

  it('kurzes Datum: Heute, Gestern, sonst ohne Jahr', () => {
    const now = new Date(2026, 9, 3, 15, 0).getTime() / 1000;
    expect(shortDate('de', now - 3600, now)).toBe('Heute');
    expect(shortDate('de', now - 86400, now)).toBe('Gestern');
    expect(shortDate('de', new Date(2026, 8, 20, 9).getTime() / 1000, now)).toBe('20. Sept.');
    expect(shortDate('de', new Date(2025, 8, 20, 9).getTime() / 1000, now)).toBe('20. Sept. 2025');
  });

  it('Hauptaktion nur für Prüfen/Ausgefallen', () => {
    expect(needsAction(device('a', { status: 'failed' }))).toBe(true);
    expect(needsAction(device('a', { status: 'check' }))).toBe(true);
    expect(needsAction(device('a', { status: 'ok' }))).toBe(false);
    expect(needsAction(device('a', { status: 'failed', ignored: true }))).toBe(false);
  });
});

describe('Richtung Puls', () => {
  const NOW = Date.UTC(2026, 9, 3, 9, 41) / 1000; // Samstag
  const H = 3600;
  const D = 86400;
  const door = device('Türkontakt', {
    status: 'failed',
    reason: 'Seit 4 Tagen still. Meldet sich sonst alle 3 Stunden.',
    reason_key: 'silent',
    last_activity: NOW - 4 * D - 2 * H,
    typical: 3 * H,
    partner: 'Schloss',
    partner_name: 'Schloss',
  });
  const cellar = device('Keller', {
    status: 'watch',
    reason_key: 'battery_soon',
    battery: { ...device('x').battery, level: 12 },
  });
  const lock = device('Schloss', { last_activity: NOW - 600 });

  it('Dauer und Wochentag', () => {
    expect(span('de', 30)).toBe('1 Minuten');
    expect(span('de', 5 * H)).toBe('5 Stunden');
    expect(span('de', H)).toBe('1 Stunde');
    expect(span('de', D + H)).toBe('1 Tag');
    expect(span('de', 4.2 * D)).toBe('4 Tagen');
    expect(sinceDay('de', NOW - D, NOW)).toBe('gestern');
    expect(sinceDay('de', NOW - 4 * D, NOW)).toBe('Dienstag');
    expect(sinceDay('de', NOW - 10 * D, NOW)).toBeNull();
    expect(sinceDay('de', NOW - 60, NOW)).toBeNull();
  });

  it('still vs. nur schwache Batterie', () => {
    expect(isSilent(door)).toBe(true);
    expect(isSilent(cellar)).toBe(false);
    expect(isSilent({ ...door, ignored: true })).toBe(false);
    expect(offRhythm(door)).toBe(true);
    expect(offRhythm(cellar)).toBe(false);
  });

  it('Schlagzeile', () => {
    const h = hero('de', [door, cellar, lock]);
    expect(h.line1).toBe('2 von 3 Geräten');
    expect(h.line1Short).toBe('2 von 3');
    expect(h.line2).toBe('schlagen im Takt.');
    expect(h.line2Short).toBe('im Takt.');
    expect(hero('de', [lock, cellar]).line1).toBe('Alle 2 Geräte');
    expect(hero('de', [device('n', { status: 'learning' })]).line2).toBe('lernt noch.');
    expect(hero('de', []).line1).toBe('Noch keine');
  });

  it('Sätze unter der Schlagzeile', () => {
    const said = heroSentences('de', [cellar, door, lock], NOW);
    expect(said.mentions).toHaveLength(2);
    const [first, second] = said.mentions;
    expect(first?.name).toBe('Türkontakt');
    expect(`${first?.before}${first?.name}${first?.after}`).toBe(
      'Türkontakt ist seit Dienstag still.'
    );
    expect(first?.tone).toBe('crit');
    expect(`${second?.name}${second?.after}`).toBe('Keller braucht bald eine neue Batterie.');
    expect(said.more).toBe(0);
    const many = heroSentences(
      'de',
      [
        door,
        device('a', { status: 'check', reason_key: 'unavailable' }),
        device('b', { status: 'check', reason_key: 'partner', partner_name: 'P' }),
        device('c', { status: 'check', reason_key: 'battery_low' }),
      ],
      NOW
    );
    expect(many.more).toBe(2);
    expect(many.text).toBe('Und 2 weitere.');
    expect(heroSentences('de', [lock], NOW).text).toBe('Alle melden sich wie gewohnt.');
    const recent = heroSentences('de', [{ ...door, last_activity: NOW - 5 * H }], NOW - 0);
    expect(recent.mentions[0]?.after).toContain('Stunden');
    const odd = heroSentences(
      'de',
      [device('z', { status: 'check', reason_key: 'x', reason: 'Hm.' })],
      NOW
    );
    expect(odd.mentions[0]?.after).toBe(': Hm.');
    const partner = heroSentences(
      'de',
      [device('y', { status: 'check', reason_key: 'partner', partner_name: 'P' })],
      NOW
    );
    expect(partner.mentions[0]?.after).toContain('P');
    expect(heroSentences('de', [device('l', { status: 'learning' })], NOW).text).toContain('lernt');
    expect(
      heroSentences('de', [device('u', { status: 'failed', reason_key: 'unavailable' })], NOW)
        .mentions[0]?.after
    ).toContain('erreichbar');
    expect(
      heroSentences('de', [device('v', { status: 'check', reason_key: 'battery_low' })], NOW)
        .mentions[0]?.after
    ).toContain('eine neue');
  });

  it('Monitor-Abschnitte', () => {
    const learning = device('L', { status: 'learning' });
    const g = monitorGroups([lock, door, cellar, learning, device('I', { ignored: true })]);
    expect(g.map((x) => x.key)).toEqual(['need', 'watch', 'rhythm', 'learning']);
    expect(monitorGroups([lock]).map((x) => x.key)).toEqual(['rhythm']);
  });

  it('Stille in der Leiste', () => {
    expect(silenceFlag('de', door, NOW)).toBe('Seit 4 Tagen still');
    expect(silenceFlag('de', cellar, NOW)).toBeNull();
    const start = NOW - 7 * D;
    // 7 Tage à 24 h → 12 Fenster à 2 h je Tag
    const starts = Array.from({ length: 8 }, (_, i) => start + i * D);
    expect(silentIndex(door, starts)).toBe(Math.floor((door.last_activity! - start) / (2 * H)) + 1);
    expect(silentIndex({ ...door, last_activity: start - D }, starts)).toBe(0);
    expect(silentIndex(lock, starts)).toBe(-1);
    // silence_from (z. B. späterer Batteriewechsel) schlägt die letzte Meldung
    expect(silentIndex({ ...door, silence_from: start + 50 * 2 * H + 1 }, starts)).toBe(51);
    // Regelmäßig bis Fenster 40, dann lange nichts, dann eine vereinzelte Meldung in Fenster 80:
    // die Stille beginnt nach der letzten regelmäßigen Meldung, nicht nach dem Ausreißer
    const strip = Array.from({ length: 84 }, (_, i) => (i <= 40 || i === 80 ? 2 : 0));
    const stray = { ...door, strip, typical: 2 * H, last_activity: start + 80 * 2 * H + 60 };
    expect(silentIndex(stray, starts)).toBe(41);
    // Drei Ausreißer sind wieder ein Takt: dann zählt die letzte Meldung
    const busy = Array.from({ length: 84 }, (_, i) => (i <= 40 || i >= 78 ? 2 : 0));
    expect(silentIndex({ ...stray, strip: busy }, starts)).toBe(81);
  });

  it('Statuswort rechts', () => {
    expect(statusWord('de', door, NOW)).toEqual({ text: 'Ausgefallen', tone: 'crit' });
    expect(statusWord('de', cellar, NOW)).toEqual({ text: 'Batterie 12 %', tone: 'warn' });
    expect(statusWord('de', lock, NOW)).toBeNull();
    expect(statusWord('de', { ...lock, ignored: true }, NOW)?.tone).toBe('muted');
    expect(statusWord('de', device('n', { status: 'learning' }), NOW)?.text).toBe('Lernt');
    const fresh = device('f', { battery: { ...lock.battery, replaced: [NOW - H] } });
    expect(statusWord('de', fresh, NOW)).toEqual({ text: 'Neue Batterie', tone: 'ok' });
  });

  it('Leiste fürs Handy zusammenfassen', () => {
    expect(resample([1, 2, 3, 4, null, null], 3)).toEqual([3, 7, null]);
    expect(resample([1, 2], 4)).toEqual([1, 2]);
    expect(resample([0, null, 5], 2)).toEqual([0, 5]);
  });

  it('Ruhezeit als Bereiche', () => {
    expect(hoursOf('07:30')).toBe(7.5);
    expect(quietRanges('22:00', '07:30')).toEqual([
      [0, 7.5],
      [22, 24],
    ]);
    expect(quietRanges('13:00', '15:00')).toEqual([[13, 15]]);
    expect(quietRanges('08:00', '08:00')).toEqual([]);
  });

  it('Gerätedetail: Schlagzeile und Satz', () => {
    expect(detailHeadline('de', door, NOW)).toEqual({ text: 'Still seit 4 Tagen.', tone: 'crit' });
    expect(detailHeadline('de', { ...door, status: 'watch' }, NOW).text).toBe('Ungewohnt still.');
    expect(detailHeadline('de', cellar, NOW).text).toBe('Batterie bei 12 %.');
    expect(detailHeadline('de', lock, NOW)).toEqual({ text: 'Im Takt.', tone: 'accent' });
    expect(detailHeadline('de', { ...lock, ignored: true }, NOW).text).toBe('Nicht überwacht.');
    expect(detailHeadline('de', device('n', { status: 'learning' }), NOW).text).toBe('Lernt noch.');
    expect(
      detailHeadline('de', device('u', { status: 'check', reason_key: 'unavailable' }), NOW).text
    ).toBe('Nicht erreichbar.');
    expect(
      detailHeadline('de', device('p', { status: 'check', reason_key: 'partner' }), NOW).text
    ).toBe('Schweigt, Partner aktiv.');
    expect(detailText('de', door)).toMatch(/^Meldet sich sonst alle 3 Std\. Zuletzt /);
    expect(detailText('de', cellar)).toBe('');
  });

  it('Partner-Vergleich', () => {
    expect(partnerLine('de', door, lock)).toBe(
      'Schloss meldet sich weiter – nur Türkontakt schweigt.'
    );
    expect(partnerLine('de', lock, lock)).toBe('Beide melden sich wie gewohnt.');
    expect(partnerLine('de', door, door)).toBe('');
  });

  it('Herzschlag-Antwort prüfen und Striche je Tag', () => {
    const ok = parseHeartbeat({
      start: 1,
      days: 2,
      bin_minutes: 15,
      day_starts: [1, 86401, 172801],
      devices: { a: [[0, 2], [null]], b: [0, 2], c: [['x']] },
    });
    expect(ok?.devices).toEqual({ a: [[0, 2], [null]] });
    expect(ok?.dayStarts).toEqual([1, 86401, 172801]);
    expect(ok?.noData).toEqual([]);
    // Ohne (gültige) Tagesgrenzen: gleichmäßig ab start
    expect(parseHeartbeat({ start: 0, days: 2, bin_minutes: 15, devices: {} })?.dayStarts).toEqual([
      0, 86400, 172800,
    ]);
    expect(
      parseHeartbeat({ start: 0, days: 2, bin_minutes: 15, day_starts: [0, 5, 3], devices: {} })
        ?.dayStarts
    ).toEqual([0, 86400, 172800]);
    expect(
      parseHeartbeat({ start: 1, days: 7, bin_minutes: 15, devices: {}, no_data: [[1, 2], ['x']] })
        ?.noData
    ).toEqual([[1, 2]]);
    expect(parseHeartbeat(null)).toBeNull();
    expect(parseHeartbeat({ start: 'x' })).toBeNull();
    expect(parseHeartbeat({ start: 1, days: 7, bin_minutes: 15, devices: null })).toBeNull();
    const day = Array.from({ length: 96 }, (_, i) => (i === 1 ? 3 : 0));
    expect(dayTicks(day, 86400, 15)).toEqual([{ at: 1.5 / 96, count: 3 }]);
    expect(dayTicks([0, null], 86400, 15)).toEqual([]);
    // 25-h-Tag (Ende der Sommerzeit): 100 Fenster, das letzte endet am Tagesende
    const long = Array.from({ length: 100 }, (_, i) => (i === 99 ? 1 : 0));
    expect(dayTicks(long, 25 * 3600, 15)).toEqual([{ at: 99.5 / 100, count: 1 }]);
  });

  it('Zeiten ohne Daten als Anteile der Leiste', () => {
    const day = 86400;
    const starts = Array.from({ length: 8 }, (_, i) => i * day);
    expect(gapFractions([[day, 2 * day]], starts)).toEqual([[1 / 7, 2 / 7]]);
    // Ragt über das Fenster hinaus → abgeschnitten; ganz außerhalb → weg
    expect(gapFractions([[-day, day]], starts)).toEqual([[0, 1 / 7]]);
    expect(gapFractions([[8 * day, 9 * day]], starts)).toEqual([]);
    expect(gapFractions([[0, day]], [0])).toEqual([]);
    // Tage gleich breit: die Mitte eines 25-h-Tages liegt in der Mitte seiner Spalte
    const dst = [0, 25 * 3600, 49 * 3600];
    expect(timeFraction(12.5 * 3600, dst)).toBe(0.25);
    expect(timeFraction(25 * 3600 + 12 * 3600, dst)).toBe(0.75);
    expect(timeFraction(-5, dst)).toBe(0);
    expect(timeFraction(60 * 3600, dst)).toBe(1);
  });

  it('Schlagzeile der Mitteilungen fasst gleiche Stufen zusammen', () => {
    const settings: Settings = {
      targets: null,
      levels: { failed: 'now', check: 'daily', battery: 'daily' },
      summary_time: '18:00',
      quiet: { enabled: true, start: '22:00', end: '07:30' },
      critical_alerts: true,
      arrive_home: { enabled: false, persons: [] },
      recovered: true,
      z2m_base: 'zigbee2mqtt',
    };
    expect(settingsHero('de', settings, 'An Alex’ iPhone')).toEqual({
      line1: 'Pulse meldet sich um 18:00.',
      line2: 'Ruhe 22:00–07:30.',
      sub: 'An Alex’ iPhone. Ausfälle sofort, Auffälliges und Batterien in der Zusammenfassung.',
    });
    const off = { ...settings, quiet: { ...settings.quiet, enabled: false } };
    expect(settingsHero('de', off, '').line2).toBe('Ohne Ruhezeit.');
  });
});

describe('Zeitzone, Zeitumstellung und Einheiten', () => {
  const BERLIN = 'Europe/Berlin';
  // 25. 10. 2026: Ende der Sommerzeit in Berlin (der Tag hat 25 Stunden)
  const before = Date.UTC(2026, 9, 24, 22, 0) / 1000; // 25. 10. 00:00 MESZ
  const after = Date.UTC(2026, 9, 25, 23, 0) / 1000; // 26. 10. 00:00 MEZ

  it('Kalendertage und Uhrzeit in HAs Zeitzone', () => {
    expect(after - before).toBe(25 * 3600);
    expect(dayNumber(after, BERLIN) - dayNumber(before, BERLIN)).toBe(1);
    expect(dayNumber(after - 1, BERLIN)).toBe(dayNumber(before, BERLIN));
    expect(hourOfDay(after, BERLIN)).toBe(0);
    expect(hourOfDay(after + 18.5 * 3600, BERLIN)).toBe(18.5);
    // Dieselbe Sekunde ist in New York noch der Vortag
    expect(hourOfDay(after, 'America/New_York')).toBe(19);
    expect(shortDate('de', after - 3600, after + 3600, BERLIN)).toBe('Gestern');
    expect(sinceDay('de', before + 3600, after + 3600, BERLIN)).toBe('gestern');
  });

  it('ungültige Zeitzone fällt auf den Browser zurück', () => {
    expect(validTimeZone('Mars/Olympus')).toBeUndefined();
    expect(validTimeZone(undefined)).toBeUndefined();
    expect(validTimeZone(BERLIN)).toBe(BERLIN);
    expect(() => dayLabels('de', [0, 86400], 'Mars/Olympus')).not.toThrow();
  });

  it('Tagesgrenzen aus dem Snapshot, Achse nach echter Tageslänge', () => {
    const snap = snapshot([]);
    expect(dayStartsOf({ ...snap, strip_start: 10, strip_days: 2 })).toEqual([10, 86410, 172810]);
    const starts = [0, 86400, 86400 + 25 * 3600];
    expect(dayStartsOf({ ...snap, strip_days: 2, day_starts: starts })).toEqual(starts);
    // Je Tag genau 12 Fenster → gleich breite Spalten, auch am 25-h-Tag
    expect(axisColumns(starts)).toBe('repeat(2, minmax(0, 1fr))');
  });

  it('Spannung in mV oder V', () => {
    expect(formatVoltage('de', 3050)).toBe('3,05 V');
    expect(formatVoltage('en', 3050)).toBe('3.05 V');
    expect(formatVoltage('de', 950.4)).toBe('950 mV');
  });

  it('Zigbee2MQTT-Thema prüfen', () => {
    expect(cleanZ2mBase('  zigbee2mqtt ')).toBe('zigbee2mqtt');
    expect(cleanZ2mBase('home/z2m')).toBe('home/z2m');
    expect(cleanZ2mBase('')).toBeNull();
    expect(cleanZ2mBase('z2m/#')).toBeNull();
    expect(cleanZ2mBase('z2m/+/x')).toBeNull();
    expect(cleanZ2mBase('/z2m')).toBeNull();
    expect(cleanZ2mBase('z2m/')).toBeNull();
  });

  it('Leistenfarbe: Ignorierte grau, sonst nach Status', () => {
    expect(rhythmTone(device('a', { status: 'failed' }))).toBe('crit');
    expect(rhythmTone(device('a', { status: 'failed', ignored: true }))).toBe('muted');
    expect(rhythmTone(device('a'))).toBe('ok');
  });

  it('merkt sich das letzte Ergebnis nach Identität', () => {
    let calls = 0;
    const double = memoize((list: number[]) => {
      calls += 1;
      return list.map((x) => x * 2);
    });
    const input = [1, 2];
    const first = double(input);
    expect(double(input)).toBe(first);
    expect(calls).toBe(1);
    expect(double([1, 2])).not.toBe(first);
    expect(calls).toBe(2);
  });
});

describe('Zweite Runde', () => {
  const NOW = Date.UTC(2026, 9, 3, 9, 41) / 1000;
  const H = 3600;
  const D = 86400;
  const silent = device('Tür', {
    status: 'failed',
    reason_key: 'silent',
    last_activity: NOW - 4 * D,
    typical: 3 * H,
  });

  it('Stille zählt ab silence_from, sonst ab der letzten Meldung', () => {
    expect(silenceStart(silent)).toBe(NOW - 4 * D);
    const changed = { ...silent, silence_from: NOW - 2 * H };
    expect(silenceStart(changed)).toBe(NOW - 2 * H);
    expect(silenceStart({ ...silent, silence_from: null })).toBeNull();
    expect(detailHeadline('de', changed, NOW).text).toBe('Still seit 2 Stunden.');
    expect(silenceFlag('de', changed, NOW)).toBe('Seit 2 Stunden still');
    expect(heroSentences('de', [changed], NOW).mentions[0]?.after).toBe(
      ' ist seit 2 Stunden still.'
    );
  });

  it('wartet auf die erste Meldung nach dem Batteriewechsel', () => {
    const waiting = device('Melder', {
      status: 'watch',
      reason_key: 'waiting_first',
      reason: 'Wartet auf die erste Meldung.',
      last_activity: NOW - 3 * D,
      silence_from: NOW - H,
    });
    expect(isWaiting(waiting)).toBe(true);
    expect(isWaiting({ ...waiting, ignored: true })).toBe(false);
    expect(isSilent(waiting)).toBe(false);
    expect(statusWord('de', waiting, NOW)).toEqual({ text: 'Wartet', tone: 'warn' });
    expect(rhythmPill('de', waiting, NOW)).toBe('Wartet');
    expect(detailHeadline('de', waiting, NOW)).toEqual({
      text: 'Wartet auf die erste Meldung.',
      tone: 'warn',
    });
    expect(heroSentences('de', [waiting], NOW).mentions[0]?.after).toBe(
      ' wartet auf die erste Meldung nach dem Batteriewechsel.'
    );
    expect(silentIndex(waiting, [0, D])).toBe(-1);
  });

  it('Pillen in der Leiste', () => {
    expect(rhythmPill('de', silent, NOW)).toBe('Seit 4 Tagen still');
    expect(rhythmPill('de', device('L', { status: 'learning' }), NOW)).toBe('Lernt noch');
    expect(rhythmPill('de', device('O'), NOW)).toBe('');
    expect(rhythmPill('de', { ...silent, ignored: true }, NOW)).toBe('');
  });

  it('lernende Geräte zählen nicht als im Takt und bekommen einen eigenen Satz', () => {
    const ok = device('A');
    const l1 = device('L1', { status: 'learning' });
    const l2 = device('L2', { status: 'learning' });
    expect(hero('de', [ok, l1, l2]).line1).toBe('Dein einziges Gerät');
    expect(hero('de', [ok, l1, l2]).line2).toBe('schlägt im Takt.');
    expect(hero('en', [silent]).line2).toBe('is silent.');
    expect(hero('de', [ok, device('B')]).line1).toBe('Alle 2 Geräte');
    expect(heroSentences('de', [ok, l1, l2], NOW).text).toBe(
      'Alle melden sich wie gewohnt. 2 Geräte lernt Pulse noch kennen.'
    );
    expect(heroSentences('de', [ok, l1], NOW).text).toBe(
      'Alle melden sich wie gewohnt. Ein Gerät lernt Pulse noch kennen.'
    );
    expect(heroSentences('de', [silent, l1], NOW).text).toBe('Ein Gerät lernt Pulse noch kennen.');
    expect(heroSentences('de', [l1, l2], NOW).text).toBe(
      'Pulse lernt gerade, wie oft sich jedes Gerät meldet.'
    );
    expect(heroSentences('de', [], NOW).text).toBe('');
    expect(learningLine('en', 1)).toBe('Pulse is still getting to know 1 device.');
    expect(learningLine('en', 3)).toBe('Pulse is still getting to know 3 devices.');
    expect(detailText('de', l1)).toBe(
      'Lernt noch: braucht etwa 7 Meldungen, um den Takt zu kennen.'
    );
  });

  it('Fenster der Leiste: 12 je Kalendertag, auch an der Zeitumstellung', () => {
    const starts = [0, 25 * H, 49 * H];
    expect(stripIndex(-1, starts)).toBe(-1);
    expect(stripIndex(0, starts)).toBe(0);
    // 25-h-Tag: Fenster sind 125 Minuten lang
    expect(stripIndex(125 * 60 - 1, starts)).toBe(0);
    expect(stripIndex(125 * 60, starts)).toBe(1);
    expect(stripIndex(25 * H - 1, starts)).toBe(11);
    expect(stripIndex(25 * H, starts)).toBe(12);
    expect(stripIndex(49 * H, starts)).toBe(24);
    expect(stripIndex(5, [0])).toBe(-1);
  });

  it('Herzschlag: Stille beginnt nach der letzten Meldung, nie auf einem Strich', () => {
    const starts = [0, D, 2 * D];
    const day = (marks: number[]) =>
      Array.from({ length: 96 }, (_, i) => (marks.includes(i) ? 1 : 0));
    const d = { ...silent, last_activity: D + 10 * H, silence_from: D + 10 * H };
    // Letzte Meldung im Fenster 40 (10:00–10:15) → Stille ab 10:15
    expect(heartbeatSilence(d, [day([5]), day([40])], starts, 15)).toBe(D + 10.25 * H);
    // Späterer manueller Wechsel: Stille ab dem Wechsel
    const later = { ...d, silence_from: D + 14 * H };
    expect(heartbeatSilence(later, [day([5]), day([40])], starts, 15)).toBe(D + 14 * H);
    // Meldung nach silence_from (vereinzelt) → Linie erst danach, nie darunter
    expect(heartbeatSilence(d, [day([5]), day([40, 80])], starts, 15)).toBe(D + 20.25 * H);
    expect(heartbeatSilence(device('ok', { last_activity: D }), [day([1])], starts, 15)).toBe(-1);
  });

  it('Striche: feste Höhen nach Anzahl', () => {
    expect(tickHeight(1)).toBe(12);
    expect(tickHeight(2)).toBe(18);
    expect(tickHeight(3)).toBe(22);
    expect(tickHeight(9)).toBe(22);
  });

  it('Gitterlinien nach echter Lokalzeit (25-h-Tag)', () => {
    const BERLIN = 'Europe/Berlin';
    const before = Date.UTC(2026, 9, 24, 22, 0) / 1000; // 25. 10. 00:00 MESZ
    const after = before + 25 * H;
    const marks = hourMarks(before, after, [3, 12], BERLIN);
    // 3:00 MEZ liegt 4 Stunden nach Mitternacht, 12:00 nach 13 Stunden
    expect(marks).toEqual([4 / 25, 13 / 25]);
    expect(hourMarks(0, 0, [3])).toEqual([]);
  });

  it('Tagesband als Textzeile', () => {
    const settings = snapshot([]).settings;
    expect(daybandLine('de', settings)).toBe('18:00 Zusammenfassung · Ruhe 22:00 bis 07:30');
    expect(daybandLine('en', { ...settings, quiet: { ...settings.quiet, enabled: false } })).toBe(
      'Summary 18:00 · No quiet hours'
    );
  });

  it('Heimkommen: mehrere Personen, ältere Server mit person', () => {
    const settings = snapshot([]).settings;
    expect(arrivePersons(settings)).toEqual([]);
    expect(
      arrivePersons({
        ...settings,
        arrive_home: { enabled: true, persons: ['person.a', 'person.b'] },
      })
    ).toEqual(['person.a', 'person.b']);
    const legacy = { ...settings, arrive_home: { enabled: true, persons: [] } };
    Reflect.deleteProperty(legacy.arrive_home, 'persons');
    Reflect.set(legacy.arrive_home, 'person', 'person.c');
    expect(arrivePersons(legacy)).toEqual(['person.c']);
  });

  it('nur Admins dürfen ändern', () => {
    expect(canEdit({ is_admin: true })).toBe(true);
    expect(canEdit({ is_admin: false })).toBe(false);
    expect(canEdit(undefined)).toBe(false);
  });
});

describe('Zeitformat', () => {
  it('folgt der HA-Einstellung, sonst der Sprache', () => {
    expect(timeFormatOf('24')).toBe('24');
    expect(timeFormatOf('12')).toBe('12');
    expect(timeFormatOf('language')).toBeUndefined();
    const ts = Date.UTC(2026, 9, 3, 6, 5) / 1000;
    expect(formatWhen('en-US', ts, 'Europe/Berlin')).toBe('Sat 8:05 AM');
    expect(formatWhen('en-US', ts, 'Europe/Berlin', '24')).toBe('Sat 08:05');
    expect(formatWhen('de', ts, 'Europe/Berlin', '12')).toContain('8:05');
    expect(formatWhen('de', ts, 'Europe/Berlin')).toBe('Sa., 08:05');
  });
});
