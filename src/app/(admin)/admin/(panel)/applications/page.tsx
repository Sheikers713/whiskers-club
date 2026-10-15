import Link from "next/link";
import type { ApplicationStatus, ApplicationType } from "@prisma/client";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { t } from "@/lib/i18n/localized";
import { formatShortDate } from "@/lib/format";
import { PageTitle } from "@/components/admin/ui";
import { statusLabels, typeLabels } from "./labels";

export const metadata = { title: "Заявки" };

export default async function Applications({ searchParams }: PageProps<"/admin/applications">) {
  await requireUser(["EDITOR"]);
  const sp = await searchParams;
  const type = typeof sp.type === "string" && sp.type in typeLabels ? (sp.type as ApplicationType) : undefined;
  const status = typeof sp.status === "string" && sp.status in statusLabels ? (sp.status as ApplicationStatus) : undefined;
  const rows = await db.application.findMany({
    where: { ...(type ? { type } : {}), ...(status ? { status } : {}) },
    orderBy: { createdAt: "desc" },
    include: { cat: { select: { name: true } } },
    take: 300,
  });
  const link = (k: string, v?: string) => {
    const q = new URLSearchParams();
    if (k === "type" ? v : type) q.set("type", (k === "type" ? v : type)!);
    if (k === "status" ? v : status) q.set("status", (k === "status" ? v : status)!);
    return `/admin/applications${q.size ? `?${q}` : ""}`;
  };
  return (
    <div className="max-w-5xl">
      <PageTitle>Заявки</PageTitle>
      <div className="mb-4 space-y-2 text-sm">
        <nav className="flex flex-wrap gap-2">
          <Link href={link("type")} className={`rounded-md px-3 py-1.5 ${!type ? "bg-ink text-milk" : "bg-paper ring-1 ring-line"}`}>Все типы</Link>
          {Object.entries(typeLabels).map(([k, l]) => (
            <Link key={k} href={link("type", k)} className={`rounded-md px-3 py-1.5 ${type === k ? "bg-ink text-milk" : "bg-paper ring-1 ring-line"}`}>{l}</Link>
          ))}
        </nav>
        <nav className="flex flex-wrap gap-2">
          <Link href={link("status")} className={`rounded-md px-3 py-1.5 ${!status ? "bg-ink text-milk" : "bg-paper ring-1 ring-line"}`}>Все статусы</Link>
          {Object.entries(statusLabels).map(([k, l]) => (
            <Link key={k} href={link("status", k)} className={`rounded-md px-3 py-1.5 ${status === k ? "bg-ink text-milk" : "bg-paper ring-1 ring-line"}`}>{l}</Link>
          ))}
        </nav>
      </div>
      <ul className="divide-y divide-line rounded-[var(--radius-card)] bg-paper ring-1 ring-line">
        {rows.map((a) => (
          <li key={a.id}>
            <Link href={`/admin/applications/${a.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-milk">
              <span className="min-w-0">
                <span className="block font-medium">
                  {a.name} {a.status === "NEW" && <span className="ml-1 rounded-[var(--radius-control)] bg-brick px-2 py-0.5 text-xs text-white">новая</span>}
                </span>
                <span className="block truncate text-sm text-ink-soft">
                  {typeLabels[a.type]}
                  {a.cat ? ` · ${t(a.cat.name, "ru")}` : ""} · {formatShortDate(a.createdAt, "ru")}
                </span>
              </span>
              <span className="shrink-0 text-sm">{statusLabels[a.status]}</span>
            </Link>
          </li>
        ))}
        {rows.length === 0 && <li className="px-4 py-6 text-ink-soft">Заявок нет.</li>}
      </ul>
    </div>
  );
}
