import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ProofLevel } from "@prisma/client";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary, type Dictionary } from "@/lib/i18n/dictionary";
import { t } from "@/lib/i18n/localized";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { campaignRaised, getPublicReport } from "@/lib/queries/finance";
import { publicCatWhere } from "@/lib/queries/cats";
import { formatRsd, formatShortDate } from "@/lib/format";
import { Money } from "@/components/site/Money";
import { Progress } from "@/components/site/Progress";

export async function generateMetadata({ params }: PageProps<"/[locale]/transparency">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { title: getDictionary(locale).report.title };
}

function parseDate(v: unknown): Date | undefined {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return undefined;
  const d = new Date(`${v}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function proofLabel(p: ProofLevel, d: Dictionary) {
  return { FISCAL_VERIFIED: d.report.proofFiscal, DOCUMENT: d.report.proofDocument, NONE: d.report.proofNone }[p];
}

const proofStyle: Record<ProofLevel, string> = {
  FISCAL_VERIFIED: "bg-sage-soft text-sage",
  DOCUMENT: "bg-milk text-ink-soft",
  NONE: "bg-brick-soft text-brick-dark",
};

export default async function TransparencyPage({ params, searchParams }: PageProps<"/[locale]/transparency">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const sp = await searchParams;
  const from = parseDate(sp.from);
  const to = parseDate(sp.to);
  const catId = typeof sp.cat === "string" && /^[0-9a-f-]{36}$/.test(sp.cat) ? sp.cat : undefined;
  const categoryId = typeof sp.category === "string" && /^[0-9a-f-]{36}$/.test(sp.category) ? sp.category : undefined;

  const [settings, report, cats, categories, campaigns] = await Promise.all([
    getSettings(),
    getPublicReport({ from, to, catId, categoryId }),
    db.cat.findMany({ where: publicCatWhere, select: { id: true, name: true, originalLocale: true }, orderBy: { createdAt: "desc" } }),
    db.expenseCategory.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    db.campaign.findMany({
      where: { state: "PUBLISHED", ...(catId ? { cats: { some: { catId } } } : {}) },
      orderBy: [{ status: "asc" }, { startDate: "desc" }],
      include: { cats: { include: { cat: { select: { slug: true, name: true, state: true } } } } },
    }),
  ]);
  const raised = await campaignRaised(campaigns.map((c) => c.id));
  const rate = settings.eurRate;
  const field = "mt-1 block w-full rounded-xl border border-line bg-paper px-3 py-2.5";

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-4xl font-bold">{dict.report.title}</h1>
      <p className="mt-3 max-w-3xl text-ink-soft">{dict.report.intro}</p>

      <form method="get" className="mt-8 grid gap-4 rounded-2xl bg-paper p-4 ring-1 ring-line sm:grid-cols-2 lg:grid-cols-5">
        <label className="text-sm font-medium">
          {dict.report.from}
          <input type="date" name="from" defaultValue={typeof sp.from === "string" ? sp.from : ""} className={field} />
        </label>
        <label className="text-sm font-medium">
          {dict.report.to}
          <input type="date" name="to" defaultValue={typeof sp.to === "string" ? sp.to : ""} className={field} />
        </label>
        <label className="text-sm font-medium">
          {dict.report.cat}
          <select name="cat" defaultValue={catId ?? ""} className={field}>
            <option value="">{dict.report.all}</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {t(c.name, locale, c.originalLocale)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium">
          {dict.report.category}
          <select name="category" defaultValue={categoryId ?? ""} className={field}>
            <option value="">{dict.report.all}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {t(c.label, locale)}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="self-end rounded-full bg-ink px-5 py-2.5 font-semibold text-milk">
          {dict.report.apply}
        </button>
      </form>

      <dl className="mt-6 grid gap-3 sm:grid-cols-3">
        {[
          { label: dict.report.income, value: report.incomeRsd },
          { label: dict.report.expenses, value: report.expenseRsd },
          ...(categoryId || catId ? [] : [{ label: dict.report.balance, value: report.incomeRsd - report.expenseRsd }]),
        ].map((s) => (
          <div key={s.label} className="rounded-2xl bg-paper p-5 ring-1 ring-line">
            <dt className="text-sm text-ink-soft">{s.label}</dt>
            <dd className="mt-1 text-2xl font-bold">
              <Money amount={s.value} locale={locale} eurRate={rate} />
            </dd>
          </div>
        ))}
      </dl>

      {campaigns.length > 0 && (
        <section className="mt-12">
          <h2 className="text-2xl font-bold">{dict.report.campaigns}</h2>
          <ul className="mt-4 grid gap-4 md:grid-cols-2">
            {campaigns.map((c) => {
              const value = raised.get(c.id) ?? 0;
              return (
                <li key={c.id} className="rounded-2xl bg-paper p-5 ring-1 ring-line">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-bold">{t(c.title, locale)}</h3>
                    <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${c.status === "ACTIVE" ? "bg-brick-soft text-brick-dark" : "bg-milk text-ink-soft"}`}>
                      {c.status === "ACTIVE" ? dict.report.active : dict.report.closed}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-ink-soft">
                    {c.cats
                      .filter((cc) => cc.cat.state === "PUBLISHED")
                      .map((cc) => t(cc.cat.name, locale))
                      .join(", ")}
                  </p>
                  <div className="mt-3">
                    <Progress value={value} target={c.targetRsd} label={t(c.title, locale)} />
                  </div>
                  <p className="mt-2 text-sm">
                    <span className="font-semibold">{formatRsd(value, locale)}</span> {dict.cats.of} {formatRsd(c.targetRsd, locale)}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {!categoryId && (
        <section className="mt-12">
          <h2 className="text-2xl font-bold">{dict.report.income}</h2>
          {report.donations.length === 0 ? (
            <p className="mt-3 text-ink-soft">{dict.report.noRecords}</p>
          ) : (
            <ul className="mt-4 divide-y divide-line rounded-2xl bg-paper ring-1 ring-line">
              {report.donations.map((d) => (
                <li key={d.id} className="grid gap-1 px-4 py-3 sm:grid-cols-[7rem_1fr_auto] sm:gap-4">
                  <span className="text-sm text-ink-soft">{formatShortDate(d.date, locale)}</span>
                  <div>
                    <p className="font-medium">{d.showName && d.publicName ? d.publicName : dict.cat.anonymous}</p>
                    <p className="text-sm text-ink-soft">
                      {d.campaign ? t(d.campaign.title, locale) : d.cat ? t(d.cat.name, locale) : dict.report.generalFund}
                      {d.comment ? ` · «${d.comment}»` : ""}
                    </p>
                  </div>
                  <span className="font-semibold sm:text-right">{formatRsd(d.amountRsd, locale)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="mt-12">
        <h2 className="text-2xl font-bold">{dict.report.expenses}</h2>
        {report.expenses.length === 0 ? (
          <p className="mt-3 text-ink-soft">{dict.report.noRecords}</p>
        ) : (
          <ul className="mt-4 divide-y divide-line rounded-2xl bg-paper ring-1 ring-line">
            {report.expenses.map((e) => {
              const linked = e.cats.filter((c) => c.cat.state === "PUBLISHED");
              return (
                <li key={e.id} className="grid gap-1 px-4 py-3 sm:grid-cols-[7rem_1fr_auto] sm:gap-4">
                  <span className="text-sm text-ink-soft">{formatShortDate(e.date, locale)}</span>
                  <div>
                    <p className="font-medium">{t(e.publicSummary, locale) || e.description}</p>
                    <p className="text-sm text-ink-soft">
                      {t(e.category.label, locale)}
                      {e.vendor ? ` · ${e.vendor}` : ""}
                      {linked.length > 0 && " · "}
                      {linked.map((c, i) => (
                        <span key={c.catId}>
                          {i > 0 && ", "}
                          <Link href={`/${locale}/cats/${c.cat.slug}`} className="underline">
                            {t(c.cat.name, locale)}
                          </Link>
                        </span>
                      ))}
                      {linked.length > 1 && ` (${dict.cat.sharedExpense})`}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${proofStyle[e.proof]}`}>{proofLabel(e.proof, dict)}</span>
                      {e.files.map((f, i) => (
                        <a key={f.fileId} href={`/files/expenses/${e.id}/${f.fileId}`} target="_blank" className="text-xs underline">
                          {dict.report.receipt}
                          {e.files.length > 1 ? ` ${i + 1}` : ""}
                        </a>
                      ))}
                    </div>
                  </div>
                  <span className="font-semibold sm:text-right">{formatRsd(e.amountRsd, locale)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
