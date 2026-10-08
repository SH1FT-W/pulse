/**
 * Pulse-Optik „Puls“: große Schlagzeilen, Rhythmusleisten als Motiv, Farbe nur für Status. Flächen,
 * Text und Linien kommen aus HAs Theme-Variablen; eigen ist der Akzent (Pulse-Violett, Theme-Autoren:
 * `--pulse-accent` / `--pulse-accent-hi` / `--pulse-accent-fill`). Im Dunkelmodus setzt das Panel
 * `--pulse-glow-strength` – die Leisten leuchten dann in ihrer Statusfarbe wie ein EKG.
 */
import { css } from 'lit';

export const tokens = css`
  :host {
    --pu-accent: var(--pulse-accent, var(--pulse-accent-default, #6d5dfc));
    --pu-accent-hi: var(--pulse-accent-hi, var(--pulse-accent-hi-default, #a99fff));
    /* Flächen-Akzent für Knöpfe mit weißer Schrift (≥ 4,5:1); dunkel setzt das Panel #6f5cff */
    --pu-accent-fill: var(--pulse-accent-fill, var(--pulse-accent-fill-default, var(--pu-accent)));
    --pu-ok: var(--success-color, #43a047);
    --pu-warn: var(--warning-color, #ffa600);
    --pu-crit: var(--error-color, #db4437);
    --pu-muted: var(--secondary-text-color);
    --pu-line: var(--divider-color, rgba(127, 127, 127, 0.2));
    --pu-card: var(--card-background-color, var(--ha-card-background, #fff));
    --pu-fill: var(--secondary-background-color, rgba(127, 127, 127, 0.12));
    --pu-track: color-mix(in srgb, var(--primary-text-color) 10%, transparent);
    /* Segment aktiv und Blatt: das Panel setzt im Dunkelmodus hellere Flächen (iOS „erhöht“) */
    --pu-raised: var(--pulse-raised, var(--pu-card));
    --pu-ink: var(--primary-text-color);
    --pu-faint: color-mix(in srgb, var(--secondary-text-color) 82%, transparent);
    /* Neutrale Balken bei Problemgeräten: Farbe nur am Problem selbst */
    --pu-neutral: color-mix(in srgb, var(--pu-ink) 35%, transparent);
    --pu-warn-text: var(
      --pulse-warn-text,
      color-mix(in srgb, var(--pu-warn) 55%, var(--primary-text-color))
    );
    --pu-crit-text: color-mix(in srgb, var(--pu-crit) 88%, var(--primary-text-color));
    --pu-ok-text: color-mix(in srgb, var(--pu-ok) 72%, var(--primary-text-color));
    /* 0 % = kein Leuchten (hell); das Panel setzt dunkel 55 % */
    --pu-glow-strength: var(--pulse-glow-strength, 0%);
    --pu-mono: ui-monospace, 'SF Mono', SFMono-Regular, Menlo, Consolas, monospace;
    --pu-display: -apple-system, BlinkMacSystemFont, 'SF Pro Display', var(--ha-font-family-body, Roboto), system-ui, sans-serif;
    --pu-grad-text: var(--pulse-grad-text, linear-gradient(90deg, #5b4bf0, #8676ff));
    /* Schriftgrößen (Minimum 11 px) */
    --pu-fs-11: 11px;
    --pu-fs-13: 13px;
    --pu-fs-15: 15px;
    --pu-fs-17: 17px;
    --pu-fs-20: 20px;
    --pu-fs-28: 28px;
    --pu-fs-42: 42px;
    --pu-fs-56: 56px;
    /* Abstände und Radien */
    --pu-sp-4: 4px;
    --pu-sp-8: 8px;
    --pu-sp-12: 12px;
    --pu-sp-16: 16px;
    --pu-sp-24: 24px;
    --pu-sp-32: 32px;
    --pu-sp-48: 48px;
    --pu-r-8: 8px;
    --pu-r-12: 12px;
    --pu-r-20: 20px;
    --pu-r-full: 999px;
    /* Gemeinsame Spalten der Monitor-Zeilen (Übersicht + Geräte): Name | Leiste | Status · Zeit */
    --pu-col-name: minmax(0, 320px);
    --pu-col-state: 210px;
    --pu-col-gap: clamp(12px, 2.2cqi, 24px);
    /* Touch-Ziele: auf dem Handy mindestens 44 px (Apple HIG) */
    --pu-hit: 36px;
  }
  @media (pointer: coarse), (max-width: 600px) {
    :host {
      --pu-hit: 44px;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    :host *,
    :host *::before,
    :host *::after {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }
  }
`;

/**
 * Gemeinsame Bausteine: FLODE-Pillen-Knopf, gruppierte Inset-Listen
 * wie in den iOS-Einstellungen (graue Abschnittsüberschrift, Zeilen Label links / Wert rechts).
 */
export const shared = css`
  /* FLODEs Pillen-Knopf (.save) – .primary mit Akzent-Verlauf */
  .pbtn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-height: var(--pu-hit);
    padding: 0 16px;
    border: 0;
    border-radius: calc(var(--pu-hit) / 2);
    font: inherit;
    font-size: var(--pu-fs-15);
    font-weight: 500;
    white-space: nowrap;
    cursor: pointer;
    color: var(--primary-text-color);
    background: var(--pu-fill);
    --mdc-icon-size: 18px;
    -webkit-tap-highlight-color: transparent;
    transition: filter 0.15s, transform 0.1s;
  }
  /* Hover nur mit Maus – auf Touch bliebe er nach dem Tippen hängen */
  @media (hover: hover) {
    .pbtn:hover {
      filter: brightness(1.06);
    }
    button.row:hover,
    .row.tappable:hover {
      background: color-mix(in srgb, var(--primary-text-color) 4%, transparent);
    }
  }
  .pbtn:active {
    transform: scale(0.98);
  }
  /* Einfarbig: weiße Schrift auf dem Flächen-Akzent bleibt in hell und dunkel ≥ 4,5:1 */
  .pbtn.primary {
    color: #fff;
    background: var(--pu-accent-fill);
  }
  .pbtn:focus-visible {
    outline: 3px solid color-mix(in srgb, var(--pu-accent) 45%, transparent);
    outline-offset: 2px;
  }
  /* Abschnitt einer Inset-Liste */
  .section {
    display: grid;
    gap: 6px;
    min-width: 0;
  }
  .section-title {
    margin: 0;
    padding: 0 2px;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--pu-muted);
  }
  .section-foot {
    margin: 0;
    padding: 0 2px;
    font-size: var(--pu-fs-13);
    line-height: 1.4;
    color: var(--pu-muted);
  }
  .list {
    border: 1px solid var(--pu-line);
    border-radius: var(--pu-r-20);
    background: var(--pu-card);
    overflow: hidden;
  }
  .row {
    position: relative;
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: max(48px, var(--pu-hit));
    padding: 6px 16px;
    box-sizing: border-box;
    width: 100%;
    border: 0;
    background: none;
    color: var(--primary-text-color);
    font: inherit;
    font-size: var(--pu-fs-15);
    text-align: start;
  }
  /* Trennlinie eingerückt wie in iOS (beginnt am Text, nicht am Rand) */
  .row + .row::before {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    left: var(--inset, 16px);
    border-top: 1px solid var(--pu-line);
  }
  /* Zeilen mit 20-px-Symbol: Trennlinie beginnt am Text (16 + 20 + 12) */
  .row.has-icon {
    --inset: 48px;
  }
  .row > .ico {
    flex: none;
    color: var(--pu-muted);
    --mdc-icon-size: 20px;
  }
  .row > .ico.t-crit {
    color: var(--pu-crit-text);
  }
  .row > .ico.t-warn {
    color: var(--pu-warn-text);
  }
  button.row,
  .row.tappable {
    cursor: pointer;
    transition: background 0.15s;
    -webkit-tap-highlight-color: transparent;
  }
  button.row:active,
  .row.tappable:active {
    background: color-mix(in srgb, var(--primary-text-color) 8%, transparent);
  }
  button.row:focus-visible {
    outline: 2px solid var(--pu-accent);
    outline-offset: -2px;
  }
  .row .label {
    flex: 1;
    min-width: 0;
    display: grid;
  }
  .row .label small {
    font-size: var(--pu-fs-13);
    line-height: 1.35;
    color: var(--pu-muted);
    text-wrap: pretty;
  }
  /* Schalter in tippbaren Zeilen: die Zeile schaltet, der Schalter zeigt nur an */
  .row.tappable ha-switch {
    pointer-events: none;
  }
  .row .value {
    flex: none;
    max-width: 55%;
    color: var(--pu-muted);
    text-align: end;
    font-variant-numeric: tabular-nums;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .row .chev {
    flex: none;
    margin-inline-end: -6px;
    color: var(--pu-muted);
    --mdc-icon-size: 20px;
  }
  .row.action {
    color: var(--pu-accent);
    font-weight: 500;
  }
  .muted {
    color: var(--pu-muted);
  }
`;

/** Typografie der Richtung „Puls“: Schlagzeile mit Verlauf, Kapitälchen-Überschriften, Mono für Zeiten. */
export const puls = css`
  .grad {
    background: var(--pu-grad-text);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }
  .cap {
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--pu-muted);
  }
  /* Mono nur für Achsen; Zeiten in Systemschrift mit gleich breiten Ziffern */
  .mono {
    font-family: var(--pu-mono);
    font-variant-numeric: tabular-nums;
  }
  .num {
    font-variant-numeric: tabular-nums;
  }
  .t-crit {
    color: var(--pu-crit-text);
  }
  .t-warn {
    color: var(--pu-warn-text);
  }
  .t-ok {
    color: var(--pu-ok-text);
  }
  .t-muted {
    color: var(--pu-muted);
  }
`;

/**
 * Gemeinsame Zeilen-Vorlage für Übersicht und Geräteliste: Name | Leiste | Status · Zeit (+ ⋮ in der
 * Geräteliste). Spalten aus den Tokens `--pu-col-*`; auf dem Handy Name + Status oben, Leiste darunter.
 */
export const monitor = css`
  .axis,
  .rowgrid {
    display: grid;
    grid-template-columns: var(--pu-col-name) minmax(0, 1fr) var(--pu-col-state);
    gap: var(--pu-col-gap);
    align-items: center;
  }
  .axis {
    padding: var(--pu-sp-12) 0 2px;
    font-size: var(--pu-fs-11);
    color: var(--pu-faint);
  }
  .axis .days {
    display: grid;
    text-align: center;
  }
  /* Heute hervorgehoben */
  .axis .days span:last-child {
    color: var(--pu-ink);
    font-weight: 600;
  }
  .axis .right {
    text-align: end;
  }
  .grp {
    display: flex;
    gap: var(--pu-sp-8);
    padding: var(--pu-sp-24) 0 var(--pu-sp-8);
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--pu-muted);
  }
  .nm {
    display: flex;
    align-items: center;
    gap: var(--pu-sp-12);
    min-width: 0;
  }
  .nm ha-icon {
    flex: none;
    color: var(--pu-muted);
    --mdc-icon-size: 20px;
  }
  /* Name immer in Textfarbe – die Statusfarbe steht höchstens am Symbol */
  .nm ha-icon.t-crit {
    color: var(--pu-crit-text);
  }
  .nm ha-icon.t-warn {
    color: var(--pu-warn-text);
  }
  /* Erst weicht der Raum, dann der Name */
  .nm b {
    flex: 0 0 auto;
    max-width: 100%;
    min-width: 0;
    font-size: var(--pu-fs-15);
    font-weight: 600;
    color: var(--pu-ink);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .room {
    flex: 0 100 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: var(--pu-fs-13);
    color: var(--pu-faint);
  }
  .st {
    min-width: 0;
    font-size: var(--pu-fs-13);
    color: var(--pu-muted);
    text-align: end;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .st b {
    font-weight: 600;
  }
  @container (max-width: 860px) {
    .monitor {
      --pu-col-name: minmax(160px, 30%);
      --pu-col-state: minmax(90px, 18%);
    }
    .room,
    .st .sep,
    .st b + .sep + .time {
      display: none;
    }
  }
  @container (max-width: 600px) {
    .axis {
      grid-template-columns: minmax(0, 1fr);
    }
    .axis > span {
      display: none;
    }
    .rowgrid {
      grid-template-columns: minmax(0, 1fr) auto;
      gap: var(--pu-sp-8) var(--pu-sp-12);
      padding: var(--pu-sp-12) 0 10px;
    }
    .rowgrid pulse-rhythm {
      grid-column: 1 / -1;
      grid-row: 2;
      --rhythm-height: 22px;
    }
    .nm ha-icon,
    .room {
      display: none;
    }
    .nm b {
      white-space: normal;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }
    .grp {
      justify-content: space-between;
    }
    .grp .count::before {
      content: none;
    }
  }
`;
