export const locales = ["en", "ru", "sr"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";
export const localeCookie = "wc_locale";

export const localeNames: Record<Locale, string> = {
  en: "English",
  ru: "Русский",
  sr: "Srpski",
};

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (locales as readonly string[]).includes(value);
}

// Languages that should land on the Serbian (Latin) version.
const serbianLike = ["sr", "hr", "bs", "me", "sh"];

/** Picks a locale from an Accept-Language header. */
export function negotiateLocale(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return defaultLocale;
  const ranked = acceptLanguage
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.find((p) => p.trim().startsWith("q="));
      return { tag: tag.toLowerCase(), q: q ? Number(q.trim().slice(2)) || 0 : 1 };
    })
    .filter((x) => x.tag)
    .sort((a, b) => b.q - a.q);
  for (const { tag } of ranked) {
    const base = tag.split("-")[0];
    if (base === "en") return "en";
    if (base === "ru" || base === "uk" || base === "be") return "ru";
    if (serbianLike.includes(base)) return "sr";
  }
  return defaultLocale;
}
