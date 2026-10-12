import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/config";
import { fmt, getDictionary } from "@/lib/i18n/dictionary";
import { t } from "@/lib/i18n/localized";
import { db } from "@/lib/db";
import { publicCatWhere } from "@/lib/queries/cats";
import { formFields, formLabels } from "@/lib/forms/labels";
import { ApplicationForm } from "@/components/site/ApplicationForm";

export const metadata: Metadata = { robots: { index: false } };

export default async function AdoptPage({ params }: PageProps<"/[locale]/cats/[slug]/adopt">) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const cat = await db.cat.findFirst({ where: { slug, ...publicCatWhere, status: { group: "ACTIVE" } } });
  if (!cat) notFound();
  const name = t(cat.name, locale, cat.originalLocale);
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link href={`/${locale}/cats/${slug}`} className="font-medium text-brick hover:underline">
        ‹ {name}
      </Link>
      <h1 className="mt-3 font-display text-4xl font-bold">{fmt(dict.forms.adoptFor, { name })}</h1>
      <div className="mt-8">
        <ApplicationForm type="ADOPTION" locale={locale} catId={cat.id} fields={formFields("ADOPTION", dict)} labels={formLabels(dict)} />
      </div>
    </div>
  );
}
