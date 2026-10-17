import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionary";
import { t } from "@/lib/i18n/localized";
import { getSettings } from "@/lib/settings";
import { getCatalog, getCatsWithActiveCampaign } from "@/lib/queries/cats";
import { getHomeStats } from "@/lib/queries/stats";
import { db } from "@/lib/db";
import { formatNumber } from "@/lib/format";
import { CatCard } from "@/components/site/CatCard";
import { SocialLinks } from "@/components/site/SocialLinks";
import { Money } from "@/components/site/Money";
import { PaymentMethods } from "@/components/site/PaymentMethods";

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const [settings, stats, looking, urgent, partners] = await Promise.all([
    getSettings(),
    getHomeStats(),
    getCatalog("looking", 6),
    getCatsWithActiveCampaign(3),
    db.partner.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
  ]);
  const heroText = t(settings.heroText, locale) || dict.home.heroText;
  const about = t(settings.aboutText, locale);
  const story = t(settings.malaStory, locale);

  const statItems = [
    { value: formatNumber(stats.rescued, locale), label: dict.home.statRescued },
    { value: formatNumber(stats.adopted, locale), label: dict.home.statAdopted },
    { value: formatNumber(stats.sterilized, locale), label: dict.home.statSterilized },
    { value: formatNumber(stats.inTreatment, locale), label: dict.home.statInTreatment },
  ];

  return (
    <>
      <section className="border-b border-line">
        <div className="mx-auto grid max-w-6xl md:grid-cols-[1.1fr_1fr] md:gap-10 md:px-4">
          <div className="px-4 pb-10 pt-10 md:px-0 md:py-20">
            <p className="eyebrow text-ink-soft">{dict.meta.tagline}</p>
            <h1 className="mt-6 font-display text-[2.6rem] uppercase !leading-[0.92] sm:text-6xl lg:text-7xl">
              {dict.home.heroTitle}
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">{heroText}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={`/${locale}/help`} className="rounded-[var(--radius-control)] bg-brick px-6 py-3.5 font-bold text-white hover:bg-brick-dark">
                {dict.nav.donate}
              </Link>
            </div>
          </div>
          <div aria-hidden className="olive-dot relative min-h-72 overflow-hidden md:my-10 md:min-h-[26rem] md:rounded-[var(--radius-card)]">
            <div className="absolute left-1/2 top-[12%] aspect-square w-[52%] max-w-64 -translate-x-1/2 rounded-full bg-sun" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/cat-black.webp" alt="" width={1100} height={568} className="absolute inset-x-0 bottom-0 mx-auto w-[118%] max-w-none -translate-x-[8%]" />
          </div>
        </div>
      </section>

      {about && (
        <section className="mx-auto max-w-6xl px-4 py-8">
          <h2 className="font-display text-3xl md:text-4xl">{dict.home.whoTitle}</h2>
          <div className="prose-text mt-4 max-w-3xl whitespace-pre-line text-lg">{about}</div>
        </section>
      )}

      {settings.showStats && (
      <section className="mx-auto max-w-6xl px-4 py-8" aria-labelledby="stats">
        <h2 id="stats" className="sr-only">{dict.home.statsTitle}</h2>
        <dl className="grid grid-cols-2 gap-3 md:grid-cols-6">
          {statItems.map((s) => (
            <div key={s.label} className="rounded-[var(--radius-card)] bg-paper p-4 ring-1 ring-line">
              <dt className="text-xs font-bold uppercase tracking-wider text-ink-soft">{s.label}</dt>
              <dd className="mt-1 font-display text-4xl">{s.value}</dd>
            </div>
          ))}
          <div className="col-span-2 rounded-[var(--radius-card)] bg-paper p-4 ring-1 ring-line md:col-span-1">
            <dt className="text-xs font-bold uppercase tracking-wider text-ink-soft">{dict.home.statRaised}</dt>
            <dd className="text-xl font-bold">
              <Money amount={stats.raisedRsd} locale={locale} eurRate={stats.eurRate} showEur={false} />
            </dd>
          </div>
          <div className="col-span-2 rounded-[var(--radius-card)] bg-paper p-4 ring-1 ring-line md:col-span-1">
            <dt className="text-xs font-bold uppercase tracking-wider text-ink-soft">{dict.home.statSpent}</dt>
            <dd className="text-xl font-bold">
              <Money amount={stats.spentRsd} locale={locale} eurRate={stats.eurRate} showEur={false} />
            </dd>
          </div>
        </dl>
      </section>
      )}

      {looking.cats.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-8">
          <div className="flex items-end justify-between gap-4">
            <h2 className="font-display text-3xl md:text-4xl">{dict.home.lookingTitle}</h2>
            <Link href={`/${locale}/cats`} className="font-semibold text-brick hover:underline">
              {dict.home.seeAllCats} →
            </Link>
          </div>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {looking.cats.map((cat) => (
              <CatCard key={cat.id} cat={cat} locale={locale} dict={dict} />
            ))}
          </div>
        </section>
      )}

      {urgent.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-8">
          <h2 className="font-display text-3xl md:text-4xl">{dict.home.urgentTitle}</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {urgent.map((cat) => (
              <CatCard key={cat.id} cat={cat} locale={locale} dict={dict} />
            ))}
          </div>
        </section>
      )}

      {story && (
        <section className="mx-auto max-w-6xl px-4 py-8">
          <div className="rounded-[var(--radius-card)] bg-paper p-6 ring-1 ring-line md:p-10">
            <h2 className="font-display text-3xl md:text-4xl">{dict.home.storyTitle}</h2>
            <div className="prose-text mt-4 max-w-3xl whitespace-pre-line text-lg">{story}</div>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-6xl px-4 py-8">
        <h2 className="font-display text-3xl md:text-4xl">{dict.home.helpTitle}</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { href: `/${locale}/help#donate`, title: dict.help.donateTitle, text: dict.help.donateText },
            { href: `/${locale}/volunteer`, title: dict.help.volunteerTitle, text: dict.help.volunteerText },
            { href: `/${locale}/foster`, title: dict.help.fosterTitle, text: dict.help.fosterText },
            { href: `/${locale}/partnership`, title: dict.help.partnerTitle, text: dict.help.partnerText },
          ].map((c) => (
            <Link key={c.href} href={c.href} className="group rounded-[var(--radius-card)] bg-paper p-5 ring-1 ring-line transition hover:-translate-y-0.5 hover:ring-ink">
              <h3 className="text-lg font-extrabold group-hover:text-brick">{c.title}</h3>
              <p className="mt-2 line-clamp-4 text-sm text-ink-soft">{c.text}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="olive-dot rounded-[var(--radius-card)] p-6 md:p-12">
          <h2 className="font-display text-3xl md:text-4xl">{dict.home.transparencyTitle}</h2>
          <p className="mt-3 max-w-2xl text-lg">{dict.home.transparencyText}</p>
          <Link href={`/${locale}/transparency`} className="mt-6 inline-block rounded-[var(--radius-control)] bg-ink px-6 py-3.5 font-bold text-milk hover:bg-brick">
            {dict.home.transparencyLink}
          </Link>
        </div>
      </section>

      {settings.instagramUrl && (
        <section className="mx-auto max-w-6xl px-4 py-8">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-[var(--radius-card)] bg-paper p-6 ring-1 ring-line">
            <a href={settings.instagramUrl} target="_blank" rel="noopener" className="text-xl font-bold hover:text-brick">
              {dict.home.instagramTitle} <span aria-hidden>→</span>
            </a>
            <SocialLinks settings={settings} dict={dict} />
          </div>
        </section>
      )}

      {partners.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-8">
          <h2 className="font-display text-3xl md:text-4xl">{dict.home.partnersTitle}</h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {partners.map((p) => (
              <li key={p.id} className="rounded-[var(--radius-card)] bg-paper p-5 ring-1 ring-line">
                {p.url ? (
                  <a href={p.url} target="_blank" rel="noopener" className="font-bold hover:text-brick">{p.name}</a>
                ) : (
                  <span className="font-bold">{p.name}</span>
                )}
                {t(p.description, locale) && <p className="mt-1 text-sm text-ink-soft">{t(p.description, locale)}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section id="donate" className="mx-auto max-w-6xl px-4 py-8">
        <h2 className="font-display text-3xl md:text-4xl">{dict.help.donateTitle}</h2>
        <PaymentMethods locale={locale} dict={dict} />
      </section>
    </>
  );
}
