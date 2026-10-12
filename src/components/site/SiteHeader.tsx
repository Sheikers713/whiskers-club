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
            className={`rounded-full px-2.5 py-1 text-sm font-semibold uppercase ${
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
        <Link href={`/${locale}`} className="font-display text-xl font-bold tracking-tight">
          Whiskers&nbsp;Club
        </Link>
        <nav className="hidden items-center gap-6 md:flex" aria-label={dict.nav.menu}>
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="font-medium hover:text-brick">
              {n.label}
            </Link>
          ))}
          {langLinks}
        </nav>
        <details className="relative md:hidden">
          <summary className="cursor-pointer list-none rounded-full border border-ink/15 px-4 py-2 text-sm font-semibold">
            {dict.nav.menu}
          </summary>
          <div className="absolute right-0 mt-2 w-60 rounded-2xl bg-paper p-4 shadow-lg ring-1 ring-line">
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
