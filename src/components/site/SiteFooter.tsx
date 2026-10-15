import Link from "next/link";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionary";
import type { SiteSettings } from "@/lib/settings";
import { t } from "@/lib/i18n/localized";

export function SiteFooter({ locale, dict, settings }: { locale: Locale; dict: Dictionary; settings: SiteSettings }) {
  const contactText = t(settings.contactText, locale);
  return (
    <footer className="mt-16 border-t border-line bg-cream-deep">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-3">
        <div>
          <Link href={`/${locale}`} className="flex items-center gap-3" aria-label="Whiskers Club">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/cat-mark.png" alt="" width={56} height={56} className="h-14 w-14" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/wordmark.webp" alt="" width={120} height={60} className="h-14 w-auto" />
          </Link>
          <p className="mt-3 max-w-xs text-sm text-ink-soft">{dict.meta.tagline}</p>
        </div>
        <div>
          <p className="eyebrow">{dict.footer.contacts}</p>
          <ul className="mt-2 space-y-1 text-sm">
            {settings.instagramUrl && (
              <li>
                <a href={settings.instagramUrl} className="underline hover:text-brick" rel="noopener" target="_blank">
                  Instagram
                </a>
              </li>
            )}
            {settings.telegramUrl && (
              <li>
                <a href={settings.telegramUrl} className="underline hover:text-brick" rel="noopener" target="_blank">
                  Telegram
                </a>
              </li>
            )}
            {settings.contactEmail && (
              <li>
                <a href={`mailto:${settings.contactEmail}`} className="underline hover:text-brick">
                  {settings.contactEmail}
                </a>
              </li>
            )}
            {contactText && <li className="whitespace-pre-line text-ink-soft">{contactText}</li>}
          </ul>
        </div>
        <div className="text-sm">
          <Link href={`/${locale}/help`} className="block font-semibold hover:text-brick">
            {dict.nav.help}
          </Link>
          <Link href={`/${locale}/privacy`} className="mt-1 block underline hover:text-brick">
            {dict.footer.privacy}
          </Link>
        </div>
      </div>
      <p className="mx-auto max-w-6xl px-4 pb-8 text-xs text-ink-soft">{dict.footer.disclaimer}</p>
    </footer>
  );
}
