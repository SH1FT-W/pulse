import { css, html, LitElement, nothing, type PropertyValues, svg } from 'lit';
import { defineOnce } from './ha';
import { resample, stripHeights, type Tone } from './logic';
import { tokens } from './styles';

/** Unter dieser Breite zeigt die Leiste halb so viele Balken (Handy). */
const NARROW = 480;
const W = 1000;
const H = 26;

function total(buckets: (number | null)[]): number {
  return buckets.reduce<number>((sum, b) => sum + (b ?? 0), 0);
}

/**
 * Rhythmusleiste – das Motiv von Pulse: ein abgerundeter Balken je Zeitfenster (12 je Tag), mittig,
 * Höhe nach Anzahl Meldungen; feine Linien trennen die Tage. Farbe nur am Problem: bei Problemgeräten
 * sind die Balken neutral, nur der letzte Balken vor dem Abbruch, vereinzelte Meldungen danach und die
 * gestrichelte Stille tragen die Statusfarbe. Ohne Stille (z. B. Batterie, „Wartet“) markiert ein
 * Strich in Statusfarbe das Ende. Zeiten ohne Daten sind schraffiert, Fenster in der Zukunft leer.
 * Kommt eine neue Meldung dazu, wächst der letzte Balken kurz (nicht bei reduzierter Bewegung).
 */
export class PulseRhythm extends LitElement {
  static properties = {
    buckets: { attribute: false },
    tone: { type: String, reflect: true },
    learning: { type: Boolean, reflect: true },
    silentFrom: { type: Number, attribute: false },
    flag: { type: String },
    gaps: { attribute: false },
    days: { type: Number },
    narrow: { state: true },
    width: { state: true },
  };

  declare buckets: (number | null)[];
  /** ok = Akzent-Violett (im Takt), warn/crit = Problem, muted = grau */
  declare tone: Tone;
  /** Lernt noch: gestrichelte Balken */
  declare learning: boolean;
  /** Index des ersten stillen Fensters (−1 = nicht still) – bezogen auf `buckets` */
  declare silentFrom: number;
  /** Pille: „Seit 4 Tagen still“ über der Stille, sonst („Wartet“, „Lernt noch“) am Ende */
  declare flag: string;
  /** Zeiten ohne Daten als Anteile der Leiste (0–1), siehe gapFractions() */
  declare gaps: [number, number][];
  /** Anzahl Tage (für die Tagesgrenzen) */
  declare days: number;
  declare narrow: boolean;
  /** Gemessene Breite in px (für die Beschriftung) */
  declare width: number;

  private observer: ResizeObserver | null = null;
  /** Fenster (ungebündelt), dessen Balken gerade wachsen soll (−1 = keins) */
  private growAt = -1;

  constructor() {
    super();
    this.buckets = [];
    this.tone = 'ok';
    this.learning = false;
    this.silentFrom = -1;
    this.flag = '';
    this.gaps = [];
    this.days = 7;
    this.narrow = false;
    this.width = 0;
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      const narrow = width > 0 && width < NARROW;
      if (narrow !== this.narrow) this.narrow = narrow;
      if (Math.abs(width - this.width) >= 8) this.width = width;
    });
    this.observer.observe(this);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.observer?.disconnect();
    this.observer = null;
  }

  protected willUpdate(changed: PropertyValues<this>): void {
    if (!changed.has('buckets')) return;
    const before = changed.get('buckets');
    // Nur bei einer neuen Meldung (gleiches Fenster-Raster, mehr Meldungen) – nicht beim ersten Zeichnen
    if (Array.isArray(before) && before.length === this.buckets.length) {
      if (total(this.buckets) > total(before))
        this.growAt = this.buckets.findLastIndex((b) => (b ?? 0) > 0);
    } else this.growAt = -1;
  }

  render() {
    const factor = this.narrow && this.buckets.length > 48 ? 2 : 1;
    const buckets =
      factor > 1 ? resample(this.buckets, Math.ceil(this.buckets.length / 2)) : this.buckets;
    const n = buckets.length || 1;
    // Aufrunden: ein zusammengefasster Balken mit der letzten echten Meldung gehört nicht zur Stille
    const silentFrom = this.silentFrom >= 0 ? Math.ceil(this.silentFrom / factor) : -1;
    const heights = stripHeights(buckets);
    const step = W / n;
    const bw = step * 0.56;
    const firstFuture = heights.indexOf(null);
    const end = firstFuture < 0 ? n : firstFuture;
    const problem = this.tone === 'warn' || this.tone === 'crit';
    const grow = this.growAt >= 0 ? Math.floor(this.growAt / factor) : -1;
    // Letzter Balken vor dem Abbruch (Statusfarbe)
    let lastBefore = -1;
    if (problem && silentFrom >= 0)
      for (let i = 0; i < Math.min(silentFrom, n); i++) if ((heights[i] ?? 0) > 0) lastBefore = i;
    // Problem ohne Stille: eine Markierung am Ende
    const mark = problem && silentFrom < 0 && end > 0 ? end - 1 : -1;
    const inGap = (i: number) => {
      const mid = (i + 0.5) / n;
      return this.gaps.some(([a, b]) => mid >= a && mid <= b);
    };
    const base: unknown[] = [];
    const hot: unknown[] = [];
    heights.forEach((h, i) => {
      if (h === null || i === mark) return;
      // In der Stille nur die vereinzelten Meldungen zeigen – auf der gestrichelten Linie
      if (silentFrom >= 0 && i >= silentFrom && h === 0) return;
      if (h === 0 && inGap(i)) return;
      const x = (i * step + (step - bw) / 2).toFixed(1);
      if (h === 0) {
        base.push(
          svg`<rect class="zero" x=${x} y=${(H / 2 - 1.5).toFixed(1)} width=${bw.toFixed(1)} height="3" rx="1.5"></rect>`
        );
        return;
      }
      const bh = Math.max(4, 6 + h * (H - 6));
      const colored = problem
        ? i === lastBefore || (silentFrom >= 0 && i >= silentFrom)
        : this.tone === 'ok';
      const classes = [
        problem && !colored ? 'n' : '',
        this.learning ? 'dash' : '',
        i === grow ? 'grow' : '',
      ].join(' ');
      const rect = svg`<rect class=${classes} x=${x} y=${((H - bh) / 2).toFixed(1)} width=${bw.toFixed(1)} height=${bh.toFixed(1)} rx=${(bw / 2).toFixed(1)}></rect>`;
      (colored ? hot : base).push(rect);
    });
    if (mark >= 0)
      hot.push(
        svg`<rect class="mark" x=${(mark * step + (step - bw) / 2).toFixed(1)} y="1" width=${bw.toFixed(1)} height=${H - 2} rx=${(bw / 2).toFixed(1)}></rect>`
      );
    if (silentFrom >= 0 && silentFrom < end)
      hot.push(
        svg`<line class="silent" x1=${(silentFrom * step).toFixed(1)} x2=${(end * step).toFixed(1)} y1=${H / 2} y2=${H / 2}></line>`
      );
    const dayLines = Array.from({ length: Math.max(0, this.days - 1) }, (_, k) => {
      const x = (((k + 1) / this.days) * W).toFixed(1);
      return svg`<line class="day" x1=${x} x2=${x} y1="1" y2=${H - 1}></line>`;
    });
    const pct = (i: number) => `${((i / n) * 100).toFixed(2)}%`;
    const gaps = this.gaps.map(
      ([a, b]) =>
        html`<span class="gap" style=${`left: ${(a * 100).toFixed(2)}%; width: ${((b - a) * 100).toFixed(2)}%`}></span>`
    );
    return html`${gaps}<svg class="base" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">${dayLines}${base}</svg><svg class="hot" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">${hot}</svg>${this.renderFlag(silentFrom, end, n, pct)}`;
  }

  /** Pille über der Stille (wenn die Strecke Platz hat), sonst am Ende der Leiste. */
  private renderFlag(silentFrom: number, end: number, n: number, pct: (i: number) => string) {
    if (!this.flag) return nothing;
    if (silentFrom >= 0) {
      const room = ((end - silentFrom) / n) * this.width;
      if (room < 140) return nothing;
      // Mittig auf der gestrichelten Strecke, nie über den rechten Rand hinaus
      return html`<span class="flag-area" style=${`left: max(0px, min(${pct(silentFrom)}, calc(${pct(end)} - 176px))); right: calc(100% - ${pct(end)})`}>
        <span class="flag">${this.flag}</span>
      </span>`;
    }
    if (this.width < 300) return nothing;
    return html`<span class="flag-area at-end" style=${`right: calc(100% - ${pct(end)})`}>
      <span class="flag">${this.flag}</span>
    </span>`;
  }

  static styles = [
    tokens,
    css`
      :host {
        position: relative;
        display: block;
        min-width: 0;
        height: var(--rhythm-height, 26px);
        --bar: var(--pu-accent);
        --silent: var(--pu-crit);
        --pill-bg: color-mix(in srgb, var(--pu-crit) 88%, #000);
        --pill-ink: #fff;
      }
      :host([tone='warn']) {
        --bar: var(--pu-warn);
        /* Stille unter Beobachtung: dieselbe Farbe wie der Status, nicht Rot */
        --silent: var(--pu-warn);
        --pill-bg: var(--pu-warn);
        --pill-ink: #231a00;
      }
      :host([tone='crit']) {
        --bar: var(--pu-crit);
      }
      :host([tone='muted']) {
        --bar: color-mix(in srgb, var(--pu-muted) 55%, transparent);
        --pill-bg: color-mix(in srgb, var(--pu-ink) 9%, var(--primary-background-color, #fff));
        --pill-ink: var(--pu-muted);
      }
      svg {
        position: absolute;
        inset: 0;
        display: block;
        width: 100%;
        height: 100%;
        overflow: visible;
      }
      /* Leuchten nur dunkel (Stärke vom Panel) und nur in der Statusfarbe */
      svg.hot {
        filter: drop-shadow(
          0 0 5px color-mix(in srgb, var(--bar) var(--pu-glow-strength), transparent)
        );
      }
      rect {
        fill: var(--bar);
      }
      rect.n {
        fill: var(--pu-neutral);
      }
      rect.zero {
        fill: var(--pu-track);
      }
      rect.dash {
        fill: none;
        stroke: var(--bar);
        stroke-width: 1.5;
        stroke-dasharray: 2 2;
        vector-effect: non-scaling-stroke;
      }
      rect.grow {
        transform-box: fill-box;
        transform-origin: center;
      }
      @media (prefers-reduced-motion: no-preference) {
        rect.grow {
          animation: grow 180ms ease-out;
        }
      }
      @keyframes grow {
        from {
          transform: scaleY(0.4);
        }
      }
      .day {
        stroke: var(--pu-line);
        stroke-width: 1;
        vector-effect: non-scaling-stroke;
      }
      .silent {
        stroke: var(--silent);
        stroke-width: 2.5;
        stroke-dasharray: 6 6;
        vector-effect: non-scaling-stroke;
      }
      .gap {
        position: absolute;
        top: 3px;
        bottom: 3px;
        border-radius: 4px;
        background: repeating-linear-gradient(
          -45deg,
          color-mix(in srgb, var(--pu-ink) 12%, transparent) 0 1.5px,
          transparent 1.5px 6px
        );
      }
      .flag-area {
        position: absolute;
        top: 0;
        bottom: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 0;
        pointer-events: none;
      }
      .flag-area.at-end {
        left: 0;
        justify-content: flex-end;
      }
      .flag {
        padding: 3px 10px;
        border-radius: var(--pu-r-full);
        background: var(--pill-bg);
        color: var(--pill-ink);
        font-size: 12px;
        font-weight: 700;
        line-height: 1.25;
        white-space: nowrap;
        pointer-events: none;
      }
    `,
  ];
}

defineOnce('pulse-rhythm', PulseRhythm);

declare global {
  interface HTMLElementTagNameMap {
    'pulse-rhythm': PulseRhythm;
  }
}
