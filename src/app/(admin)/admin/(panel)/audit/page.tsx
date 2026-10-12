import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { PageTitle } from "@/components/admin/ui";

export const metadata = { title: "Журнал" };

const PAGE = 100;

export default async function Audit({ searchParams }: PageProps<"/admin/audit">) {
  await requireUser(["SUPERADMIN"]);
  const sp = await searchParams;
  const page = Math.max(0, Number(sp.page) || 0);
  const action = typeof sp.action === "string" ? sp.action : undefined;
  const events = await db.auditEvent.findMany({
    where: action ? { action: { startsWith: action } } : {},
    orderBy: { at: "desc" },
    skip: page * PAGE,
    take: PAGE + 1,
    include: { actor: { select: { name: true } } },
  });
  return (
    <div className="max-w-5xl">
      <PageTitle>Журнал действий</PageTitle>
      <form className="mb-4 flex gap-2">
        <input name="action" defaultValue={action} placeholder="Например: auth, expense, cat" className="rounded-lg border border-line bg-paper px-3 py-2" />
        <button className="rounded-full bg-ink px-4 py-2 text-milk">Найти</button>
      </form>
      <ul className="divide-y divide-line rounded-2xl bg-paper text-sm ring-1 ring-line">
        {events.slice(0, PAGE).map((e) => (
          <li key={e.id} className="px-4 py-2">
            <details>
              <summary className="cursor-pointer">
                <span className="text-ink-soft">{e.at.toLocaleString("ru-RU", { timeZone: "Europe/Belgrade" })}</span> · {e.actor?.name ?? "—"} · <code>{e.action}</code>
                {e.entityType && <span className="text-ink-soft"> · {e.entityType}</span>}
                {e.ip && <span className="text-ink-soft"> · {e.ip}</span>}
              </summary>
              {(e.before || e.after) && (
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  {e.before && <pre className="overflow-x-auto rounded bg-milk p-2 text-xs">{JSON.stringify(e.before, null, 2)}</pre>}
                  {e.after && <pre className="overflow-x-auto rounded bg-sage-soft p-2 text-xs">{JSON.stringify(e.after, null, 2)}</pre>}
                </div>
              )}
            </details>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex gap-4">
        {page > 0 && <Link href={`/admin/audit?page=${page - 1}${action ? `&action=${action}` : ""}`} className="underline">← Новее</Link>}
        {events.length > PAGE && <Link href={`/admin/audit?page=${page + 1}${action ? `&action=${action}` : ""}`} className="underline">Старее →</Link>}
      </div>
    </div>
  );
}
