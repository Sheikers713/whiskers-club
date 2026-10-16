import type { ReactNode } from "react";
import type { Dictionary } from "@/lib/i18n/dictionary";
import type { SiteSettings } from "@/lib/settings";

const icon = (children: ReactNode, viewBox = "0 0 24 24") => (
  <svg viewBox={viewBox} aria-hidden className="h-5 w-5" fill="currentColor">
    {children}
  </svg>
);

const icons = {
  instagram: icon(
    <>
      <rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="17.5" cy="6.5" r="1.3" />
    </>,
  ),
  facebook: icon(<path d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.8 1.4-3.8 3.9v2.3H7.9v3h2.6V21z" />),
  youtube: icon(<path fillRule="evenodd" d="M6 5h12a4 4 0 0 1 4 4v6a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V9a4 4 0 0 1 4-4zm4 4v6l5.2-3z" />),
  tiktok: icon(<path d="M16.6 3c.3 2.2 1.6 3.6 3.9 3.8v3a7 7 0 0 1-3.9-1.2v6.1a5.8 5.8 0 1 1-5.8-5.8c.3 0 .6 0 .9.1v3.1a2.7 2.7 0 1 0 1.9 2.6V3z" />),
  telegram: icon(<path d="M21.4 3.6 2.9 10.8c-1.2.5-1.2 1.2 0 1.6l4.7 1.5 1.8 5.6c.2.6.4.8.9.8.4 0 .6-.2.9-.5l2.3-2.2 4.7 3.5c.9.5 1.5.2 1.7-.8l3.1-14.6c.3-1.3-.5-1.8-1.6-1.3zM9 13.9l9.3-5.9c.4-.3.8-.1.5.2l-7.7 7-.3 3.2z" />),
  paypal: icon(<path d="M8.3 21H5.1a.5.5 0 0 1-.5-.6L7.2 3.6c.1-.4.4-.6.8-.6h6c3.3 0 5.3 1.7 4.8 4.8-.6 3.6-3 5.2-6.4 5.2H10c-.4 0-.7.3-.8.7zm11.5-12c.9.8 1.3 2.1 1 3.8-.6 3.5-3 5-6.3 5h-.9c-.4 0-.7.3-.8.7l-.6 3.9c-.1.4-.4.6-.8.6H9.8l.4-2.7.6-3.4h1.6c4.1 0 7-2 7.4-6.4z" />),
  reports: icon(<path d="M4 20V10h3v10zm6.5 0V4h3v16zM17 20v-7h3v7z" />),
};

/** Round icon links to the project's pages elsewhere; empty settings are skipped. */
export function SocialLinks({ settings, dict, className = "" }: { settings: SiteSettings; dict: Dictionary; className?: string }) {
  const links: Array<[keyof typeof icons, string, string]> = [
    ["instagram", "Instagram", settings.instagramUrl],
    ["facebook", "Facebook", settings.facebookUrl],
    ["youtube", "YouTube", settings.youtubeUrl],
    ["tiktok", "TikTok", settings.tiktokUrl],
    ["telegram", "Telegram", settings.telegramUrl],
    ["paypal", "PayPal", settings.paypalUrl],
    ["reports", dict.footer.reports, settings.reportsUrl],
  ];
  return (
    <ul className={`flex flex-wrap gap-2 ${className}`}>
      {links
        .filter(([, , url]) => url)
        .map(([key, label, url]) => (
          <li key={key}>
            <a
              href={url}
              target="_blank"
              rel="noopener"
              title={label}
              aria-label={label}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-paper text-ink ring-1 ring-line hover:bg-ink hover:text-milk"
            >
              {icons[key]}
            </a>
          </li>
        ))}
    </ul>
  );
}
