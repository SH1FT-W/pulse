import { css, html, LitElement, nothing, svg } from 'lit';
import { defineOnce } from './ha';
import { type StringKey, t } from './strings';
import { puls, tokens } from './styles';
import type { WelcomeMode } from './welcome';

interface Feature {
  icon: string;
  title: StringKey;
  text: StringKey;
}

/** Erster Besuch: was Pulse ist. */
const WELCOME: Feature[] = [
  {
    icon: 'mdi:chart-timeline-variant',
    title: 'welcome_rhythm_title',
    text: 'welcome_rhythm_text',
  },
  { icon: 'mdi:ear-hearing', title: 'welcome_listen_title', text: 'welcome_listen_text' },
  { icon: 'mdi:bell-badge-outline', title: 'welcome_notify_title', text: 'welcome_notify_text' },
];

/**
 * Nach einem Update: das Neue dieser Version, in Worten der Nutzer. Bei jedem Release ersetzen
 * (2–4 Einträge). 1.0 ist die erste Version – da gibt es nichts „Neues“, nur das Willkommen.
 */
export const WHATS_NEW: Feature[] = [];

const CHANGELOG_URL = 'https://github.com/SH1FT-W/pulse/blob/main/CHANGELOG.md';

export type ZigbeeOffer = 'offer' | 'on' | 'none';

/** „Willkommen bei Pulse“ / „Neu in Pulse x.y“ – wie FLODEs Blatt nach einem iOS-Update. */
export class PulseWelcome extends LitElement {
  static properties = {
    language: { type: String },
    mode: { attribute: false },
    version: { type: String },
    zigbee: { type: String },
  };

  declare language: string;
  declare mode: WelcomeMode | null;
  declare version: string;
  /** Zigbee2MQTT gefunden und Lebenszeichen noch aus → Zeile mit Schalter */
  declare zigbee: ZigbeeOffer;

  constructor() {
    super();
    this.language = 'en';
    this.mode = null;
    this.version = '';
    this.zigbee = 'none';
  }

  private close(): void {
    if (!this.mode) return;
    this.mode = null;
    this.dispatchEvent(new CustomEvent('closed'));
  }

  /** Eine Einstellung, kein Feature: eigene Zeile unter den Punkten, ganze Zeile tippbar. */
  private renderZigbee() {
    const lang = this.language;
    const on = this.zigbee === 'on';
    const ask = () => {
      if (!on) this.dispatchEvent(new CustomEvent('enable-z2m'));
    };
    return html`<div
      class=${on ? 'zig' : 'zig tappable'}
      role=${on ? nothing : 'switch'}
      aria-checked=${on ? nothing : 'false'}
      tabindex=${on ? nothing : '0'}
      @click=${ask}
      @keydown=${(e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          ask();
        }
      }}
    >
      <span><b>${t(lang, 'welcome_zigbee_title')}</b><small>${t(lang, 'welcome_zigbee_text')}</small></span>
      ${
        on
          ? html`<span class="on"><ha-icon icon="mdi:check-circle"></ha-icon>${t(lang, 'zigbee_active')}</span>`
          : html`<ha-switch tabindex="-1" aria-hidden="true"></ha-switch>`
      }
    </div>`;
  }

  /** EKG-Linie des App-Zeichens, die in Rhythmusleisten übergeht. */
  private renderEcg() {
    const bars = [
      24, 38, 18, 44, 30, 40, 22, 46, 34, 26, 42, 20, 36, 44, 28, 40, 24, 34, 46, 30, 22, 38, 42,
      26,
    ];
    return html`<svg class="ecg" viewBox="0 0 390 160" aria-hidden="true">
      <defs>
        <linearGradient id="pulse-wl" x1="0" x2="1">
          <stop offset="0" stop-color="#b9b0ff"></stop>
          <stop offset="1" stop-color="#6d5dfc"></stop>
        </linearGradient>
      </defs>
      <path class="line" d="M0 80 H70 L82 40 L96 120 L108 60 L116 80 H150"></path>
      ${bars.map(
        (h, i) =>
          svg`<rect x=${166 + i * 9.4} y=${80 - h / 2} width="4.6" height=${h} rx="2.3" fill="url(#pulse-wl)" opacity=${(1 - i / 34).toFixed(2)}></rect>`
      )}
      <circle class="end" cx="150" cy="80" r="6"></circle>
    </svg>`;
  }

  render() {
    if (!this.mode) return nothing;
    const lang = this.language;
    const welcome = this.mode === 'welcome';
    const features = welcome ? WELCOME : WHATS_NEW;
    return html`<ha-dialog open @closed=${() => this.close()}>
      <div class="sheet">
        <div class="glow" aria-hidden="true"></div>
        ${this.renderEcg()}
        ${
          welcome
            ? html`<h2>${t(lang, 'welcome_head1')}<br /><span class="grad">${t(lang, 'welcome_head2')}</span></h2>
                <p class="lead">${t(lang, 'welcome_lead')}</p>`
            : html`<h2 class="news">${t(lang, 'whats_new_title', { version: this.version })}</h2>`
        }
        <ol>
          ${features.map(
            (f, i) => html`<li>
              <em class="mono">${String(i + 1).padStart(2, '0')}</em>
              <span><b>${t(lang, f.title)}.</b> ${t(lang, f.text)}</span>
            </li>`
          )}
        </ol>
      </div>
      <!-- Fester Fuß: Schalter und „Weiter“ bleiben immer sichtbar, der Text darüber scrollt -->
      <div slot="footer" class="foot">
        ${welcome && this.zigbee !== 'none' ? this.renderZigbee() : nothing}
        <button class="go" type="button" @click=${() => this.close()}>${t(lang, 'continue')}</button>
        ${
          welcome
            ? nothing
            : html`<a class="all" href=${CHANGELOG_URL} target="_blank" rel="noreferrer">${t(lang, 'whats_new_all')}</a>`
        }
      </div>
    </ha-dialog>`;
  }

  static styles = [
    tokens,
    puls,
    css`
      ha-dialog {
        /* Bühne wie die Seite: im Dunkeln schwarz, damit das EKG leuchtet */
        --ha-dialog-surface-background: var(--primary-background-color);
        --mdc-theme-surface: var(--primary-background-color);
        --mdc-dialog-max-width: 480px;
        --mdc-dialog-min-width: min(480px, 100vw);
      }
      .sheet {
        position: relative;
        display: flex;
        flex-direction: column;
        gap: 0;
        max-width: 440px;
        margin: 0 auto;
        padding: 4px 4px 4px;
        color: var(--pu-ink);
      }
      /* Leuchten läuft zu allen Rändern weich aus – keine Kante am Dialogrand */
      .glow {
        position: absolute;
        inset: 0 0 auto;
        height: 240px;
        background: radial-gradient(
          closest-side,
          color-mix(in srgb, var(--pu-accent) 30%, transparent),
          color-mix(in srgb, var(--pu-accent) 8%, transparent) 60%,
          transparent
        );
        pointer-events: none;
      }
      .ecg {
        position: relative;
        display: block;
        width: calc(100% + 48px);
        height: auto;
        margin: 0 -24px 6px;
        overflow: visible;
      }
      .ecg .line {
        fill: none;
        stroke: url(#pulse-wl);
        stroke-width: 5;
        stroke-linecap: round;
        stroke-linejoin: round;
        filter: drop-shadow(0 0 10px color-mix(in srgb, var(--pu-accent) 70%, transparent));
      }
      .ecg .end {
        fill: var(--card-background-color, #000);
        stroke: #b9b0ff;
        stroke-width: 3;
      }
      h2 {
        position: relative;
        margin: 0;
        font-family: var(--pu-display);
        font-size: 46px;
        font-weight: 800;
        letter-spacing: -0.025em;
        line-height: 1;
      }
      h2.news {
        font-size: 34px;
        text-wrap: balance;
      }
      .lead {
        margin: 14px 0 0;
        font-size: 17px;
        line-height: 1.42;
        letter-spacing: -0.01em;
        color: var(--pu-muted);
      }
      ol {
        list-style: none;
        margin: 22px 0 0;
        padding: 0;
        display: grid;
        gap: 14px;
      }
      li {
        display: grid;
        grid-template-columns: 32px 1fr;
        gap: 6px;
        font-size: 15px;
        line-height: 1.38;
        color: var(--pu-muted);
      }
      li em {
        font-style: normal;
        font-size: 13px;
        padding-top: 2px;
        color: var(--pu-accent);
      }
      li b {
        font-weight: 600;
        color: var(--pu-ink);
      }
      .foot {
        display: flex;
        flex-direction: column;
        gap: 14px;
        width: 100%;
        max-width: 464px;
        margin: 0 auto;
        padding: 0 12px calc(12px + env(safe-area-inset-bottom));
        box-sizing: border-box;
      }
      .zig {
        display: flex;
        align-items: center;
        gap: 12px;
        min-height: 48px;
        padding-top: 14px;
        border-top: 1px solid var(--pu-line);
      }
      .zig > span:first-child {
        flex: 1;
        display: grid;
        min-width: 0;
      }
      .zig b {
        font-size: 15px;
      }
      .zig small {
        font-size: 13px;
        color: var(--pu-muted);
      }
      .zig.tappable {
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
      }
      .zig.tappable ha-switch {
        pointer-events: none;
      }
      .zig:focus-visible {
        outline: 2px solid var(--pu-accent);
        outline-offset: 2px;
      }
      .on {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-weight: 600;
        color: var(--pu-ok-text);
        --mdc-icon-size: 18px;
      }
      .go {
        width: 100%;
        min-height: 52px;
        border: 0;
        border-radius: 26px;
        /* Einfarbig wie alle Primärknöpfe: Weiß auf dem Flächen-Akzent ≥ 4,5:1 */
        background: var(--pu-accent-fill);
        box-shadow: 0 10px 40px -8px color-mix(in srgb, var(--pu-accent-fill) 60%, transparent);
        color: #fff;
        font: inherit;
        font-size: var(--pu-fs-17);
        font-weight: 600;
        cursor: pointer;
      }
      .go:focus-visible {
        outline: 3px solid var(--pu-accent);
        outline-offset: 3px;
      }
      .all {
        align-self: center;
        color: var(--pu-accent);
        font-size: 15px;
        text-decoration: none;
      }
      .sheet {
        padding-bottom: 12px;
      }
      /* Handy: HAs Dialog-Fuß hat dort keinen Innenabstand – bündig mit dem Text darüber */
      @media (max-width: 600px) {
        .foot {
          max-width: none;
          padding-inline: 28px;
        }
      }
    `,
  ];
}

defineOnce('pulse-welcome', PulseWelcome);

declare global {
  interface HTMLElementTagNameMap {
    'pulse-welcome': PulseWelcome;
  }
}
