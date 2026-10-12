import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { t } from "@/lib/i18n/localized";
import { toDateInput } from "@/lib/admin/form";
import { saveDonation } from "@/lib/actions/finance";
import { BackLink, Card, Field, Flash, PageTitle, StateBadge, StateSelect, btnCls, inputCls } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/ActionForm";
import { AuditTrail } from "@/components/admin/AuditTrail";

export const metadata = { title: "Поступление" };

export default async function DonationPage({ params, searchParams }: PageProps<"/admin/donations/[id]">) {
  await requireUser(["FINANCE"]);
  const { id } = await params;
  const sp = await searchParams;
  const d = id === "new" ? null : await db.donation.findUnique({ where: { id }, include: { files: { include: { file: true } } } });
  if (id !== "new" && !d) notFound();
  const [campaigns, cats] = await Promise.all([
    db.campaign.findMany({ where: { status: "ACTIVE" }, orderBy: { startDate: "desc" } }),
    db.cat.findMany({ select: { id: true, name: true }, orderBy: { createdAt: "desc" } }),
  ]);
  const campaignOptions = d?.campaignId && !campaigns.some((c) => c.id === d.campaignId)
    ? [...campaigns, await db.campaign.findUniqueOrThrow({ where: { id: d.campaignId } })]
    : campaigns;
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
            <Field label="Способ (PayPal, карта RSD, RUB...)">
              <input name="method" defaultValue={d?.method ?? ""} className={inputCls} />
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
        <Card title="Назначение">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Сбор">
              <select name="campaignId" defaultValue={d?.campaignId ?? ""} className={inputCls}>
                <option value="">Нет</option>
                {campaignOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {t(c.title, "ru")}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Или конкретный кот (если без сбора)" hint="Пусто = общий фонд">
              <select name="catId" defaultValue={d?.catId ?? ""} className={inputCls}>
                <option value="">Общий фонд</option>
                {cats.map((c) => (
                  <option key={c.id} value={c.id}>
                    {t(c.name, "ru")}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Внутренний комментарий">
            <textarea name="internalComment" defaultValue={d?.internalComment ?? ""} rows={2} className={inputCls} />
          </Field>
          <Field label="Подтверждение (скриншот перевода и т.п., не публикуется)">
            <input type="file" name="files" multiple accept="image/*,application/pdf" className="mt-1 block" />
          </Field>
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
