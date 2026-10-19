import { css, html, LitElement, nothing } from 'lit';
import { live } from 'lit/directives/live.js';
import { defineOnce, showToast } from './ha';
import {
  arrivePersons,
  cleanZ2mBase,
  importantCount,
  monitored,
  settingsHero,
  templateExample,
  timeOptions,
} from './logic';
import type { Choice } from './pulse-picker';
import { KIND_KEYS, TEMPLATE_KINDS } from './pulse-template-sheet';
import { type StringKey, t } from './strings';
import { puls, shared, tokens } from './styles';
import type { Settings, Snapshot, TemplateKind } from './types';
import './pulse-dayband';
import './pulse-picker';

type LevelKey = keyof Settings['levels'];

/**
 * Mitteilungen im Stil „Puls“: Schlagzeile („Pulse meldet sich um 18:00. / Ruhe 22:00–07:30.“) mit dem
 * Tagesband als Bühne, darunter die Einstellungen. Jede Änderung wird sofort gespeichert.
 */
export class PulseSettings extends LitElement {
  static properties = {
    snapshot: { attribute: false },
    language: { type: String },
    now: { type: Number },
    recipients: { type: String },
    names: { attribute: false },
    timeZone: { attribute: false },
    editing: { state: true },
  };

  declare snapshot: Snapshot;
  declare language: string;
  declare now: number;
  declare recipients: string;
  /** Anzeigenamen für notify-Dienste und Personen (aus hass.states) */
  declare names: Record<string, string>;
  /** Zeitzone von Home Assistant (schon geprüft) */
  declare timeZone: string | undefined;
  /** Own text being edited (sheet open) */
  declare editing: TemplateKind | null;

  constructor() {
    super();
    this.language = 'en';
    this.now = 0;
    this.recipients = '';
    this.names = {};
    this.timeZone = undefined;
    this.editing = null;
  }

  private save(settings: Record<string, unknown>): void {
    this.dispatchEvent(
      new CustomEvent('settings-change', { detail: { settings }, bubbles: true, composed: true })
    );
  }

  private fire(name: string, detail: object = {}): void {
    this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
  }

  /** Zeile mit Pfeil, die woanders hinführt (ganze Zeile tippbar). */
  private linkRow(label: string, value: string, onTap: () => void) {
    return html`<button class="row link" type="button" @click=${onTap}>
      <span class="label">${label}</span>
      <span class="value">${value}</span>
      <ha-icon class="chev" icon="mdi:chevron-right"></ha-icon>
    </button>`;
  }

  /**
   * Schreibt in Zigbee2MQTT nur nach Rückfrage (Blatt im Panel): an = „Aktiv“, gerade angefragt =
   * „Angefragt“, sonst Schalter-Zeile, die die Rückfrage öffnet.
   */
  private z2mOptionRow(
    label: StringKey,
    hint: StringKey,
    active: boolean,
    requestedAt: number | null | undefined,
    event: string
  ) {
    const lang = this.language;
    const content = html`<span class="label">${t(lang, label)}<small>${t(lang, hint)}</small></span>`;
    if (active)
      return html`<div class="row">${content}<span class="value t-ok on"><ha-icon icon="mdi:check-circle"></ha-icon>${t(lang, 'zigbee_active')}</span></div>`;
    const requested = typeof requestedAt === 'number' && this.now - requestedAt < 120;
    if (requested)
      return html`<div class="row">${content}<span class="value">${t(lang, 'zigbee_requested')}</span></div>`;
    return this.toggleRow(content, false, () => this.fire(event));
  }

  /** Basisthema von Zigbee2MQTT: prüfen, dann speichern; Ungültiges als Hinweis und zurücksetzen. */
  private onZ2mBase(event: Event): void {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    const current = this.snapshot.settings.z2m_base;
    const base = cleanZ2mBase(input.value);
    if (base === null) {
      showToast(this, t(this.language, 'z2m_base_invalid'));
      input.value = current;
      return;
    }
    input.value = base;
    if (base !== current) this.save({ z2m_base: base });
  }

  private targetLabel(service: string): string {
    return this.names[service] ?? service.replace(/^mobile_app_/, '').replaceAll('_', ' ');
  }

  private toggleTarget(service: string, on: boolean): void {
    const current = this.snapshot.settings.targets ?? this.snapshot.targets;
    const next = on ? [...new Set([...current, service])] : current.filter((x) => x !== service);
    this.save({ targets: next });
  }

  private times(current: string): Choice[] {
    return timeOptions(current).map((v) => ({ value: v, label: v }));
  }

  /** Personen fürs Heimkommen an/aus (mindestens eine bleibt gewählt, solange es eingeschaltet ist). */
  private togglePerson(person: string, on: boolean): void {
    const current = arrivePersons(this.snapshot.settings);
    const next = on ? [...new Set([...current, person])] : current.filter((p) => p !== person);
    this.save({ arrive_home: { persons: next } });
  }

  private pickerRow(
    label: StringKey,
    value: string,
    options: Choice[],
    onPick: (v: string) => void,
    icon?: { icon: string; tone: string }
  ) {
    const lang = this.language;
    return html`<div class=${icon ? 'row has-icon' : 'row'}>
      ${icon ? html`<ha-icon class=${`ico ${icon.tone}`} icon=${icon.icon}></ha-icon>` : nothing}
      <span class="label">${t(lang, label)}</span>
      <pulse-picker
        .language=${lang}
        .label=${t(lang, label)}
        .value=${value}
        .options=${options}
        @change=${(e: CustomEvent<{ value: string }>) => onPick(e.detail.value)}
      ></pulse-picker>
    </div>`;
  }

  /** Ganze Zeile schaltet (≥ 44 px Ziel); der Schalter zeigt nur den Zustand. */
  private toggleRow(
    content: unknown,
    checked: boolean,
    onToggle: (on: boolean) => void,
    icon = false
  ) {
    return html`<div
      class=${icon ? 'row has-icon tappable' : 'row tappable'}
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
      ${content}
      <ha-switch tabindex="-1" aria-hidden="true" .checked=${checked}></ha-switch>
    </div>`;
  }

  private switchRow(
    label: StringKey,
    checked: boolean,
    onToggle: (on: boolean) => void,
    hint?: StringKey
  ) {
    const lang = this.language;
    return this.toggleRow(
      html`<span class="label">${t(lang, label)}${hint ? html`<small>${t(lang, hint)}</small>` : nothing}</span>`,
      checked,
      onToggle
    );
  }

  render() {
    const lang = this.language;
    const snap = this.snapshot;
    const s = snap.settings;
    const chosen = s.targets ?? snap.targets;
    const levels: Choice[] = [
      { value: 'now', label: t(lang, 'level_now') },
      { value: 'daily', label: t(lang, 'level_daily') },
      { value: 'off', label: t(lang, 'level_off') },
    ];
    const level = (key: LevelKey, label: StringKey, icon: string, iconTone: string) =>
      this.pickerRow(label, s.levels[key], levels, (v) => this.save({ levels: { [key]: v } }), {
        icon,
        tone: iconTone,
      });
    const persons = arrivePersons(s);
    const head = settingsHero(lang, s);
    const important = importantCount(snap.devices);
    const z = snap.z2m;
    const own = s.templates ?? {};
    const watched = monitored(snap.devices);
    const mains = watched.filter((d) => d.mains).length;
    // Preview with a real device: preferably one with a room
    const example = watched.find((d) => d.area && !d.mains) ?? watched[0];
    return html`
      <section class="hero">
        <div class="words">
          <h2 class="hl">${head.line1}<br /><span class="grad">${head.line2}</span></h2>
          <p class="hsub">${head.sub}</p>
        </div>
        <pulse-dayband
          .settings=${s}
          .language=${lang}
          .timeZone=${this.timeZone}
          .now=${this.now}
          .recipients=${this.recipients}
        ></pulse-dayband>
      </section>

      <div class="cols">

      <section class="section">
        <h3 class="section-title">${t(lang, 'recipients')}</h3>
        <div class="list">
          ${
            snap.targets.length
              ? snap.targets.map((service) =>
                  this.toggleRow(
                    html`<ha-icon class="ico" icon="mdi:cellphone"></ha-icon>
                      <span class=${this.names[service] ? 'label' : 'label capname'}>${this.targetLabel(service)}</span>`,
                    chosen.includes(service),
                    (on) => this.toggleTarget(service, on),
                    true
                  )
                )
              : html`<div class="row"><span class="label muted">${t(lang, 'recipients_none')}</span></div>`
          }
        </div>
        ${snap.targets.length ? html`<p class="section-foot">${t(lang, 'recipients_hint')}</p>` : nothing}
      </section>

      <section class="section">
        <h3 class="section-title">${t(lang, 'when')}</h3>
        <div class="list">
          ${level('failed', 'level_failed', 'mdi:heart-broken-outline', 't-crit')}
          ${level('check', 'level_check', 'mdi:alert-circle-outline', 't-warn')}
          ${level('battery', 'level_battery', 'mdi:battery-low', '')}
        </div>
        <p class="section-foot">${t(lang, 'levels_hint')}</p>
      </section>

      <section class="section">
        <h3 class="section-title">${t(lang, 'times')}</h3>
        <div class="list">
          ${this.pickerRow('summary_time', s.summary_time, this.times(s.summary_time), (v) => this.save({ summary_time: v }))}
          ${this.switchRow('quiet', s.quiet.enabled, (on) => this.save({ quiet: { enabled: on } }))}
          ${
            s.quiet.enabled
              ? html`${this.pickerRow('quiet_from', s.quiet.start, this.times(s.quiet.start), (v) => this.save({ quiet: { start: v } }))}
                ${this.pickerRow('quiet_to', s.quiet.end, this.times(s.quiet.end), (v) => this.save({ quiet: { end: v } }))}`
              : nothing
          }
        </div>
        ${s.quiet.enabled ? html`<p class="section-foot">${t(lang, 'quiet_hint')}</p>` : nothing}
      </section>

      <section class="section">
        <h3 class="section-title">${t(lang, 'special')}</h3>
        <div class="list">
          ${this.switchRow('critical', s.critical_alerts, (on) => this.save({ critical_alerts: on }), 'critical_hint')}
          ${this.linkRow(t(lang, 'important_devices'), String(important), () => this.fire('show-devices', { filter: 'important' }))}
          ${this.switchRow(
            'arrive',
            s.arrive_home.enabled,
            (on) =>
              this.save({
                arrive_home: {
                  enabled: on,
                  // Beim Einschalten ohne Auswahl: die erste Person, sonst bleibt die Auswahl
                  persons: persons.length || !on ? persons : snap.persons.slice(0, 1),
                },
              }),
            'arrive_hint'
          )}
          ${
            s.arrive_home.enabled
              ? snap.persons.length
                ? snap.persons.map((person) =>
                    this.toggleRow(
                      html`<ha-icon class="ico" icon="mdi:account-outline"></ha-icon>
                        <span class="label">${this.names[person] ?? person}</span>`,
                      persons.includes(person),
                      (on) => this.togglePerson(person, on),
                      true
                    )
                  )
                : html`<div class="row"><span class="label muted">${t(lang, 'persons_none')}</span></div>`
              : nothing
          }
          ${this.switchRow('recovered', s.recovered, (on) => this.save({ recovered: on }), 'recovered_hint')}
        </div>
      </section>

      <section class="section">
        <h3 class="section-title">${t(lang, 'zigbee')}</h3>
        ${
          z.present
            ? html`<div class="list z2m">
                ${this.z2mOptionRow('welcome_zigbee_title', 'zigbee_hint', z.last_seen && z.availability, z.requested_at, 'enable-z2m')}
                ${this.z2mOptionRow('health_title', 'health_hint', z.health === true, z.health_requested_at, 'enable-z2m-health')}
              </div>`
            : nothing
        }
        <details class="list adv">
          <summary class="row">
            <span class="label">${t(lang, 'advanced')}</span>
            <ha-icon class="chev" icon="mdi:chevron-down"></ha-icon>
          </summary>
          <label class="row">
            <span class="label">${t(lang, 'z2m_base')}</span>
            <input
              class="text"
              type="text"
              spellcheck="false"
              autocomplete="off"
              autocapitalize="off"
              placeholder="zigbee2mqtt"
              .value=${live(s.z2m_base)}
              @change=${(e: Event) => this.onZ2mBase(e)}
              @keydown=${(e: KeyboardEvent) => {
                // Enter speichert (über change beim Verlassen des Feldes)
                if (e.key === 'Enter' && e.currentTarget instanceof HTMLInputElement)
                  e.currentTarget.blur();
              }}
            />
          </label>
          <p class="row adv-hint">${t(lang, 'z2m_base_hint')}</p>
        </details>
      </section>

      <section class="section">
        <h3 class="section-title">${t(lang, 'texts')}</h3>
        <div class="list">
          ${TEMPLATE_KINDS.map((kind) =>
            this.linkRow(
              t(lang, KIND_KEYS[kind]),
              t(
                lang,
                own[`${kind}_title`] != null || own[`${kind}_message`] != null
                  ? 'tpl_custom'
                  : 'tpl_default'
              ),
              () => {
                this.editing = kind;
              }
            )
          )}
        </div>
        <p class="section-foot">${t(lang, 'texts_hint')}</p>
      </section>

      <section class="section">
        <h3 class="section-title">${t(lang, 'beta')}</h3>
        <div class="list">
          ${this.switchRow('mains_beta', s.mains_beta ?? false, (on) => this.save({ mains_beta: on }), 'mains_beta_hint')}
          ${
            s.mains_beta
              ? this.linkRow(t(lang, 'mains_devices'), String(mains), () =>
                  this.fire('show-devices', { filter: 'mains' })
                )
              : nothing
          }
        </div>
      </section>

      <section class="section">
        <h3 class="section-title">${t(lang, 'try_it')}</h3>
        <div class="list">
          <button class="row action" type="button" @click=${() => this.fire('test')}>${t(lang, 'test')}</button>
          <button class="row action" type="button" @click=${() => this.fire('summary')}>${t(lang, 'summary_now')}</button>
        </div>
      </section>
      </div>
      <pulse-template-sheet
        .open=${this.editing !== null}
        .kind=${this.editing ?? 'failed'}
        .language=${lang}
        .current=${own}
        .defaults=${snap.template_defaults ?? {}}
        .vars=${snap.template_vars ?? []}
        .example=${templateExample(example)}
        @template-save=${(e: CustomEvent<{ templates: Record<string, string | null> }>) =>
          this.save({ templates: e.detail.templates })}
        @closed=${() => {
          this.editing = null;
        }}
      ></pulse-template-sheet>
    `;
  }

  static styles = [
    tokens,
    shared,
    puls,
    css`
      :host {
        display: block;
        container-type: inline-size;
      }
      /* Schlagzeile wie in der Übersicht, das Tagesband zeigt live, was die Einstellungen bewirken */
      .hero {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(340px, 470px);
        gap: 24px 48px;
        align-items: end;
        margin-bottom: 32px;
      }
      .hl {
        margin: 0;
        font-family: var(--pu-display);
        font-size: clamp(32px, 4.2cqi, var(--pu-fs-56));
        line-height: 1.04;
        font-weight: 800;
        letter-spacing: -0.025em;
        text-wrap: balance;
      }
      .hsub {
        margin: 14px 0 0;
        max-width: 46ch;
        font-size: clamp(var(--pu-fs-15), 1.6cqi, var(--pu-fs-17));
        line-height: 1.42;
        letter-spacing: -0.01em;
        color: var(--pu-muted);
        text-wrap: pretty;
      }
      /* Abschnitte in zwei Spalten, auf schmalen Bildschirmen eine */
      .cols {
        columns: 2 380px;
        column-gap: 24px;
        padding-top: 24px;
        border-top: 1px solid var(--pu-line);
      }
      .section {
        break-inside: avoid;
        margin-bottom: 28px;
      }
      .z2m {
        margin-bottom: var(--pu-sp-12);
      }
      .on {
        display: inline-flex;
        align-items: center;
        gap: var(--pu-sp-4);
        --mdc-icon-size: 18px;
      }
      .row .value.t-ok {
        color: var(--pu-ok-text);
      }
      .capname {
        text-transform: capitalize;
      }
      /* „Erweitert“: zugeklappte Zeile, darin das Zigbee2MQTT-Thema */
      .adv summary {
        list-style: none;
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
      }
      .adv summary::-webkit-details-marker {
        display: none;
      }
      .adv summary:focus-visible {
        outline: 2px solid var(--pu-accent);
        outline-offset: -2px;
      }
      .adv .chev {
        transition: transform 0.2s;
      }
      .adv[open] .chev {
        transform: rotate(180deg);
      }
      .adv-hint {
        margin: 0;
        font-size: var(--pu-fs-13);
        line-height: 1.4;
        color: var(--pu-muted);
      }
      /* Textfeld rechts in der Zeile, ruhig wie ein Wert */
      .text {
        flex: 0 1 50%;
        min-width: 0;
        min-height: var(--pu-hit);
        padding: 0 10px;
        box-sizing: border-box;
        border: 1px solid transparent;
        border-radius: 8px;
        background: var(--pu-fill);
        color: var(--primary-text-color);
        font: inherit;
        font-size: var(--pu-fs-15);
        text-align: end;
      }
      .text:focus {
        outline: none;
        border-color: var(--pu-accent);
      }
      @container (max-width: 1000px) {
        .hero {
          grid-template-columns: minmax(0, 1fr);
        }
        pulse-dayband {
          max-width: 560px;
        }
      }
      @container (max-width: 600px) {
        .hl {
          font-size: clamp(30px, 9.5cqi, 40px);
        }
        .hsub {
          font-size: var(--pu-fs-15);
        }
        .hero {
          margin-bottom: 24px;
        }
      }
    `,
  ];
}

defineOnce('pulse-settings', PulseSettings);

declare global {
  interface HTMLElementTagNameMap {
    'pulse-settings': PulseSettings;
  }
}
