/** UI-Texte (Deutsch + Englisch). Platzhalter: {name}. Begründungen kommen fertig vom Server. */
import { DE } from './strings-de';
import { EN } from './strings-en';

export type StringKey = keyof typeof EN;

export function t(
  language: string,
  key: StringKey,
  vars: Record<string, string | number> = {}
): string {
  const table: Record<StringKey, string> = language.startsWith('de') ? DE : EN;
  return table[key].replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match
  );
}
