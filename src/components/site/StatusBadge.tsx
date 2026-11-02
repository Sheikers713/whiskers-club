import type { CatStatus, Sex } from "@prisma/client";
import type { Locale } from "@/lib/i18n/config";
import { statusLabel } from "@/lib/i18n/localized";

export function StatusBadge({ status, sex, locale }: { status: CatStatus; sex?: Sex | null; locale: Locale }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-paper/95 px-3 py-1 text-xs font-semibold text-ink shadow-sm">
      <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: status.color }} />
      {statusLabel(status, sex, locale)}
    </span>
  );
}
