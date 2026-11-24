import type { Metadata } from "next";
import { notFound } from "next/navigation";
import "../../globals.css";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionary";
import { getSettings, type SiteSettings } from "@/lib/settings";
import { indexingAllowed, jsonLd, ogLocale, siteUrl } from "@/lib/seo";
import { themeCss } from "@/lib/theme";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = getDictionary(locale);
  const description = dict.seo.homeDescription;
  const images = ["/opengraph-image.jpg"];
  // Shared defaults; each page sets its own canonical URL and hreflang links (pageMeta).
  return {
    metadataBase: new URL(siteUrl()),
    description,
    openGraph: { type: "website", siteName: "Whiskers Club", title: dict.seo.homeTitle, description, locale: ogLocale[locale], images },
    twitter: { card: "summary_large_image", title: dict.seo.homeTitle, description, images },
    title: { default: dict.seo.homeTitle, template: "%s · Whiskers Club" },
    applicationName: "Whiskers Club",
    // ALLOW_INDEXING=false keeps a temporary domain out of search results.
    robots: indexingAllowed() ? { index: true, follow: true } : { index: false, follow: false },
    verification: {
      google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
      yandex: process.env.YANDEX_VERIFICATION || undefined,
    },
  };
}

/** Schema.org description of the organisation, shown to search engines on every page. */
function organizationLd(locale: Locale, description: string, settings: SiteSettings) {
  const base = siteUrl();
  const sameAs = [settings.instagramUrl, settings.facebookUrl, settings.youtubeUrl, settings.tiktokUrl, settings.telegramUrl].filter(Boolean);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "NGO",
        "@id": `${base}/#organization`,
        name: "Whiskers Club",
        url: `${base}/${locale}`,
        logo: `${base}/icon.png`,
        image: `${base}/opengraph-image.jpg`,
        description,
        slogan: getDictionary(locale).home.heroTitle,
        areaServed: { "@type": "City", name: "Belgrade" },
        address: { "@type": "PostalAddress", addressLocality: "Belgrade", addressCountry: "RS" },
        ...(settings.contactEmail ? { email: settings.contactEmail } : {}),
        ...(sameAs.length ? { sameAs } : {}),
      },
      {
        "@type": "WebSite",
        "@id": `${base}/#website`,
        name: "Whiskers Club",
        url: `${base}/${locale}`,
        inLanguage: locale === "sr" ? "sr-Latn" : locale,
        publisher: { "@id": `${base}/#organization` },
      },
    ],
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
        {/* Theme from «Оформление»: only validated hex colours, whitelisted fonts and numbers. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd(organizationLd(locale, dict.seo.orgDescription, settings)) }}
        />
        <style dangerouslySetInnerHTML={{ __html: themeCss(settings.theme) }} />
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
