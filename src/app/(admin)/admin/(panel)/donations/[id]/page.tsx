import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { t } from "@/lib/i18n/localized";
import { toDateInput } from "@/lib/admin/form";
import { saveDonation } from "@/lib/actions/finance";
import { BackLink, Card, Field, Flash, PageTitle, StateBadge, StateSelect, btnCls, inputCls } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/ActionForm";
import { AuditTrail } from "@/components/admin/AuditTrail";
import { FileInput } from "@/components/admin/FileInput";
import { CatPicker } from "@/components/admin/CatPicker";
import { loadPickerCats } from "@/lib/queries/picker-cats";

export const metadata = { title: "Поступление" };

export default async function DonationPage({ params, searchParams }: PageProps<"/admin/donations/[id]">) {
  await requireUser(["FINANCE"]);
  const { id } = await params;
  const sp = await searchParams;
  const d = id === "new" ? null : await db.donation.findUnique({ where: { id }, include: { files: { include: { file: true } } } });
  if (id !== "new" && !d) notFound();
  const pickerCats = await loadPickerCats();
  // Donation channels come from the payment methods shown on the site, plus cash.
  const methods = await db.paymentMethod.findMany({ orderBy: { sortOrder: "asc" } });
  const methodOptions = [
    ...new Set([
      ...methods.map((m) => [t(m.title, "ru"), m.currencyNote].filter(Boolean).join(", ")),
      "Наличные",
      "Другое",
      ...(d?.method ? [d.method] : []),
    ]),
  ];
  return (
    <div className="max-w-3xl space-y-6">
      <BackLink href="/admin/donations">Поступления</BackLink>
      <PageTitle>{d ? "Поступление" : "Новое поступление"} {d && <StateBadge state={d.state} />}</PageTitle>
      <Flash searchParams={sp} />
      <ActionForm action={saveDonation} className="space-y-6">
        {d && <input type="hidden" name="id" value={d.id} />}
        <Card>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Дата">
              <input type="date" name="date" required defaultValue={toDateInput(d?.date ?? new Date())} className={inputCls} />
            </Field>
            <Field label="Сумма, RSD" hint="Если пришло в другой валюте, пересчитайте и округлите">
              <input name="amountRsd" inputMode="numeric" required defaultValue={d?.amountRsd ?? ""} className={inputCls} />
            </Field>
            <Field label="Способ">
              <select name="method" defaultValue={d?.method ?? ""} className={inputCls}>
                <option value="">Не указан</option>
                {methodOptions.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Публикация">
              <StateSelect value={d?.state} />
            </Field>
          </div>
        </Card>
        <Card title="Донор">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Имя донора (видят только админы)">
              <input name="donorName" defaultValue={d?.donorName ?? ""} className={inputCls} />
            </Field>
            <Field label="Публичное имя">
              <input name="publicName" defaultValue={d?.publicName ?? ""} className={inputCls} />
            </Field>
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="showName" defaultChecked={d?.showName} /> Донор согласен показать имя. Без галочки на сайте будет «Аноним».
          </label>
          <Field label="Публичный комментарий">
            <input name="comment" defaultValue={d?.comment ?? ""} className={inputCls} />
          </Field>
        </Card>
        <Card title="Для кого">
          <fieldset>
            <legend className="text-sm font-medium">Для кого</legend>
            {d?.campaignId && !d.catId && (
              <p className="mt-1 text-xs text-ink-soft">Сейчас привязано к сбору. Выберите кота, чтобы перепривязать.</p>
            )}
            <CatPicker cats={pickerCats} name="catId" multiple={false} defaultValue={d?.catId ? [d.catId] : []} />
          </fieldset>
          <Field label="Внутренний комментарий">
            <textarea name="internalComment" defaultValue={d?.internalComment ?? ""} rows={2} className={inputCls} />
          </Field>
          <FileInput name="files" label="Подтверждение (скриншот перевода и т.п., не публикуется)" accept="image/*,application/pdf" multiple />
          {d && d.files.length > 0 && (
            <ul className="text-sm">
              {d.files.map((f) => (
                <li key={f.fileId}>
                  <a href={`/admin/files/${f.fileId}`} target="_blank" className="underline">
                    {f.file.originalName}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <button className={btnCls}>{d ? "Сохранить" : "Внести"}</button>
      </ActionForm>
      {d && <AuditTrail entityType="Donation" entityId={d.id} />}
    </div>
  );
}
