import { css, html, LitElement } from 'lit';
import { defineOnce } from './ha';
import { tokens } from './styles';

/**
 * Das App-Zeichen: abgerundetes Quadrat mit dunklem Verlauf und einer Puls-Linie im Akzent-Verlauf –
 * gebaut wie FLODEs Zeichen, mit Leuchten in der Akzentfarbe.
 */
export class PulseMark extends LitElement {
  render() {
    return html`<svg viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <linearGradient id="pulse-mark-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#1c1838" />
          <stop offset="1" stop-color="#0d0b1c" />
        </linearGradient>
        <linearGradient id="pulse-mark-line" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#b9b0ff" />
          <stop offset="1" stop-color="#6d5dfc" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="22" fill="url(#pulse-mark-bg)" />
      <path
        d="M16 55 H34 L42 34 L54 72 L62 46 L67 55 H84"
        fill="none"
        stroke="url(#pulse-mark-line)"
        stroke-width="8"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <circle cx="84" cy="55" r="6" fill="#0d0b1c" stroke="#b9b0ff" stroke-width="4" />
    </svg>`;
  }

  static styles = [
    tokens,
    css`
      :host {
        display: block;
        width: 64px;
        height: 64px;
      }
      svg {
        width: 100%;
        height: 100%;
        filter: drop-shadow(0 10px 24px rgba(109, 93, 252, 0.45));
      }
      /* Klein im Kopf: ohne Leuchten */
      :host([flat]) svg {
        filter: none;
      }
    `,
  ];
}

defineOnce('pulse-mark', PulseMark);

declare global {
  interface HTMLElementTagNameMap {
    'pulse-mark': PulseMark;
  }
}
