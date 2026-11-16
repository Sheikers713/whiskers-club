import type { Locale } from "@/lib/i18n/config";
import { fmt, type Dictionary } from "@/lib/i18n/dictionary";
import { IPS_AMOUNTS } from "@/lib/ips";
import { formatAccount, formatReference, ipsReady, type IpsTarget } from "@/lib/ips-donation";
import type { SiteSettings } from "@/lib/settings";
import { CopyButton } from "./CopyButton";
import { IpsQrPicker } from "./IpsQrPicker";

/**
 * «IPS skeniraj» box: a QR code for an RSD transfer from any Serbian bank app,
 * plus the same details to type in by hand. The reference names the cat, so
 * the transfer can be matched to it on the bank statement.
 */
export function IpsDonate({ target, catName, settings, locale, dict }: { target: IpsTarget; catName?: string; settings: SiteSettings; locale: Locale; dict: Dictionary }) {
  if (!ipsReady(settings)) return null;
  const d = dict.ips;
  const account = formatAccount(settings.ips.account);
  const ref = formatReference(target.reference);
  // [label, shown, copied]
  const rows: [string, string, string | null][] = [
    [d.recipient, settings.ips.recipient.replace(/\n/g, ", "), null],
    [d.account, account, settings.ips.account],
    [d.reference, `${ref.model} · ${ref.number}`, ref.number],
  ];
  return (
    <div>
      <h3 className="text-lg font-bold">{d.title}</h3>
      <p className="mt-1 text-sm text-ink-soft">{d.howTo}</p>
      {catName && <p className="mt-1 text-sm text-ink-soft">{fmt(d.forCat, { name: catName })}</p>}
      <div className="mt-4">
        <IpsQrPicker slug={target.slug} amounts={IPS_AMOUNTS} locale={locale} labels={{ amount: d.amount, other: d.other, alt: d.alt, save: d.save }} />
      </div>
      <p className="mt-4 text-sm text-ink-soft">{d.onPhone}</p>
      <dl className="mt-2 grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[auto_1fr] sm:gap-y-1.5">
        {rows.map(([label, value, copy]) => (
          <div key={label} className="contents">
            <dt className="text-ink-soft">{label}</dt>
            <dd className="mb-2 flex flex-wrap items-center gap-2 font-medium sm:mb-0">
              <span className="select-all break-all">{value}</span>
              {copy && <CopyButton value={copy} label={dict.help.copy} copiedLabel={dict.help.copied} />}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
