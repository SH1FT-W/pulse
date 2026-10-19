import { css, html, LitElement, nothing } from 'lit';
import { live } from 'lit/directives/live.js';
import { defineOnce } from './ha';
import { renderTemplate } from './logic';
import { type StringKey, t } from './strings';
import { puls, shared, tokens } from './styles';
import type { TemplateKey, TemplateKind } from './types';
import './pulse-sheet';

export const TEMPLATE_KINDS: TemplateKind[] = ['failed', 'check', 'battery', 'recovered'];

export const KIND_KEYS: Record<TemplateKind, StringKey> = {
  failed: 'tpl_failed',
  check: 'tpl_check',
  battery: 'tpl_battery',
  recovered: 'tpl_recovered',
};

type Field = 'title' | 'message';

/**
 * Own text for one kind of notification: title and text start from Pulse's sentence (shown filled in),
 * placeholders insert at the cursor, the preview uses a real device. Saving an unchanged default stores
 * nothing (null), so later improvements of Pulse's sentences still arrive.
 */
export class PulseTemplateSheet extends LitElement {
  static properties = {
    open: { type: Boolean },
    kind: { type: String },
    language: { type: String },
    current: { attribute: false },
    defaults: { attribute: false },
    vars: { attribute: false },
    example: { attribute: false },
    draftTitle: { state: true },
    draftMessage: { state: true },
  };

  declare open: boolean;
  declare kind: TemplateKind;
  declare language: string;
  /** Saved own texts (null = default) */
  declare current: Partial<Record<TemplateKey, string | null>>;
  declare defaults: Partial<Record<TemplateKey, string>>;
  declare vars: string[];
  declare example: Record<string, string | null>;
  declare draftTitle: string;
  declare draftMessage: string;

  private focused: Field = 'message';

  constructor() {
    super();
    this.open = false;
    this.kind = 'failed';
    this.language = 'en';
    this.current = {};
    this.defaults = {};
    this.vars = [];
    this.example = {};
    this.draftTitle = '';
    this.draftMessage = '';
  }

  willUpdate(changed: Map<string, unknown>): void {
    // Opened (or another kind): start from what is saved, otherwise from the default
    if ((changed.has('open') || changed.has('kind')) && this.open) {
      this.draftTitle = this.value('title');
      this.draftMessage = this.value('message');
    }
  }

  private value(field: Field): string {
    const key: TemplateKey = `${this.kind}_${field}`;
    return this.current[key] ?? this.defaults[key] ?? '';
  }

  private insert(name: string): void {
    const token = `{${name}}`;
    const field = this.focused;
    const el = this.renderRoot.querySelector(field === 'title' ? 'input' : 'textarea');
    const text = field === 'title' ? this.draftTitle : this.draftMessage;
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;
    const next = text.slice(0, start) + token + text.slice(end);
    if (field === 'title') this.draftTitle = next;
    else this.draftMessage = next;
    void this.updateComplete.then(() => {
      el?.focus();
      el?.setSelectionRange(start + token.length, start + token.length);
    });
  }

  private save(reset: boolean): void {
    const store = (field: Field, text: string): string | null => {
      const clean = text.trim();
      return reset || !clean || clean === this.defaults[`${this.kind}_${field}`] ? null : clean;
    };
    this.dispatchEvent(
      new CustomEvent('template-save', {
        detail: {
          templates: {
            [`${this.kind}_title`]: store('title', this.draftTitle),
            [`${this.kind}_message`]: store('message', this.draftMessage),
          },
        },
        bubbles: true,
        composed: true,
      })
    );
    this.close();
  }

  private close(): void {
    this.dispatchEvent(new CustomEvent('closed', { bubbles: true, composed: true }));
  }

  render() {
    const lang = this.language;
    const preview = (text: string) => renderTemplate(text, this.example, this.vars);
    const custom =
      this.current[`${this.kind}_title`] != null || this.current[`${this.kind}_message`] != null;
    return html`<pulse-sheet
      no-close
      .open=${this.open}
      .heading=${t(lang, KIND_KEYS[this.kind])}
      .language=${lang}
      @closed=${() => this.close()}
    >
      <div class="body">
        <label class="field">
          <span class="cap">${t(lang, 'tpl_title_field')}</span>
          <input
            type="text"
            maxlength="300"
            .value=${live(this.draftTitle)}
            @focus=${() => {
              this.focused = 'title';
            }}
            @input=${(e: Event) => {
              if (e.target instanceof HTMLInputElement) this.draftTitle = e.target.value;
            }}
          />
        </label>
        <label class="field">
          <span class="cap">${t(lang, 'tpl_message_field')}</span>
          <textarea
            rows="3"
            maxlength="300"
            .value=${live(this.draftMessage)}
            @focus=${() => {
              this.focused = 'message';
            }}
            @input=${(e: Event) => {
              if (e.target instanceof HTMLTextAreaElement) this.draftMessage = e.target.value;
            }}
          ></textarea>
        </label>
        <div>
          <span class="cap">${t(lang, 'tpl_vars')}</span>
          <div class="chips">
            ${this.vars.map(
              (name) =>
                html`<button class="chip" type="button" @mousedown=${(e: Event) => e.preventDefault()} @click=${() => this.insert(name)}>{${name}}</button>`
            )}
          </div>
          <p class="hint">${t(lang, 'tpl_vars_hint')}</p>
        </div>
        ${
          Object.keys(this.example).length
            ? html`<div class="preview" aria-live="polite">
                <span class="cap">${t(lang, 'tpl_preview')}</span>
                <div class="bubble">
                  <b>${preview(this.draftTitle) || this.example.name}</b>
                  <span>${preview(this.draftMessage)}</span>
                </div>
              </div>`
            : nothing
        }
      </div>
      ${custom ? html`<button slot="footer" class="pbtn" type="button" @click=${() => this.save(true)}>${t(lang, 'tpl_reset')}</button>` : nothing}
      <button slot="footer" class="pbtn" type="button" @click=${() => this.close()}>${t(lang, 'cancel')}</button>
      <button slot="footer" class="pbtn primary" type="button" @click=${() => this.save(false)}>${t(lang, 'tpl_save')}</button>
    </pulse-sheet>`;
  }

  static styles = [
    tokens,
    shared,
    puls,
    css`
      .body {
        display: grid;
        gap: 18px;
      }
      .cap {
        display: block;
        margin-bottom: 6px;
        font-size: var(--pu-fs-13);
        color: var(--pu-muted);
      }
      input,
      textarea {
        width: 100%;
        box-sizing: border-box;
        min-height: var(--pu-hit);
        padding: 10px 12px;
        border: 1px solid transparent;
        border-radius: 10px;
        background: var(--pu-fill);
        color: var(--primary-text-color);
        font: inherit;
        font-size: var(--pu-fs-15);
        resize: vertical;
      }
      input:focus,
      textarea:focus {
        outline: none;
        border-color: var(--pu-accent);
      }
      .chips {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .chip {
        min-height: 32px;
        padding: 0 10px;
        border: 0;
        border-radius: 999px;
        background: var(--pu-fill);
        color: var(--primary-text-color);
        font: inherit;
        font-size: var(--pu-fs-13);
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        cursor: pointer;
      }
      .hint {
        margin: 8px 0 0;
        font-size: var(--pu-fs-13);
        line-height: 1.4;
        color: var(--pu-muted);
      }
      .bubble {
        display: grid;
        gap: 2px;
        padding: 12px 14px;
        border-radius: 14px;
        background: var(--pu-fill);
        font-size: var(--pu-fs-15);
        line-height: 1.35;
        white-space: pre-line;
      }
    `,
  ];
}

defineOnce('pulse-template-sheet', PulseTemplateSheet);

declare global {
  interface HTMLElementTagNameMap {
    'pulse-template-sheet': PulseTemplateSheet;
  }
}
