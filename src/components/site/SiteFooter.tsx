import Link from "next/link";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionary";
import type { SiteSettings } from "@/lib/settings";
import { t } from "@/lib/i18n/localized";

export function SiteFooter({ locale, dict, settings }: { locale: Locale; dict: Dictionary; settings: SiteSettings }) {
  const contactText = t(settings.contactText, locale);
  return (
    <footer className="mt-16 border-t border-line bg-paper">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-3">
        <div>
          <p className="font-display text-lg font-bold">Whiskers Club</p>
          <p className="mt-2 text-sm text-ink-soft">{dict.meta.tagline}</p>
        </div>
        <div>
          <p className="font-semibold">{dict.footer.contacts}</p>
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
