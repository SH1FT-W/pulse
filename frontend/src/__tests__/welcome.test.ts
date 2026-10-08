import { describe, expect, it } from 'vitest';
import { detectMode, markSeen, SEEN_KEY } from '../welcome';

function memory(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    data,
  };
}

describe('Willkommen / Neu in Pulse', () => {
  it('erster Besuch: Willkommen, bleibt bis zum Schließen', () => {
    const store = memory();
    expect(detectMode(store, '1.0.0')).toBe('welcome');
    expect(detectMode(store, '1.0.0')).toBe('welcome'); // HA lädt die Seite neu
    markSeen(store, '1.0.0');
    expect(detectMode(store, '1.0.0')).toBeNull();
  });

  it('neue Version: einmal „Neu in Pulse“', () => {
    const store = memory({ [SEEN_KEY]: '0.9.0' });
    expect(detectMode(store, '1.0.0')).toBe('whatsNew');
    markSeen(store, '1.0.0');
    expect(detectMode(store, '1.0.0')).toBeNull();
  });

  it('ohne Neuerungen (1.0): Update still als gesehen merken', () => {
    const store = memory({ [SEEN_KEY]: '0.9.0' });
    expect(detectMode(store, '1.0.0', false)).toBeNull();
    expect(store.data.get(SEEN_KEY)).toBe('1.0.0');
    // Das erste Willkommen kommt trotzdem
    expect(detectMode(memory(), '1.0.0', false)).toBe('welcome');
  });

  it('wer Pulse vor seenVersion kannte, sieht das Neue', () => {
    expect(detectMode(memory({ 'pulse.welcome': '1.0' }), '1.0.0')).toBe('whatsNew');
  });
});
