import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { t } from "@/lib/i18n/localized";
import { toDateInput } from "@/lib/admin/form";
import { saveExpense } from "@/lib/actions/finance";
import { BackLink, Card, Field, Flash, LocalizedField, PageTitle, StateBadge, StateSelect, btnCls, inputCls } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/ActionForm";
import { AuditTrail } from "@/components/admin/AuditTrail";
import { FileInput } from "@/components/admin/FileInput";

export const metadata = { title: "Расход" };

export default async function ExpensePage({ params, searchParams }: PageProps<"/admin/expenses/[id]">) {
  await requireUser(["FINANCE"]);
  const { id } = await params;
  const sp = await searchParams;
  const e =
    id === "new"
      ? null
      : await db.expense.findUnique({ where: { id }, include: { cats: true, files: { include: { file: true } } } });
  if (id !== "new" && !e) notFound();
  const [categories, cats, campaigns] = await Promise.all([
    db.expenseCategory.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    db.cat.findMany({ select: { id: true, name: true, state: true }, orderBy: { createdAt: "desc" } }),
    db.campaign.findMany({ orderBy: { startDate: "desc" } }),
  ]);
  const linked = new Set(e?.cats.map((c) => c.catId));
  return (
    <div className="max-w-3xl space-y-6">
      <BackLink href="/admin/expenses">Расходы</BackLink>
      <PageTitle>{e ? "Расход" : "Новый расход"} {e && <StateBadge state={e.state} />}</PageTitle>
      <Flash searchParams={sp} />
      <ActionForm action={saveExpense} className="space-y-6">
        {e && <input type="hidden" name="id" value={e.id} />}
        <Card>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Дата">
              <input type="date" name="date" required defaultValue={toDateInput(e?.date ?? new Date())} className={inputCls} />
            </Field>
            <Field label="Сумма, RSD">
              <input name="amountRsd" inputMode="numeric" required defaultValue={e?.amountRsd ?? ""} className={inputCls} />
            </Field>
            <Field label="Категория">
              <select name="categoryId" required defaultValue={e?.categoryId ?? ""} className={inputCls}>
                <option value="" disabled>
                  Выберите
                </option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {t(c.label, "ru")}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Продавец / получатель">
              <input name="vendor" defaultValue={e?.vendor ?? ""} className={inputCls} />
            </Field>
          </div>
          <Field label="На что (как в таблице)">
            <input name="description" required defaultValue={e?.description ?? ""} className={inputCls} />
          </Field>
          <LocalizedField name="publicSummary" label="Публичное описание по языкам (необязательно; иначе показывается «На что»)" value={e?.publicSummary} />
        </Card>
        <Card title="Коты и сбор">
          <fieldset>
            <legend className="text-sm font-medium">Коты (если расход на нескольких, он всё равно учитывается один раз)</legend>
            <div className="mt-2 flex max-h-56 flex-wrap gap-2 overflow-y-auto">
              {cats.map((c) => (
                <label key={c.id} className="flex items-center gap-2 rounded-md bg-milk px-3 py-1.5">
                  <input type="checkbox" name="cats" value={c.id} defaultChecked={linked.has(c.id)} />
                  {t(c.name, "ru")}
                </label>
              ))}
            </div>
          </fieldset>
          <Field label="Сбор">
            <select name="campaignId" defaultValue={e?.campaignId ?? ""} className={inputCls}>
              <option value="">Нет (общий фонд)</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {t(c.title, "ru")}
                </option>
              ))}
            </select>
          </Field>
        </Card>
        <Card title="Подтверждение">
          <Field label="Тип подтверждения">
            <select name="proof" defaultValue={e?.proof ?? "DOCUMENT"} className={inputCls}>
              {e?.proof === "FISCAL_VERIFIED" && <option value="FISCAL_VERIFIED">Фискальный чек проверен</option>}
              <option value="DOCUMENT">Приложен документ (фото чека, выписка, перевод)</option>
              <option value="NONE">Без фискального чека</option>
            </select>
          </Field>
          <Field label="Причина отсутствия чека (обязательно для «без чека»)">
            <input name="noReceiptReason" defaultValue={e?.noReceiptReason ?? ""} className={inputCls} />
          </Field>
          <FileInput name="files" label="Фото чека или документ" accept="image/*,application/pdf" multiple />
          <label className="flex items-center gap-2">
            <input type="checkbox" name="newFilesPublic" defaultChecked /> Показывать новые файлы в публичном отчёте
          </label>
          {e && e.files.length > 0 && (
            <ul className="space-y-1 text-sm">
              {e.files.map((f) => (
                <li key={f.fileId} className="flex items-center gap-3">
                  <a href={`/admin/files/${f.fileId}`} target="_blank" className="underline">
                    {f.file.originalName}
                  </a>
                  <label className="flex items-center gap-1">
                    <input type="checkbox" name="publicFiles" value={f.fileId} defaultChecked={f.isPublic} /> публично
                  </label>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-ink-soft">Перед публикацией проверьте, что на фото нет телефонов и личных данных.</p>
        </Card>
        <Card title="Служебное (не публикуется)">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Кто платил">
              <input name="payer" defaultValue={e?.payer ?? ""} className={inputCls} />
            </Field>
            <Field label="Способ оплаты">
              <input name="paymentMethod" defaultValue={e?.paymentMethod ?? ""} className={inputCls} />
            </Field>
            <Field label="Фискальный номер">
              <input name="fiscalId" defaultValue={e?.fiscalId ?? ""} className={inputCls} />
            </Field>
            <Field label="Публикация">
              <StateSelect value={e?.state} />
            </Field>
          </div>
          <Field label="Комментарий">
            <textarea name="internalComment" defaultValue={e?.internalComment ?? ""} rows={2} className={inputCls} />
          </Field>
        </Card>
        <button className={btnCls}>{e ? "Сохранить" : "Внести"}</button>
      </ActionForm>
      {e && <AuditTrail entityType="Expense" entityId={e.id} />}
    </div>
  );
}
