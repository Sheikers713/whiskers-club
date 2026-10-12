import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { t } from "@/lib/i18n/localized";
import { saveCategory, saveFilter, saveFlag, saveStatus } from "@/lib/actions/admin";
import { Card, Field, Flash, LocalizedField, PageTitle, btnSecondaryCls, inputCls } from "@/components/admin/ui";

export const metadata = { title: "Справочники" };

const groupLabels = { ACTIVE: "Активные (в «Все»)", ADOPTED: "Нашли дом", ARCHIVE: "Архив" } as const;

function Item({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
  return (
    <details className="rounded-xl bg-milk p-3">
      <summary className="cursor-pointer font-medium">{title}</summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}

export default async function Taxonomies({ searchParams }: PageProps<"/admin/taxonomies">) {
  await requireUser(["SUPERADMIN"]);
  const sp = await searchParams;
  const [statuses, flags, filters, categories] = await Promise.all([
    db.catStatus.findMany({ orderBy: { sortOrder: "asc" } }),
    db.catFlag.findMany({ orderBy: { sortOrder: "asc" } }),
    db.catalogFilter.findMany({ orderBy: { sortOrder: "asc" } }),
    db.expenseCategory.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  const statusForm = (s?: (typeof statuses)[number]) => (
    <form action={saveStatus} className="space-y-3">
      {s ? <input type="hidden" name="id" value={s.id} /> : (
        <Field label="Ключ (латиницей, не меняется)">
          <input name="key" required pattern="[a-z0-9_]+" className={inputCls} />
        </Field>
      )}
      <LocalizedField name="label" label="Название" value={s?.label} required />
      <div className="grid gap-3 sm:grid-cols-4">
        <Field label="Группа">
          <select name="group" defaultValue={s?.group ?? "ACTIVE"} className={inputCls}>
            {Object.entries(groupLabels).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </Field>
        <Field label="Цвет">
          <input name="color" type="color" defaultValue={s?.color ?? "#888888"} className={inputCls + " h-11"} />
        </Field>
        <Field label="Приоритет в каталоге" hint="Меньше = выше">
          <input name="priority" type="number" defaultValue={s?.priority ?? 50} className={inputCls} />
        </Field>
        <Field label="Порядок в списке">
          <input name="sortOrder" type="number" defaultValue={s?.sortOrder ?? 0} className={inputCls} />
        </Field>
      </div>
      <label className="flex items-center gap-2"><input type="checkbox" name="isPublic" defaultChecked={s?.isPublic ?? true} /> Коты с этим статусом видны на сайте</label>
      <button className={btnSecondaryCls}>Сохранить</button>
    </form>
  );

  const flagForm = (f?: (typeof flags)[number]) => (
    <form action={saveFlag} className="space-y-3">
      {f ? <input type="hidden" name="id" value={f.id} /> : (
        <Field label="Ключ (латиницей)"><input name="key" required pattern="[a-z0-9_]+" className={inputCls} /></Field>
      )}
      <LocalizedField name="label" label="Название" value={f?.label} required />
      <Field label="Порядок"><input name="sortOrder" type="number" defaultValue={f?.sortOrder ?? 0} className={inputCls} /></Field>
      <label className="flex items-center gap-2"><input type="checkbox" name="isPublic" defaultChecked={f?.isPublic ?? true} /> Показывать как метку на странице кота</label>
      <button className={btnSecondaryCls}>Сохранить</button>
    </form>
  );

  const filterForm = (f?: (typeof filters)[number]) => (
    <form action={saveFilter} className="space-y-3">
      {f ? <input type="hidden" name="id" value={f.id} /> : (
        <Field label="Ключ (латиницей, попадает в адрес)"><input name="key" required pattern="[a-z0-9_]+" className={inputCls} /></Field>
      )}
      <LocalizedField name="label" label="Название" value={f?.label} required />
      <p className="text-sm text-ink-soft">Кот попадает в фильтр, если подходят все заданные условия. Пустое условие не ограничивает.</p>
      <fieldset className="flex flex-wrap gap-3">
        <legend className="text-sm font-medium">Группы статусов</legend>
        {Object.entries(groupLabels).map(([k, l]) => (
          <label key={k} className="flex items-center gap-2 text-sm"><input type="checkbox" name="statusGroups" value={k} defaultChecked={(f?.statusGroups ?? ["ACTIVE"]).includes(k as never)} /> {l}</label>
        ))}
      </fieldset>
      <fieldset className="flex flex-wrap gap-3">
        <legend className="text-sm font-medium">Только эти статусы</legend>
        {statuses.map((s) => (
          <label key={s.id} className="flex items-center gap-2 text-sm"><input type="checkbox" name="statusKeys" value={s.key} defaultChecked={f?.statusKeys.includes(s.key)} /> {t(s.label, "ru")}</label>
        ))}
      </fieldset>
      <fieldset className="flex flex-wrap gap-3">
        <legend className="text-sm font-medium">Есть хотя бы один признак</legend>
        {flags.map((x) => (
          <label key={x.id} className="flex items-center gap-2 text-sm"><input type="checkbox" name="flagKeys" value={x.key} defaultChecked={f?.flagKeys.includes(x.key)} /> {t(x.label, "ru")}</label>
        ))}
      </fieldset>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="requireActiveCampaign" defaultChecked={f?.requireActiveCampaign} /> Идёт сбор</label>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Порядок"><input name="sortOrder" type="number" defaultValue={f?.sortOrder ?? 0} className={inputCls} /></Field>
        <label className="flex items-center gap-2 self-end"><input type="checkbox" name="isEnabled" defaultChecked={f?.isEnabled ?? true} /> Включён</label>
      </div>
      <button className={btnSecondaryCls}>Сохранить</button>
    </form>
  );

  const categoryForm = (c?: (typeof categories)[number]) => (
    <form action={saveCategory} className="space-y-3">
      {c ? <input type="hidden" name="id" value={c.id} /> : (
        <Field label="Ключ (латиницей)"><input name="key" required pattern="[a-z0-9_]+" className={inputCls} /></Field>
      )}
      <LocalizedField name="label" label="Название" value={c?.label} required />
      <Field label="Порядок"><input name="sortOrder" type="number" defaultValue={c?.sortOrder ?? 0} className={inputCls} /></Field>
      <label className="flex items-center gap-2"><input type="checkbox" name="isActive" defaultChecked={c?.isActive ?? true} /> Используется</label>
      <button className={btnSecondaryCls}>Сохранить</button>
    </form>
  );

  return (
    <div className="max-w-4xl space-y-6">
      <PageTitle>Справочники</PageTitle>
      <Flash searchParams={sp} />
      <Card title="Фильтры каталога">
        {filters.map((f) => <Item key={f.id} title={<>{t(f.label, "ru")} {!f.isEnabled && <span className="text-sm text-ink-soft">(выключен)</span>}</>}>{filterForm(f)}</Item>)}
        <Item title="+ Новый фильтр">{filterForm()}</Item>
      </Card>
      <Card title="Статусы котов">
        {statuses.map((s) => (
          <Item key={s.id} title={<><span className="mr-2 inline-block h-3 w-3 rounded-full" style={{ background: s.color }} />{t(s.label, "ru")} <span className="text-sm text-ink-soft">· {groupLabels[s.group]}{s.isPublic ? "" : " · скрыт"}</span></>}>{statusForm(s)}</Item>
        ))}
        <Item title="+ Новый статус">{statusForm()}</Item>
      </Card>
      <Card title="Признаки котов">
        {flags.map((f) => <Item key={f.id} title={t(f.label, "ru")}>{flagForm(f)}</Item>)}
        <Item title="+ Новый признак">{flagForm()}</Item>
      </Card>
      <Card title="Категории расходов">
        {categories.map((c) => <Item key={c.id} title={t(c.label, "ru")}>{categoryForm(c)}</Item>)}
        <Item title="+ Новая категория">{categoryForm()}</Item>
      </Card>
    </div>
  );
}
