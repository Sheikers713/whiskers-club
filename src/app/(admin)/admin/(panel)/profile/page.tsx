import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { roleLabels } from "@/lib/auth/roles";
import { logoutEverywhere } from "@/lib/actions/auth";
import { updateProfile } from "@/lib/actions/admin";
import { Card, Field, Flash, PageTitle, btnCls, btnSecondaryCls, inputCls } from "@/components/admin/ui";
import { PasswordForm } from "./PasswordForm";

export const metadata = { title: "Профиль" };

export default async function Profile({ searchParams }: PageProps<"/admin/profile">) {
  const me = await requireUser();
  const sp = await searchParams;
  const u = await db.user.findUniqueOrThrow({ where: { id: me.id } });
  return (
    <div className="max-w-3xl space-y-6">
      <PageTitle>Профиль</PageTitle>
      <Flash searchParams={sp} />
      <p className="text-ink-soft">
        {u.email} · {u.roles.map((r) => roleLabels[r]).join(", ")}
      </p>
      <form action={updateProfile}>
        <Card title="Имя и публичные контакты">
          <p className="text-sm text-ink-soft">Если вы куратор кота, эти кнопки появятся на его странице. Заполняйте только то, что готовы показать всем.</p>
          <Field label="Имя">
            <input name="name" defaultValue={u.name} required className={inputCls} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Telegram (@username)">
              <input name="contactTelegram" defaultValue={u.contactTelegram ?? ""} className={inputCls} />
            </Field>
            <Field label="Телефон">
              <input name="contactPhone" type="tel" defaultValue={u.contactPhone ?? ""} className={inputCls} />
            </Field>
            <Field label="WhatsApp (номер)">
              <input name="contactWhatsapp" type="tel" defaultValue={u.contactWhatsapp ?? ""} className={inputCls} />
            </Field>
            <Field label="Viber (номер)">
              <input name="contactViber" type="tel" defaultValue={u.contactViber ?? ""} className={inputCls} />
            </Field>
            <Field label="Instagram (@username)">
              <input name="contactInstagram" defaultValue={u.contactInstagram ?? ""} className={inputCls} />
            </Field>
            <Field label="Telegram chat id для уведомлений" hint="Не публикуется. Как получить id, описано в README.">
              <input name="telegramChatId" defaultValue={u.telegramChatId ?? ""} className={inputCls} />
            </Field>
          </div>
          <button className={btnCls}>Сохранить</button>
        </Card>
      </form>
      <Card title="Пароль">
        <PasswordForm />
      </Card>
      <form action={logoutEverywhere}>
        <button className={btnSecondaryCls}>Выйти на всех устройствах</button>
      </form>
    </div>
  );
}
