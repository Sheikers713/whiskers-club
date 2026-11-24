import type { Metadata } from "next";
import { locales, type Locale } from "./i18n/config";

/**
 * Search engines may index the site unless ALLOW_INDEXING=false (use that on a
 * temporary or staging domain).
 */
export function indexingAllowed(): boolean {
  return process.env.ALLOW_INDEXING !== "false";
}

/** Public origin without a trailing slash, from APP_URL. */
export function siteUrl(): string {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

export const ogLocale: Record<Locale, string> = { en: "en_US", ru: "ru_RU", sr: "sr_RS" };

/** hreflang links for a path without the language prefix ("" for home, "/cats"). */
export function languageAlternates(path: string): Record<string, string> {
  return {
    ...Object.fromEntries(locales.map((l) => [l, `/${l}${path}`])),
    "x-default": `/en${path}`,
  };
}

type PageSeo = {
  title: string;
  description: string;
  /** Use the title as is, without the « · Whiskers Club» suffix. */
  absoluteTitle?: boolean;
  images?: string[];
};

/**
 * Title, description, canonical URL, hreflang alternates and Open Graph for a
 * public page. Next.js replaces the layout's openGraph object as a whole, so
 * every field is set here.
 */
export function pageMeta(locale: Locale, path: string, seo: PageSeo): Metadata {
  const url = `/${locale}${path}`;
  const ogTitle = seo.absoluteTitle ? seo.title : `${seo.title} · Whiskers Club`;
  const images = seo.images ?? ["/opengraph-image.jpg"];
  return {
    title: seo.absoluteTitle ? { absolute: seo.title } : seo.title,
    description: seo.description,
    alternates: { canonical: url, languages: languageAlternates(path) },
    openGraph: {
      type: "website",
      siteName: "Whiskers Club",
      url,
      title: ogTitle,
      description: seo.description,
      locale: ogLocale[locale],
      alternateLocale: locales.filter((l) => l !== locale).map((l) => ogLocale[l]),
      images,
    },
    twitter: { card: "summary_large_image", title: ogTitle, description: seo.description, images },
  };
}

/** Serialises JSON-LD for a <script> tag without letting "</script>" break out. */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
