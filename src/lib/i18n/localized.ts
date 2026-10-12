import { defaultLocale, locales, type Locale } from "./config";

/** Translatable text as stored in the database: one value per language. */
export type LocalizedText = Partial<Record<Locale, string>>;

export function asLocalized(value: unknown): LocalizedText {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: LocalizedText = {};
  for (const l of locales) {
    const v = (value as Record<string, unknown>)[l];
    if (typeof v === "string" && v.trim() !== "") out[l] = v;
  }
  return out;
}

/**
 * Resolves text for a locale with the agreed fallback chain (decision 1.5):
 * requested language -> English -> original language -> any language.
 * `isFallback` lets admins see that a translation is missing.
 */
export function pickLocalized(
  value: unknown,
  locale: Locale,
  originalLocale?: string | null,
): { text: string; locale: Locale | null; isFallback: boolean } {
  const v = asLocalized(value);
  const chain: Locale[] = [locale, defaultLocale];
  if (originalLocale && (locales as readonly string[]).includes(originalLocale)) {
    chain.push(originalLocale as Locale);
  }
  chain.push(...locales);
  for (const l of chain) {
    if (v[l]) return { text: v[l]!, locale: l, isFallback: l !== locale };
  }
  return { text: "", locale: null, isFallback: true };
}

export function t(value: unknown, locale: Locale, originalLocale?: string | null): string {
  return pickLocalized(value, locale, originalLocale).text;
}

export function missingLocales(value: unknown): Locale[] {
  const v = asLocalized(value);
  return locales.filter((l) => !v[l]);
}
