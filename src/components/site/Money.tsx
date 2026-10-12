import { formatRsd, formatNumber, rsdToEur } from "@/lib/format";
import type { Locale } from "@/lib/i18n/config";

/** "12 000 RSD (≈ 102 €)" — dinars are the real amount, euros a hint. */
export function Money({
  amount,
  locale,
  eurRate,
  showEur = true,
  className,
}: {
  amount: number;
  locale: Locale;
  eurRate: number;
  showEur?: boolean;
  className?: string;
}) {
  return (
    <span className={className}>
      <span className="whitespace-nowrap">{formatRsd(amount, locale)}</span>
      {showEur && eurRate > 0 && (
        <span className="whitespace-nowrap text-ink-soft font-normal">
          {" "}
          (≈ {formatNumber(rsdToEur(amount, eurRate), locale)} €)
        </span>
      )}
    </span>
  );
}
