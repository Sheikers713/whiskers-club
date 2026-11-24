import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionary";
import { t } from "@/lib/i18n/localized";
import { getSettings } from "@/lib/settings";
import { pageMeta } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/[locale]/privacy">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = getDictionary(locale);
  return pageMeta(locale, "/privacy", { title: dict.privacy.title, description: dict.seo.privacyDescription });
}

export default async function Page({ params }: PageProps<"/[locale]/privacy">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const settings = await getSettings();
  const body = t(settings.privacyText, locale);
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display text-4xl uppercase md:text-6xl">{dict.privacy.title}</h1>
      <div className="prose-text mt-6 whitespace-pre-line text-lg leading-relaxed">{body}</div>
    </div>
  );
}
