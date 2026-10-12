import en, { type Dictionary } from "./dictionaries/en";
import ru from "./dictionaries/ru";
import sr from "./dictionaries/sr";
import type { Locale } from "./config";

const dictionaries: Record<Locale, Dictionary> = { en, ru, sr };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

/** Replaces {name} placeholders. */
export function fmt(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, key) =>
    key in values ? String(values[key]) : m,
  );
}

export type { Dictionary };
