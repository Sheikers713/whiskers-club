import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { t } from "@/lib/i18n/localized";
import { savePartner, saveSettings } from "@/lib/actions/admin";
import { Card, Field, Flash, LocalizedField, PageTitle, btnCls, btnSecondaryCls, inputCls } from "@/components/admin/ui";

export const metadata = { title: "Настройки сайта" };

export default async function Settings({ searchParams }: PageProps<"/admin/settings">) {
  await requireUser(["SUPERADMIN"]);
  const sp = await searchParams;
  const [s, partners] = await Promise.all([getSettings(), db.partner.findMany({ orderBy: { sortOrder: "asc" } })]);
  const partnerForm = (p?: (typeof partners)[number]) => (
    <form action={savePartner} className="space-y-3">
      {p && <input type="hidden" name="id" value={p.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Название"><input name="name" defaultValue={p?.name} required className={inputCls} /></Field>
        <Field label="Сайт"><input name="url" type="url" defaultValue={p?.url ?? ""} className={inputCls} /></Field>
      </div>
      <LocalizedField name="description" label="Описание" value={p?.description} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Порядок"><input name="sortOrder" type="number" defaultValue={p?.sortOrder ?? 0} className={inputCls} /></Field>
        <label className="flex items-center gap-2 self-end"><input type="checkbox" name="isActive" defaultChecked={p?.isActive ?? true} /> Показывать</label>
      </div>
      <button className={btnSecondaryCls}>Сохранить</button>
    </form>
  );
  return (
    <div className="max-w-4xl space-y-6">
      <PageTitle>Настройки сайта</PageTitle>
      <Flash searchParams={sp} />
      <form action={saveSettings} className="space-y-6">
        <Card title="Деньги и счётчики">
          <div className="grid gap-4 sm:grid-cols-4">
            <Field label="Курс: динаров за 1 €" hint="Только для подсказки «≈ €»">
              <input name="eurRate" inputMode="decimal" defaultValue={s.eurRate} className={inputCls} />
            </Field>
            <Field label="Спасено до сайта"><input name="offsetRescued" type="number" defaultValue={s.counterOffsets.rescued} className={inputCls} /></Field>
            <Field label="Пристроено до сайта"><input name="offsetAdopted" type="number" defaultValue={s.counterOffsets.adopted} className={inputCls} /></Field>
            <Field label="Стерилизовано до сайта"><input name="offsetSterilized" type="number" defaultValue={s.counterOffsets.sterilized} className={inputCls} /></Field>
          </div>
        </Card>
        <Card title="Тексты главной">
          <LocalizedField name="heroText" label="Текст под заголовком (пусто = стандартный)" value={s.heroText} multiline rows={2} />
          <LocalizedField name="aboutText" label="Кто мы и как работаем (главная и страница «О нас»)" value={s.aboutText} multiline rows={6} />
          <LocalizedField name="malaStory" label="История Малы" value={s.malaStory} multiline rows={6} />
        </Card>
        <Card title="Контакты">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Instagram"><input name="instagramUrl" type="url" defaultValue={s.instagramUrl} className={inputCls} /></Field>
            <Field label="Facebook"><input name="facebookUrl" type="url" defaultValue={s.facebookUrl} className={inputCls} /></Field>
            <Field label="YouTube"><input name="youtubeUrl" type="url" defaultValue={s.youtubeUrl} className={inputCls} /></Field>
            <Field label="TikTok"><input name="tiktokUrl" type="url" defaultValue={s.tiktokUrl} className={inputCls} /></Field>
            <Field label="Telegram"><input name="telegramUrl" type="url" defaultValue={s.telegramUrl} className={inputCls} /></Field>
            <Field label="PayPal"><input name="paypalUrl" type="url" defaultValue={s.paypalUrl} className={inputCls} /></Field>
            <Field label="Отчёты о пожертвованиях"><input name="reportsUrl" type="url" defaultValue={s.reportsUrl} className={inputCls} /></Field>
            <Field label="Email"><input name="contactEmail" type="email" defaultValue={s.contactEmail} className={inputCls} /></Field>
          </div>
          <LocalizedField name="contactText" label="Дополнительно в подвале" value={s.contactText} multiline rows={2} />
        </Card>
        <Card title="Политика конфиденциальности">
          <LocalizedField name="privacyText" label="Текст" value={s.privacyText} multiline rows={10} />
        </Card>
        <button className={btnCls}>Сохранить настройки</button>
      </form>
      <section id="partners" className="scroll-mt-20">
        <Card title="Партнёры">
          {partners.map((p) => (
            <details key={p.id} className="rounded-[var(--radius-card)] bg-milk p-3">
              <summary className="cursor-pointer font-medium">{p.name} {!p.isActive && "(скрыт)"} {t(p.description, "ru") && <span className="text-sm text-ink-soft">· {t(p.description, "ru").slice(0, 60)}</span>}</summary>
              <div className="mt-3">{partnerForm(p)}</div>
            </details>
          ))}
          <details className="rounded-[var(--radius-card)] bg-milk p-3">
            <summary className="cursor-pointer font-medium">+ Новый партнёр</summary>
            <div className="mt-3">{partnerForm()}</div>
          </details>
        </Card>
      </section>
    </div>
  );
}
