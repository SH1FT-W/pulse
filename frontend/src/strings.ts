/** UI-Texte (en, de, fr, es, nl). Platzhalter: {name}. Begründungen kommen fertig vom Server. */
import { DE } from './strings-de';
import { EN } from './strings-en';
import { ES } from './strings-es';
import { FR } from './strings-fr';
import { NL } from './strings-nl';

export type StringKey = keyof typeof EN;

const TABLES: Record<string, Record<StringKey, string>> = { de: DE, fr: FR, es: ES, nl: NL };

export function t(
  language: string,
  key: StringKey,
  vars: Record<string, string | number> = {}
): string {
  const table = TABLES[language.slice(0, 2).toLowerCase()] ?? EN;
  return table[key].replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match
  );
}
