type Contacts = {
  name: string;
  contactTelegram: string | null;
  contactPhone: string | null;
  contactWhatsapp: string | null;
  contactViber: string | null;
  contactInstagram: string | null;
};

function digits(phone: string) {
  return phone.replace(/[^\d+]/g, "");
}

/** Curator with the contact buttons they filled in (reference site layout). */
export function CuratorCard({ curator }: { curator: Contacts }) {
  const tg = curator.contactTelegram?.replace(/^@/, "");
  const ig = curator.contactInstagram?.replace(/^@/, "");
  const links = [
    tg && { href: `https://t.me/${tg}`, label: "Telegram", short: "TG" },
    curator.contactPhone && { href: `tel:${digits(curator.contactPhone)}`, label: curator.contactPhone, short: "☎" },
    curator.contactWhatsapp && {
      href: `https://wa.me/${digits(curator.contactWhatsapp).replace("+", "")}`,
      label: "WhatsApp",
      short: "WA",
    },
    curator.contactViber && { href: `viber://chat?number=${encodeURIComponent(digits(curator.contactViber))}`, label: "Viber", short: "Vb" },
    ig && { href: `https://instagram.com/${ig}`, label: "Instagram", short: "IG" },
  ].filter(Boolean) as Array<{ href: string; label: string; short: string }>;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] bg-paper p-4 ring-1 ring-line">
      <div className="flex items-center gap-3">
        <span aria-hidden className="grid h-11 w-11 place-items-center rounded-full bg-orange text-lg font-bold text-white">
          {curator.name.slice(0, 1)}
        </span>
        <div>
          <p className="font-semibold">{curator.name}</p>
          {tg && <p className="text-sm text-ink-soft">@{tg}</p>}
        </div>
      </div>
      <ul className="flex flex-wrap gap-2">
        {links.map((l) => (
          <li key={l.href}>
            <a
              href={l.href}
              target={l.href.startsWith("http") ? "_blank" : undefined}
              rel="noopener"
              title={l.label}
              aria-label={l.label}
              className="grid h-10 min-w-10 place-items-center rounded-[var(--radius-control)] bg-ink px-3 text-sm font-bold text-milk hover:bg-brick"
            >
              {l.short}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
