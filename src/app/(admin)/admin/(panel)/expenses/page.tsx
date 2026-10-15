import Link from "next/link";
import type { PublicationState } from "@prisma/client";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { t } from "@/lib/i18n/localized";
import { formatRsd, formatShortDate } from "@/lib/format";
import { PageTitle, StateBadge, btnCls } from "@/components/admin/ui";

export const metadata = { title: "Расходы" };

const proofLabel = { FISCAL_VERIFIED: "чек проверен", DOCUMENT: "документ", NONE: "без чека" } as const;

export default async function Expenses({ searchParams }: PageProps<"/admin/expenses">) {
  await requireUser(["FINANCE"]);
  const sp = await searchParams;
  const state = typeof sp.state === "string" ? (sp.state as PublicationState) : undefined;
  const rows = await db.expense.findMany({
    where: state ? { state } : {},
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    include: { category: true, cats: { include: { cat: { select: { name: true } } } } },
    take: 500,
  });
  return (
    <div className="max-w-5xl">
      <PageTitle action={<Link href="/admin/expenses/new" className={btnCls}>+ Внести расход</Link>}>Расходы</PageTitle>
      <ul className="divide-y divide-line rounded-[var(--radius-card)] bg-paper ring-1 ring-line">
        {rows.map((e) => (
          <li key={e.id}>
            <Link href={`/admin/expenses/${e.id}`} className="grid grid-cols-[5.5rem_1fr_auto] items-center gap-3 px-4 py-3 hover:bg-milk">
              <span className="text-sm text-ink-soft">{formatShortDate(e.date, "ru")}</span>
              <span className="min-w-0">
                <span className="block truncate font-medium">{e.description}</span>
                <span className="block truncate text-sm text-ink-soft">
                  {t(e.category.label, "ru")} · {proofLabel[e.proof]}
                  {e.cats.length > 0 && ` · ${e.cats.map((c) => t(c.cat.name, "ru")).join(", ")}`}
                </span>
              </span>
              <span className="text-right">
                <span className="block font-semibold">{formatRsd(e.amountRsd, "ru")}</span>
                <StateBadge state={e.state} />
              </span>
            </Link>
          </li>
        ))}
        {rows.length === 0 && <li className="px-4 py-6 text-ink-soft">Записей нет.</li>}
      </ul>
    </div>
  );
}
