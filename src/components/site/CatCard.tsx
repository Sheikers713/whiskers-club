import Link from "next/link";
import type { CatCardData } from "@/lib/queries/cats";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionary";
import { t } from "@/lib/i18n/localized";
import { formatAge, formatRsd } from "@/lib/format";
import { photoUrl } from "@/lib/media-url";
import { Progress } from "./Progress";
import { StatusBadge } from "./StatusBadge";

export function CatCard({ cat, locale, dict }: { cat: CatCardData; locale: Locale; dict: Dictionary }) {
  const name = t(cat.name, locale, cat.originalLocale);
  const summary = t(cat.summary, locale, cat.originalLocale);
  const sex = cat.sex === "FEMALE" ? dict.cats.female : cat.sex === "MALE" ? dict.cats.male : null;
  const camp = cat.activeCampaign;
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-[var(--radius-card)] bg-paper shadow-sm ring-1 ring-line transition hover:shadow-md">
      <div className="relative aspect-[4/3] bg-line">
        {cat.cover?.storageKey ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoUrl(cat.cover.storageKey, 480)}
            srcSet={`${photoUrl(cat.cover.storageKey, 480)} 480w, ${photoUrl(cat.cover.storageKey, 1200)} 1200w`}
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            alt={t(cat.cover.alt, locale) || name}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : null}
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <StatusBadge status={cat.status} locale={locale} />
          {cat.hasSpecialNeeds && (
            <span className="rounded-full bg-paper/95 px-3 py-1 text-xs font-semibold text-brick">
              {dict.cats.specialNeeds}
            </span>
          )}
        </div>
        <h3 className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 pb-3 pt-10 text-2xl font-bold text-white">
          <Link href={`/${locale}/cats/${cat.slug}`} className="after:absolute after:inset-0">
            {name}
          </Link>
        </h3>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <p className="text-sm text-ink-soft">
          {[sex, formatAge(cat.birthDate, dict)].filter(Boolean).join(" · ")}
        </p>
        {summary && <p className="line-clamp-2 text-[15px]">{summary}</p>}
        {camp && (
          <div className="mt-auto space-y-1.5 pt-1">
            <Progress value={camp.raisedRsd} target={camp.targetRsd} label={dict.cat.fundraiser} />
            <div className="flex justify-between text-sm">
              <span className="font-semibold text-brick">{formatRsd(camp.raisedRsd, locale)}</span>
              {camp.raisedRsd >= camp.targetRsd ? (
                <span className="font-semibold text-sage">✓ {dict.cats.goalReached}</span>
              ) : (
                <span className="text-ink-soft">
                  {dict.cats.of} {formatRsd(camp.targetRsd, locale)}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
