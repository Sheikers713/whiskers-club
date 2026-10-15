import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionary";
import { formFields, formLabels } from "@/lib/forms/labels";
import { ApplicationForm } from "@/components/site/ApplicationForm";

export async function generateMetadata({ params }: PageProps<"/[locale]/partnership">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { title: getDictionary(locale).help.partnerTitle };
}

export default async function Page({ params }: PageProps<"/[locale]/partnership">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-display text-4xl uppercase md:text-6xl">{dict.help.partnerTitle}</h1>
      <p className="mt-3 text-lg text-ink-soft">{dict.help.partnerText}</p>
      <div className="mt-8">
        <ApplicationForm type="PARTNERSHIP" locale={locale} fields={formFields("PARTNERSHIP", dict)} labels={formLabels(dict)} />
      </div>
    </div>
  );
}
