import type { Sex } from "@prisma/client";
import { statusLabel } from "@/lib/i18n/localized";

export type PillStatus = { id: string; key: string; label: unknown; color: string; isPublic: boolean };

/** The status pill exactly as the public site draws it, for the admin. */
export function StatusPill({ status, sex, big = false, className = "" }: { status: PillStatus; sex?: Sex | null; big?: boolean; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md bg-paper font-semibold ${big ? "px-3.5 py-2 text-sm" : "px-3 py-1 text-xs"} text-ink shadow-sm ring-1 ring-line ${className}`}>
      <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ background: status.color }} />
      {statusLabel(status, sex, "ru")}
      {!status.isPublic && <span className="font-normal text-ink-soft">· не на сайте</span>}
    </span>
  );
}
