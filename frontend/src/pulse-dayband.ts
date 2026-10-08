import { css, html, LitElement } from 'lit';
import { defineOnce } from './ha';
import { daybandLine, hourOfDay, hoursOf, quietRanges } from './logic';
import { t } from './strings';
import { puls, tokens } from './styles';
import type { Settings } from './types';

const pct = (hours: number) => `${((hours / 24) * 100).toFixed(2)}%`;

/**
 * „Dein Tag mit Pulse“: eine Textzeile („18:00 Zusammenfassung · Ruhe 22:00 bis 07:30“) und darunter
 * 24 Stunden als Band – nur Grafik: Ruhezeit hinterlegt, Zusammenfassung als Punkt, „jetzt“ als Strich.
 */
export class PulseDayband extends LitElement {
  static properties = {
    settings: { attribute: false },
    language: { type: String },
    now: { type: Number },
    recipients: { type: String },
    timeZone: { attribute: false },
  };

  declare settings: Settings;
  declare language: string;
  declare now: number;
  /** „An Alex’ iPhone“ */
  declare recipients: string;
  /** Zeitzone von Home Assistant – Ruhezeit und Zusammenfassung gelten dort, nicht im Browser */
  declare timeZone: string | undefined;

  constructor() {
    super();
    this.language = 'en';
    this.now = 0;
    this.recipients = '';
    this.timeZone = undefined;
  }

  render() {
    const lang = this.language;
    const s = this.settings;
    const now = hourOfDay(this.now, this.timeZone);
    const summary = hoursOf(s.summary_time);
    const quiet = s.quiet.enabled ? quietRanges(s.quiet.start, s.quiet.end) : [];
    const line = daybandLine(lang, s);
    return html`<div class="top">
        <span class="cap">${t(lang, 'day_title')}</span>
        <span class="to">${this.recipients}</span>
      </div>
      <p class="line">${line}</p>
      <div class="band" role="img" aria-label=${`${t(lang, 'day_title')}: ${line}`}>
        <div class="track" aria-hidden="true">
          ${quiet.map(
            ([a, b]) =>
              html`<span class="quiet" style=${`left: ${pct(a)}; width: ${pct(b - a)}`}></span>`
          )}
          <span class="nowline" style=${`left: ${pct(now)}`}></span>
          <span class="dot" style=${`left: ${pct(summary)}`}></span>
        </div>
        <div class="hours mono" aria-hidden="true">
          ${[0, 6, 12, 18, 24].map((h) => html`<span>${t(lang, 'hour_label', { h })}</span>`)}
        </div>
      </div>`;
  }

  static styles = [
    tokens,
    puls,
    css`
      /* Haarlinie oben wie beim Monitor statt Rahmen und Fläche */
      :host {
        display: block;
        padding: var(--pu-sp-16) 0 0;
        border-top: 1px solid var(--pu-line);
        box-sizing: border-box;
        min-width: 0;
      }
      .top {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        gap: var(--pu-sp-12);
      }
      .to {
        font-size: var(--pu-fs-13);
        color: var(--pu-muted);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .line {
        margin: var(--pu-sp-4) 0 0;
        font-size: var(--pu-fs-13);
        color: var(--pu-ink);
        font-variant-numeric: tabular-nums;
      }
      .band {
        position: relative;
        margin-top: var(--pu-sp-12);
      }
      .track {
        position: relative;
        height: 14px;
        border-radius: 7px;
        background: var(--pu-track);
      }
      .quiet {
        position: absolute;
        top: 0;
        bottom: 0;
        border-radius: 7px;
        background: color-mix(in srgb, var(--pu-accent) 16%, transparent);
      }
      /* „jetzt“: feiner Strich über dem Punkt */
      .nowline {
        position: absolute;
        z-index: 1;
        top: -5px;
        bottom: -5px;
        width: 2px;
        margin-left: -1px;
        background: var(--pu-muted);
        border-radius: 1px;
      }
      .dot {
        position: absolute;
        top: 50%;
        width: 14px;
        height: 14px;
        margin: -10px 0 0 -10px;
        border-radius: 50%;
        background: var(--pu-accent);
        border: 3px solid var(--primary-background-color, #fff);
      }
      .hours {
        display: flex;
        justify-content: space-between;
        margin-top: var(--pu-sp-8);
        font-size: var(--pu-fs-11);
        color: var(--pu-faint);
      }
    `,
  ];
}

defineOnce('pulse-dayband', PulseDayband);

declare global {
  interface HTMLElementTagNameMap {
    'pulse-dayband': PulseDayband;
  }
}
