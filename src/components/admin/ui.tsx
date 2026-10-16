import Link from "next/link";
import type { ReactNode } from "react";
import { asLocalized } from "@/lib/i18n/localized";

export const inputCls =
  "mt-1 block w-full rounded-lg border border-line bg-paper px-3 py-2 text-base focus:border-ink focus:outline-none";
export const btnCls = "inline-flex items-center justify-center rounded-[var(--radius-control)] bg-ink px-5 py-2.5 font-semibold text-milk hover:bg-brick disabled:opacity-50";
export const btnSecondaryCls = "inline-flex items-center justify-center rounded-[var(--radius-control)] border border-ink/20 bg-paper px-5 py-2.5 font-semibold hover:bg-milk";

export function PageTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-bold md:text-3xl">{children}</h1>
      {action}
    </div>
  );
}

export function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="rounded-[var(--radius-card)] bg-paper p-4 ring-1 ring-line md:p-5">
      {title && <h2 className="mb-3 text-lg font-bold">{title}</h2>}
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-soft">{hint}</span>}
    </label>
  );
}

const langNames = { ru: "Русский", en: "English", sr: "Srpski" } as const;
const order = ["ru", "en", "sr"] as const;

/**
 * Inputs for one translatable field; an empty language falls back on the site.
 * `locales` limits which languages are shown (e.g. Russian only), and `auto`
 * lists machine-translated values (`<name>.<locale>`) to mark as drafts.
 */
export function LocalizedField({
  name,
  label,
  value,
  multiline,
  rows = 4,
  required,
  locales = order,
  auto,
}: {
  name: string;
  label: string;
  value?: unknown;
  multiline?: boolean;
  rows?: number;
  required?: boolean;
  locales?: readonly (typeof order)[number][];
  auto?: string[];
}) {
  const v = asLocalized(value);
  const input = (l: (typeof order)[number]) => (
    <label key={l} className="flex items-start gap-2">
      <span className={`mt-2.5 w-7 shrink-0 text-xs font-bold uppercase ${v[l] ? "text-ink-soft" : "text-brick"}`} title={langNames[l]}>
        {l}
        {auto?.includes(`${name}.${l}`) && (
          <span className="block text-[10px] font-semibold normal-case text-sage" title="Машинный перевод, проверьте">
            авто
          </span>
        )}
      </span>
      {multiline ? (
        <textarea name={`${name}.${l}`} defaultValue={v[l] ?? ""} rows={rows} className={inputCls + " mt-0"} lang={l} />
      ) : (
        <input name={`${name}.${l}`} defaultValue={v[l] ?? ""} className={inputCls + " mt-0"} lang={l} required={required && l === "ru"} />
      )}
    </label>
  );
  const main = locales.filter((l) => l === "ru");
  // Translations stay folded away; closed <details> inputs are still submitted.
  const extra = locales.filter((l) => l !== "ru");
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{label}</legend>
      {main.map(input)}
      {extra.length > 0 && (
        <details className="group">
          <summary className="ml-9 inline-flex cursor-pointer list-none items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold text-ink-soft ring-1 ring-line hover:bg-milk [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">+</span>
            <span className="hidden group-open:inline">−</span>
            {extra.map((l) => l.toUpperCase()).join(", ")}
          </summary>
          <div className="mt-2 space-y-2">{extra.map(input)}</div>
        </details>
      )}
    </fieldset>
  );
}

export function Flash({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  if (searchParams.notice)
    return (
      <p role="status" className="mb-4 rounded-lg bg-line px-4 py-3 font-medium">
        {String(searchParams.notice)}
      </p>
    );
  if (searchParams.saved) return <p role="status" className="mb-4 rounded-lg bg-sage-soft px-4 py-3 font-medium">Сохранено.</p>;
  if (searchParams.error)
    return (
      <p role="alert" className="mb-4 rounded-lg bg-brick-soft px-4 py-3 font-medium text-brick-dark">
        {String(searchParams.error)}
      </p>
    );
  return null;
}

export function StateBadge({ state }: { state: string }) {
  const map: Record<string, [string, string]> = {
    DRAFT: ["Черновик", "bg-line text-ink-soft"],
    PUBLISHED: ["Опубликовано", "bg-sage-soft text-sage"],
    HIDDEN: ["Скрыто", "bg-brick-soft text-brick-dark"],
    ARCHIVED: ["Архив", "bg-milk text-ink-soft"],
  };
  const [label, cls] = map[state] ?? [state, "bg-line"];
  return <span className={`rounded-md px-2.5 py-0.5 text-xs font-semibold ${cls}`}>{label}</span>;
}

export function StateSelect({ value, name = "state" }: { value?: string; name?: string }) {
  return (
    <select name={name} defaultValue={value ?? "DRAFT"} className={inputCls}>
      <option value="DRAFT">Черновик</option>
      <option value="PUBLISHED">Опубликовано</option>
      <option value="HIDDEN">Скрыто</option>
      <option value="ARCHIVED">Архив</option>
    </select>
  );
}

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="mb-3 inline-block text-sm font-medium text-brick hover:underline">
      ‹ {children}
    </Link>
  );
}
