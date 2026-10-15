import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { t } from "@/lib/i18n/localized";
import { savePaymentMethod } from "@/lib/actions/finance";
import { ActionForm } from "@/components/admin/ActionForm";
import { Card, Field, Flash, LocalizedField, PageTitle, btnCls, inputCls } from "@/components/admin/ui";

export const metadata = { title: "Реквизиты" };

type PM = Awaited<ReturnType<typeof db.paymentMethod.findMany>>[number];

function MethodForm({ m }: { m?: PM }) {
  return (
    <ActionForm action={savePaymentMethod} className="space-y-4">
      {m && <input type="hidden" name="id" value={m.id} />}
      <LocalizedField name="title" label="Название (PayPal, перевод в RSD...)" value={m?.title} required />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Что копировать (номер счёта, email, кошелёк)">
          <input name="value" defaultValue={m?.value ?? ""} className={inputCls} />
        </Field>
        <Field label="Ссылка (https://...)">
          <input name="url" type="url" defaultValue={m?.url ?? ""} className={inputCls} />
        </Field>
        <Field label="Валюта (подпись)">
          <input name="currencyNote" defaultValue={m?.currencyNote ?? ""} placeholder="EUR / USD" className={inputCls} />
        </Field>
        <Field label="Порядок">
          <input name="sortOrder" type="number" defaultValue={m?.sortOrder ?? 0} className={inputCls} />
        </Field>
      </div>
      <LocalizedField name="instructions" label="Инструкция" value={m?.instructions} multiline rows={2} />
      <label className="flex items-center gap-2">
        <input type="checkbox" name="isActive" defaultChecked={m?.isActive ?? true} /> Показывать на сайте
      </label>
      <button className={btnCls}>{m ? "Сохранить" : "Добавить"}</button>
    </ActionForm>
  );
}

export default async function PaymentMethods({ searchParams }: PageProps<"/admin/payment-methods">) {
  await requireUser(["FINANCE"]);
  const sp = await searchParams;
  const methods = await db.paymentMethod.findMany({ orderBy: { sortOrder: "asc" } });
  return (
    <div className="max-w-3xl space-y-6">
      <PageTitle>Реквизиты для пожертвований</PageTitle>
      <Flash searchParams={sp} />
      {methods.map((m) => (
        <details key={m.id} className="rounded-[var(--radius-card)] bg-paper p-4 ring-1 ring-line">
          <summary className="cursor-pointer font-semibold">
            {t(m.title, "ru")} {!m.isActive && <span className="text-sm text-ink-soft">(скрыт)</span>}
          </summary>
          <div className="mt-4">
            <MethodForm m={m} />
          </div>
        </details>
      ))}
      <Card title="Новый способ">
        <MethodForm />
      </Card>
    </div>
  );
}
