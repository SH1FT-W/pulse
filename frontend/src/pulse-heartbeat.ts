import { css, html, LitElement, nothing, type PropertyValues, svg } from 'lit';
import { defineOnce } from './ha';
import { dayTicks, hourMarks, tickHeight } from './logic';
import { t } from './strings';
import { puls, tokens } from './styles';

const W = 1000;
const H = 24;
const GRID_HOURS = [3, 6, 9, 12, 15, 18, 21];

function total(bins: (number | null)[][]): number {
  return bins.reduce((sum, day) => sum + day.reduce<number>((s, b) => s + (b ?? 0), 0), 0);
}

/**
 * Herzschlag-Kalender: eine Zeile je Tag, ein fester 3-px-Strich je 15-min-Fenster mit Meldungen
 * (höher = mehrere). Die Tage kommen mit echten Grenzen (`dayStarts`), an der Zeitumstellung also 23
 * oder 25 Stunden lang; die Gitterlinien stehen auf echter Lokalzeit. Ist das Gerät still, läuft ab
 * `silentSince` (nach der letzten Meldung, siehe heartbeatSilence()) eine gestrichelte Linie in der
 * Statusfarbe bis „jetzt“. Zeiten ohne Daten sind schraffiert – sichtbar anders als Stille.
 */
export class PulseHeartbeat extends LitElement {
  static properties = {
    bins: { attribute: false },
    dayStarts: { attribute: false },
    binMinutes: { type: Number },
    now: { type: Number },
    silentSince: { type: Number, attribute: false },
    noData: { attribute: false },
    silence: { type: String, reflect: true },
    language: { type: String },
    timeZone: { attribute: false },
    tone: { type: String, reflect: true },
    beating: { state: true },
  };

  /** Je Tag die Fenster (Tag i deckt [dayStarts[i], dayStarts[i+1]) ab) */
  declare bins: (number | null)[][];
  declare dayStarts: number[];
  declare binMinutes: number;
  declare now: number;
  /** Beginn der Stille (nach der letzten Meldung), sonst −1 */
  declare silentSince: number;
  /** Zeiten ohne Daten: [von, bis] in Sekunden */
  declare noData: [number, number][];
  /** Farbe der Stille: warn (Beobachten) oder crit (Prüfen/Ausgefallen) */
  declare silence: 'warn' | 'crit';
  declare language: string;
  /** Zeitzone von Home Assistant (für Wochentage und Gitter, schon geprüft) */
  declare timeZone: string | undefined;
  /** ok = Akzent, neutral = Problemgerät (Farbe nur an der Stille), muted = ignoriert */
  declare tone: 'ok' | 'neutral' | 'muted';
  /** Jetzt-Punkt pulsiert einmal (neue Meldung) */
  declare beating: boolean;

  constructor() {
    super();
    this.bins = [];
    this.dayStarts = [];
    this.binMinutes = 15;
    this.now = 0;
    this.silentSince = -1;
    this.noData = [];
    this.silence = 'crit';
    this.language = 'en';
    this.timeZone = undefined;
    this.tone = 'ok';
    this.beating = false;
  }

  protected willUpdate(changed: PropertyValues<this>): void {
    if (!changed.has('bins')) return;
    const before = changed.get('bins');
    // Nur bei einer neuen Meldung desselben Geräts/Zeitraums, nicht beim ersten Laden
    if (
      Array.isArray(before) &&
      before.length === this.bins.length &&
      total(this.bins) > total(before)
    )
      this.beating = true;
  }

  private row(day: number, dayStart: number, dayEnd: number) {
    const length = dayEnd - dayStart;
    const pct = (seconds: number) => `${((seconds / length) * 100).toFixed(2)}%`;
    const x = (seconds: number) => ((seconds / length) * W).toFixed(1);
    const grid = hourMarks(dayStart, dayEnd, GRID_HOURS, this.timeZone).map((at) => {
      const gx = (at * W).toFixed(1);
      return svg`<line class="grid" x1=${gx} x2=${gx} y1="3" y2=${H - 3}></line>`;
    });
    let silent: unknown = nothing;
    if (this.silentSince > 0 && this.silentSince < dayEnd && this.now > dayStart) {
      const from = Math.max(this.silentSince, dayStart) - dayStart;
      const to = Math.min(this.now, dayEnd) - dayStart;
      if (to > from)
        silent = svg`<line class="silent" x1=${x(from)} x2=${x(to)} y1=${H / 2} y2=${H / 2}></line>`;
    }
    // Feste 3-px-Striche als HTML (in der skalierten viewBox würden sie zu „Bohnen“)
    const ticks = dayTicks(this.bins[day] ?? [], length, this.binMinutes).map(
      (tick) =>
        html`<i class="tk" style=${`left: ${(tick.at * 100).toFixed(2)}%; height: ${tickHeight(tick.count)}px`}></i>`
    );
    const gaps = this.noData
      .map(([a, b]): [number, number] => [Math.max(a, dayStart), Math.min(b, dayEnd)])
      .filter(([a, b]) => b > a)
      .map(
        ([a, b]) =>
          html`<span class="gap" style=${`left: ${pct(a - dayStart)}; width: ${pct(b - a)}`}></span>`
      );
    const isToday = this.now >= dayStart && this.now < dayEnd;
    const nowDot = isToday
      ? html`<span
          class=${['now', this.silentSince > 0 ? 'silent' : '', this.beating ? 'beat' : ''].join(' ')}
          style=${`left: ${pct(this.now - dayStart)}`}
          @animationend=${() => {
            this.beating = false;
          }}
        ></span>`
      : nothing;
    const label = new Intl.DateTimeFormat(this.language, {
      weekday: 'short',
      ...(this.timeZone ? { timeZone: this.timeZone } : {}),
    })
      .format(new Date(((dayStart + dayEnd) / 2) * 1000))
      .replace('.', '');
    return html`<div class="r">
      <span class=${isToday ? 'mono today' : 'mono'}>${label}</span>
      <div class="track">
        ${gaps}
        <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">${grid}${silent}</svg>
        <div class="ticks">${ticks}</div>
        ${nowDot}
      </div>
    </div>`;
  }

  render() {
    const days = Math.max(0, this.dayStarts.length - 1);
    const count = total(this.bins);
    const rows = Array.from({ length: days }, (_, i) =>
      this.row(i, this.dayStarts[i] ?? 0, this.dayStarts[i + 1] ?? 0)
    );
    return html`<div class="cal" role="img" aria-label=${t(this.language, 'heartbeat_aria', { count, days })}>
      ${rows}
      <div class="x mono" aria-hidden="true"><span></span><div><span>0</span><span>6</span><span>12</span><span>18</span><span>24</span></div></div>
    </div>`;
  }

  static styles = [
    tokens,
    puls,
    css`
      :host {
        display: block;
        --tick: var(--pu-accent);
        --silent: var(--pu-crit);
      }
      :host([silence='warn']) {
        --silent: var(--pu-warn);
      }
      :host([tone='neutral']) {
        --tick: var(--pu-neutral);
      }
      :host([tone='muted']) {
        --tick: color-mix(in srgb, var(--pu-muted) 60%, transparent);
      }
      .cal {
        display: grid;
        gap: 4px;
      }
      .r {
        display: grid;
        grid-template-columns: 28px minmax(0, 1fr);
        gap: 8px;
        align-items: center;
        height: 24px;
      }
      .r > span {
        font-size: 12px;
        color: var(--pu-muted);
      }
      .r > span.today {
        color: var(--pu-ink);
        font-weight: 600;
      }
      .track {
        position: relative;
        min-width: 0;
        height: 24px;
      }
      svg {
        position: absolute;
        inset: 0;
        display: block;
        width: 100%;
        height: 100%;
        overflow: visible;
      }
      .grid {
        stroke: var(--pu-line);
        stroke-width: 1;
        vector-effect: non-scaling-stroke;
      }
      .silent {
        stroke: var(--silent);
        stroke-width: 2.5;
        stroke-dasharray: 5 5;
        vector-effect: non-scaling-stroke;
      }
      .ticks {
        position: absolute;
        inset: 0;
        filter: drop-shadow(
          0 0 4px color-mix(in srgb, var(--tick) var(--pu-glow-strength), transparent)
        );
      }
      .tk {
        position: absolute;
        top: 50%;
        width: 3px;
        margin-left: -1.5px;
        border-radius: 1.5px;
        background: var(--tick);
        transform: translateY(-50%);
      }
      .now {
        position: absolute;
        top: 50%;
        width: 8px;
        height: 8px;
        margin: -4px 0 0 -4px;
        border-radius: 50%;
        background: var(--pu-accent);
      }
      .now.silent {
        background: var(--silent);
      }
      @media (prefers-reduced-motion: no-preference) {
        .now.beat {
          animation: beat 600ms ease-out;
        }
      }
      @keyframes beat {
        30% {
          transform: scale(1.8);
          box-shadow: 0 0 0 4px color-mix(in srgb, var(--pu-accent) 30%, transparent);
        }
      }
      .gap {
        position: absolute;
        top: 2px;
        bottom: 2px;
        border-radius: 4px;
        background: repeating-linear-gradient(
          -45deg,
          color-mix(in srgb, var(--pu-ink) 13%, transparent) 0 1.5px,
          transparent 1.5px 6px
        );
      }
      .x {
        display: grid;
        grid-template-columns: 28px minmax(0, 1fr);
        gap: 8px;
        margin-top: 4px;
        font-size: var(--pu-fs-11);
        color: var(--pu-faint);
      }
      .x div {
        display: flex;
        justify-content: space-between;
      }
    `,
  ];
}

defineOnce('pulse-heartbeat', PulseHeartbeat);

declare global {
  interface HTMLElementTagNameMap {
    'pulse-heartbeat': PulseHeartbeat;
  }
}
