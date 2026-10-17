"use client";

import { usePathname } from "next/navigation";
import { locales, localeNames, type Locale } from "@/lib/i18n/config";

/**
 * Language links that keep the current page. The header lives in the layout,
 * which is not re-rendered on client navigation, so the path is read here.
 */
export function LangLinks({ locale, label }: { locale: Locale; label: string }) {
  const pathname = usePathname();
  const rest = pathname.replace(/^\/(en|ru|sr)(?=\/|$)/, "");
  return (
    <ul className="flex gap-1" aria-label={label}>
      {locales.map((l) => (
        <li key={l}>
          <a
            href={`/${l}${rest}`}
            onClick={(e) => {
              // Keep filters and anchors (?filter=…, #donate) as well.
              e.currentTarget.href = `/${l}${rest}${window.location.search}${window.location.hash}`;
            }}
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
}
