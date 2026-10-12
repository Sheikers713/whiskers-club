import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { t } from "@/lib/i18n/localized";
import { anonymizeApplication, updateApplication } from "@/lib/actions/admin";
import { BackLink, Card, Field, Flash, PageTitle, btnCls, btnSecondaryCls, inputCls } from "@/components/admin/ui";
import { answerLabels, statusLabels, typeLabels } from "../labels";

export const metadata = { title: "Заявка" };

export default async function ApplicationPage({ params, searchParams }: PageProps<"/admin/applications/[id]">) {
  await requireUser(["EDITOR"]);
  const { id } = await params;
  const sp = await searchParams;
  const a = await db.application.findUnique({ where: { id }, include: { cat: { select: { id: true, name: true } } } });
  if (!a) notFound();
  const users = await db.user.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } });
  const answers = (a.answers ?? {}) as Record<string, string>;
  const closed = ["REJECTED", "COMPLETED", "WITHDRAWN"].includes(a.status);
  return (
    <div className="max-w-3xl space-y-6">
      <BackLink href="/admin/applications">Заявки</BackLink>
      <PageTitle>
        {typeLabels[a.type]}: {a.name}
      </PageTitle>
      <Flash searchParams={sp} />
      <Card>
        <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-[12rem_1fr]">
          {a.cat && (
            <>
              <dt className="text-ink-soft">Кот</dt>
              <dd>
                <Link href={`/admin/cats/${a.cat.id}`} className="underline">
                  {t(a.cat.name, "ru")}
                </Link>
              </dd>
            </>
          )}
          <dt className="text-ink-soft">Связь</dt>
          <dd>
            {a.contactMethod}: <b className="select-all">{a.contact}</b>
          </dd>
          {a.city && (
            <>
              <dt className="text-ink-soft">Город</dt>
              <dd>{a.city}</dd>
            </>
          )}
          {Object.entries(answers).map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-ink-soft">{answerLabels[k] ?? k}</dt>
              <dd className="whitespace-pre-line">{v}</dd>
            </div>
          ))}
          <dt className="text-ink-soft">Язык формы</dt>
          <dd>{a.locale.toUpperCase()}</dd>
          <dt className="text-ink-soft">Получена</dt>
          <dd>{a.createdAt.toLocaleString("ru-RU", { timeZone: "Europe/Belgrade" })}</dd>
          {a.anonymizedAt && (
            <>
              <dt className="text-ink-soft">Обезличена</dt>
              <dd>{a.anonymizedAt.toLocaleDateString("ru-RU")}</dd>
            </>
          )}
        </dl>
      </Card>
      <form action={updateApplication}>
        <input type="hidden" name="id" value={a.id} />
        <Card title="Работа с заявкой (видно только админам)">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Статус">
              <select name="status" defaultValue={a.status} className={inputCls}>
                {Object.entries(statusLabels).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Ответственный">
              <select name="assignedToId" defaultValue={a.assignedToId ?? ""} className={inputCls}>
                <option value="">—</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Внутренние заметки">
            <textarea name="internalNotes" defaultValue={a.internalNotes ?? ""} rows={4} className={inputCls} />
          </Field>
          <Field label="Причина отказа (никогда не публикуется)">
            <input name="rejectReason" defaultValue={a.rejectReason ?? ""} className={inputCls} />
          </Field>
          <button className={btnCls}>Сохранить</button>
        </Card>
      </form>
      {closed && !a.anonymizedAt && (
        <form action={anonymizeApplication}>
          <input type="hidden" name="id" value={a.id} />
          <button className={btnSecondaryCls}>Удалить личные данные из заявки</button>
        </form>
      )}
    </div>
  );
}
