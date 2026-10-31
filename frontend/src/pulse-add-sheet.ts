import { css, html, LitElement, nothing, type PropertyValues } from 'lit';
import { defineOnce } from './ha';
import { candidateLine, matchCandidates } from './logic';
import { t } from './strings';
import { shared, tokens } from './styles';
import type { ManualCandidate } from './types';
import './pulse-sheet';

/**
 * Add a device by hand (Settings → Added by hand): a sheet with a search field and every device Pulse
 * does not watch yet (`candidates`, null = still loading). A tap sends `add` with `detail.id`; the panel
 * saves it, shows a toast and closes the sheet.
 */
export class PulseAddSheet extends LitElement {
  static properties = {
    open: { type: Boolean },
    language: { type: String },
    candidates: { attribute: false },
    query: { state: true },
  };

  declare open: boolean;
  declare language: string;
  declare candidates: ManualCandidate[] | null;
  declare query: string;

  constructor() {
    super();
    this.open = false;
    this.language = 'en';
    this.candidates = null;
    this.query = '';
  }

  protected willUpdate(changed: PropertyValues<this>): void {
    // A fresh search every time the sheet opens
    if (changed.has('open') && this.open) this.query = '';
  }

  private add(id: string): void {
    this.dispatchEvent(new CustomEvent('add', { detail: { id } }));
  }

  private renderList() {
    const lang = this.language;
    if (this.candidates === null)
      return html`<p class="empty muted">${t(lang, 'manual_loading')}</p>`;
    if (!this.candidates.length) return html`<p class="empty muted">${t(lang, 'manual_none')}</p>`;
    const shown = matchCandidates(this.candidates, this.query);
    if (!shown.length) return html`<p class="empty muted">${t(lang, 'manual_no_match')}</p>`;
    return html`<div class="list">
      ${shown.map(
        (c) => html`<button class="row has-icon" type="button" @click=${() => this.add(c.id)}>
          <ha-icon class="ico" icon=${c.icon}></ha-icon>
          <span class="label">${c.name}<small>${candidateLine(c)}</small></span>
          <ha-icon class="plus" icon="mdi:plus-circle-outline"></ha-icon>
        </button>`
      )}
    </div>`;
  }

  render() {
    const lang = this.language;
    return html`<pulse-sheet
      .open=${this.open}
      .heading=${t(lang, 'manual_add')}
      .language=${lang}
      @closed=${() => this.dispatchEvent(new CustomEvent('closed'))}
    >
      ${
        this.candidates?.length
          ? html`<input
              class="search"
              type="search"
              enterkeyhint="search"
              autocomplete="off"
              spellcheck="false"
              .placeholder=${t(lang, 'manual_search')}
              aria-label=${t(lang, 'manual_search')}
              .value=${this.query}
              @input=${(e: Event) => {
                if (e.target instanceof HTMLInputElement) this.query = e.target.value;
              }}
            />`
          : nothing
      }
      ${this.renderList()}
    </pulse-sheet>`;
  }

  static styles = [
    tokens,
    shared,
    css`
      .search {
        display: block;
        width: 100%;
        min-height: var(--pu-hit);
        margin-bottom: 12px;
        padding: 0 14px;
        box-sizing: border-box;
        border: 1px solid transparent;
        border-radius: 12px;
        background: var(--pu-fill);
        color: var(--primary-text-color);
        font: inherit;
        font-size: var(--pu-fs-15);
      }
      .search:focus {
        outline: none;
        border-color: var(--pu-accent);
      }
      .plus {
        flex: none;
        color: var(--pu-accent);
        --mdc-icon-size: 22px;
      }
      .empty {
        margin: 8px 2px;
        font-size: var(--pu-fs-15);
      }
    `,
  ];
}

defineOnce('pulse-add-sheet', PulseAddSheet);

declare global {
  interface HTMLElementTagNameMap {
    'pulse-add-sheet': PulseAddSheet;
  }
}
