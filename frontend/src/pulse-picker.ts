import { css, html, LitElement, nothing } from 'lit';
import { defineOnce, dropdownValue } from './ha';
import { shared, tokens } from './styles';
import './pulse-sheet';

export interface Choice {
  value: string;
  label: string;
}

/** Ab so vielen Einträgen kommt statt des Menüs ein Blatt (z. B. 48 Uhrzeiten). */
const LONG_LIST = 12;

/**
 * Auswahl wie ein iOS-Menü: rechts in der Zeile steht der Wert, ein Tipp öffnet HAs eigenes Menü
 * (`ha-dropdown`) mit Haken am gewählten Eintrag. Lange Listen öffnen ein Blatt, das beim
 * gewählten Wert steht. Sendet `change` mit `detail.value`.
 */
export class PulsePicker extends LitElement {
  static properties = {
    options: { attribute: false },
    value: { type: String },
    label: { type: String },
    language: { type: String },
    sheetOpen: { state: true },
  };

  declare options: Choice[];
  declare value: string;
  declare label: string;
  declare language: string;
  declare sheetOpen: boolean;

  constructor() {
    super();
    this.options = [];
    this.value = '';
    this.label = '';
    this.language = 'en';
    this.sheetOpen = false;
  }

  /**
   * '' ist ein gültiger Wert („Kein Partner“), null heißt „nichts gewählt“. Der Wert wird nicht lokal
   * gesetzt: Er kommt vom Server zurück – lehnt der ab, bleibt die Anzeige beim gespeicherten Wert.
   */
  private pick(value: string | null): void {
    this.sheetOpen = false;
    if (value === null || value === this.value) return;
    this.dispatchEvent(new CustomEvent('change', { detail: { value } }));
  }

  private async openSheet(): Promise<void> {
    this.sheetOpen = true;
    await this.updateComplete;
    const selected = this.renderRoot.querySelector('.choice[aria-checked="true"]');
    if (selected instanceof HTMLElement) {
      selected.scrollIntoView({ block: 'center' });
      selected.focus({ preventScroll: true });
    }
  }

  private trigger(slot: boolean) {
    const current = this.options.find((o) => o.value === this.value);
    return html`<button
      slot=${slot ? 'trigger' : nothing}
      class="trigger"
      type="button"
      aria-label=${this.label}
      aria-haspopup=${slot ? 'menu' : 'dialog'}
      @click=${slot ? nothing : () => void this.openSheet()}
    >
      <span>${current?.label ?? this.value}</span>
      <ha-icon icon="mdi:unfold-more-horizontal"></ha-icon>
    </button>`;
  }

  private renderSheet() {
    return html`${this.trigger(false)}
      <pulse-sheet
        .open=${this.sheetOpen}
        .heading=${this.label}
        .language=${this.language}
        @closed=${() => {
          this.sheetOpen = false;
        }}
      >
        <div class="list" role="radiogroup" aria-label=${this.label}>
          ${this.options.map(
            (o) => html`<button
              class="row choice"
              type="button"
              role="radio"
              aria-checked=${o.value === this.value ? 'true' : 'false'}
              @click=${() => this.pick(o.value)}
            >
              <span class="label">${o.label}</span>
              ${o.value === this.value ? html`<ha-icon class="check" icon="mdi:check"></ha-icon>` : nothing}
            </button>`
          )}
        </div>
      </pulse-sheet>`;
  }

  render() {
    if (this.options.length > LONG_LIST) return this.renderSheet();
    return html`<ha-dropdown placement="bottom-end" @wa-select=${(e: Event) => this.pick(dropdownValue(e))}>
      ${this.trigger(true)}
      ${this.options.map(
        (o) => html`<ha-dropdown-item .value=${o.value}>
          <ha-icon
            slot="icon"
            class=${o.value === this.value ? 'check' : 'check hidden'}
            icon="mdi:check"
          ></ha-icon>
          ${o.label}
        </ha-dropdown-item>`
      )}
    </ha-dropdown>`;
  }

  static styles = [
    tokens,
    shared,
    css`
      :host {
        display: inline-block;
        flex: none;
        max-width: 62%;
      }
      .trigger {
        display: inline-flex;
        width: max-content;
        align-items: center;
        gap: 2px;
        max-width: 100%;
        min-height: var(--pu-hit);
        min-width: var(--pu-hit);
        justify-content: flex-end;
        margin-inline-end: -6px;
        padding: 0 4px 0 10px;
        border: 0;
        border-radius: 8px;
        background: none;
        color: var(--pu-muted);
        font: inherit;
        font-size: 15px;
        font-variant-numeric: tabular-nums;
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
      }
      @media (hover: hover) {
        .trigger:hover {
          background: var(--pu-fill);
        }
      }
      .trigger:focus-visible {
        outline: 2px solid var(--pu-accent);
      }
      .trigger span {
        white-space: nowrap;
      }
      .trigger ha-icon {
        flex: none;
        --mdc-icon-size: 18px;
      }
      .check {
        color: var(--pu-accent);
        --mdc-icon-size: 20px;
      }
      .check.hidden {
        visibility: hidden;
      }
      .choice {
        font-variant-numeric: tabular-nums;
      }
      .choice[aria-checked='true'] {
        color: var(--pu-accent);
        font-weight: 600;
      }
    `,
  ];
}

defineOnce('pulse-picker', PulsePicker);

declare global {
  interface HTMLElementTagNameMap {
    'pulse-picker': PulsePicker;
  }
}
