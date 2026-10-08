/**
 * Wann das Willkommen-Blatt kommt – wie bei FLODE: beim ersten Besuch „Willkommen bei Pulse“, nach
 * einem Update einmal „Neu in Pulse x.y“. Gemerkt pro Browser in `pulse.seenVersion`.
 */
export type WelcomeMode = 'welcome' | 'whatsNew';

export const SEEN_KEY = 'pulse.seenVersion';
/** Steht drin, solange das Willkommen noch aussteht (übersteht HAs Neuladen der Seite). */
const PENDING = '';
/** Schlüssel aus der Zeit vor `seenVersion` – wer ihn hat, hat Pulse schon benutzt. */
const LEGACY_KEY = 'pulse.welcome';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/**
 * `hasNews`: ob diese Version überhaupt Neuerungen zeigt (bei 1.0 nicht) – sonst wird ein Update
 * still als gesehen gemerkt, statt ein leeres „Neu in Pulse“ zu zeigen.
 */
export function detectMode(
  storage: StorageLike,
  version: string,
  hasNews = true
): WelcomeMode | null {
  const seen = storage.getItem(SEEN_KEY);
  if (seen === version) return null;
  if (seen === PENDING) return 'welcome';
  if (seen !== null || storage.getItem(LEGACY_KEY) !== null) {
    if (hasNews) return 'whatsNew';
    markSeen(storage, version);
    return null;
  }
  storage.setItem(SEEN_KEY, PENDING);
  return 'welcome';
}

export function markSeen(storage: StorageLike, version: string): void {
  storage.setItem(SEEN_KEY, version);
}
