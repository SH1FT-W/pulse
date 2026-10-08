/** Der Ausschnitt aus Home Assistants Frontend-Objekten, den Pulse nutzt. */

export type Unsubscribe = () => void;

export interface HassConnection {
  subscribeMessage: <T>(
    callback: (message: T) => void,
    message: Record<string, unknown> & { type: string }
  ) => Promise<Unsubscribe>;
}

/** Ausschnitt aus HAs `CurrentUser` (frontend/src/types.ts dort). */
export interface HassUser {
  id?: string;
  name?: string;
  is_admin: boolean;
  is_owner?: boolean;
}

export interface HomeAssistant {
  language: string;
  /** HAs Nutzereinstellungen; `time_format`: 'language' | 'system' | '12' | '24' */
  locale?: { time_format?: string };
  states: Record<string, { entity_id: string; state: string; attributes: Record<string, unknown> }>;
  callWS: <T>(message: Record<string, unknown> & { type: string }) => Promise<T>;
  connection: HassConnection;
  /** Angemeldeter Benutzer (HAs `CurrentUser`); fehlt kurz beim Start */
  user?: HassUser;
  dockedSidebar?: string;
  kioskMode?: boolean;
  themes?: { darkMode?: boolean };
  config?: { time_zone?: string };
}

export function showMenuButton(hass: HomeAssistant | undefined, narrow: boolean): boolean {
  return hass?.kioskMode !== true && (narrow || hass?.dockedSidebar === 'always_hidden');
}

export interface ToastAction {
  text: string;
  action: () => void;
}

export function showToast(from: HTMLElement, message: string, action?: ToastAction): void {
  const detail = action ? { message, action, duration: 5000 } : { message };
  from.dispatchEvent(
    new CustomEvent('hass-notification', { detail, bubbles: true, composed: true })
  );
}

/** Wie HAs `navigate()`: URL setzen und HAs Router Bescheid geben. */
export function navigateTo(url: string, replace = false): void {
  if (replace) history.replaceState(null, '', url);
  else history.pushState(null, '', url);
  window.dispatchEvent(new CustomEvent('location-changed', { detail: { replace } }));
}

/** Element nur registrieren, wenn es den Namen noch nicht gibt (HA lädt bei Neustart neu). */
export function defineOnce(name: string, element: CustomElementConstructor): void {
  if (!customElements.get(name)) customElements.define(name, element);
}

export function errorText(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error)
    return String(error.message);
  return String(error);
}

/** Wert eines `<select>`/`<input>` aus einem Ereignis (leer, wenn das Ziel keins ist). */
export function inputValue(event: Event): string {
  const target = event.target;
  if (target instanceof HTMLSelectElement || target instanceof HTMLInputElement)
    return target.value;
  return '';
}

/**
 * Gewählter Wert aus HAs `ha-dropdown` (`wa-select` mit `detail.item.value`), sonst null.
 * '' ist ein gültiger Wert (z. B. „Kein Partner“) und nicht dasselbe wie „nichts gewählt“.
 */
export function dropdownValue(event: Event): string | null {
  const item: unknown = Reflect.get(Object(Reflect.get(event, 'detail')), 'item');
  const value: unknown = Reflect.get(Object(item), 'value');
  return typeof value === 'string' ? value : null;
}

/** Letzte Eingabe: Maus/Touch oder Tastatur – Fokusringe nur nach Tastatur (wie :focus-visible). */
let lastInput: 'pointer' | 'keyboard' = 'pointer';
let inputTracking = false;

export function trackInput(): void {
  if (inputTracking) return;
  inputTracking = true;
  window.addEventListener('pointerdown', () => (lastInput = 'pointer'), true);
  window.addEventListener('keydown', () => (lastInput = 'keyboard'), true);
}

/** Tiefstes fokussiertes Element über alle Shadow-Roots. */
function deepActive(): Element | null {
  let active = document.activeElement;
  while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
  return active;
}

/**
 * Nach dem Schließen eines Menüs gibt HA den Fokus an den Auslöser zurück – nach Maus/Touch bliebe dort
 * ein Ring stehen. Dann den Fokus wieder abgeben; mit Tastatur bleibt er (Barrierefreiheit).
 */
export function dropFocusAfterPointer(): void {
  if (lastInput !== 'pointer') return;
  window.setTimeout(() => {
    const active = deepActive();
    if (active instanceof HTMLElement) active.blur();
    // ha-icon-button hält den Fokus in seinem inneren Knopf
    const host = document.activeElement;
    if (host instanceof HTMLElement && host.tagName !== 'BODY') host.blur();
  }, 0);
}
