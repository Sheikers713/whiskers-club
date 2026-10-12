import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { roleLabels } from "@/lib/auth/roles";
import { createInvitation, makeResetLink, revokeInvitation, updateUser } from "@/lib/actions/admin";
import { Card, Field, Flash, PageTitle, btnCls, btnSecondaryCls, inputCls } from "@/components/admin/ui";

export const metadata = { title: "Пользователи" };

const allRoles = ["SUPERADMIN", "EDITOR", "FINANCE"] as const;

export default async function Users({ searchParams }: PageProps<"/admin/users">) {
  const me = await requireUser(["SUPERADMIN"]);
  const sp = await searchParams;
  const [users, invites] = await Promise.all([
    db.user.findMany({ orderBy: { createdAt: "asc" } }),
    db.invitation.findMany({ where: { acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } }, orderBy: { createdAt: "desc" } }),
  ]);
  return (
    <div className="max-w-4xl space-y-6">
      <PageTitle>Пользователи</PageTitle>
      <Flash searchParams={sp} />
      {typeof sp.link === "string" && (
        <div role="status" className="rounded-lg bg-sage-soft px-4 py-3">
          <p className="font-medium">{sp.sent === "1" ? "Письмо отправлено. Ссылка на всякий случай:" : "Отправьте эту ссылку человеку (Telegram или любым способом):"}</p>
          <code className="mt-2 block select-all break-all rounded bg-paper px-3 py-2 text-sm">{sp.link}</code>
          <p className="mt-1 text-xs text-ink-soft">Ссылка одноразовая. Больше она нигде не показывается.</p>
        </div>
      )}
      <Card title="Пригласить">
        <form action={createInvitation} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email">
              <input name="email" type="email" required className={inputCls} />
            </Field>
            <Field label="Имя">
              <input name="name" required className={inputCls} />
            </Field>
          </div>
          <fieldset className="flex flex-wrap gap-3">
            <legend className="text-sm font-medium">Роли</legend>
            {allRoles.map((r) => (
              <label key={r} className="flex items-center gap-2 rounded-full bg-milk px-3 py-1.5">
                <input type="checkbox" name="roles" value={r} defaultChecked={r === "EDITOR"} /> {roleLabels[r]}
              </label>
            ))}
          </fieldset>
          <button className={btnCls}>Создать приглашение</button>
        </form>
        {invites.length > 0 && (
          <ul className="divide-y divide-line text-sm">
            {invites.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-3 py-2">
                <span>
                  {i.name} · {i.email} · до {i.expiresAt.toLocaleDateString("ru-RU")}
                </span>
                <form action={revokeInvitation}>
                  <input type="hidden" name="id" value={i.id} />
                  <button className="text-brick underline">Отозвать</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card title="Команда">
        <ul className="divide-y divide-line">
          {users.map((u) => (
            <li key={u.id} className="py-3">
              <form action={updateUser} className="flex flex-wrap items-center gap-3">
                <input type="hidden" name="id" value={u.id} />
                <span className="min-w-48 flex-1">
                  <b>{u.name}</b> {u.id === me.id && "(вы)"}
                  <span className="block text-sm text-ink-soft">
                    {u.email}
                    {u.lastLoginAt && ` · вход ${u.lastLoginAt.toLocaleDateString("ru-RU")}`}
                  </span>
                </span>
                {allRoles.map((r) => (
                  <label key={r} className="flex items-center gap-1 text-sm">
                    <input type="checkbox" name="roles" value={r} defaultChecked={u.roles.includes(r)} /> {roleLabels[r]}
                  </label>
                ))}
                <label className="flex items-center gap-1 text-sm">
                  <input type="checkbox" name="isActive" defaultChecked={u.isActive} /> активен
                </label>
                <button className={btnSecondaryCls + " px-3 py-1.5 text-sm"}>Сохранить</button>
              </form>
              <form action={makeResetLink} className="mt-1">
                <input type="hidden" name="id" value={u.id} />
                <button className="text-sm underline">Создать ссылку для сброса пароля</button>
              </form>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
