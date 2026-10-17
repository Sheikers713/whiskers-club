import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary, type Dictionary } from "@/lib/i18n/dictionary";
import { t } from "@/lib/i18n/localized";
import { getSettings } from "@/lib/settings";
import { Blob, Heart, Highlighted, Paw, Sparks, Squiggle, founderIcons } from "@/components/site/AboutDecor";

export async function generateMetadata({ params }: PageProps<"/[locale]/about">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { title: getDictionary(locale).about.title };
}

type Founder = Dictionary["about"]["founders"][number];

// Two looks, after the founders' Instagram slides: light sage for Nata, cocoa for Kristina.
const themes = [
  {
    photo: "/about/nata.jpg",
    card: "bg-[#efe8dc] text-ink",
    blobA: "text-olive",
    blobB: "text-[#d6a58f]",
    line: "text-paper",
    accent: "text-orange",
    pill: "bg-orange text-paper",
    icon: ["bg-olive/70", "bg-[#e7c3b3]", "bg-olive/70"],
    mark: "bg-olive/45 text-ink",
    paw: "text-olive",
    soft: "text-ink",
  },
  {
    photo: "/about/kristina.jpg",
    card: "bg-[#93665a] text-paper",
    blobA: "text-[#7b5146]",
    blobB: "text-[#a97767]",
    line: "text-[#f2d9cd]",
    accent: "text-[#f2d9cd]",
    pill: "bg-[#f2d9cd] text-cocoa",
    icon: ["bg-[#f2d9cd] text-cocoa", "bg-[#f2d9cd] text-cocoa", "bg-[#f2d9cd] text-cocoa"],
    mark: "bg-[#f2d9cd] text-cocoa",
    paw: "text-[#7b5146]",
    soft: "text-paper/90",
  },
] as const;

function FounderCard({ founder, index, slogan }: { founder: Founder; index: number; slogan: string }) {
  const th = themes[index % themes.length];
  const flip = index % 2 === 1;
  return (
    <article className={`relative isolate overflow-clip rounded-[2rem] px-6 py-10 md:px-12 md:py-14 ${th.card}`}>
      <Blob variant={0} className={`-right-24 -top-28 -z-10 h-72 w-72 md:h-96 md:w-96 ${th.blobA}`} />
      <Blob variant={1} className={`-bottom-28 -left-24 -z-10 h-72 w-72 ${th.blobA}`} />
      <Blob variant={2} className={`-bottom-20 -right-16 -z-10 h-56 w-56 ${th.blobB}`} />
      <Squiggle className={`top-6 -z-10 w-48 ${flip ? "-left-6 -scale-x-100" : "-right-4"} ${th.line}`} />
      <Squiggle className={`bottom-10 -z-10 w-44 rotate-180 ${flip ? "-right-6 -scale-x-100" : "-left-6"} ${th.line}`} />

      <div className={`grid items-center gap-10 md:grid-cols-[1.15fr_1fr] [&>*]:min-w-0 ${flip ? "md:[&>*:first-child]:order-2" : ""}`}>
        <div>
          <div className="relative inline-block pl-8">
            <Sparks className={`absolute -left-1 -top-3 h-9 w-9 ${th.accent}`} />
            <h3 className="font-display text-[2.6rem] uppercase sm:text-6xl md:text-7xl">{founder.name}</h3>
            <Heart className={`absolute -right-10 top-0 h-9 w-9 rotate-12 md:-right-12 md:h-10 md:w-10 ${th.accent}`} />
          </div>
          <p className={`mt-4 inline-block -rotate-2 rounded-full px-5 py-2 text-sm font-extrabold uppercase tracking-wide md:text-base ${th.pill}`}>
            {founder.role}
          </p>
          <p className="mt-4 flex flex-wrap items-center gap-x-3 text-lg font-bold md:text-xl">
            {founder.tags.map((tag, i) => (
              <span key={tag} className="flex items-center gap-3">
                {i > 0 && <span className={th.accent}>♥</span>}
                {tag}
              </span>
            ))}
          </p>
          <ul className="mt-8 space-y-6">
            {founder.items.map((item, i) => (
              <li key={i} className="flex items-start gap-4">
                <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${th.icon[i % 3]}`}>
                  {founderIcons[item.icon]}
                </span>
                <p className={`pt-1 text-[17px] leading-relaxed ${th.soft}`}>
                  <Highlighted text={item.text} markClass={th.mark} />
                </p>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative mx-auto w-full max-w-sm">
          <Heart className={`absolute -top-6 right-2 z-10 h-12 w-12 -rotate-12 ${th.accent}`} />
          <Sparks className={`absolute -left-4 top-6 z-10 h-10 w-10 ${th.accent}`} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={th.photo}
            alt={founder.name}
            width={480}
            height={480}
            className="aspect-square w-full rounded-full object-cover shadow-[0_0_0_6px_var(--color-paper)]"
          />
          <div className="mt-6 flex items-end justify-center gap-4">
            <Paw className={`h-16 w-16 -rotate-12 ${th.paw}`} />
            {index === 0 && (
              <p className="max-w-[9rem] -rotate-6 text-lg font-extrabold uppercase leading-tight tracking-wide text-sage">{slogan}</p>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export default async function Page({ params }: PageProps<"/[locale]/about">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const a = dict.about;
  const settings = await getSettings();
  const body = t(settings.aboutText, locale);
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="relative">
        <h1 className="font-display text-5xl uppercase md:text-7xl">{a.title}</h1>
        <Paw className="absolute right-0 top-0 h-14 w-14 rotate-12 text-olive md:h-20 md:w-20" />
      </div>
      {body && <div className="prose-text mt-6 max-w-3xl whitespace-pre-line text-lg leading-relaxed">{body}</div>}

      <section className="mt-10">
        <p className="max-w-3xl text-xl font-semibold leading-relaxed md:text-2xl">{a.foundersIntro}</p>
        <h2 className="sr-only">{a.foundersTitle}</h2>
        <div className="mt-10 space-y-8">
          {a.founders.map((f, i) => (
            <FounderCard key={f.name} founder={f} index={i} slogan={a.slogan} />
          ))}
        </div>
        <div className="relative mt-10 rounded-[2rem] bg-sage-soft px-6 py-8 md:px-12">
          <Heart className="absolute -top-5 right-8 h-10 w-10 rotate-12 text-orange" />
          <p className="max-w-3xl text-lg font-semibold leading-relaxed md:text-xl">{a.foundersOutro}</p>
        </div>
      </section>

      <section className="relative isolate mt-16 overflow-hidden rounded-[2rem] bg-[#efe8dc] px-6 py-10 md:px-12 md:py-14">
        <Blob variant={1} className="-right-28 -top-28 -z-10 h-80 w-80 text-[#e7c3b3]" />
        <Blob variant={2} className="-bottom-32 -left-28 -z-10 h-80 w-80 text-olive/70" />
        <Squiggle className="-right-2 top-10 -z-10 w-52 text-paper" />

        <div className="relative inline-block pl-8">
          <Sparks className="absolute -left-1 -top-3 h-9 w-9 text-orange" />
          <h2 className="font-display text-4xl uppercase md:text-6xl">{a.storyTitle}</h2>
          <Heart className="absolute -right-10 -top-4 h-10 w-10 rotate-12 text-orange" />
        </div>

        <div className="mt-6 max-w-3xl space-y-4 text-lg leading-relaxed">
          {a.story.slice(0, 3).map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>

        <div className="mx-auto my-10 grid max-w-2xl gap-8 sm:grid-cols-2">
          {(
            [
              ["/about/mala-before.jpg", a.before, a.photoBefore, "-rotate-2", "bg-cocoa text-paper"],
              ["/about/mala-after.jpg", a.after, a.photoAfter, "rotate-2", "bg-orange text-paper"],
            ] as const
          ).map(([src, tag, caption, tilt, pill]) => (
            <figure key={src} className={`relative ${tilt}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={caption} className="aspect-[3/4] w-full rounded-[1.5rem] object-cover shadow-[0_0_0_6px_var(--color-paper)]" />
              <span className={`absolute left-4 top-4 rounded-full px-4 py-1.5 text-sm font-extrabold uppercase tracking-wide ${pill}`}>{tag}</span>
              <figcaption className="mt-3 text-center text-sm font-semibold text-ink-soft">{caption}</figcaption>
            </figure>
          ))}
        </div>

        <div className="max-w-3xl space-y-4 text-lg leading-relaxed">
          {a.story.slice(3, -1).map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
        <div className="mt-8 flex items-start gap-4 rounded-[1.5rem] bg-paper/80 p-6 ring-1 ring-line">
          <Paw className="h-12 w-12 shrink-0 -rotate-12 text-orange" />
          <p className="text-lg font-semibold leading-relaxed md:text-xl">{a.story.at(-1)}</p>
        </div>
      </section>
    </div>
  );
}
