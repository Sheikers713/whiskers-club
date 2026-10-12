import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/config";
import { fmt, getDictionary } from "@/lib/i18n/dictionary";
import { t } from "@/lib/i18n/localized";
import { getCatalog } from "@/lib/queries/cats";
import { CatCard } from "@/components/site/CatCard";

export async function generateMetadata({ params }: PageProps<"/[locale]/cats">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { title: getDictionary(locale).cats.title };
}

export default async function CatsPage({ params, searchParams }: PageProps<"/[locale]/cats">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const sp = await searchParams;
  const filterKey = typeof sp.filter === "string" ? sp.filter : undefined;
  const { filters, active, total, cats } = await getCatalog(filterKey);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-4xl font-bold">{dict.cats.title}</h1>
      <p className="mt-1 text-ink-soft">{fmt(dict.cats.waiting, { count: total })}</p>
      <nav className="-mx-4 mt-6 overflow-x-auto px-4" aria-label={dict.cats.title}>
        <ul className="flex w-max gap-2">
          {filters.map((f) => {
            const current = f.key === active?.key;
            return (
              <li key={f.key}>
                <Link
                  href={`/${locale}/cats${f.key === filters[0]?.key ? "" : `?filter=${f.key}`}`}
                  aria-current={current ? "page" : undefined}
                  className={`block rounded-full border px-4 py-2 font-medium ${
                    current ? "border-ink bg-ink text-milk" : "border-line bg-paper hover:border-ink"
                  }`}
                >
                  {t(f.label, locale)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      {cats.length === 0 ? (
        <p className="mt-10 text-lg text-ink-soft">{dict.cats.empty}</p>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cats.map((cat) => (
            <CatCard key={cat.id} cat={cat} locale={locale} dict={dict} />
          ))}
        </div>
      )}
    </div>
  );
}
