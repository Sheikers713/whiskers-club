import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { t } from "@/lib/i18n/localized";
import { formatNumber, formatShortDate } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import { PageTitle, btnCls, btnSecondaryCls } from "@/components/admin/ui";

export const metadata = { title: "Таблица расходов и донатов" };

/**
 * Expenses and donations laid out like the volunteers' Google Sheet: expenses
 * on the left (Дата, Сумма, На что, Чеки), donations on the right (Дата,
 * Сумма, От кого), oldest first, a tab per cat. A shared expense shows the
 * cat's equal share in that cat's tab, as on the cat's public page.
 */

const cell = "border border-line px-2 py-1.5 align-top";
const num = `${cell} text-right tabular-nums whitespace-nowrap`;
const head = "whitespace-nowrap border border-line bg-milk px-2 py-1.5 text-left text-sm font-semibold";
const dm = (d: Date) => formatShortDate(d, "ru").slice(0, 5);
const n = (v: number) => formatNumber(v, "ru");

function DraftMark({ state }: { state: string }) {
  if (state === "PUBLISHED") return null;
  return <span className="ml-1 rounded bg-line px-1 text-xs text-ink-soft">{state === "DRAFT" ? "черновик" : "скрыто"}</span>;
}

export default async function FinanceSheet({ searchParams }: PageProps<"/admin/finance">) {
  await requireUser(["FINANCE"]);
  const sp = await searchParams;
  const tab = typeof sp.cat === "string" ? sp.cat : "all";

  const [expensesAll, donationsAll] = await Promise.all([
    db.expense.findMany({
      where: { state: { not: "ARCHIVED" } },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
      include: {
        cats: { include: { cat: { select: { id: true, name: true } } } },
        files: { select: { fileId: true }, take: 3 },
      },
    }),
    db.donation.findMany({
      where: { state: { not: "ARCHIVED" } },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
      include: { cat: { select: { id: true, name: true } }, campaign: { select: { title: true } } },
    }),
  ]);

  // Who added each row: the admin account, or the Telegram name the bot noted.
  const userIds = [...new Set([...expensesAll, ...donationsAll].map((r) => r.createdById).filter((v): v is string => !!v))];
  const users = new Map((await db.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } })).map((u) => [u.id, u.name]));
  const addedBy = (r: { createdById: string | null; internalComment: string | null }) =>
    (r.createdById && users.get(r.createdById)) || r.internalComment?.match(/^Внесено через Telegram: ([^.]+)/)?.[1] || "";

  // Tabs: every cat that has money records, like the sheet's tabs per cat group.
  const tabs = new Map<string, string>();
  for (const e of expensesAll) for (const c of e.cats) tabs.set(c.cat.id, t(c.cat.name, "ru"));
  for (const d of donationsAll) if (d.cat) tabs.set(d.cat.id, t(d.cat.name, "ru"));
  const catTabs = [...tabs].sort((a, b) => a[1].localeCompare(b[1], "ru"));

  const expenses = expensesAll
    .filter((e) => (tab === "all" ? true : tab === "general" ? e.cats.length === 0 : e.cats.some((c) => c.cat.id === tab)))
    .map((e) => {
      const share = tab !== "all" && tab !== "general" && e.cats.length > 1 ? Math.round(e.amountRsd / e.cats.length) : e.amountRsd;
      return { ...e, share };
    });
  const donations = donationsAll.filter((d) =>
    tab === "all" ? true : tab === "general" ? !d.catId : d.catId === tab,
  );
  const showCats = tab === "all";
  const published = <T extends { state: string }>(rows: T[]) => rows.filter((r) => r.state === "PUBLISHED");
  const spent = published(expenses).reduce((s, e) => s + e.share, 0);
  const raised = published(donations).reduce((s, d) => s + d.amountRsd, 0);
  // The opening balance (money on hand before the records start) counts for the
  // whole fund; the part spent on particular cats counts in their tabs.
  const opening = (await getSettings()).openingBalance;
  const openingRsd =
    tab === "all" ? opening.amountRsd : tab === "general" ? 0 : (opening.cats?.find((c) => c.catId === tab)?.amountRsd ?? 0);
  const balance = openingRsd + raised - spent;
  const since = [expenses[0]?.date, donations[0]?.date].filter(Boolean).sort((a, b) => +a! - +b!)[0];

  const tabCls = (active: boolean) =>
    `whitespace-nowrap rounded-t-lg border border-b-0 border-line px-3 py-1.5 text-sm ${active ? "bg-paper font-semibold" : "bg-milk text-ink-soft hover:text-ink"}`;

  return (
    <div className="max-w-[90rem]">
      <PageTitle
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/expenses/new" className={btnCls}>+ Расход</Link>
            <Link href="/admin/donations/new" className={btnSecondaryCls}>+ Донат</Link>
          </div>
        }
      >
        Расходы и донаты
      </PageTitle>

      <table className="mb-6 w-full max-w-md border-collapse text-sm font-semibold">
        <tbody>
          {openingRsd > 0 && (
            <tr>
              <td className={cell}>
                Начальный остаток{opening.date ? ` на ${formatShortDate(opening.date, "ru")}` : ""}
                {tab !== "all" && <span className="block text-xs font-normal text-ink-soft">часть, потраченная на этого кота</span>}
              </td>
              <td className={num}>{n(openingRsd)}</td>
            </tr>
          )}
          <tr><td className={cell}>Итого донаты</td><td className={num}>{n(raised)}</td></tr>
          <tr><td className={cell}>Итого расходы</td><td className={num}>{n(spent)}</td></tr>
          <tr><td className={cell}>Остаток</td><td className={`${num} ${balance < 0 ? "text-brick" : ""}`}>{n(balance)}</td></tr>
        </tbody>
      </table>
      <p className="-mt-4 mb-6 text-xs text-ink-soft">В итогах только опубликованные записи. Переводы между сборами здесь не учитываются.</p>

      <nav className="-mb-px flex gap-1 overflow-x-auto">
        <Link href="/admin/finance" className={tabCls(tab === "all")}>Все</Link>
        {catTabs.map(([id, name]) => (
          <Link key={id} href={`/admin/finance?cat=${id}`} className={tabCls(tab === id)}>{name}</Link>
        ))}
        <Link href="/admin/finance?cat=general" className={tabCls(tab === "general")}>Без кота</Link>
      </nav>

      <div className="grid gap-6 rounded-b-[var(--radius-card)] rounded-tr-[var(--radius-card)] bg-paper p-3 ring-1 ring-line xl:grid-cols-[3fr_2fr]">
        <section className="min-w-0 overflow-x-auto">
          <h2 className="mb-2 text-center text-lg font-bold">Расходы{since ? ` с ${formatShortDate(since, "ru")}` : ""}</h2>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className={head}>Дата</th>
                <th className={head}>Сумма (RSD)</th>
                <th className={head}>На что</th>
                {showCats && <th className={head}>Коты</th>}
                <th className={head}>Чеки</th>
                <th className={head}>Внёс</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id} className="hover:bg-milk">
                  <td className={num}>
                    <Link href={`/admin/expenses/${e.id}`} className="hover:underline">{dm(e.date)}</Link>
                  </td>
                  <td className={num} title={e.share !== e.amountRsd ? `Доля из ${n(e.amountRsd)} на ${e.cats.length} котов` : undefined}>
                    {n(e.share)}
                    {e.share !== e.amountRsd && <span className="block text-xs text-ink-soft">из {n(e.amountRsd)}</span>}
                  </td>
                  <td className={cell}>
                    <Link href={`/admin/expenses/${e.id}`} className="hover:underline">{e.description}</Link>
                    <DraftMark state={e.state} />
                  </td>
                  {showCats && <td className={cell}>{e.cats.map((c) => t(c.cat.name, "ru")).join(", ")}</td>}
                  <td className={cell}>
                    {e.files.length > 0
                      ? e.files.map((f, i) => (
                          <a key={f.fileId} href={`/admin/files/${f.fileId}`} target="_blank" className="mr-2 text-brick underline">
                            чек{e.files.length > 1 ? ` ${i + 1}` : ""}
                          </a>
                        ))
                      : <span className="text-ink-soft">{e.noReceiptReason || (e.proof === "NONE" ? "без чека" : "")}</span>}
                  </td>
                  <td className={`${cell} text-ink-soft`}>{addedBy(e)}</td>
                </tr>
              ))}
              {expenses.length === 0 && (
                <tr><td colSpan={showCats ? 6 : 5} className={`${cell} text-ink-soft`}>Расходов нет.</td></tr>
              )}
            </tbody>
            <tfoot>
              <tr className="font-semibold">
                <td className={cell}>Итого</td>
                <td className={num}>{n(spent)}</td>
                <td className={cell} colSpan={showCats ? 4 : 3} />
              </tr>
            </tfoot>
          </table>
        </section>

        <section className="min-w-0 overflow-x-auto">
          <h2 className="mb-2 text-center text-lg font-bold">Донаты{since ? ` с ${formatShortDate(since, "ru")}` : ""}</h2>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className={head}>Дата</th>
                <th className={head}>Сумма (RSD)</th>
                <th className={head}>От кого</th>
                {showCats && <th className={head}>Кот</th>}
                <th className={head}>Внёс</th>
              </tr>
            </thead>
            <tbody>
              {donations.map((d) => (
                <tr key={d.id} className="hover:bg-milk">
                  <td className={num}>
                    <Link href={`/admin/donations/${d.id}`} className="hover:underline">{formatShortDate(d.date, "ru")}</Link>
                  </td>
                  <td className={num}>{n(d.amountRsd)}</td>
                  <td className={cell}>
                    <Link href={`/admin/donations/${d.id}`} className="hover:underline">{d.donorName || d.publicName || "Аноним"}</Link>
                    {d.method && <span className="block text-xs text-ink-soft">{d.method}</span>}
                    <DraftMark state={d.state} />
                  </td>
                  {showCats && <td className={cell}>{d.cat ? t(d.cat.name, "ru") : d.campaign ? t(d.campaign.title, "ru") : ""}</td>}
                  <td className={`${cell} text-ink-soft`}>{addedBy(d)}</td>
                </tr>
              ))}
              {donations.length === 0 && (
                <tr><td colSpan={showCats ? 5 : 4} className={`${cell} text-ink-soft`}>Донатов нет.</td></tr>
              )}
            </tbody>
            <tfoot>
              <tr className="font-semibold">
                <td className={cell}>Итого</td>
                <td className={num}>{n(raised)}</td>
                <td className={cell} colSpan={showCats ? 3 : 2} />
              </tr>
            </tfoot>
          </table>

        </section>
      </div>
    </div>
  );
}
