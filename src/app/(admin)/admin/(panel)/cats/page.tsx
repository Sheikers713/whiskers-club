import Link from "next/link";
import type { PublicationState } from "@prisma/client";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { t, untranslatedLocales } from "@/lib/i18n/localized";
import { photoUrl } from "@/lib/media-url";
import { sortCats } from "@/lib/queries/cats";
import { PageTitle, StateBadge, btnCls } from "@/components/admin/ui";
import { QuickStatus } from "@/components/admin/QuickStatus";

export const metadata = { title: "Коты" };

export default async function AdminCats({ searchParams }: PageProps<"/admin/cats">) {
  await requireUser(["EDITOR"]);
  const sp = await searchParams;
  const state = typeof sp.state === "string" && ["DRAFT", "PUBLISHED", "HIDDEN", "ARCHIVED"].includes(sp.state) ? (sp.state as PublicationState) : undefined;
  const [found, statuses] = await Promise.all([
    db.cat.findMany({ where: state ? { state } : {}, include: { status: true, cover: true } }),
    db.catStatus.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, key: true, label: true, color: true, isPublic: true } }),
  ]);
  // Same order as the catalog on the home page.
  const cats = sortCats(found);
  return (
    <div className="max-w-5xl">
      <PageTitle action={<Link href="/admin/cats/new" className={btnCls}>+ Добавить кота</Link>}>Коты</PageTitle>
      <nav className="mb-4 flex flex-wrap gap-2 text-sm">
        {[["", "Все"], ["DRAFT", "Черновики"], ["PUBLISHED", "Опубликованы"], ["HIDDEN", "Скрыты"], ["ARCHIVED", "Архив"]].map(([k, l]) => (
          <Link key={k} href={k ? `/admin/cats?state=${k}` : "/admin/cats"} className={`rounded-md px-3 py-1.5 ${state === k || (!state && !k) ? "bg-ink text-milk" : "bg-paper ring-1 ring-line"}`}>
            {l}
          </Link>
        ))}
      </nav>
      {cats.length === 0 ? (
        <p className="text-ink-soft">Котов пока нет.</p>
      ) : (
        <ul className="divide-y divide-line rounded-[var(--radius-card)] bg-paper ring-1 ring-line">
          {cats.map((c) => {
            const missing = untranslatedLocales(c.name).concat(untranslatedLocales(c.summary));
            return (
              <li key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 hover:bg-milk">
                <Link href={`/admin/cats/${c.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                  {c.cover?.storageKey ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photoUrl(c.cover.storageKey, 480)} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <span className="h-12 w-12 shrink-0 rounded-lg bg-line" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">
                      {t(c.name, "ru")}
                      {c.isPinned && <span className="ml-2 text-xs font-normal text-ink-soft" title="Закреплён в начале каталога">📌</span>}
                    </p>
                    {missing.length > 0 && <p className="text-sm text-brick">нет перевода: {[...new Set(missing)].join(", ").toUpperCase()}</p>}
                  </div>
                </Link>
                <div className="ml-auto flex items-center gap-3">
                  <QuickStatus catId={c.id} sex={c.sex} current={c.statusId} statuses={statuses} />
                  <StateBadge state={c.state} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
