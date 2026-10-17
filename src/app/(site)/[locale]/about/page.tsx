import { existsSync } from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionary";
import { t } from "@/lib/i18n/localized";
import { getSettings } from "@/lib/settings";

export async function generateMetadata({ params }: PageProps<"/[locale]/about">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { title: getDictionary(locale).about.title };
}

// Before/after photos of Mala; each is shown only once its file is in public/about.
const malaPhotos = [
  { src: "/about/mala-before.jpg", key: "photoBefore" },
  { src: "/about/mala-after.jpg", key: "photoAfter" },
] as const;

export default async function Page({ params }: PageProps<"/[locale]/about">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const settings = await getSettings();
  const body = t(settings.aboutText, locale);
  const photos = malaPhotos.filter((p) => existsSync(path.join(process.cwd(), "public", p.src)));
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display text-4xl uppercase md:text-6xl">{dict.about.title}</h1>
      {body && <div className="prose-text mt-6 whitespace-pre-line text-lg leading-relaxed">{body}</div>}

      <section className="mt-10">
        <h2 className="font-display text-3xl md:text-4xl">{dict.about.foundersTitle}</h2>
        <p className="mt-4 text-lg leading-relaxed">{dict.about.foundersIntro}</p>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {dict.about.founders.map((f) => (
            <li key={f.name} className="rounded-[var(--radius-card)] bg-paper p-5 ring-1 ring-line">
              <h3 className="text-xl font-extrabold">{f.name}</h3>
              <p className="mt-2 text-ink-soft">{f.text}</p>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-lg leading-relaxed">{dict.about.foundersOutro}</p>
      </section>

      <section className="mt-12 rounded-[var(--radius-card)] bg-paper p-6 ring-1 ring-line md:p-10">
        <h2 className="font-display text-3xl md:text-4xl">{dict.about.storyTitle}</h2>
        <div className="prose-text mt-4 space-y-4 text-lg leading-relaxed">
          {dict.about.story.slice(0, 3).map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
        {photos.length > 0 && (
          <div className="my-6 grid gap-4 sm:grid-cols-2">
            {photos.map((p) => (
              <figure key={p.src}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.src} alt={dict.about[p.key]} className="aspect-[4/3] w-full rounded-lg object-cover" />
                <figcaption className="mt-2 text-sm text-ink-soft">{dict.about[p.key]}</figcaption>
              </figure>
            ))}
          </div>
        )}
        <div className="prose-text mt-4 space-y-4 text-lg leading-relaxed">
          {dict.about.story.slice(3).map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
      </section>
    </div>
  );
}
