import Link from "next/link";
import type { PublicationState } from "@prisma/client";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { t } from "@/lib/i18n/localized";
import { formatRsd, formatShortDate } from "@/lib/format";
import { PageTitle, StateBadge, btnCls } from "@/components/admin/ui";

export const metadata = { title: "Поступления" };

export default async function Donations({ searchParams }: PageProps<"/admin/donations">) {
  await requireUser(["FINANCE"]);
  const sp = await searchParams;
  const state = typeof sp.state === "string" ? (sp.state as PublicationState) : undefined;
  const rows = await db.donation.findMany({
    where: state ? { state } : {},
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    include: { campaign: { select: { title: true } }, cat: { select: { name: true } } },
    take: 500,
  });
  const total = rows.filter((r) => r.state === "PUBLISHED").reduce((s, r) => s + r.amountRsd, 0);
  return (
    <div className="max-w-5xl">
      <PageTitle action={<Link href="/admin/donations/new" className={btnCls}>+ Внести поступление</Link>}>Поступления</PageTitle>
      <p className="mb-4 text-sm text-ink-soft">Опубликовано в списке: {formatRsd(total, "ru")}. Все суммы в динарах.</p>
      <ul className="divide-y divide-line rounded-2xl bg-paper ring-1 ring-line">
        {rows.map((d) => (
          <li key={d.id}>
            <Link href={`/admin/donations/${d.id}`} className="grid grid-cols-[5.5rem_1fr_auto] items-center gap-3 px-4 py-3 hover:bg-milk">
              <span className="text-sm text-ink-soft">{formatShortDate(d.date, "ru")}</span>
              <span className="min-w-0">
                <span className="font-medium">{d.donorName ?? d.publicName ?? "Аноним"}</span>
                <span className="block truncate text-sm text-ink-soft">
                  {d.campaign ? t(d.campaign.title, "ru") : d.cat ? t(d.cat.name, "ru") : "Общий фонд"}
                  {d.showName ? "" : " · имя скрыто"}
                </span>
              </span>
              <span className="text-right">
                <span className="block font-semibold">{formatRsd(d.amountRsd, "ru")}</span>
                <StateBadge state={d.state} />
              </span>
            </Link>
          </li>
        ))}
        {rows.length === 0 && <li className="px-4 py-6 text-ink-soft">Записей нет.</li>}
      </ul>
    </div>
  );
}
