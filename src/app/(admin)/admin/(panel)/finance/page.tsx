import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { t } from "@/lib/i18n/localized";
import { formatNumber, formatShortDate } from "@/lib/format";
import { settlements } from "@/lib/finance/settle";
import { getSettings } from "@/lib/settings";
import { toDateInput } from "@/lib/admin/form";
import { PageTitle } from "@/components/admin/ui";
import { DonationSheet, ExpenseSheet } from "./Sheet";

export const metadata = { title: "Таблица расходов и донатов" };

/**
 * Expenses and donations laid out like the volunteers' Google Sheet: expenses
 * on the left (Дата, Сумма, На что, Чеки), donations on the right (Дата,
 * Сумма, От кого), newest first, a tab per cat, every cell editable (Sheet.tsx). A shared expense shows the
 * cat's equal share in that cat's tab, as on the cat's public page.
 */

const cell = "border border-line px-2 py-1.5 align-top";
const num = `${cell} text-right tabular-nums whitespace-nowrap`;
const n = (v: number) => formatNumber(v, "ru");

export default async function FinanceSheet({ searchParams }: PageProps<"/admin/finance">) {
  await requireUser(["FINANCE"]);
  const sp = await searchParams;
  const tab = typeof sp.cat === "string" ? sp.cat : "all";
  // One table at a time: expenses (default) or donations.
  const view = sp.view === "donations" ? "donations" : "expenses";
  const href = (cat: string, v: string = view) => {
    const q = new URLSearchParams();
    if (cat !== "all") q.set("cat", cat);
    if (v === "donations") q.set("view", v);
    const qs = q.toString();
    return `/admin/finance${qs ? `?${qs}` : ""}`;
  };

  const [expensesAll, donationsAll] = await Promise.all([
    db.expense.findMany({
      where: { state: { not: "ARCHIVED" } },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      include: {
        cats: { include: { cat: { select: { id: true, name: true } } } },
        files: { select: { fileId: true } },
      },
    }),
    db.donation.findMany({
      where: { state: { not: "ARCHIVED" } },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
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
  // A donation for several cats is stored as one row per cat (an equal share).
  // Rows of one donation share an import key: "tg:<user>:<entry>:<n>" from the
  // bot, "xlsx1:<sheet>:D<row>" plus ":2" from the sheet import.
  const groupOf = (k: string | null) => (k ? (k.startsWith("tg:") ? k.replace(/:\d+$/, "") : k.replace(/:2$/, "")) : null);
  const groups = new Map<string, typeof donationsAll>();
  for (const d of donationsAll) {
    const g = groupOf(d.importKey);
    if (g) groups.set(g, [...(groups.get(g) ?? []), d]);
  }
  const splitOf = (d: (typeof donationsAll)[number]) => {
    const rows = groups.get(groupOf(d.importKey) ?? "") ?? [];
    return rows.length > 1
      ? { total: rows.reduce((s, r) => s + r.amountRsd, 0), cats: rows.map((r) => (r.cat ? t(r.cat.name, "ru") : "фонд Whiskers Club")) }
      : null;
  };
  const donations = donationsAll.filter((d) =>
    tab === "all" ? true : tab === "general" ? !d.catId : d.catId === tab,
  );
  // Cats to pick from: everyone in our care now, plus any cat already on a record.
  const [allCats, paymentMethods] = await Promise.all([
    db.cat.findMany({ select: { id: true, name: true, state: true, adoptedAt: true, updatedAt: true, status: { select: { group: true, label: true } } } }),
    db.paymentMethod.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
  ]);
  const catOptions = allCats
    .map((c) => ({ id: c.id, name: t(c.name, "ru"), active: c.state !== "ARCHIVED" && c.status.group === "ACTIVE" }))
    .sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name, "ru"));
  const methods = [...new Set([...paymentMethods.map((m) => t(m.title, "ru")).filter(Boolean), "Наличные", "Другое"])];
  const published = <T extends { state: string }>(rows: T[]) => rows.filter((r) => r.state === "PUBLISHED");
  const spent = published(expenses).reduce((s, e) => s + e.share, 0);
  const raised = published(donations).reduce((s, d) => s + d.amountRsd, 0);
  // The 15 000 opening balance is a donation without a cat, dated in settings.
  // Money without a cat is only used when a cat leaves our care: its balance is
  // then brought to zero from it (or its surplus goes back). See settle.ts.
  const opening = (await getSettings()).openingBalance;
  const openingRow = opening.amountRsd ? { label: "Начальный остаток", hint: "в фонд Whiskers Club, до учёта на сайте", amount: opening.amountRsd, date: opening.date } : null;
  const perCat = new Map<string, { income: number; spent: number }>();
  const add = (id: string, k: "income" | "spent", v: number) => {
    const m = perCat.get(id) ?? { income: 0, spent: 0 };
    m[k] += v;
    perCat.set(id, m);
  };
  for (const d of published(donationsAll)) if (d.catId) add(d.catId, "income", d.amountRsd);
  for (const e of published(expensesAll)) for (const c of e.cats) add(c.cat.id, "spent", e.amountRsd / e.cats.length);
  const settled = settlements(
    allCats.map((c) => ({
      id: c.id,
      name: t(c.name, "ru"),
      closed: c.state === "ARCHIVED" || c.status.group !== "ACTIVE",
      closedOn: toDateInput(c.adoptedAt ?? c.updatedAt),
      income: perCat.get(c.id)?.income ?? 0,
      spent: perCat.get(c.id)?.spent ?? 0,
    })),
  );
  const fmtDay = (d: string | null) => (d ? formatShortDate(d, "ru") : "");
  const statusOf = new Map(allCats.map((c) => [c.id, t(c.status.label, "ru").toLowerCase()]));
  const closedHint = (x: { catId: string; closedOn: string | null }) => [statusOf.get(x.catId), fmtDay(x.closedOn)].filter(Boolean).join(", ");
  // Extra lines between «Итого расходы» and «Остаток» on a tab.
  const settleRows: { label: string; hint?: string; amount: number }[] =
    tab === "all"
      ? []
      : tab === "general"
        ? settled.map((x) => ({
            label: x.amount > 0 ? `Закрыли долг: ${x.name}` : `Вернулся излишек: ${x.name}`,
            hint: closedHint(x),
            amount: -x.amount,
          }))
        : settled
            .filter((x) => x.catId === tab)
            .map((x) => ({
              label: x.amount > 0 ? "Закрыто из фонда Whiskers Club" : "Излишек ушёл в фонд Whiskers Club",
              hint: closedHint(x),
              amount: x.amount,
            }));
  const withOpening = (tab === "all" || tab === "general") && openingRow ? openingRow.amount : 0;
  const raisedAll = raised + withOpening;
  const balance = raisedAll - spent + settleRows.reduce((sum, r) => sum + r.amount, 0);

  const tabCls = (active: boolean) =>
    `whitespace-nowrap rounded-t-lg border border-b-0 border-line px-3 py-1.5 text-sm ${active ? "bg-paper font-semibold" : "bg-milk text-ink-soft hover:text-ink"}`;

  return (
    <div className="max-w-[120rem]">
      <PageTitle
        action={
          <p className="text-sm text-ink-soft">
            Нажмите на ячейку, чтобы изменить. Полные формы:{" "}
            <Link href="/admin/expenses/new" className="underline">расход</Link>, <Link href="/admin/donations/new" className="underline">донат</Link>
          </p>
        }
      >
        Расходы и донаты
      </PageTitle>

      <table className="mb-6 w-full max-w-md border-collapse text-sm font-semibold">
        <tbody>
          <tr>
            <td className={cell}>
              Итого донаты
              {withOpening !== 0 && <span className="block text-xs font-normal text-ink-soft">с начальным остатком {n(withOpening)} (фонд Whiskers Club, {fmtDay(opening.date)})</span>}
            </td>
            <td className={num}>{n(raisedAll)}</td>
          </tr>
          <tr><td className={cell}>Итого расходы</td><td className={num}>{n(spent)}</td></tr>
          {settleRows.map((r) => (
            <tr key={r.label}>
              <td className={cell}>
                {r.label}
                {r.hint && <span className="block text-xs font-normal text-ink-soft">{r.hint}</span>}
              </td>
              <td className={num}>{r.amount > 0 ? "+" : ""}{n(r.amount)}</td>
            </tr>
          ))}
          <tr><td className={cell}>Остаток</td><td className={`${num} ${balance < 0 ? "text-brick" : ""}`}>{n(balance)}</td></tr>
        </tbody>
      </table>
      <p className="-mt-4 mb-6 text-xs text-ink-soft">В итогах только опубликованные записи. Переводы между сборами здесь не учитываются.</p>

      <nav className="-mb-px flex gap-1 overflow-x-auto">
        <Link href={href("all")} className={tabCls(tab === "all")}>Все</Link>
        {catTabs.map(([id, name]) => (
          <Link key={id} href={href(id)} className={tabCls(tab === id)}>{name}</Link>
        ))}
        <Link href={href("general")} className={tabCls(tab === "general")}>Фонд Whiskers Club</Link>
      </nav>

      <div className="rounded-b-[var(--radius-card)] rounded-tr-[var(--radius-card)] bg-paper p-3 ring-1 ring-line">
        <div className="mb-3 flex justify-center gap-3">
          <Link
            href={href(tab, "expenses")}
            aria-current={view === "expenses" ? "page" : undefined}
            className={`rounded-lg px-6 py-2 text-lg font-bold text-white shadow-sm transition ${view === "expenses" ? "bg-red-600 ring-4 ring-red-600/30" : "bg-red-600/45 hover:bg-red-600/80"}`}
          >
            Расходы · {n(spent)}
          </Link>
          <Link
            href={href(tab, "donations")}
            aria-current={view === "donations" ? "page" : undefined}
            className={`rounded-lg px-6 py-2 text-lg font-bold text-white shadow-sm transition ${view === "donations" ? "bg-green-600 ring-4 ring-green-600/30" : "bg-green-600/45 hover:bg-green-600/80"}`}
          >
            Донаты · {n(raisedAll)}
          </Link>
        </div>

        {view === "expenses" ? (
        <section className="min-w-0">
          <ExpenseSheet
            rows={expenses.map((e) => ({
              id: e.id,
              date: toDateInput(e.date),
              amountRsd: e.amountRsd,
              share: e.share,
              description: e.description,
              catIds: e.cats.map((c) => c.cat.id),
              fileIds: e.files.map((f) => f.fileId),
              driveUrl: e.files.length ? null : (e.internalComment?.match(/Чек: (https:\/\/\S+)/)?.[1] ?? null),
              proof: e.proof,
              noReceiptReason: e.noReceiptReason,
              state: e.state,
              addedBy: addedBy(e),
            }))}
            cats={catOptions}
            defaultCatIds={tab !== "all" && tab !== "general" ? [tab] : []}
          />
          <p className="mt-1 text-right text-sm font-semibold">Итого: {n(spent)}</p>
        </section>
        ) : (
        <section className="min-w-0">
          <DonationSheet
            rows={donations.map((d) => ({
              id: d.id,
              date: toDateInput(d.date),
              amountRsd: d.amountRsd,
              donorName: d.donorName ?? d.publicName,
              method: d.method,
              catId: d.catId,
              split: splitOf(d),
              campaign: d.campaign ? t(d.campaign.title, "ru") : null,
              state: d.state,
              addedBy: addedBy(d),
            }))}
            cats={catOptions}
            methods={methods}
            fundRows={withOpening && openingRow ? [openingRow] : []}
            defaultCatId={tab !== "all" && tab !== "general" ? tab : ""}
          />
          <p className="mt-1 text-right text-sm font-semibold">Итого: {n(raisedAll)}</p>
        </section>
        )}
      </div>
    </div>
  );
}
