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

/**
 * Feminine forms of status names, by status key, for languages where the
 * word changes with the cat's gender. Kept in code on purpose: admins edit only
 * the regular name. English has none, so it always uses the regular name.
 */
const FEMALE_STATUS_LABELS: Record<string, Partial<Record<Locale, string>>> = {
  ready: { ru: "Готова к пристройству", sr: "Spremna za udomljavanje" },
  adopted: { ru: "Нашла дом", sr: "Udomljena" },
};

/** A cat status in the cat's grammatical gender. */
export function statusLabel(status: { key: string; label: unknown }, sex: string | null | undefined, locale: Locale): string {
  if (sex === "FEMALE") {
    const female = FEMALE_STATUS_LABELS[status.key]?.[locale];
    if (female) return female;
  }
  return t(status.label, locale);
}

export function t(value: unknown, locale: Locale, originalLocale?: string | null): string {
  return pickLocalized(value, locale, originalLocale).text;
}

export function missingLocales(value: unknown): Locale[] {
  const v = asLocalized(value);
  return locales.filter((l) => !v[l]);
}

/**
 * Languages a text still needs a translation in. A text that is empty in every
 * language (e.g. no summary yet) has nothing to translate, so it reports none.
 */
export function untranslatedLocales(value: unknown): Locale[] {
  const v = asLocalized(value);
  return Object.keys(v).length === 0 ? [] : missingLocales(v);
}

/** Joins two texts per language with a blank line, skipping empty parts. */
export function mergeTexts(a: unknown, b: unknown): LocalizedText {
  const x = asLocalized(a);
  const y = asLocalized(b);
  const out: LocalizedText = {};
  for (const l of locales) {
    const v = [x[l], y[l]].filter(Boolean).join("\n\n");
    if (v) out[l] = v;
  }
  return out;
}
