import Link from "next/link";
import { locales, localeNames, type Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionary";

export function SiteHeader({ locale, dict, path }: { locale: Locale; dict: Dictionary; path: string }) {
  const nav = [
    { href: `/${locale}/cats`, label: dict.nav.cats },
    { href: `/${locale}/help`, label: dict.nav.help },
    { href: `/${locale}/transparency`, label: dict.nav.transparency },
    { href: `/${locale}/about`, label: dict.nav.about },
  ];
  const langLinks = (
    <ul className="flex gap-1" aria-label={dict.nav.language}>
      {locales.map((l) => (
        <li key={l}>
          <a
            href={`/${l}${path}`}
            hrefLang={l}
            lang={l}
            aria-current={l === locale ? "true" : undefined}
            className={`rounded-[var(--radius-control)] px-2.5 py-1 text-sm font-bold uppercase ${
              l === locale ? "bg-ink text-milk" : "text-ink-soft hover:bg-line"
            }`}
            title={localeNames[l]}
          >
            {l}
          </a>
        </li>
      ))}
    </ul>
  );
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-milk/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href={`/${locale}`} className="flex shrink-0 items-center gap-2.5" aria-label="Whiskers Club">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/cat-mark.png" alt="" width={44} height={44} className="h-11 w-11" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/wordmark.webp" alt="" width={96} height={48} className="h-12 w-auto" />
        </Link>
        <nav className="hidden items-center gap-6 md:flex" aria-label={dict.nav.menu}>
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="border-b border-transparent py-1 text-sm font-semibold hover:border-brick">
              {n.label}
            </Link>
          ))}
          {langLinks}
        </nav>
        <details className="relative md:hidden">
          <summary className="cursor-pointer list-none rounded-[var(--radius-control)] border border-ink px-4 py-2 text-sm font-semibold">
            {dict.nav.menu}
          </summary>
          <div className="absolute right-0 mt-2 w-60 rounded-[var(--radius-card)] bg-paper p-4 shadow-lg ring-1 ring-line">
            <ul className="space-y-1">
              {nav.map((n) => (
                <li key={n.href}>
                  <Link href={n.href} className="block rounded-lg px-3 py-2 font-medium hover:bg-milk">
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-3 border-t border-line pt-3">{langLinks}</div>
          </div>
        </details>
      </div>
    </header>
  );
}
