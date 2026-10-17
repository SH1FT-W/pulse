// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import '../pulse-sheet';
import type { PulseSheet } from '../pulse-sheet';

function matchSheet(matches: boolean): void {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: () => ({ matches }),
  });
}

async function mount(): Promise<{
  sheet: PulseSheet;
  dialog: HTMLDialogElement;
  drag: HTMLElement;
}> {
  const sheet = document.createElement('pulse-sheet');
  document.body.append(sheet);
  await sheet.updateComplete;
  const dialog = sheet.shadowRoot?.querySelector('dialog');
  const drag = sheet.shadowRoot?.querySelector('.drag');
  if (!(dialog instanceof HTMLDialogElement) || !(drag instanceof HTMLElement))
    throw new Error('kein Blatt');
  return { sheet, dialog, drag };
}

function pointer(type: string, clientY: number, timeStamp = 0): PointerEvent {
  const event = new PointerEvent(type, { clientY, pointerId: 1, button: 0, bubbles: true });
  if (timeStamp) Object.defineProperty(event, 'timeStamp', { value: timeStamp });
  return event;
}

describe('pulse-sheet', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    document.documentElement.style.overflow = '';
  });

  it('sperrt die Seite dahinter, solange ein Blatt offen ist', async () => {
    matchSheet(false);
    const { sheet, dialog } = await mount();
    const { sheet: second } = await mount();
    sheet.open = true;
    await sheet.updateComplete;
    expect(dialog.open).toBe(true);
    expect(document.documentElement.style.overflow).toBe('hidden');
    second.open = true;
    await second.updateComplete;
    let closed = 0;
    sheet.addEventListener('closed', () => closed++);
    sheet.open = false;
    await sheet.updateComplete;
    expect(closed).toBe(1);
    expect(document.documentElement.style.overflow).toBe('hidden'); // das zweite ist noch offen
    second.open = false;
    await second.updateComplete;
    expect(document.documentElement.style.overflow).toBe('');
  });

  it('Esc oder Hintergrund schließen das Blatt und melden closed', async () => {
    matchSheet(false);
    const { sheet, dialog } = await mount();
    sheet.open = true;
    await sheet.updateComplete;
    let closed = 0;
    sheet.addEventListener('closed', () => closed++);
    dialog.close(); // wie Esc
    await sheet.updateComplete;
    expect(sheet.open).toBe(false);
    expect(closed).toBe(1);
    expect(document.documentElement.style.overflow).toBe('');
  });

  it('zieht nur im Handy-Modus und erst ab dem Schwellwert', async () => {
    matchSheet(false);
    const desktop = await mount();
    desktop.sheet.open = true;
    await desktop.sheet.updateComplete;
    desktop.drag.dispatchEvent(pointer('pointerdown', 100));
    desktop.drag.dispatchEvent(pointer('pointermove', 180));
    expect(desktop.dialog.style.transform).toBe('');

    matchSheet(true);
    const phone = await mount();
    phone.sheet.open = true;
    await phone.sheet.updateComplete;
    phone.drag.dispatchEvent(pointer('pointerdown', 100));
    phone.drag.dispatchEvent(pointer('pointermove', 103)); // unter DRAG_SLOP: noch ein Tipp
    expect(phone.dialog.style.transform).toBe('');
    phone.drag.dispatchEvent(pointer('pointermove', 160));
    expect(phone.dialog.style.transform).toBe('translateY(60px)');
    // Nach oben nur mit Widerstand
    phone.drag.dispatchEvent(pointer('pointermove', 40));
    expect(phone.dialog.style.transform).toBe('translateY(-10px)');
    // Kurzer Weg, langsam losgelassen: schnappt zurück
    phone.drag.dispatchEvent(pointer('pointermove', 120));
    phone.drag.dispatchEvent(pointer('pointerup', 120, 2000));
    expect(phone.dialog.style.transform).toBe('');
    expect(phone.dialog.open).toBe(true);
  });
});
