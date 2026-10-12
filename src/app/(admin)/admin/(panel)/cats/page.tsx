import Link from "next/link";
import type { PublicationState } from "@prisma/client";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { missingLocales, t } from "@/lib/i18n/localized";
import { photoUrl } from "@/lib/media-url";
import { PageTitle, StateBadge, btnCls } from "@/components/admin/ui";

export const metadata = { title: "Коты" };

export default async function AdminCats({ searchParams }: PageProps<"/admin/cats">) {
  await requireUser(["EDITOR"]);
  const sp = await searchParams;
  const state = typeof sp.state === "string" && ["DRAFT", "PUBLISHED", "HIDDEN", "ARCHIVED"].includes(sp.state) ? (sp.state as PublicationState) : undefined;
  const cats = await db.cat.findMany({
    where: state ? { state } : {},
    include: { status: true, cover: true },
    orderBy: [{ updatedAt: "desc" }],
  });
  return (
    <div className="max-w-5xl">
      <PageTitle action={<Link href="/admin/cats/new" className={btnCls}>+ Добавить кота</Link>}>Коты</PageTitle>
      <nav className="mb-4 flex flex-wrap gap-2 text-sm">
        {[["", "Все"], ["DRAFT", "Черновики"], ["PUBLISHED", "Опубликованы"], ["HIDDEN", "Скрыты"], ["ARCHIVED", "Архив"]].map(([k, l]) => (
          <Link key={k} href={k ? `/admin/cats?state=${k}` : "/admin/cats"} className={`rounded-full px-3 py-1.5 ${state === k || (!state && !k) ? "bg-ink text-milk" : "bg-paper ring-1 ring-line"}`}>
            {l}
          </Link>
        ))}
      </nav>
      {cats.length === 0 ? (
        <p className="text-ink-soft">Котов пока нет.</p>
      ) : (
        <ul className="divide-y divide-line rounded-2xl bg-paper ring-1 ring-line">
          {cats.map((c) => {
            const missing = missingLocales(c.name).concat(missingLocales(c.summary));
            return (
              <li key={c.id}>
                <Link href={`/admin/cats/${c.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-milk">
                  {c.cover?.storageKey ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photoUrl(c.cover.storageKey, 480)} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <span className="h-12 w-12 shrink-0 rounded-lg bg-line" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{t(c.name, "ru")}</p>
                    <p className="text-sm text-ink-soft">
                      {t(c.status.label, "ru")}
                      {missing.length > 0 && <span className="text-brick"> · нет перевода: {[...new Set(missing)].join(", ").toUpperCase()}</span>}
                    </p>
                  </div>
                  <StateBadge state={c.state} />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
