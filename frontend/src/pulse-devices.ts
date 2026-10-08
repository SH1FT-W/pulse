import { css, html, LitElement, nothing } from 'lit';
import { defineOnce, dropdownValue, inputValue } from './ha';
import {
  ago,
  applyFilter,
  axisColumns,
  type DeviceFilter,
  dayLabels,
  formatWhen,
  type GroupBy,
  gapFractions,
  groupDevices,
  isSilent,
  memoize,
  rhythmPill,
  rhythmTone,
  search,
  silentIndex,
  statusKey,
  statusWord,
  type TimeFormat,
  tone,
} from './logic';
import { type StringKey, t } from './strings';
import { monitor, puls, shared, tokens } from './styles';
import type { Device } from './types';
import './pulse-rhythm';

const GROUP_KEYS: Record<GroupBy, StringKey> = {
  area: 'group_area',
  status: 'group_status',
  none: 'group_none',
};

/**
 * Geräteliste im Stil „Puls“ – dieselbe Zeilen-Vorlage wie die Übersicht (Name | Leiste | Status · Zeit),
 * dazu Suche, Gruppieren und ⋮ (nur für Admins).
 */
export class PulseDevices extends LitElement {
  static properties = {
    devices: { attribute: false },
    language: { type: String },
    now: { type: Number },
    start: { type: Number },
    days: { type: Number },
    dayStarts: { attribute: false },
    timeZone: { attribute: false },
    timeFormat: { attribute: false },
    bucketHours: { type: Number },
    noData: { attribute: false },
    groupBy: { type: String },
    filter: { attribute: false },
    readonly: { type: Boolean },
    query: { state: true },
    collapsed: { state: true },
  };

  declare devices: Device[];
  declare language: string;
  declare now: number;
  /** Beginn der Rhythmusleiste und Fenstergröße (für die abbrechende Leiste) */
  declare start: number;
  declare days: number;
  /** Echte Tagesgrenzen für die Achse */
  declare dayStarts: number[];
  /** Zeitzone von Home Assistant (schon geprüft) */
  declare timeZone: string | undefined;
  declare timeFormat: TimeFormat;
  declare bucketHours: number;
  /** Zeiten ohne Daten: [von, bis] in Sekunden */
  declare noData: [number, number][];
  declare groupBy: GroupBy;
  /** Vorübergehender Filter aus der Übersicht (Chip mit ✕), unabhängig von der Gruppierung */
  declare filter: DeviceFilter | null;
  /** Nicht-Admin: keine ⋮-Menüs */
  declare readonly: boolean;
  declare query: string;
  declare collapsed: Set<string>;

  constructor() {
    super();
    this.devices = [];
    this.language = 'en';
    this.now = 0;
    this.start = 0;
    this.days = 7;
    this.dayStarts = [];
    this.timeZone = undefined;
    this.timeFormat = undefined;
    this.bucketHours = 2;
    this.noData = [];
    this.groupBy = 'area';
    this.filter = null;
    this.readonly = false;
    this.query = '';
    this.collapsed = new Set();
  }

  private fire(name: string, detail: object): void {
    this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
  }

  private toggle(group: string): void {
    const next = new Set(this.collapsed);
    if (next.has(group)) next.delete(group);
    else next.add(group);
    this.collapsed = next;
  }

  private setGroup(by: string): void {
    if (by !== 'area' && by !== 'status' && by !== 'none') return;
    this.groupBy = by;
    this.collapsed = new Set();
    this.fire('group-change', { group: by });
  }

  private onMenu(device: Device, event: Event): void {
    const value = dropdownValue(event);
    if (value === 'details') this.fire('open', { id: device.id });
    else if (value === 'replaced') this.fire('replaced', { id: device.id });
    else if (value === 'later') this.fire('later', { id: device.id });
    else if (value === 'ignore')
      this.fire('device-change', { id: device.id, changes: { ignored: !device.ignored } });
  }

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
    const menu = this.readonly
      ? nothing
      : html`<span class="menu"><ha-dropdown placement="bottom-end" @wa-select=${(e: Event) => this.onMenu(d, e)}>
          <ha-icon-button slot="trigger" .label=${t(lang, 'more_for', { name: d.name })}>
            <ha-icon icon="mdi:dots-vertical"></ha-icon>
          </ha-icon-button>
          <ha-dropdown-item value="details"><ha-icon slot="icon" icon="mdi:information-outline"></ha-icon>${t(lang, 'details')}</ha-dropdown-item>
          <ha-dropdown-item value="replaced"><ha-icon slot="icon" icon="mdi:battery-sync-outline"></ha-icon>${t(lang, 'replaced')}</ha-dropdown-item>
          <ha-dropdown-item value="later"><ha-icon slot="icon" icon="mdi:bell-sleep-outline"></ha-icon>${t(lang, 'later')}</ha-dropdown-item>
          <ha-dropdown-item value="ignore">
            <ha-icon slot="icon" icon=${d.ignored ? 'mdi:eye-outline' : 'mdi:eye-off-outline'}></ha-icon>${t(lang, d.ignored ? 'resume' : 'ignore')}
          </ha-dropdown-item>
        </ha-dropdown></span>`;
    return html`<div class="mrow">
      <button class="main rowgrid" type="button" @click=${() => this.fire('open', { id: d.id })}>
        <span class="nm">
          <ha-icon class=${`t-${symbol}`} .icon=${d.icon}></ha-icon>
          <b>${d.name}</b>
          ${this.groupBy !== 'area' && d.area ? html`<span class="room">${d.area}</span>` : nothing}
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
      </button>
      ${menu}
    </div>`;
  }

  render() {
    const lang = this.language;
    const found = search(applyFilter(this.devices, this.filter), this.query);
    const byArea = this.groupBy === 'area';
    const watched = found.filter((d) => !d.ignored);
    const ignored = found.filter((d) => d.ignored);
    const groups = groupDevices(watched, this.groupBy, lang, t(lang, 'no_area'));
    this.gaps = this.gapsOf(this.noData, this.dayStarts);
    const days = dayLabels(lang, this.dayStarts, this.timeZone);
    if (ignored.length) groups.push({ area: t(lang, 'ignored'), devices: ignored });
    const filterLabel = this.filter
      ? t(lang, 'filter_label', {
          what: t(lang, this.filter === 'ignored' ? 'ignored' : statusKey(this.filter)),
        })
      : '';
    const group = (g: { area: string; devices: Device[] }) => {
      const closed = this.collapsed.has(g.area);
      return html`${
        g.area
          ? html`<button class="group" type="button" aria-expanded=${closed ? 'false' : 'true'} @click=${() => this.toggle(g.area)}>
              <ha-icon icon=${closed ? 'mdi:chevron-right' : 'mdi:chevron-down'}></ha-icon>
              <span>${g.area}</span><span class="count">${g.devices.length}</span>
            </button>`
          : nothing
      }${closed ? nothing : g.devices.map((d) => this.renderRow(d))}`;
    };
    const classes = ['monitor', byArea ? 'by-area' : '', this.readonly ? 'readonly' : ''].join(' ');
    return html`<div class=${classes}>
      <div class="toolbar">
        <label class="search">
          <ha-icon icon="mdi:magnify"></ha-icon>
          <input
            id="search"
            type="search"
            .value=${this.query}
            placeholder=${this.devices.length === 1 ? t(lang, 'search_one') : t(lang, 'search', { count: this.devices.length })}
            @input=${(e: Event) => {
              this.query = inputValue(e);
            }}
          />
        </label>
        <ha-dropdown placement="bottom-end" @wa-select=${(e: Event) => this.setGroup(dropdownValue(e) ?? '')}>
          <button slot="trigger" class="chip" type="button">
            ${t(lang, 'group_by', { what: t(lang, GROUP_KEYS[this.groupBy]) })}
            <ha-icon icon="mdi:menu-down"></ha-icon>
          </button>
          ${(['area', 'status', 'none'] as const).map(
            (by) => html`<ha-dropdown-item value=${by}>
              <ha-icon slot="icon" class=${by === this.groupBy ? 'check' : 'check hidden'} icon="mdi:check"></ha-icon>
              ${t(lang, GROUP_KEYS[by])}
            </ha-dropdown-item>`
          )}
        </ha-dropdown>
        ${
          filterLabel
            ? html`<button class="chip filter" type="button" @click=${() => this.fire('filter-clear', {})} aria-label=${`${filterLabel}, ${t(lang, 'filter_clear')}`}>
                ${filterLabel}
                <ha-icon icon="mdi:close"></ha-icon>
              </button>`
            : nothing
        }
      </div>
      <div class="axis" aria-hidden="true">
        <span>${found.length === 1 ? t(lang, 'monitor_head_one') : t(lang, 'monitor_head', { count: found.length })}</span>
        <div class="days mono" style=${`grid-template-columns: ${axisColumns(this.dayStarts)}`}>${days.map((d) => html`<span>${d.replace('.', '')}</span>`)}</div>
        <span class="right">${t(lang, 'col_last')}</span>
      </div>
      ${
        found.length
          ? groups.map(group)
          : html`<p class="empty muted">${
              this.query.trim()
                ? t(lang, 'no_results', { query: this.query })
                : t(lang, 'filter_empty')
            }</p>`
      }
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
      .monitor {
        border-top: 1px solid var(--pu-line);
      }
      .toolbar {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 12px;
        padding: 16px 0 6px;
      }
      .search {
        flex: 1 1 240px;
        min-width: 0;
        display: flex;
        align-items: center;
        gap: 8px;
        height: max(40px, var(--pu-hit));
        padding: 0 14px;
        box-sizing: border-box;
        border-radius: 12px;
        border: 1px solid transparent;
        background: var(--pu-fill);
        color: var(--pu-muted);
      }
      .search:focus-within {
        border-color: var(--pu-accent);
        box-shadow: 0 0 0 1px var(--pu-accent);
      }
      .search input {
        flex: 1;
        min-width: 0;
        border: 0;
        outline: 0;
        background: transparent;
        color: var(--primary-text-color);
        font: inherit;
        font-size: var(--pu-fs-15);
      }
      .chip {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        height: max(40px, var(--pu-hit));
        padding: 0 10px 0 16px;
        box-sizing: border-box;
        border: 1px solid var(--pu-line);
        border-radius: 99px;
        background: none;
        color: var(--primary-text-color);
        font: inherit;
        font-size: var(--pu-fs-13);
        white-space: nowrap;
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
      }
      .chip:focus-visible {
        outline: 2px solid var(--pu-accent);
        outline-offset: 2px;
      }
      .chip.filter {
        border-color: transparent;
        color: var(--pu-accent);
        background: color-mix(in srgb, var(--pu-accent) 12%, transparent);
        font-weight: 600;
        --mdc-icon-size: 18px;
      }
      .check {
        color: var(--pu-accent);
      }
      .check.hidden {
        visibility: hidden;
      }

      /* Zeilen-Vorlage aus styles.ts (monitor): Name | Leiste | Status · Zeit, dazu ⋮ */
      .axis {
        margin-right: 48px;
      }
      .monitor.readonly .axis {
        margin-right: 0;
      }
      .mrow {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 48px;
        align-items: center;
        border-bottom: 1px solid var(--pu-line);
      }
      .monitor.readonly .mrow {
        grid-template-columns: minmax(0, 1fr);
      }
      .main {
        min-height: max(48px, var(--pu-hit));
        padding: 0;
        border: 0;
        background: none;
        color: var(--pu-ink);
        font: inherit;
        text-align: start;
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
      }
      @media (hover: hover) {
        .mrow:hover,
        .group:hover {
          background: color-mix(in srgb, var(--pu-ink) 3%, transparent);
        }
      }
      .mrow:active {
        background: color-mix(in srgb, var(--pu-ink) 6%, transparent);
      }
      .main:focus-visible,
      .group:focus-visible {
        outline: 2px solid var(--pu-accent);
        outline-offset: 3px;
        border-radius: var(--pu-r-8);
      }
      .group {
        display: flex;
        align-items: center;
        gap: var(--pu-sp-8);
        width: 100%;
        min-height: max(44px, var(--pu-hit));
        padding: var(--pu-sp-24) 0 var(--pu-sp-8);
        border: 0;
        border-bottom: 1px solid var(--pu-line);
        background: none;
        color: var(--pu-muted);
        font: inherit;
        font-size: 12px;
        font-weight: 600;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        text-align: start;
        cursor: pointer;
        --mdc-icon-size: 18px;
      }
      .group .count {
        font-weight: 500;
        color: var(--pu-faint);
      }
      .empty {
        margin: 0;
        padding: var(--pu-sp-32) 20px;
        text-align: center;
      }
      .menu {
        display: flex;
        justify-content: center;
      }
      /* Handy: Name + Status oben (⋮ daneben), Leiste darunter über die ganze Breite */
      @container (max-width: 600px) {
        .axis {
          margin-right: 0;
        }
        .toolbar {
          padding-top: var(--pu-sp-12);
        }
        .search {
          flex-basis: 100%;
        }
        .mrow {
          grid-template-columns: minmax(0, 1fr) 44px;
          align-items: start;
        }
        .main.rowgrid {
          padding-right: 0;
        }
        .menu {
          margin-top: 4px;
        }
      }
    `,
  ];
}

defineOnce('pulse-devices', PulseDevices);

declare global {
  interface HTMLElementTagNameMap {
    'pulse-devices': PulseDevices;
  }
}
