import { db } from "@/lib/db";

/** History of changes for one record, newest first. */
export async function AuditTrail({ entityType, entityId }: { entityType: string; entityId: string }) {
  const events = await db.auditEvent.findMany({
    where: { entityType, entityId },
    orderBy: { at: "desc" },
    include: { actor: { select: { name: true } } },
    take: 50,
  });
  if (!events.length) return null;
  return (
    <details className="rounded-2xl bg-paper p-4 ring-1 ring-line">
      <summary className="cursor-pointer font-semibold">История изменений ({events.length})</summary>
      <ul className="mt-3 space-y-2 text-sm">
        {events.map((e) => (
          <li key={e.id}>
            <span className="text-ink-soft">{e.at.toLocaleString("ru-RU", { timeZone: "Europe/Belgrade" })}</span> · {e.actor?.name ?? "система"} ·{" "}
            <code>{e.action}</code>
          </li>
        ))}
      </ul>
    </details>
  );
}
