import { css, html, LitElement, nothing, type PropertyValues } from 'lit';
import { defineOnce, navigateTo } from './ha';
import {
  ago,
  axisColumns,
  batteryFirst,
  criticalChange,
  dayLabels,
  detailHeadline,
  detailText,
  forecastText,
  formatDate,
  formatVoltage,
  formatWhen,
  gapFractions,
  type HeartbeatData,
  heartbeatSilence,
  memoize,
  needsAction,
  parseHeartbeat,
  partnerLine,
  partnerOptions,
  partnerSuggestions,
  rhythmPill,
  rhythmTone,
  shortDate,
  silentIndex,
  type TimeFormat,
  tone,
} from './logic';
import type { Choice } from './pulse-picker';
import { type StringKey, t } from './strings';
import { puls, shared, tokens } from './styles';
import type { Device } from './types';
import './pulse-heartbeat';
import './pulse-picker';
import './pulse-rhythm';
import './pulse-sheet';

/** Length of the settings open animation (matches the CSS transition). */
const SETTINGS_ANIMATION_MS = 260;

/** Color of the silence in the calendar: orange when watching, otherwise red. */
function silenceTone(device: Device): 'warn' | 'crit' {
  return tone(device.status) === 'warn' ? 'warn' : 'crit';
}

/** Strokes in the calendar: problem devices neutral (color only on the silence), ignored ones gray. */
function heartbeatTone(device: Device): 'ok' | 'neutral' | 'muted' {
  if (device.ignored) return 'muted';
  return tone(device.status) === 'ok' ? 'ok' : 'neutral';
}

/** Batteries per device, as the server accepts them (1–12). */
const COUNT_OPTIONS: Choice[] = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: String(i + 1),
}));

const CHEM_KEYS: Record<string, StringKey> = {
  nimh: 'chem_nimh',
  alkaline: 'chem_alkaline',
  lithium: 'chem_lithium',
};

/**
 * Device detail "Puls": large headline ("Still seit 4 Tagen.", silent for 4 days), heartbeat calendar
 * (one stroke per report, 7 days), comparison with the partner device, battery figures; the settings
 * sit collapsed below.
 */
export class PulseDeviceSheet extends LitElement {
  static properties = {
    device: { attribute: false },
    devices: { attribute: false },
    language: { type: String },
    now: { type: Number },
    stripStart: { type: Number },
    stripDays: { type: Number },
    dayStarts: { attribute: false },
    timeZone: { attribute: false },
    timeFormat: { attribute: false },
    bucketHours: { type: Number },
    fetchHeartbeat: { attribute: false },
    beat: { state: true },
    batteryTypes: { attribute: false },
    chemistries: { attribute: false },
    noData: { attribute: false },
    open: { type: Boolean },
    readonly: { type: Boolean },
    settingsOpen: { state: true },
    beatError: { state: true },
  };

  declare device: Device | null;
  declare devices: Device[];
  declare language: string;
  declare now: number;
  declare stripStart: number;
  declare stripDays: number;
  /** Real day boundaries (for the axis, until the calendar is loaded) */
  declare dayStarts: number[];
  /** Home Assistant time zone (already validated) */
  declare timeZone: string | undefined;
  declare timeFormat: TimeFormat;
  declare bucketHours: number;
  /** Fetches the heartbeat calendar (`pulse/heartbeat`), from the panel, which holds the connection */
  declare fetchHeartbeat: ((ids: string[]) => Promise<unknown>) | null;
  declare beat: HeartbeatData | null;
  declare batteryTypes: string[];
  declare chemistries: string[];
  /** Times without data from the snapshot (until the calendar is loaded) */
  declare noData: [number, number][];
  declare open: boolean;
  /** Non-admin: everything readable, nothing changeable */
  declare readonly: boolean;
  /** Settings expanded; stays that way when switching devices */
  declare settingsOpen: boolean;
  /** Heartbeat could not be loaded → notice + "Neu laden" (reload) */
  declare beatError: boolean;

  constructor() {
    super();
    this.device = null;
    this.devices = [];
    this.language = 'en';
    this.now = 0;
    this.stripStart = 0;
    this.stripDays = 7;
    this.dayStarts = [];
    this.timeZone = undefined;
    this.timeFormat = undefined;
    this.bucketHours = 2;
    this.fetchHeartbeat = null;
    this.beat = null;
    this.batteryTypes = [];
    this.chemistries = [];
    this.noData = [];
    this.open = false;
    this.readonly = false;
    this.settingsOpen = false;
    this.beatError = false;
  }

  private readonly gapsOf = memoize(gapFractions);

  /** What changes the calendar: device, last report, day. Refetch only then. */
  private beatKey = '';

  protected willUpdate(changed: PropertyValues<this>): void {
    if (!changed.has('device') && !changed.has('open') && !changed.has('stripStart')) return;
    const d = this.device;
    if (!this.open || !d) {
      this.beatKey = '';
      return;
    }
    const key = `${d.id}|${d.last_activity ?? ''}|${this.dayStarts[0] ?? this.stripStart}`;
    if (key === this.beatKey) return;
    if (!this.beat || !(d.id in this.beat.devices)) this.beat = null;
    this.beatKey = key;
    this.beatError = false;
    void this.loadBeat(d.id, key);
  }

  private async loadBeat(id: string, key: string): Promise<void> {
    if (!this.fetchHeartbeat) return;
    let data: HeartbeatData | null = null;
    try {
      data = parseHeartbeat(await this.fetchHeartbeat([id]));
    } catch {
      data = null;
    }
    if (key !== this.beatKey) return;
    if (data) this.beat = data;
    // If the old calendar stays, it is enough; otherwise a notice with "Neu laden" (reload)
    else if (!this.beat) this.beatError = true;
  }

  private reloadBeat(id: string): void {
    this.beatError = false;
    void this.loadBeat(id, this.beatKey);
  }

  private fire(name: string, detail: object): void {
    this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
  }

  private change(changes: Record<string, string | number | boolean | null>): void {
    if (this.device) this.fire('device-change', { id: this.device.id, changes });
  }

  private picker(
    label: string,
    value: string,
    options: Choice[],
    onPick: (value: string) => void,
    hint?: string
  ) {
    if (this.readonly) {
      const chosen = options.find((o) => o.value === value)?.label ?? value;
      return html`<div class="row">
        <span class="label">${label}${hint ? html`<small>${hint}</small>` : nothing}</span>
        <span class="value">${chosen}</span>
      </div>`;
    }
    return html`<div class="row">
      <span class="label">${label}${hint ? html`<small>${hint}</small>` : nothing}</span>
      <pulse-picker
        .language=${this.language}
        .label=${label}
        .value=${value}
        .options=${options}
        @change=${(e: CustomEvent<{ value: string }>) => onPick(e.detail.value)}
      ></pulse-picker>
    </div>`;
  }

  /** The whole row toggles (≥ 44 px target); the switch only shows the state. */
  private switchRow(
    label: string,
    hint: string,
    checked: boolean,
    onToggle: (on: boolean) => void,
    locked?: string
  ) {
    // locked: set by an HA label – shown like read-only, with where it comes from
    if (this.readonly || locked)
      return html`<div class="row">
        <span class="label">${label}<small>${locked ?? hint}</small></span>
        <span class="value">${t(this.language, checked ? 'on' : 'off')}</span>
      </div>`;
    return html`<div
      class="row tappable"
      role="switch"
      tabindex="0"
      aria-checked=${checked ? 'true' : 'false'}
      @click=${() => onToggle(!checked)}
      @keydown=${(e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggle(!checked);
        }
      }}
    >
      <span class="label">${label}<small>${hint}</small></span>
      <ha-switch tabindex="-1" aria-hidden="true" .checked=${checked}></ha-switch>
    </div>`;
  }

  private renderBody(d: Device) {
    const lang = this.language;
    const b = d.battery;
    const snoozed = d.snooze_until !== null && d.snooze_until > this.now;
    const level = b.flag
      ? t(lang, b.low ? 'battery_flag_low' : 'battery_flag_ok')
      : b.level === null
        ? t(lang, 'unknown')
        : t(lang, 'unit_percent', { value: Math.round(b.level) });
    const typeText = b.type
      ? (b.count ?? 1) > 1
        ? t(lang, 'battery_count_type', { count: b.count ?? 1, type: b.type })
        : b.type
      : t(lang, 'unknown');
    const zone = this.timeZone;
    const head = detailHeadline(lang, d, this.now);
    const partner = d.partner ? (this.devices.find((p) => p.id === d.partner) ?? null) : null;
    const lastChange = b.replaced.at(-1);
    const beat = this.beat;
    const bins = beat?.devices[d.id] ?? null;
    const noData = beat?.noData ?? this.noData;
    const gaps = this.gapsOf(noData, this.dayStarts);
    const days = Math.max(1, this.dayStarts.length - 1);
    const rhythm = (x: Device) =>
      html`<pulse-rhythm .buckets=${x.strip} tone=${rhythmTone(x)} ?learning=${x.status === 'learning' && !x.ignored} .gaps=${gaps} .days=${days} .silentFrom=${silentIndex(x, this.dayStarts)}></pulse-rhythm>`;
    const pairLine = partner ? partnerLine(lang, d, partner) : '';
    const meta = [d.area, d.model].filter(Boolean).join(' · ');
    // "Akku-Prozent sagt zu wenig" (percentage says too little) is already under the value (Akku · ungenau); not twice
    const forecast = forecastText(
      lang,
      b.forecast,
      b.forecast_reason === 'untrusted' && !b.trusted ? null : b.forecast_reason
    );
    const replaceButton = (primary: boolean) =>
      html`<button class=${primary ? 'pbtn primary' : 'pbtn'} type="button" @click=${() => this.fire('replaced', { id: d.id })}>
        <ha-icon icon="mdi:battery-sync-outline"></ha-icon>${t(lang, 'replaced')}
      </button>`;
    const laterButton = (primary: boolean) =>
      snoozed && d.snooze_until !== null
        ? html`<span class="snoozed">
            <span class="muted small">${t(lang, 'snoozed_until', { when: formatWhen(lang, d.snooze_until, this.now, zone, this.timeFormat) })}</span>
            <button class="pbtn" type="button" @click=${() => this.fire('snooze-cancel', { id: d.id })}>${t(lang, 'snooze_cancel')}</button>
          </span>`
        : html`<button class=${primary ? 'pbtn primary' : 'pbtn'} type="button" @click=${() => this.fire('later', { id: d.id })}>
            <ha-icon icon="mdi:bell-sleep-outline"></ha-icon>${t(lang, 'later')}
          </button>`;
    // Battery reason: "Batterie gewechselt" (battery changed) first; otherwise remind is the sensible main action
    const battery = batteryFirst(d);
    const mains = d.mains === true;
    return html`
      <header class="hero">
        ${
          meta || d.cloud || mains
            ? html`<p class="dname"><ha-icon .icon=${d.icon}></ha-icon><span>${meta}</span>${
                d.cloud
                  ? html`<span class="chip-cloud"><ha-icon icon="mdi:cloud-outline"></ha-icon>${t(lang, 'cloud_device')}</span>`
                  : nothing
              }${
                d.manual
                  ? html`<span class="chip-cloud"><ha-icon icon="mdi:plus-circle-outline"></ha-icon>${t(lang, 'manual_chip')}</span>`
                  : mains
                    ? html`<span class="chip-cloud"><ha-icon icon="mdi:power-plug-outline"></ha-icon>${t(lang, 'mains_chip')}</span>`
                    : nothing
              }</p>`
            : nothing
        }
        <h3 class=${`dhl ${head.tone === 'accent' ? 'grad' : `t-${head.tone}`}`}>${head.text}</h3>
        <p class="dtx">${detailText(lang, d, this.now, zone, this.timeFormat)}</p>
      </header>

      ${this.readonly ? html`<p class="ro muted small"><ha-icon icon="mdi:lock-outline"></ha-icon>${t(lang, 'read_only')}</p>` : nothing}
      ${
        needsAction(d) && !this.readonly
          ? html`<div class="buttons">
              ${
                mains
                  ? laterButton(!snoozed)
                  : battery
                    ? html`${replaceButton(true)}${laterButton(false)}`
                    : html`${laterButton(!snoozed)}${replaceButton(false)}`
              }
            </div>`
          : nothing
      }

      <section class="cal">
        <div class="hd">
          <span class="cap">${t(lang, 'heartbeat_title')}</span>
          <span class="legend">
            <span>${t(lang, 'heartbeat_legend')}</span>
            ${gaps.length ? html`<span class="lg-gap"><i aria-hidden="true"></i>${t(lang, 'no_data_legend')}</span>` : nothing}
          </span>
        </div>
        ${
          bins && beat
            ? html`<pulse-heartbeat
                .bins=${bins}
                .dayStarts=${beat.dayStarts}
                .binMinutes=${beat.binMinutes}
                .timeZone=${zone}
                .now=${this.now}
                .silentSince=${heartbeatSilence(d, bins, beat.dayStarts, beat.binMinutes)}
                .noData=${noData}
                silence=${silenceTone(d)}
                .language=${lang}
                tone=${heartbeatTone(d)}
              ></pulse-heartbeat>`
            : this.beatError
              ? html`<div class="cal-err">
                  <span class="muted">${t(lang, 'heartbeat_failed')}</span>
                  <button class="pbtn" type="button" @click=${() => this.reloadBeat(d.id)}>${t(lang, 'reload')}</button>
                </div>`
              : html`<div class="cal-wait"><pulse-rhythm .buckets=${d.strip} tone=${rhythmTone(d)} ?learning=${d.status === 'learning' && !d.ignored} .gaps=${gaps} .days=${days} .silentFrom=${silentIndex(d, this.dayStarts)} .flag=${rhythmPill(lang, d, this.now)}></pulse-rhythm>
                <div class="axis muted" aria-hidden="true" style=${`grid-template-columns: ${axisColumns(this.dayStarts)}`}>${dayLabels(lang, this.dayStarts, zone).map((l) => html`<span>${l}</span>`)}</div></div>`
        }
      </section>

      ${
        partner
          ? html`<section class="pair">
              <span class="cap">${t(lang, 'with_partner')}</span>
              <div class="l"><span>${partner.name}</span>${rhythm(partner)}</div>
              <div class="l"><span>${d.name}</span>${rhythm(d)}</div>
              ${pairLine ? html`<p>${pairLine}</p>` : nothing}
            </section>`
          : nothing
      }

      ${
        mains
          ? html`<p class="fc muted"><ha-icon icon=${d.manual ? 'mdi:plus-circle-outline' : 'mdi:power-plug-outline'}></ha-icon><span>${t(lang, d.manual ? 'manual_note' : 'mains_note')}</span></p>`
          : html`<section class="stats">
        <div>
          <span>${t(lang, 'battery')}</span>
          <b class=${b.trusted ? '' : 'faint'}>${level}</b>
          ${b.trusted ? nothing : html`<small>${t(lang, 'stat_rechargeable')}</small>`}
        </div>
        <div><span>${t(lang, 'battery_type')}</span><b>${typeText}</b></div>
        <div><span>${t(lang, 'stat_changed')}</span><b>${lastChange !== undefined ? shortDate(lang, lastChange, this.now, zone) : t(lang, 'unknown')}</b></div>
      </section>
      ${forecast ? html`<p class=${b.forecast ? 'fc' : 'fc muted'}><ha-icon icon=${b.forecast ? 'mdi:battery-clock-outline' : 'mdi:battery-unknown'}></ha-icon><span>${forecast}</span></p>` : nothing}`
      }

      ${this.renderSuggestions(d)}

      <div class="list quick">
        ${
          needsAction(d) || this.readonly || mains
            ? nothing
            : html`<button class="row action" type="button" @click=${() => this.fire('replaced', { id: d.id })}>
                <span class="label">${t(lang, 'replaced_now')}</span>
              </button>`
        }
        ${this.switchRow(
          t(lang, 'important'),
          t(lang, 'important_hint'),
          d.critical,
          (on) => this.change({ critical: criticalChange(d, on) }),
          d.label === 'important' ? t(lang, 'label_set', { label: 'pulse_important' }) : undefined
        )}
      </div>

      <details class="more" ?open=${this.settingsOpen} @toggle=${this.onSettingsToggle}>
        <summary>
          <span>${t(lang, 'device_settings')}</span>
          <ha-icon icon="mdi:chevron-down"></ha-icon>
        </summary>
        ${this.renderSettings(d)}
      </details>
    `;
  }

  /**
   * Settings opened: the sheet grows with them up to its maximum height; anything beyond that lies below the
   * visible area, so scroll it into view once the opening animation (where supported) is done.
   */
  private onSettingsToggle = (event: Event): void => {
    const el = event.currentTarget;
    if (!(el instanceof HTMLDetailsElement)) return;
    this.settingsOpen = el.open;
    if (!el.open) return;
    const animated = CSS.supports('interpolate-size', 'allow-keywords');
    window.setTimeout(
      () => el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }),
      animated ? SETTINGS_ANIMATION_MS : 0
    );
  };

  /** Partner suggestions from the server (admins only, only without a partner): accept or dismiss. */
  private renderSuggestions(d: Device) {
    const lang = this.language;
    const list = this.readonly ? [] : partnerSuggestions(d);
    if (!list.length) return nothing;
    return html`<section class="suggest">
      <span class="cap">${t(lang, 'partner')}</span>
      ${list.map(
        (p) => html`<div class="sg">
          <span class="sg-t"><b>${t(lang, 'partner_suggest', { name: p.name })}</b><small>${t(lang, 'partner_suggest_why')}</small></span>
          <span class="sg-b">
            <button class="pbtn" type="button" @click=${() => this.fire('partner-dismiss', { id: d.id, partner: p.id })}>${t(lang, 'partner_dismiss')}</button>
            <button class="pbtn primary" type="button" @click=${() => this.change({ partner: p.id })}>${t(lang, 'partner_accept')}</button>
          </span>
        </div>`
      )}
    </section>`;
  }

  private renderBatterySettings(d: Device, typeOptions: Choice[], chemOptions: Choice[]) {
    const lang = this.language;
    const b = d.battery;
    return html`<section class="section">
        <h4 class="section-title">${t(lang, 'battery')}</h4>
        <div class="list">
          ${this.picker(t(lang, 'battery_type'), b.type ?? '', typeOptions, (v) => this.change({ battery_type: v || null }))}
          ${this.picker(t(lang, 'battery_count'), String(b.count ?? 1), COUNT_OPTIONS, (v) => this.change({ battery_count: Number(v) }))}
          ${this.picker(t(lang, 'chemistry'), b.chemistry ?? '', chemOptions, (v) => this.change({ chemistry: v || null }), b.trusted ? undefined : t(lang, 'level_unreliable'))}
          ${b.voltage !== null ? html`<div class="row"><span class="label">${t(lang, 'voltage')}</span><span class="value">${formatVoltage(lang, b.voltage)}</span></div>` : nothing}
        </div>
      </section>

      <section class="section">
        <h4 class="section-title">${t(lang, 'replaced_history')}</h4>
        <div class="list">
          ${
            b.replaced.length
              ? [...b.replaced]
                  .reverse()
                  .slice(0, 3)
                  .map(
                    (ts) =>
                      html`<div class="row"><span class="label">${formatDate(lang, ts, this.timeZone)}</span><span class="value">${ago(lang, ts, this.now)}</span></div>`
                  )
              : html`<div class="row"><span class="label muted">${t(lang, 'never_replaced')}</span></div>`
          }
        </div>
      </section>`;
  }

  /** Device settings: collapsed under the heartbeat, calm and without heavy surfaces. */
  private renderSettings(d: Device) {
    const lang = this.language;
    const typeOptions: Choice[] = [
      { value: '', label: t(lang, 'type_unknown') },
      ...this.batteryTypes.map((type) => ({ value: type, label: type })),
    ];
    const chemOptions: Choice[] = [
      { value: '', label: t(lang, 'chem_unknown') },
      ...this.chemistries.map((c) => ({
        value: c,
        label: t(lang, CHEM_KEYS[c] ?? 'chem_unknown'),
      })),
    ];
    const partners: Choice[] = [
      { value: '', label: t(lang, 'partner_none') },
      ...partnerOptions(this.devices, d).map((p) => ({ value: p.id, label: p.name })),
    ];
    const mains = d.mains === true;
    return html`<div class="settings">
      ${mains ? nothing : this.renderBatterySettings(d, typeOptions, chemOptions)}
      <section class="section">
        <h4 class="section-title">${t(lang, 'partner')}</h4>
        <div class="list">
          ${this.picker(t(lang, 'partner'), d.partner ?? '', partners, (v) => this.change({ partner: v || null }))}
        </div>
        <p class="section-foot">${t(lang, 'partner_hint')}</p>
      </section>

      <section class="section">
        <h4 class="section-title">${t(lang, 'monitoring')}</h4>
        <div class="list">
          ${this.switchRow(
            t(lang, 'ignore'),
            t(lang, 'ignore_hint'),
            d.ignored,
            (on) => this.change({ ignored: on }),
            d.label === 'ignore' ? t(lang, 'label_set', { label: 'pulse_ignore' }) : undefined
          )}
          ${
            this.readonly
              ? nothing
              : html`<button class="row action" type="button" @click=${() => navigateTo(`/config/devices/device/${d.id}`)}>
                  <span class="label">${t(lang, 'open_device')}</span>
                  <ha-icon class="chev" icon="mdi:chevron-right"></ha-icon>
                </button>`
          }
        </div>
      </section>
    </div>`;
  }

  render() {
    const d = this.device;
    return html`<pulse-sheet
      .open=${this.open && d !== null}
      .heading=${d?.name ?? ''}
      .language=${this.language}
      @closed=${() => this.fire('sheet-closed', {})}
    >
      ${d ? html`<div class="body">${this.renderBody(d)}</div>` : nothing}
    </pulse-sheet>`;
  }

  static styles = [
    tokens,
    shared,
    puls,
    css`
      .body {
        display: grid;
        gap: 24px;
        padding-bottom: 8px;
      }
      .hero {
        display: grid;
        gap: 6px;
      }
      .dname {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
        margin: 0;
        font-size: 14px;
        color: var(--pu-muted);
        --mdc-icon-size: 18px;
      }
      .dname ha-icon {
        flex: none;
      }
      .dname span {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .dhl {
        margin: 2px 0 4px;
        font-family: var(--pu-display);
        font-size: clamp(32px, 9vw, var(--pu-fs-42));
        font-weight: 800;
        letter-spacing: -0.025em;
        line-height: 1.02;
        text-wrap: balance;
      }
      .dhl.t-muted {
        color: var(--pu-ink);
      }
      .dtx {
        margin: 0;
        font-size: var(--pu-fs-15);
        line-height: 1.45;
        text-wrap: pretty;
      }
      .buttons {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px;
      }
      .small {
        font-size: var(--pu-fs-13);
      }
      .snoozed {
        display: inline-flex;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--pu-sp-8);
      }
      .ro {
        display: flex;
        align-items: center;
        gap: var(--pu-sp-8);
        margin: 0;
        --mdc-icon-size: 16px;
      }
      .cal .hd {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        align-items: baseline;
        gap: 4px 12px;
        margin-bottom: 10px;
      }
      .legend {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 4px 12px;
        font-size: var(--pu-fs-11);
        color: var(--pu-faint);
      }
      .lg-gap {
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
      .lg-gap i {
        width: 18px;
        height: 10px;
        border-radius: 3px;
        background: repeating-linear-gradient(
          -45deg,
          color-mix(in srgb, var(--pu-ink) 22%, transparent) 0 1.5px,
          transparent 1.5px 5px
        );
      }
      .cal-wait {
        display: grid;
        gap: 6px;
      }
      .cal-err {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 8px 12px;
        min-height: 64px;
        font-size: var(--pu-fs-15);
      }
      .chip-cloud {
        display: inline-flex;
        flex: none;
        align-items: center;
        gap: 4px;
        padding: 1px 8px;
        border-radius: var(--pu-r-full);
        background: var(--pu-fill);
        font-size: 12px;
        --mdc-icon-size: 14px;
      }
      /* Battery forecast below the battery figures */
      .fc {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        margin: -12px 0 0;
        font-size: var(--pu-fs-15);
        line-height: 1.4;
        --mdc-icon-size: 18px;
      }
      .fc ha-icon {
        flex: none;
        margin-top: 1px;
        color: var(--pu-muted);
      }
      .fc.muted {
        font-size: var(--pu-fs-13);
      }
      .suggest {
        display: grid;
        gap: 8px;
        padding-top: 14px;
        border-top: 1px solid var(--pu-line);
      }
      .sg {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 8px 12px;
      }
      .sg-t {
        display: grid;
        min-width: 0;
      }
      .sg-t small {
        font-size: var(--pu-fs-13);
        color: var(--pu-muted);
      }
      .sg-b {
        display: flex;
        gap: 8px;
      }
      .quick {
        --pu-card: transparent;
      }
      .axis {
        display: grid;
        text-align: center;
        font-size: 12px;
      }
      /* Partner comparison: hairline instead of a surface, no grey tile in dark mode */
      .pair {
        display: grid;
        gap: 6px;
        padding: 14px 0 0;
        border-top: 1px solid var(--pu-line);
      }
      .pair .cap {
        margin-bottom: 4px;
      }
      .pair .l {
        display: grid;
        grid-template-columns: minmax(80px, 32%) minmax(0, 1fr);
        gap: 12px;
        align-items: center;
        font-size: var(--pu-fs-13);
        font-weight: 600;
        --rhythm-height: 22px;
      }
      .pair .l span {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .pair p {
        margin: 6px 0 0;
        font-size: 14px;
        line-height: 1.4;
        color: var(--pu-muted);
        text-wrap: pretty;
      }
      .stats {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        border-top: 1px solid var(--pu-line);
      }
      .stats div {
        display: grid;
        align-content: start;
        min-width: 0;
        padding-top: 12px;
      }
      .stats div + div {
        padding-inline-start: 14px;
        border-inline-start: 1px solid var(--pu-line);
      }
      .stats span {
        font-size: 12px;
        color: var(--pu-muted);
      }
      .stats b {
        font-size: 20px;
        font-weight: 700;
        letter-spacing: -0.015em;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .stats small {
        font-size: var(--pu-fs-11);
        line-height: 1.3;
        color: var(--pu-faint);
      }
      .faint,
      .value.faint {
        opacity: 0.7;
      }

      /* Settings collapsed: one calm row; open: light lists without a surface */
      .more {
        border-top: 1px solid var(--pu-line);
        interpolate-size: allow-keywords;
      }
      /* Open and close smoothly where the browser can animate to auto height (elsewhere it simply jumps) */
      .more::details-content {
        block-size: 0;
        overflow: clip;
        transition:
          block-size 240ms cubic-bezier(0.2, 0.8, 0.2, 1),
          content-visibility 240ms allow-discrete;
      }
      .more[open]::details-content {
        block-size: auto;
      }
      @media (prefers-reduced-motion: reduce) {
        .more::details-content {
          transition: none;
        }
      }
      summary {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        min-height: max(48px, var(--pu-hit));
        list-style: none;
        cursor: pointer;
        font-size: 16px;
        font-weight: 600;
        -webkit-tap-highlight-color: transparent;
      }
      summary::-webkit-details-marker {
        display: none;
      }
      summary ha-icon {
        color: var(--pu-muted);
        transition: transform 0.2s;
      }
      .more[open] summary ha-icon {
        transform: rotate(180deg);
      }
      summary:focus-visible {
        outline: 2px solid var(--pu-accent);
        outline-offset: 4px;
        border-radius: 8px;
      }
      summary:focus:not(:focus-visible) {
        outline: none;
      }
      .settings {
        display: grid;
        gap: 20px;
        padding: 4px 0 8px;
        --pu-card: transparent;
      }
      .settings .list {
        border-color: var(--pu-line);
      }
      .row .label {
        text-wrap: pretty;
      }
    `,
  ];
}

defineOnce('pulse-device-sheet', PulseDeviceSheet);

declare global {
  interface HTMLElementTagNameMap {
    'pulse-device-sheet': PulseDeviceSheet;
  }
}
