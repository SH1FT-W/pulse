import { css, html, LitElement, nothing } from 'lit';
import { defineOnce } from './ha';
import { tokens } from './styles';

export interface Segment {
  value: string;
  label: string;
}

/**
 * Reiter im Stil „Puls“: Text, der aktive mit Unterstrich. Jeder Reiter ist mindestens so hoch wie ein
 * Touch-Ziel (`--pu-hit`). Sendet `change` mit `detail.value`. Die Reiter wechseln Seiten (Routen) –
 * deshalb eine Navigation mit `aria-current="page"` statt Tab-Rollen.
 */
export class PulseSegmented extends LitElement {
  static properties = {
    options: { attribute: false },
    value: { type: String },
    label: { type: String },
  };

  declare options: Segment[];
  declare value: string;
  declare label: string;

  constructor() {
    super();
    this.options = [];
    this.value = '';
    this.label = '';
  }

  private pick(value: string): void {
    if (value === this.value) return;
    this.dispatchEvent(new CustomEvent('change', { detail: { value } }));
  }

  render() {
    return html`<nav aria-label=${this.label}>
      ${this.options.map(
        (o) => html`<button
          type="button"
          aria-current=${o.value === this.value ? 'page' : nothing}
          class=${o.value === this.value ? 'active' : ''}
          @click=${() => this.pick(o.value)}
        >
          ${o.label}
        </button>`
      )}
    </nav>`;
  }

  static styles = [
    tokens,
    css`
      :host {
        display: block;
        max-width: 100%;
      }
      nav {
        display: flex;
        gap: clamp(4px, 1.6vw, 14px);
      }
      button {
        position: relative;
        flex: none;
        min-height: var(--pu-hit);
        padding: 0 6px;
        border: 0;
        font: inherit;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        color: var(--pu-muted);
        background: transparent;
        transition: color 0.15s;
        -webkit-tap-highlight-color: transparent;
      }
      button::after {
        content: '';
        position: absolute;
        left: 6px;
        right: 6px;
        bottom: calc(50% - 15px);
        height: 2px;
        border-radius: 2px;
        background: transparent;
        transition: background 0.15s;
      }
      button.active {
        color: var(--pu-ink);
      }
      button.active::after {
        background: var(--pu-ink);
      }
      @media (hover: hover) {
        button:not(.active):hover {
          color: var(--pu-ink);
        }
      }
      button:focus-visible {
        outline: 2px solid var(--pu-accent);
        outline-offset: -2px;
        border-radius: 8px;
      }
      @media (max-width: 420px) {
        button {
          font-size: 13px;
          padding: 0 4px;
        }
        button::after {
          left: 4px;
          right: 4px;
        }
      }
    `,
  ];
}

defineOnce('pulse-segmented', PulseSegmented);

declare global {
  interface HTMLElementTagNameMap {
    'pulse-segmented': PulseSegmented;
  }
}
