import { db } from "@/lib/db";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionary";
import { t } from "@/lib/i18n/localized";
import { CopyButton } from "./CopyButton";

/** Donation details as entered in the admin (taken from Taplink, decision 5.1). */
export async function PaymentMethods({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const methods = await db.paymentMethod.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } });
  if (!methods.length) return null;
  return (
    <ul className="mt-6 grid gap-4 md:grid-cols-2">
      {methods.map((m) => {
        const instructions = t(m.instructions, locale);
        return (
          <li key={m.id} className="rounded-2xl bg-paper p-5 ring-1 ring-line">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-lg font-bold">{t(m.title, locale)}</h3>
              {m.currencyNote && <span className="rounded-full bg-milk px-3 py-1 text-xs font-semibold">{m.currencyNote}</span>}
            </div>
            {m.value && (
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <code className="select-all break-all rounded-lg bg-milk px-3 py-2 text-[15px]">{m.value}</code>
                <CopyButton value={m.value} label={dict.help.copy} copiedLabel={dict.help.copied} />
              </div>
            )}
            {m.url && (
              <a href={m.url} target="_blank" rel="noopener" className="mt-3 inline-block rounded-full bg-brick px-4 py-2 text-sm font-semibold text-white hover:bg-brick-dark">
                {dict.help.open} →
              </a>
            )}
            {instructions && <p className="mt-3 whitespace-pre-line text-sm text-ink-soft">{instructions}</p>}
          </li>
        );
      })}
    </ul>
  );
}
