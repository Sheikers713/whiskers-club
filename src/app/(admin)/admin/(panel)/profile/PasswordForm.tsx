"use client";

import { useActionState } from "react";
import { changePassword } from "@/lib/actions/auth";
import { btnCls, inputCls } from "@/components/admin/ui";

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePassword, {});
  return (
    <form action={action} className="space-y-3">
      {state.error && <p role="alert" className="rounded-lg bg-brick-soft px-3 py-2 text-sm text-brick-dark">{state.error}</p>}
      {state.ok && <p role="status" className="rounded-lg bg-sage-soft px-3 py-2 text-sm">{state.ok}</p>}
      <label className="block text-sm font-medium">
        Текущий пароль
        <input name="current" type="password" required autoComplete="current-password" className={inputCls} />
      </label>
      <label className="block text-sm font-medium">
        Новый пароль
        <input name="password" type="password" required minLength={10} autoComplete="new-password" className={inputCls} />
      </label>
      <label className="block text-sm font-medium">
        Повторите
        <input name="repeat" type="password" required minLength={10} autoComplete="new-password" className={inputCls} />
      </label>
      <button disabled={pending} className={btnCls}>
        Сменить пароль
      </button>
    </form>
  );
}
