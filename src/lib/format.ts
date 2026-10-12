import type { Locale } from "./i18n/config";
import { fmt, type Dictionary } from "./i18n/dictionary";

const intlLocale: Record<Locale, string> = { en: "en-GB", ru: "ru-RU", sr: "sr-Latn-RS" };

export function formatNumber(n: number, locale: Locale): string {
  return new Intl.NumberFormat(intlLocale[locale], { maximumFractionDigits: 0 }).format(n);
}

export function formatRsd(amount: number, locale: Locale): string {
  return `${formatNumber(amount, locale)} RSD`;
}

/** Approximate euro value of a dinar amount, rounded to whole euros. */
export function rsdToEur(amount: number, eurRate: number): number {
  if (!eurRate || eurRate <= 0) return 0;
  return Math.round(amount / eurRate);
}

export function formatDate(date: Date | string, locale: Locale): string {
  return new Intl.DateTimeFormat(intlLocale[locale], {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Belgrade",
  }).format(new Date(date));
}

export function formatShortDate(date: Date | string, locale: Locale): string {
  return new Intl.DateTimeFormat(intlLocale[locale], {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Europe/Belgrade",
  }).format(new Date(date));
}

/** Age in whole months between birth date and `now`. */
export function ageInMonths(birthDate: Date, now = new Date()): number {
  let months =
    (now.getUTCFullYear() - birthDate.getUTCFullYear()) * 12 +
    (now.getUTCMonth() - birthDate.getUTCMonth());
  if (now.getUTCDate() < birthDate.getUTCDate()) months -= 1;
  return Math.max(0, months);
}

export function formatAge(birthDate: Date | null, dict: Dictionary, now = new Date()): string {
  if (!birthDate) return dict.cats.ageUnknown;
  const total = ageInMonths(birthDate, now);
  if (total < 1) return dict.cats.underMonth;
  const y = Math.floor(total / 12);
  const m = total % 12;
  if (y === 0) return fmt(dict.cats.months, { n: m });
  if (m === 0) return fmt(dict.cats.years, { n: y });
  return fmt(dict.cats.yearsMonths, { y, m });
}
