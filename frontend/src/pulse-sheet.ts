import { css, html, LitElement, nothing, type PropertyValues } from 'lit';
import { defineOnce } from './ha';
import { shouldDismiss } from './logic';
import { t } from './strings';
import { tokens } from './styles';

/** Bottom sheet mode: touch or narrow (like the CSS rule below). */
const SHEET_QUERY = '(pointer: coarse), (max-width: 600px)';
/** From this much movement on, a tap becomes a drag. */
const DRAG_SLOP = 6;

/** Open sheets (also stacked); while one is open, the page behind does not scroll. */
let openSheets = 0;
let savedOverflow = '';

function lockPage(lock: boolean): void {
  const root = document.documentElement;
  if (lock) {
    if (openSheets === 0) {
      savedOverflow = root.style.overflow;
      root.style.overflow = 'hidden';
    }
    openSheets += 1;
  } else if (openSheets > 0) {
    openSheets -= 1;
    if (openSheets === 0) root.style.overflow = savedOverflow;
  }
}

/**
 * Sheet for details and short forms: on the phone (touch or narrow) a bottom sheet with a handle
 * that slides in from below and can be swiped down to dismiss; on desktop a centered dialog.
 * Uses the native `<dialog>` (focus stays in the sheet, Esc closes). A tap on the dimmed
 * backdrop closes it as well. Only the content scrolls, never the page behind.
 *
 * `open` opens/closes; on close (also via Esc/backdrop/swipe) `closed` fires.
 * Slots: default (content), `footer` (buttons, sticks to the bottom).
 */
export class PulseSheet extends LitElement {
  static properties = {
    open: { type: Boolean, reflect: true },
    heading: { type: String },
    language: { type: String },
    noClose: { type: Boolean, attribute: 'no-close' },
    hasFooter: { state: true },
  };

  declare open: boolean;
  declare heading: string;
  declare language: string;
  /** Without ✕: for confirmations whose buttons already are the exits (Esc stays "cancel") */
  declare noClose: boolean;
  declare hasFooter: boolean;

  private drag: { id: number; startY: number; startT: number; dy: number; active: boolean } | null =
    null;
  private locked = false;

  private setLocked(lock: boolean): void {
    if (lock === this.locked) return;
    this.locked = lock;
    lockPage(lock);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.setLocked(false);
  }

  constructor() {
    super();
    this.open = false;
    this.heading = '';
    this.language = 'en';
    this.noClose = false;
    this.hasFooter = false;
  }

  private get dialog(): HTMLDialogElement | null {
    return this.renderRoot.querySelector('dialog');
  }

  private get body(): HTMLElement | null {
    return this.renderRoot.querySelector('.body');
  }

  protected updated(changed: PropertyValues<this>): void {
    if (!changed.has('open')) return;
    const dialog = this.dialog;
    if (!dialog) return;
    if (this.open && !dialog.open) {
      dialog.style.transform = '';
      this.removeAttribute('scrolled');
      dialog.showModal();
      // Focus the sheet itself, without a ring; otherwise the first button carries one after a mouse click
      dialog.focus({ focusVisible: false });
      this.setLocked(true);
      const body = this.body;
      if (body) body.scrollTop = 0;
    }
    if (!this.open && dialog.open) dialog.close();
  }

  /** Esc, backdrop, swipe or close button */
  private onClose(): void {
    this.setLocked(false);
    const dialog = this.dialog;
    if (dialog) {
      dialog.style.transition = '';
      dialog.style.transform = '';
    }
    if (this.open) this.open = false;
    this.dispatchEvent(new CustomEvent('closed'));
  }

  private onClick(event: MouseEvent): void {
    // Click directly on <dialog> = on the backdrop (the content lives in .panel). Confirmations
    // (no-close) only close via their buttons or Esc; a stray tap next to them does not cancel
    if (event.target === this.dialog && !this.noClose) this.dialog?.close();
  }

  /** Mouse wheel/trackpad over the backdrop or header must not scroll the page behind. */
  private onWheel(event: WheelEvent): void {
    const body = this.body;
    const inBody = body !== null && event.composedPath().includes(body);
    if (!inBody) event.preventDefault();
  }

  private sheetMode(): boolean {
    return window.matchMedia(SHEET_QUERY).matches;
  }

  private onPointerDown(event: PointerEvent): void {
    if (!this.sheetMode() || event.button !== 0) return;
    this.drag = {
      id: event.pointerId,
      startY: event.clientY,
      startT: event.timeStamp,
      dy: 0,
      active: false,
    };
  }

  private onPointerMove(event: PointerEvent): void {
    const drag = this.drag;
    const dialog = this.dialog;
    if (!drag || drag.id !== event.pointerId || !dialog) return;
    const dy = event.clientY - drag.startY;
    if (!drag.active) {
      if (Math.abs(dy) < DRAG_SLOP) return;
      drag.active = true;
      // Capture only now; a short tap on ✕ stays a click
      const target = event.currentTarget;
      if (target instanceof HTMLElement) target.setPointerCapture(event.pointerId);
      dialog.style.transition = 'none';
    }
    // Upward only with resistance (like iOS), downward 1:1
    drag.dy = dy > 0 ? dy : dy / 6;
    dialog.style.transform = `translateY(${drag.dy}px)`;
  }

  private onPointerUp(event: PointerEvent): void {
    const drag = this.drag;
    const dialog = this.dialog;
    this.drag = null;
    if (!drag || drag.id !== event.pointerId || !dialog || !drag.active) return;
    const velocity = drag.dy / Math.max(1, event.timeStamp - drag.startT);
    dialog.style.transition = 'transform 260ms cubic-bezier(0.2, 0.8, 0.2, 1)';
    if (shouldDismiss(drag.dy, velocity)) {
      dialog.style.transform = 'translateY(100%)';
      window.setTimeout(() => dialog.close(), 220);
    } else {
      dialog.style.transform = '';
    }
  }

  render() {
    // autofocus on the sheet itself: on open no button carries a focus ring (touch),
    // Tab leads from there into the content
    return html`<dialog
      tabindex="-1"
      autofocus
      aria-label=${this.heading || nothing}
      @close=${() => this.onClose()}
      @click=${(e: MouseEvent) => this.onClick(e)}
      @wheel=${(e: WheelEvent) => this.onWheel(e)}
    >
      <div class="panel">
        <div
          class="drag"
          @pointerdown=${(e: PointerEvent) => this.onPointerDown(e)}
          @pointermove=${(e: PointerEvent) => this.onPointerMove(e)}
          @pointerup=${(e: PointerEvent) => this.onPointerUp(e)}
          @pointercancel=${(e: PointerEvent) => this.onPointerUp(e)}
        >
          <div class="grab" aria-hidden="true"></div>
          <header>
            <h2>${this.heading}</h2>
            ${
              this.noClose
                ? nothing
                : html`<ha-icon-button .label=${t(this.language, 'close')} @click=${() => this.dialog?.close()}>
                  <ha-icon icon="mdi:close"></ha-icon>
                </ha-icon-button>`
            }
          </header>
        </div>
        <div
          class="body"
          @scroll=${(e: Event) => {
            const body = e.currentTarget;
            if (body instanceof HTMLElement) this.toggleAttribute('scrolled', body.scrollTop > 0);
          }}
        >
          <slot></slot>
        </div>
        <footer class=${this.hasFooter ? '' : 'empty'}>
          <slot
            name="footer"
            @slotchange=${(e: Event) => {
              const slot = e.target;
              this.hasFooter =
                slot instanceof HTMLSlotElement && slot.assignedElements().length > 0;
            }}
          ></slot>
        </footer>
      </div>
    </dialog>`;
  }

  static styles = [
    tokens,
    css`
      dialog {
        /* Surfaces: light = page background with white lists, dark = raised surface (set by the panel) */
        --pu-card: var(--pulse-sheet-card, var(--card-background-color, #fff));
        width: min(100% - 2 * 16px, 520px);
        max-height: min(100dvh - 2 * 32px, 960px);
        padding: 0;
        border: 0;
        border-radius: 18px;
        background: var(--pulse-sheet-bg, var(--primary-background-color, #fafafa));
        color: var(--primary-text-color);
        box-shadow:
          0 0 0 1px var(--pulse-sheet-edge, transparent),
          0 12px 32px rgba(0, 0, 0, 0.3);
        overflow: hidden;
        overscroll-behavior: contain;
      }
      /* Only visible when open, otherwise display:flex would override hiding the <dialog> */
      dialog[open] {
        display: flex;
        flex-direction: column;
        animation: fade-in 250ms cubic-bezier(0.2, 0.8, 0.2, 1);
      }
      /* No outline on the dialog itself, focus sits on its buttons */
      dialog:focus {
        outline: none;
      }
      dialog::backdrop {
        /* ::backdrop does not inherit variables in every browser, hence no token */
        background: color-mix(in srgb, black 40%, transparent);
      }
      /* Fixed header, only the content scrolls (min-height: 0 lets the flex area shrink) */
      .panel {
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;
      }
      .drag {
        flex: none;
        position: relative;
        z-index: 1;
        padding-bottom: 8px;
        border-bottom: 1px solid transparent;
        transition: border-color 0.15s, box-shadow 0.15s;
      }
      :host([scrolled]) .drag {
        border-bottom-color: var(--pu-line);
        box-shadow: 0 6px 12px -10px rgba(0, 0, 0, 0.35);
      }
      .grab {
        display: none;
        width: 36px;
        height: 5px;
        margin: 8px auto 0;
        border-radius: 999px;
        background: var(--pulse-grab, color-mix(in srgb, var(--primary-text-color) 22%, transparent));
      }
      header {
        display: flex;
        align-items: center;
        gap: 8px;
        min-height: 48px;
        padding: 8px 8px 0 20px;
      }
      h2 {
        flex: 1;
        min-width: 0;
        margin: 0;
        font-size: 20px;
        font-weight: 600;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      header ha-icon-button {
        color: var(--pu-muted);
      }
      ::slotted(*:focus:not(:focus-visible)) {
        outline: none;
      }
      .body:focus {
        outline: none;
      }
      .body {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        overscroll-behavior: contain;
        -webkit-overflow-scrolling: touch;
        padding: 12px 20px 24px;
      }
      footer {
        flex: none;
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        padding: 0 20px 20px;
      }
      footer.empty {
        display: none;
      }
      /* Phone: at the bottom edge, full width, slides in from below, handle + header to swipe away */
      @media (pointer: coarse), (max-width: 600px) {
        dialog {
          width: 100%;
          max-width: none;
          max-height: 92dvh;
          margin: auto 0 0;
          border-radius: 28px 28px 0 0;
        }
        dialog[open] {
          animation: slide-up 450ms cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        .drag {
          touch-action: none;
          cursor: grab;
        }
        .grab {
          display: block;
        }
        .body,
        footer {
          padding-inline: 16px;
        }
        .body {
          padding-bottom: calc(24px + env(safe-area-inset-bottom));
        }
        footer {
          padding-bottom: calc(16px + env(safe-area-inset-bottom));
        }
        header {
          padding-inline-start: 16px;
        }
      }
      @keyframes slide-up {
        from {
          transform: translateY(100%);
        }
      }
      @keyframes fade-in {
        from {
          opacity: 0;
          transform: scale(0.97);
        }
      }
    `,
  ];
}

defineOnce('pulse-sheet', PulseSheet);

declare global {
  interface HTMLElementTagNameMap {
    'pulse-sheet': PulseSheet;
  }
}
