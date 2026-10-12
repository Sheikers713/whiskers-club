import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import { t } from "@/lib/i18n/localized";
import { formatRsd } from "@/lib/format";
import { getHomeStats } from "@/lib/queries/stats";
import { Card, PageTitle } from "@/components/admin/ui";

export const metadata = { title: "Главная" };

export default async function Dashboard({ searchParams }: PageProps<"/admin">) {
  const user = await requireUser();
  const sp = await searchParams;
  const isEditor = hasRole(user.roles, ["EDITOR"]);
  const isFinance = hasRole(user.roles, ["FINANCE"]);
  const isSuper = user.roles.includes("SUPERADMIN");

  const [newApps, draftCats, draftDonations, draftExpenses, stats, events, myCats] = await Promise.all([
    isEditor ? db.application.count({ where: { status: "NEW" } }) : 0,
    isEditor ? db.cat.count({ where: { state: "DRAFT" } }) : 0,
    isFinance ? db.donation.count({ where: { state: "DRAFT" } }) : 0,
    isFinance ? db.expense.count({ where: { state: "DRAFT" } }) : 0,
    getHomeStats(),
    isSuper ? db.systemEvent.findMany({ orderBy: { at: "desc" }, take: 15 }) : [],
    db.catCurator.findMany({ where: { userId: user.id }, include: { cat: { include: { status: true } } } }),
  ]);

  const tiles = [
    isEditor && { href: "/admin/applications?status=NEW", label: "Новые заявки", value: newApps },
    isEditor && { href: "/admin/cats?state=DRAFT", label: "Коты в черновиках", value: draftCats },
    isFinance && { href: "/admin/donations?state=DRAFT", label: "Поступления в черновиках", value: draftDonations },
    isFinance && { href: "/admin/expenses?state=DRAFT", label: "Расходы в черновиках", value: draftExpenses },
  ].filter(Boolean) as Array<{ href: string; label: string; value: number }>;

  return (
    <div className="max-w-5xl space-y-6">
      <PageTitle>Здравствуйте, {user.name}</PageTitle>
      {sp.forbidden && (
        <p role="alert" className="rounded-lg bg-brick-soft px-4 py-3 text-brick-dark">
          У вашей роли нет доступа к этому разделу.
        </p>
      )}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {tiles.map((tile) => (
          <Link key={tile.href} href={tile.href} className="rounded-2xl bg-paper p-4 ring-1 ring-line hover:ring-ink">
            <p className="text-sm text-ink-soft">{tile.label}</p>
            <p className="text-3xl font-bold">{tile.value}</p>
          </Link>
        ))}
      </div>
      <Card title="Сайт сейчас">
        <p>
          Спасено: <b>{stats.rescued}</b> · пристроено: <b>{stats.adopted}</b> · стерилизовано: <b>{stats.sterilized}</b> · на лечении:{" "}
          <b>{stats.inTreatment}</b>
        </p>
        <p>
          Собрано: <b>{formatRsd(stats.raisedRsd, "ru")}</b> · потрачено: <b>{formatRsd(stats.spentRsd, "ru")}</b> · остаток:{" "}
          <b>{formatRsd(stats.raisedRsd - stats.spentRsd, "ru")}</b>
        </p>
      </Card>
      {myCats.length > 0 && (
        <Card title="Мои коты">
          <ul className="flex flex-wrap gap-2">
            {myCats.map((c) => (
              <li key={c.catId}>
                <Link href={`/admin/cats/${c.catId}`} className="rounded-full bg-milk px-3 py-1.5 font-medium hover:bg-line">
                  {t(c.cat.name, "ru")} · {t(c.cat.status.label, "ru")}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
      {isSuper && (
        <Card title="Системные события">
          {events.length === 0 ? (
            <p className="text-ink-soft">Событий нет. Сюда попадают ошибки бэкапа, нехватка места на диске и сбои проверок.</p>
          ) : (
            <ul className="divide-y divide-line">
              {events.map((e) => (
                <li key={e.id} className="py-2 text-sm">
                  <span className={e.level === "error" ? "font-semibold text-brick" : e.level === "warning" ? "font-semibold text-orange" : "text-ink-soft"}>
                    {e.kind}
                  </span>{" "}
                  {e.message}
                  <span className="block text-xs text-ink-soft">{e.at.toLocaleString("ru-RU", { timeZone: "Europe/Belgrade" })}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}
