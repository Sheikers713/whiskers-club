import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { t } from "@/lib/i18n/localized";
import { toDateInput } from "@/lib/admin/form";
import { saveExpense } from "@/lib/actions/finance";
import { BackLink, Card, Field, Flash, PageTitle, StateBadge, StateSelect, btnCls, inputCls } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/ActionForm";
import { AuditTrail } from "@/components/admin/AuditTrail";
import { FileInput } from "@/components/admin/FileInput";
import { CatPicker } from "@/components/admin/CatPicker";
import { loadPickerCats } from "@/lib/queries/picker-cats";
import { DeleteRecord } from "@/components/admin/DeleteRecord";
import { deleteExpenseRow } from "@/lib/actions/sheet";

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
  const [category, pickerCats] = await Promise.all([
    e ? db.expenseCategory.findUnique({ where: { id: e.categoryId } }) : null,
    loadPickerCats(),
  ]);
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
          </div>
          <Field label="На что" hint="Так и будет на сайте. Категория для статистики определяется сама.">
            <input name="description" required defaultValue={e?.description ?? ""} className={inputCls} />
          </Field>
          {category && <p className="text-xs text-ink-soft">Категория: {t(category.label, "ru")}</p>}
          <fieldset>
            <legend className="text-sm font-medium">Для кого</legend>
            <CatPicker cats={pickerCats} name="cats" defaultValue={e?.cats.map((c) => c.catId) ?? []} />
          </fieldset>
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
      {e && <DeleteRecord what={`расход ${e.amountRsd} RSD «${e.description}»`} action={deleteExpenseRow.bind(null, e.id)} back="/admin/expenses" />}
      {e && <AuditTrail entityType="Expense" entityId={e.id} />}
    </div>
  );
}
