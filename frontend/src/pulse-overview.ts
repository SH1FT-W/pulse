import { css, html, LitElement, nothing } from 'lit';
import { defineOnce } from './ha';
import {
  ago,
  axisColumns,
  batteryLine,
  type DeviceFilter,
  dayLabels,
  formatWhen,
  gapFractions,
  groups,
  hero,
  heroSentences,
  isSilent,
  lastReplaced,
  type MonitorKey,
  memoize,
  monitorGroups,
  monitorTitle,
  ROOMS_FROM,
  rhythmPill,
  rhythmTone,
  shortDate,
  silentIndex,
  statusWord,
  type TimeFormat,
  tone,
} from './logic';
import { t } from './strings';
import { monitor, puls, shared, tokens } from './styles';
import type { Device, Snapshot } from './types';
import './pulse-dayband';
import './pulse-rhythm';

const ROOMS_KEY = 'pulse.closedRooms';

function loadClosed(): Set<string> {
  try {
    const raw: unknown = JSON.parse(window.localStorage.getItem(ROOMS_KEY) ?? '[]');
    return new Set(Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string') : []);
  } catch {
    return new Set();
  }
}

function saveClosed(closed: Set<string>): void {
  try {
    window.localStorage.setItem(ROOMS_KEY, JSON.stringify([...closed]));
  } catch {
    // Ohne Speicher bleibt es für diese Sitzung
  }
}

/**
 * Übersicht „Puls“: große Schlagzeile, „Dein Tag mit Pulse“, darunter der Monitor – eine
 * Rhythmusleiste je Gerät, gruppiert nach Braucht dich / Im Blick / Im Takt (ab 12 Geräten nach Raum,
 * einklappbar). Unten Batterien, letzter Wechsel und Zigbee-Lebenszeichen.
 */
export class PulseOverview extends LitElement {
  static properties = {
    snapshot: { attribute: false },
    language: { type: String },
    now: { type: Number },
    recipients: { type: String },
    timeZone: { attribute: false },
    timeFormat: { attribute: false },
    dayStarts: { attribute: false },
    noData: { attribute: false },
    readonly: { type: Boolean },
    closed: { state: true },
  };

  declare snapshot: Snapshot;
  declare language: string;
  declare now: number;
  declare recipients: string;
  /** Zeitzone von Home Assistant (schon geprüft) */
  declare timeZone: string | undefined;
  declare timeFormat: TimeFormat;
  /** Echte Tagesgrenzen für die Achse */
  declare dayStarts: number[];
  /** Zeiten ohne Daten: [von, bis] in Sekunden */
  declare noData: [number, number][];
  /** Nicht-Admin: nur lesen (kein Zigbee-Schalter, kein Sprung zu den Mitteilungen) */
  declare readonly: boolean;
  declare closed: Set<string>;

  constructor() {
    super();
    this.language = 'en';
    this.now = 0;
    this.recipients = '';
    this.timeZone = undefined;
    this.timeFormat = undefined;
    this.dayStarts = [];
    this.noData = [];
    this.readonly = false;
    this.closed = loadClosed();
  }

  private fire(name: string, detail: object = {}): void {
    this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
  }

  private show(filter: DeviceFilter | null): void {
    this.fire('show-devices', { filter });
  }

  private toggleRoom(room: string): void {
    const next = new Set(this.closed);
    if (next.has(room)) next.delete(room);
    else next.add(room);
    this.closed = next;
    saveClosed(next);
  }

  /** Zeiten ohne Daten als Anteile der Leisten – nur neu, wenn sich die Eingaben ändern */
  private readonly gapsOf = memoize(gapFractions);
  private gaps: [number, number][] = [];

  private renderRow(d: Device) {
    const lang = this.language;
    const word = statusWord(lang, d, this.now);
    const time =
      isSilent(d) && d.last_activity !== null
        ? formatWhen(lang, d.last_activity, this.timeZone, this.timeFormat)
        : ago(lang, d.last_activity, this.now);
    const symbol = d.ignored ? 'ok' : tone(d.status);
    return html`<button class="mrow rowgrid" type="button" @click=${() => this.fire('open', { id: d.id })}>
      <span class="nm">
        <ha-icon class=${`t-${symbol}`} .icon=${d.icon}></ha-icon>
        <b>${d.name}</b>
        ${d.area ? html`<span class="room">${d.area}</span>` : nothing}
      </span>
      <pulse-rhythm
        .buckets=${d.strip}
        tone=${rhythmTone(d)}
        ?learning=${d.status === 'learning' && !d.ignored}
        .gaps=${this.gaps}
        .days=${Math.max(1, this.dayStarts.length - 1)}
        .silentFrom=${silentIndex(d, this.dayStarts)}
        .flag=${rhythmPill(lang, d, this.now)}
      ></pulse-rhythm>
      <span class="st">
        ${word ? html`<b class=${`t-${word.tone}`}>${word.text}</b><span class="sep"> · </span>` : nothing}<span class="num time">${time}</span>
      </span>
    </button>`;
  }

  private renderSection(key: MonitorKey, devices: Device[]) {
    const lang = this.language;
    const title = html`<div class="grp">
      <span>${t(lang, monitorTitle(key))}</span><span class="count">${devices.length}</span>
    </div>`;
    if (key !== 'rhythm' || devices.length <= ROOMS_FROM)
      return html`${title}${devices.map((d) => this.renderRow(d))}`;
    // Viele Geräte im Takt: nach Raum, jeder Raum einklappbar
    return html`${title}${groups(devices, t(lang, 'no_area')).map((g) => {
      const closed = this.closed.has(g.area);
      return html`<button class="room-head" type="button" aria-expanded=${closed ? 'false' : 'true'} @click=${() => this.toggleRoom(g.area)}>
          <ha-icon icon=${closed ? 'mdi:chevron-right' : 'mdi:chevron-down'}></ha-icon>
          <span>${g.area}</span><span class="count">${g.devices.length}</span>
        </button>
        ${closed ? nothing : g.devices.map((d) => this.renderRow(d))}`;
    })}`;
  }

  /** Zigbee-Lebenszeichen: an = „Aktiv ✓“, sonst tippbar → Rückfrage im Panel. */
  private renderZigbee() {
    const lang = this.language;
    const z = this.snapshot.z2m;
    const head = html`<span class="cap">${t(lang, 'welcome_zigbee_title')}</span>`;
    // Ohne Zigbee2MQTT keine Kachel
    if (!z.present) return nothing;
    if (z.last_seen && z.availability)
      return html`<div class="fact zig">${head}<b class="t-ok on"><ha-icon icon="mdi:check-circle"></ha-icon>${t(lang, 'zigbee_active')}</b><span class="sub">${t(lang, 'zigbee_devices')}: ${z.devices}</span></div>`;
    const requested = z.requested_at !== null && this.now - z.requested_at < 120;
    if (this.readonly)
      return html`<div class="fact zig">${head}<b>${requested ? t(lang, 'zigbee_requested') : t(lang, 'off')}</b><span class="sub">${t(lang, 'zigbee_hint')}</span></div>`;
    return html`<div
      class="fact zig tappable"
      role="switch"
      aria-checked="false"
      tabindex="0"
      @click=${() => this.fire('enable-z2m')}
      @keydown=${(e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.fire('enable-z2m');
        }
      }}
    >
      ${head}
      <span class="line">
        <b>${requested ? t(lang, 'zigbee_requested') : t(lang, 'off')}</b>
        ${requested ? nothing : html`<ha-switch tabindex="-1" aria-hidden="true"></ha-switch>`}
      </span>
      <span class="sub">${t(lang, 'zigbee_hint')}</span>
    </div>`;
  }

  private renderFacts() {
    const lang = this.language;
    const snap = this.snapshot;
    const line = batteryLine(lang, snap.summary.low_batteries ?? []);
    const shop = snap.summary.next_battery;
    const last = lastReplaced(snap.devices);
    const ignored = snap.devices.filter((d) => d.ignored).length;
    return html`<section class="facts">
      <div class="fact">
        <span class="cap">${t(lang, 'batteries')}</span>
        <b class=${line.tone === 'warn' ? 't-warn' : ''}>${line.label}</b>
        <span class="sub">${[line.value, shop].filter(Boolean).join(' · ') || t(lang, 'nothing_due')}</span>
      </div>
      ${
        last
          ? html`<button class="fact tappable" type="button" @click=${() => this.fire('open', { id: last.device.id })}>
              <span class="cap">${t(lang, 'last_change')}</span>
              <b>${shortDate(lang, last.at, this.now, this.timeZone)}</b>
              <span class="sub">${last.device.name}</span>
            </button>`
          : html`<div class="fact"><span class="cap">${t(lang, 'last_change')}</span><b>${t(lang, 'unknown')}</b><span class="sub">${t(lang, 'never_replaced')}</span></div>`
      }
      ${this.renderZigbee()}
      ${
        ignored
          ? html`<button class="fact tappable" type="button" @click=${() => this.show('ignored')}>
              <span class="cap">${t(lang, 'ignored')}</span>
              <b>${t(lang, 'ignored_count', { count: ignored })}</b>
              <span class="sub">${t(lang, 'show_list')}</span>
            </button>`
          : nothing
      }
    </section>`;
  }

  render() {
    const lang = this.language;
    const snap = this.snapshot;
    const head = hero(lang, snap.devices);
    const said = heroSentences(lang, snap.devices, this.now, this.timeZone);
    const sections = monitorGroups(snap.devices);
    this.gaps = this.gapsOf(this.noData, this.dayStarts);
    const watched = snap.devices.filter((d) => !d.ignored).length;
    const monitorHead =
      watched === 1 ? t(lang, 'monitor_head_one') : t(lang, 'monitor_head', { count: watched });
    // Heute als Wochentag (die Übersicht zeigt eine Woche) – in HAs Zeitzone
    const today = new Intl.DateTimeFormat(lang, {
      weekday: 'short',
      ...(this.timeZone ? { timeZone: this.timeZone } : {}),
    }).format(new Date(this.now * 1000));
    const days = dayLabels(lang, this.dayStarts, this.timeZone).map((d, i, all) =>
      i === all.length - 1 ? today : d
    );
    return html`<div class="page">
      <section class="hero">
        <div class="words">
          <h2 class="hl">
            <span class="long">${head.line1}</span><span class="short">${head.line1Short}</span><br />
            <span class="grad long">${head.line2}</span><span class="grad short">${head.line2Short}</span>
          </h2>
          <p class="hsub">
            ${said.mentions.map(
              (m) => html`${m.before}<b class=${`t-${m.tone}`}>${m.name}</b>${m.after} `
            )}${said.text}
          </p>
        </div>
        ${
          this.readonly
            ? html`<pulse-dayband
                .settings=${snap.settings}
                .language=${lang}
                .timeZone=${this.timeZone}
                .now=${this.now}
                .recipients=${this.recipients}
              ></pulse-dayband>`
            : html`<pulse-dayband
                class="tappable"
                role="button"
                tabindex="0"
                .settings=${snap.settings}
                .language=${lang}
                .timeZone=${this.timeZone}
                .now=${this.now}
                .recipients=${this.recipients}
                @click=${() => this.fire('show-settings')}
                @keydown=${(e: KeyboardEvent) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.fire('show-settings');
                  }
                }}
              ></pulse-dayband>`
        }
      </section>

      <section class="monitor" aria-label=${monitorHead}>
        <div class="axis">
          <span>${monitorHead}</span>
          <div class="days mono" style=${`grid-template-columns: ${axisColumns(this.dayStarts)}`}>${days.map((d) => html`<span>${d.replace('.', '')}</span>`)}</div>
          <span class="right">${t(lang, 'col_last')}</span>
        </div>
        ${sections.map((sec) => this.renderSection(sec.key, sec.devices))}
      </section>

      ${this.renderFacts()}
    </div>`;
  }

  static styles = [
    tokens,
    shared,
    puls,
    monitor,
    css`
      :host {
        display: block;
        container-type: inline-size;
      }
      /* ── Schlagzeile ── */
      .hero {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(360px, 470px);
        gap: var(--pu-sp-24) var(--pu-sp-48);
        align-items: end;
      }
      .hl {
        margin: 0;
        font-family: var(--pu-display);
        font-size: clamp(34px, 4.6cqi, var(--pu-fs-56));
        line-height: 1.02;
        font-weight: 800;
        letter-spacing: -0.025em;
        text-wrap: balance;
      }
      .short {
        display: none;
      }
      .hsub {
        margin: var(--pu-sp-16) 0 0;
        max-width: 46ch;
        font-size: clamp(var(--pu-fs-15), 1.7cqi, var(--pu-fs-20));
        line-height: 1.42;
        letter-spacing: -0.01em;
        color: var(--pu-muted);
        text-wrap: pretty;
      }
      .hsub b {
        font-weight: 600;
        white-space: nowrap;
      }
      .hsub b.t-ok {
        color: var(--pu-ink);
      }
      pulse-dayband.tappable {
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
      }
      pulse-dayband:focus-visible {
        outline: 2px solid var(--pu-accent);
        outline-offset: 2px;
      }

      /* ── Monitor ── */
      .monitor {
        margin-top: var(--pu-sp-32);
        border-top: 1px solid var(--pu-line);
      }
      .grp .count::before {
        content: '· ';
      }
      .mrow {
        width: 100%;
        min-height: max(44px, var(--pu-hit));
        padding: 0;
        border: 0;
        border-bottom: 1px solid var(--pu-line);
        background: none;
        color: var(--pu-ink);
        font: inherit;
        text-align: start;
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
        transition: background 0.15s;
      }
      @media (hover: hover) {
        .mrow:hover,
        .room-head:hover,
        .fact.tappable:hover {
          background: color-mix(in srgb, var(--pu-ink) 3%, transparent);
        }
      }
      .mrow:active {
        background: color-mix(in srgb, var(--pu-ink) 6%, transparent);
      }
      /* Fokusring mit Luft zum Text (nur Tastatur) */
      .mrow:focus-visible,
      .room-head:focus-visible,
      .fact.tappable:focus-visible {
        outline: 2px solid var(--pu-accent);
        outline-offset: 3px;
        border-radius: var(--pu-r-8);
      }
      .room-head {
        display: flex;
        align-items: center;
        gap: var(--pu-sp-8);
        width: 100%;
        min-height: max(40px, var(--pu-hit));
        padding: 0;
        border: 0;
        border-bottom: 1px solid var(--pu-line);
        background: none;
        color: var(--pu-ink);
        font: inherit;
        font-size: var(--pu-fs-15);
        font-weight: 600;
        text-align: start;
        cursor: pointer;
        --mdc-icon-size: 18px;
      }
      .room-head ha-icon {
        color: var(--pu-muted);
      }
      .room-head .count {
        color: var(--pu-faint);
        font-weight: 500;
      }

      /* ── Fakten unten ── */
      .facts {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        margin-top: var(--pu-sp-32);
        border-top: 1px solid var(--pu-line);
      }
      .fact {
        display: grid;
        align-content: start;
        gap: var(--pu-sp-4);
        min-width: 0;
        padding: var(--pu-sp-16);
        border: 0;
        border-inline-start: 1px solid var(--pu-line);
        background: none;
        color: var(--pu-ink);
        font: inherit;
        text-align: start;
      }
      .fact:first-child {
        border-inline-start: 0;
        padding-inline-start: 0;
      }
      .fact.tappable {
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
      }
      .fact b {
        font-size: var(--pu-fs-17);
        font-weight: 700;
        letter-spacing: -0.01em;
      }
      .fact .sub {
        font-size: var(--pu-fs-13);
        color: var(--pu-muted);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .fact .line {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--pu-sp-12);
      }
      .fact ha-switch {
        pointer-events: none;
      }
      .on {
        display: inline-flex;
        align-items: center;
        gap: var(--pu-sp-4);
        --mdc-icon-size: 18px;
      }

      /* Schmaleres Panel (z. B. 1024 mit Seitenleiste): Tagesband unter die Schlagzeile */
      @container (max-width: 1000px) {
        .hero {
          grid-template-columns: minmax(0, 1fr);
        }
        pulse-dayband {
          max-width: 560px;
        }
      }
      /* Handy: Name und Status oben, Leiste darunter; Tagesband unter den Monitor */
      @container (max-width: 600px) {
        .page {
          display: flex;
          flex-direction: column;
        }
        .hero {
          display: contents;
        }
        .words {
          order: 1;
        }
        .monitor {
          order: 2;
          margin-top: var(--pu-sp-24);
        }
        pulse-dayband {
          order: 3;
          max-width: none;
          margin-top: var(--pu-sp-32);
        }
        .facts {
          order: 4;
          grid-template-columns: 1fr 1fr;
        }
        .long {
          display: none;
        }
        .short {
          display: inline;
        }
        .hl {
          font-size: clamp(34px, 10.5cqi, var(--pu-fs-42));
        }
        .hsub {
          font-size: var(--pu-fs-15);
        }
        .fact {
          border-inline-start: 0;
          padding-inline: 0;
          border-bottom: 1px solid var(--pu-line);
        }
        .fact:nth-child(even) {
          padding-inline-start: var(--pu-sp-16);
          border-inline-start: 1px solid var(--pu-line);
        }
        /* Zigbee-Lebenszeichen: Schalter + zweizeiliger Hinweis brauchen die ganze Breite */
        .fact.zig {
          grid-column: 1 / -1;
          padding-inline-start: 0;
          border-inline-start: 0;
        }
        .fact.zig .sub {
          white-space: normal;
        }
        .fact.zig ~ .fact {
          padding-inline-start: 0;
          border-inline-start: 0;
        }
      }
    `,
  ];
}

defineOnce('pulse-overview', PulseOverview);

declare global {
  interface HTMLElementTagNameMap {
    'pulse-overview': PulseOverview;
  }
}
