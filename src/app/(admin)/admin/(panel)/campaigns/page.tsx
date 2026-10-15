import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { t } from "@/lib/i18n/localized";
import { formatRsd } from "@/lib/format";
import { campaignRaised } from "@/lib/queries/finance";
import { PageTitle, StateBadge, btnCls } from "@/components/admin/ui";

export const metadata = { title: "Сборы" };

const statusLabel = { ACTIVE: "идёт", COMPLETED: "завершён", CANCELLED: "отменён" } as const;

export default async function Campaigns() {
  await requireUser(["FINANCE"]);
  const rows = await db.campaign.findMany({
    orderBy: [{ status: "asc" }, { startDate: "desc" }],
    include: { cats: { include: { cat: { select: { name: true } } } } },
  });
  const raised = await campaignRaised(rows.map((r) => r.id));
  return (
    <div className="max-w-5xl">
      <PageTitle action={<Link href="/admin/campaigns/new" className={btnCls}>+ Новый сбор</Link>}>Сборы</PageTitle>
      <ul className="divide-y divide-line rounded-[var(--radius-card)] bg-paper ring-1 ring-line">
        {rows.map((c) => (
          <li key={c.id}>
            <Link href={`/admin/campaigns/${c.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-milk">
              <span className="min-w-0">
                <span className="block font-medium">{t(c.title, "ru")}</span>
                <span className="block truncate text-sm text-ink-soft">
                  {statusLabel[c.status]} · {c.cats.map((x) => t(x.cat.name, "ru")).join(", ") || "без котов"}
                </span>
              </span>
              <span className="text-right">
                <span className="block font-semibold">
                  {formatRsd(raised.get(c.id) ?? 0, "ru")} / {formatRsd(c.targetRsd, "ru")}
                </span>
                <StateBadge state={c.state} />
              </span>
            </Link>
          </li>
        ))}
        {rows.length === 0 && <li className="px-4 py-6 text-ink-soft">Сборов пока нет.</li>}
      </ul>
    </div>
  );
}
