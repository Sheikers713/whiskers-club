import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { t } from "@/lib/i18n/localized";
import { toDateInput } from "@/lib/admin/form";
import { formatRsd, formatShortDate } from "@/lib/format";
import { campaignRaised } from "@/lib/queries/finance";
import { createTransfer, saveCampaign } from "@/lib/actions/finance";
import { BackLink, Card, Field, Flash, LocalizedField, PageTitle, StateBadge, StateSelect, btnCls, btnSecondaryCls, inputCls } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/ActionForm";
import { AuditTrail } from "@/components/admin/AuditTrail";

export const metadata = { title: "Сбор" };

export default async function CampaignPage({ params, searchParams }: PageProps<"/admin/campaigns/[id]">) {
  await requireUser(["FINANCE"]);
  const { id } = await params;
  const sp = await searchParams;
  const c =
    id === "new"
      ? null
      : await db.campaign.findUnique({
          where: { id },
          include: { cats: true, transfersIn: true, transfersOut: true, donations: { orderBy: { date: "desc" } }, expenses: { orderBy: { date: "desc" } } },
        });
  if (id !== "new" && !c) notFound();
  const [cats, categories] = await Promise.all([
    db.cat.findMany({ select: { id: true, name: true }, orderBy: { createdAt: "desc" } }),
    db.expenseCategory.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  const raised = c ? ((await campaignRaised([c.id])).get(c.id) ?? 0) : 0;
  const spent = c ? c.expenses.filter((e) => e.state === "PUBLISHED").reduce((s, e) => s + e.amountRsd, 0) : 0;
  const linked = new Set(c?.cats.map((x) => x.catId));
  return (
    <div className="max-w-3xl space-y-6">
      <BackLink href="/admin/campaigns">Сборы</BackLink>
      <PageTitle>{c ? t(c.title, "ru") : "Новый сбор"} {c && <StateBadge state={c.state} />}</PageTitle>
      <Flash searchParams={sp} />
      {c && (
        <p>
          Собрано: <b>{formatRsd(raised, "ru")}</b> из {formatRsd(c.targetRsd, "ru")} · потрачено из сбора: <b>{formatRsd(spent, "ru")}</b> · остаток:{" "}
          <b>{formatRsd(raised - spent, "ru")}</b>
        </p>
      )}
      <ActionForm action={saveCampaign} className="space-y-6">
        {c && <input type="hidden" name="id" value={c.id} />}
        <Card>
          <LocalizedField name="title" label="Название" value={c?.title} required />
          <LocalizedField name="description" label="Описание" value={c?.description} multiline rows={3} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Цель, RSD">
              <input name="targetRsd" inputMode="numeric" required defaultValue={c?.targetRsd ?? ""} className={inputCls} />
            </Field>
            <Field label="Категория (например, Лекарства)">
              <select name="categoryId" defaultValue={c?.categoryId ?? ""} className={inputCls}>
                <option value="">—</option>
                {categories.map((x) => (
                  <option key={x.id} value={x.id}>
                    {t(x.label, "ru")}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Начало">
              <input type="date" name="startDate" required defaultValue={toDateInput(c?.startDate ?? new Date())} className={inputCls} />
            </Field>
            <Field label="Срок (необязательно)">
              <input type="date" name="endDate" defaultValue={toDateInput(c?.endDate)} className={inputCls} />
            </Field>
            <Field label="Статус сбора">
              <select name="status" defaultValue={c?.status ?? "ACTIVE"} className={inputCls}>
                <option value="ACTIVE">Идёт</option>
                <option value="COMPLETED">Завершён</option>
                <option value="CANCELLED">Отменён</option>
              </select>
            </Field>
            <Field label="Публикация">
              <StateSelect value={c?.state} />
            </Field>
          </div>
          <fieldset>
            <legend className="text-sm font-medium">Коты</legend>
            <div className="mt-2 flex max-h-56 flex-wrap gap-2 overflow-y-auto">
              {cats.map((x) => (
                <label key={x.id} className="flex items-center gap-2 rounded-md bg-milk px-3 py-1.5">
                  <input type="checkbox" name="cats" value={x.id} defaultChecked={linked.has(x.id)} />
                  {t(x.name, "ru")}
                </label>
              ))}
            </div>
          </fieldset>
        </Card>
        <button className={btnCls}>{c ? "Сохранить" : "Создать"}</button>
      </ActionForm>

      {c && (
        <Card title="Перераспределение">
          <p className="text-sm text-ink-soft">
            Например, остаток завершённого сбора переводится в общий фонд. Это не поступление и не расход: общий итог не меняется.
          </p>
          <ActionForm action={createTransfer} className="grid gap-3 sm:grid-cols-4 sm:items-end">
            <input type="hidden" name="campaignId" value={c.id} />
            <Field label="Направление">
              <select name="direction" className={inputCls}>
                <option value="out">Из сбора в общий фонд</option>
                <option value="in">Из общего фонда в сбор</option>
              </select>
            </Field>
            <Field label="Сумма, RSD">
              <input name="amountRsd" inputMode="numeric" required className={inputCls} />
            </Field>
            <Field label="Дата">
              <input type="date" name="date" defaultValue={toDateInput(new Date())} className={inputCls} />
            </Field>
            <button className={btnSecondaryCls}>Провести</button>
          </ActionForm>
          {[...c.transfersIn, ...c.transfersOut].length > 0 && (
            <ul className="text-sm">
              {[...c.transfersIn.map((x) => ({ ...x, sign: "+" })), ...c.transfersOut.map((x) => ({ ...x, sign: "−" }))].map((x) => (
                <li key={x.id}>
                  {formatShortDate(x.date, "ru")} · {x.sign}
                  {formatRsd(x.amountRsd, "ru")}
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
      {c && <AuditTrail entityType="Campaign" entityId={c.id} />}
    </div>
  );
}
