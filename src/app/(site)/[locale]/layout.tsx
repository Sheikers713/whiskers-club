import type { Metadata } from "next";
import { notFound } from "next/navigation";
import "../../globals.css";
import { isLocale, locales } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionary";
import { getSettings } from "@/lib/settings";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = getDictionary(locale);
  const base = process.env.APP_URL ?? "http://localhost:3000";
  return {
    metadataBase: new URL(base),
    title: { default: `Whiskers Club — ${dict.meta.tagline}`, template: "%s · Whiskers Club" },
    description: dict.home.heroText,
    openGraph: { siteName: "Whiskers Club", type: "website", locale },
    alternates: { languages: Object.fromEntries(locales.map((l) => [l, `/${l}`])) },
    // Temporary domain must stay out of search results (decision 2.4).
    robots: process.env.ALLOW_INDEXING === "true" ? undefined : { index: false, follow: false },
  };
}

export default async function SiteLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const settings = await getSettings();
  return (
    <html lang={locale === "sr" ? "sr-Latn" : locale}>
      <body className="min-h-screen antialiased">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-paper focus:px-4 focus:py-2">
          Skip to content
        </a>
        <SiteHeader locale={locale} dict={dict} />
        <main id="main">{children}</main>
        <SiteFooter locale={locale} dict={dict} settings={settings} />
      </body>
    </html>
  );
}
