import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { TestResult, TriState } from "@prisma/client";
import { isLocale } from "@/lib/i18n/config";
import { fmt, getDictionary, type Dictionary } from "@/lib/i18n/dictionary";
import { mergeTexts, t } from "@/lib/i18n/localized";
import { getPublicCat } from "@/lib/queries/cats";
import { getSettings } from "@/lib/settings";
import { formatAge, formatDate, formatRsd } from "@/lib/format";
import { photoUrl } from "@/lib/media-url";
import { Gallery } from "@/components/site/Gallery";
import { Money } from "@/components/site/Money";
import { Progress } from "@/components/site/Progress";
import { ShareButton } from "@/components/site/ShareButton";
import { StatusBadge } from "@/components/site/StatusBadge";
import { CuratorCard } from "@/components/site/CuratorCard";

export async function generateMetadata({ params }: PageProps<"/[locale]/cats/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const data = await getPublicCat(slug);
  if (!data) return {};
  const { cat } = data;
  const name = t(cat.name, locale, cat.originalLocale);
  const description = t(cat.summary, locale, cat.originalLocale);
  return {
    title: name,
    description,
    alternates: { languages: { en: `/en/cats/${slug}`, ru: `/ru/cats/${slug}`, sr: `/sr/cats/${slug}` } },
    openGraph: {
      title: name,
      description,
      images: cat.cover?.storageKey ? [{ url: photoUrl(cat.cover.storageKey, 1200) }] : undefined,
    },
  };
}

function tri(v: TriState, d: Dictionary) {
  return v === "YES" ? d.cat.yes : v === "NO" ? d.cat.no : d.cat.unknown;
}

function test(v: TestResult, d: Dictionary) {
  return { NEGATIVE: d.cat.negative, POSITIVE: d.cat.positive, PENDING: d.cat.pending, NOT_TESTED: d.cat.notTested }[v];
}

export default async function CatPage({ params }: PageProps<"/[locale]/cats/[slug]">) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const [data, settings] = await Promise.all([getPublicCat(slug), getSettings()]);
  if (!data) notFound();
  const { cat, donations, expenses, activeCampaign } = data;
  const L = (v: unknown) => t(v, locale, cat.originalLocale);
  const name = L(cat.name);

  const photos = [...cat.media]
    .filter((m) => m.kind === "PHOTO" && m.storageKey)
    .sort((a, b) => Number(b.id === cat.coverId) - Number(a.id === cat.coverId) || a.sortOrder - b.sortOrder)
    .map((m) => ({
      src: photoUrl(m.storageKey!, 1200),
      srcSet: `${photoUrl(m.storageKey!, 480)} 480w, ${photoUrl(m.storageKey!, 1200)} 1200w`,
      alt: t(m.alt, locale),
    }));
  const instagram = cat.media.filter((m) => m.kind === "INSTAGRAM" && m.url);
  const sex = cat.sex === "FEMALE" ? dict.cats.female : cat.sex === "MALE" ? dict.cats.male : dict.cats.sexUnknown;
  const canApply = cat.status.group === "ACTIVE";
  const bonded = [...cat.bondedWith, ...cat.bondedOf];

  const sections = [
    { title: dict.cat.story, body: L(cat.story) },
    { title: dict.cat.character, body: L(cat.character) },
    { title: dict.cat.health, body: L(mergeTexts(cat.health, cat.hasSpecialNeeds ? cat.specialNeeds : undefined)) },
  ].filter((s) => s.body);

  // Public timeline: meaningful events only; "card edited" stays in the audit log.
  type Ev = { date: Date; icon: string; text: string };
  const events: Ev[] = [
    ...(cat.publishedAt ? [{ date: cat.publishedAt, icon: "🐾", text: dict.cat.eventPublished }] : []),
    ...(cat.adoptedAt ? [{ date: cat.adoptedAt, icon: "🏠", text: dict.cat.eventAdopted }] : []),
    ...cat.updates.map((u) => ({ date: u.date, icon: "📝", text: L(u.text) })),
    ...donations.map((d) => ({
      date: d.date,
      icon: "💛",
      text: fmt(dict.cat.eventDonation, {
        amount: formatRsd(d.amountRsd, locale),
        name: d.showName && d.publicName ? d.publicName : dict.cat.anonymous,
      }),
    })),
    ...expenses.map((e) => ({ date: e.date, icon: "🧾", text: fmt(dict.cat.eventExpense, { text: t(e.publicSummary, locale) || e.description }) })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Link href={`/${locale}/cats`} className="font-medium text-brick hover:underline">
        ‹ {dict.cat.back}
      </Link>
      <div className="mt-4 grid gap-8 lg:grid-cols-[1.15fr_1fr]">
        <div className="lg:sticky lg:top-20 lg:self-start">
          <Gallery photos={photos} name={name} />
          {instagram.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2">
              {instagram.map((m) => (
                <li key={m.id}>
                  <a href={m.url!} target="_blank" rel="noopener" className="inline-block rounded-[var(--radius-control)] bg-ink px-4 py-2 text-sm font-semibold text-milk hover:bg-brick">
                    ▶ {dict.cat.instagram}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-8">
          <div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <StatusBadge status={cat.status} locale={locale} />
                <h1 className="mt-3 font-display text-5xl uppercase md:text-7xl">{name}</h1>
              </div>
              <ShareButton title={name} label={dict.cat.share} copiedLabel={dict.cat.linkCopied} />
            </div>
            <ul className="mt-4 flex flex-wrap gap-2 text-sm">
              {[sex, formatAge(cat.birthDate, dict), cat.color, ...cat.flags.filter((f) => f.flag.isPublic).map((f) => t(f.flag.label, locale))]
                .filter(Boolean)
                .map((tag) => (
                  <li key={tag} className="rounded-md bg-paper px-3 py-1.5 ring-1 ring-line">
                    {tag}
                  </li>
                ))}
            </ul>
            {L(cat.summary) && <p className="mt-4 text-lg">{L(cat.summary)}</p>}
            {canApply && (
              <Link href={`/${locale}/cats/${cat.slug}/adopt`} className="mt-5 inline-block rounded-[var(--radius-control)] bg-brick px-6 py-3 font-semibold text-white hover:bg-brick-dark">
                {dict.cat.applyAdopt}
              </Link>
            )}
          </div>

          {activeCampaign && (
            <section className="rounded-[var(--radius-card)] bg-brick-soft p-5" aria-labelledby="fundraiser">
              <p id="fundraiser" className="text-sm font-semibold uppercase tracking-wide text-brick">
                {dict.cat.fundraiser}
                {activeCampaign.category ? ` · ${t(activeCampaign.category.label, locale)}` : ""}
              </p>
              <h2 className="mt-1 text-xl font-bold">{L(activeCampaign.title)}</h2>
              {L(activeCampaign.description) && <p className="mt-2 whitespace-pre-line">{L(activeCampaign.description)}</p>}
              <p className="mt-4 text-2xl font-bold">
                {formatRsd(activeCampaign.raisedRsd, locale)}{" "}
                <span className="text-base font-normal text-ink-soft">
                  {dict.cats.of} <Money amount={activeCampaign.targetRsd} locale={locale} eurRate={settings.eurRate} />
                </span>
              </p>
              <div className="mt-2">
                <Progress value={activeCampaign.raisedRsd} target={activeCampaign.targetRsd} label={dict.cat.fundraiser} />
              </div>
              <p className="mt-2 text-sm text-ink-soft">
                {activeCampaign.raisedRsd >= activeCampaign.targetRsd
                  ? `✓ ${dict.cats.goalReached}`
                  : `${Math.floor((activeCampaign.raisedRsd / Math.max(1, activeCampaign.targetRsd)) * 100)}% ${dict.cat.collected} · ${dict.cat.left} ${formatRsd(activeCampaign.targetRsd - activeCampaign.raisedRsd, locale)}`}
              </p>
              {donations.filter((d) => d.campaignId === activeCampaign.id).length > 0 && (
                <>
                  <h3 className="mt-5 text-sm font-semibold uppercase tracking-wide text-ink-soft">{dict.cat.recentDonations}</h3>
                  <ul className="mt-2 divide-y divide-brick/10">
                    {donations
                      .filter((d) => d.campaignId === activeCampaign.id)
                      .slice(0, 10)
                      .map((d) => (
                        <li key={d.id} className="flex items-start justify-between gap-3 py-2">
                          <div>
                            <span className="font-semibold">{d.showName && d.publicName ? d.publicName : dict.cat.anonymous}</span>{" "}
                            <span className="font-semibold text-brick">+{formatRsd(d.amountRsd, locale)}</span>
                            {d.comment && <p className="text-sm text-ink-soft">«{d.comment}»</p>}
                          </div>
                          <span className="shrink-0 text-xs text-ink-soft">{formatDate(d.date, locale)}</span>
                        </li>
                      ))}
                  </ul>
                </>
              )}
              <Link href={`/${locale}/help#donate`} className="mt-5 block rounded-[var(--radius-control)] bg-brick px-6 py-3 text-center font-semibold text-white hover:bg-brick-dark">
                {dict.cat.donate}
              </Link>
            </section>
          )}

          {(canApply || L(cat.adoptionTerms)) && (
            <section className="rounded-[var(--radius-card)] bg-sage-soft p-5">
              <h2 className="text-lg font-bold">{dict.cat.adoptionTerms}</h2>
              {canApply && <p className="mt-2 whitespace-pre-line">{dict.cat.adoptionDisclaimer}</p>}
              {L(cat.adoptionTerms) && <p className="mt-3 whitespace-pre-line">{L(cat.adoptionTerms)}</p>}
            </section>
          )}

          {sections.map((s) => (
            <section key={s.title}>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">{s.title}</h2>
              <p className="mt-2 whitespace-pre-line text-[17px] leading-relaxed">{s.body}</p>
            </section>
          ))}

          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">{dict.cat.medical}</h2>
            <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-[15px]">
              <dt className="text-ink-soft">{dict.cat.sterilized}</dt>
              <dd>{tri(cat.sterilized, dict)}</dd>
              <dt className="text-ink-soft">{dict.cat.vaccinated}</dt>
              <dd>{tri(cat.vaccinated, dict)}</dd>
              <dt className="text-ink-soft">{dict.cat.chipped}</dt>
              <dd>{tri(cat.chipped, dict)}</dd>
              <dt className="text-ink-soft">{dict.cat.fiv}</dt>
              <dd>{test(cat.fiv, dict)}</dd>
              <dt className="text-ink-soft">{dict.cat.felv}</dt>
              <dd>{test(cat.felv, dict)}</dd>
            </dl>
          </section>

          {bonded.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">{dict.cat.bondedWith}</h2>
              <ul className="mt-2 flex flex-wrap gap-2">
                {bonded.map((b) => (
                  <li key={b.slug}>
                    <Link href={`/${locale}/cats/${b.slug}`} className="rounded-[var(--radius-control)] bg-paper px-4 py-2 font-semibold ring-1 ring-line hover:ring-brick">
                      {t(b.name, locale)}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {expenses.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">{dict.cat.expenses}</h2>
              <ul className="mt-2 divide-y divide-line rounded-[var(--radius-card)] bg-paper ring-1 ring-line">
                {expenses.map((e) => (
                  <li key={e.id} className="flex items-start justify-between gap-3 px-4 py-3 text-[15px]">
                    <div>
                      <p>{t(e.publicSummary, locale) || e.description}</p>
                      <p className="text-xs text-ink-soft">
                        {formatDate(e.date, locale)} · {t(e.category.label, locale)}
                        {e._count.cats > 1 && ` · ${dict.cat.sharedExpense}`}
                      </p>
                    </div>
                    <span className="shrink-0 font-semibold">{formatRsd(e.amountRsd, locale)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {cat.documents.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">{dict.cat.documents}</h2>
              <ul className="mt-2 space-y-1">
                {cat.documents.map((d) => (
                  <li key={d.id}>
                    <a href={`/files/documents/${d.id}`} target="_blank" className="underline hover:text-brick">
                      {t(d.title, locale) || d.category}
                    </a>
                    {d.documentDate && <span className="text-sm text-ink-soft"> · {formatDate(d.documentDate, locale)}</span>}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {events.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">{dict.cat.history}</h2>
              <ol className="mt-3 space-y-3 border-l-2 border-line pl-4">
                {events.slice(0, 30).map((e, i) => (
                  <li key={i}>
                    <p className="text-[15px]">
                      <span aria-hidden>{e.icon} </span>
                      <span className="whitespace-pre-line">{e.text}</span>
                    </p>
                    <p className="text-xs text-ink-soft">{formatDate(e.date, locale)}</p>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {cat.curators.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">{dict.cat.curators}</h2>
              <div className="mt-3 space-y-3">
                {cat.curators.map((c) => (
                  <CuratorCard key={c.userId} curator={c.user} />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
