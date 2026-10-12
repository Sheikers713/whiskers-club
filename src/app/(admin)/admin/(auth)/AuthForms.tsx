"use client";

import Link from "next/link";
import { useActionState } from "react";
import { acceptInvite, login, requestReset, resetPassword, type AuthState } from "@/lib/actions/auth";
import { btnCls, inputCls } from "@/components/admin/ui";

function Message({ state }: { state: AuthState }) {
  if (state.error) return <p role="alert" className="rounded-lg bg-brick-soft px-3 py-2 text-sm text-brick-dark">{state.error}</p>;
  if (state.ok) return <p role="status" className="rounded-lg bg-sage-soft px-3 py-2 text-sm">{state.ok}</p>;
  return null;
}

export function LoginForm() {
  const [state, action, pending] = useActionState(login, {});
  return (
    <form action={action} className="space-y-4">
      <h1 className="text-xl font-bold">Вход</h1>
      <Message state={state} />
      <label className="block text-sm font-medium">
        Email
        <input name="email" type="email" required autoComplete="username" className={inputCls} />
      </label>
      <label className="block text-sm font-medium">
        Пароль
        <input name="password" type="password" required autoComplete="current-password" className={inputCls} />
      </label>
      <button disabled={pending} className={btnCls + " w-full"}>
        Войти
      </button>
      <Link href="/admin/forgot" className="block text-center text-sm underline">
        Забыли пароль?
      </Link>
    </form>
  );
}

export function ForgotForm() {
  const [state, action, pending] = useActionState(requestReset, {});
  return (
    <form action={action} className="space-y-4">
      <h1 className="text-xl font-bold">Восстановление пароля</h1>
      <Message state={state} />
      <label className="block text-sm font-medium">
        Email
        <input name="email" type="email" required className={inputCls} />
      </label>
      <button disabled={pending} className={btnCls + " w-full"}>
        Отправить ссылку
      </button>
      <Link href="/admin/login" className="block text-center text-sm underline">
        Ко входу
      </Link>
    </form>
  );
}

function PasswordFields() {
  return (
    <>
      <label className="block text-sm font-medium">
        Новый пароль (не короче 10 символов)
        <input name="password" type="password" required minLength={10} autoComplete="new-password" className={inputCls} />
      </label>
      <label className="block text-sm font-medium">
        Повторите пароль
        <input name="repeat" type="password" required minLength={10} autoComplete="new-password" className={inputCls} />
      </label>
    </>
  );
}

export function InviteForm({ token, email, name }: { token: string; email: string; name: string }) {
  const [state, action, pending] = useActionState(acceptInvite, {});
  return (
    <form action={action} className="space-y-4">
      <h1 className="text-xl font-bold">Приглашение в админку</h1>
      <p className="text-sm text-ink-soft">{email}</p>
      <Message state={state} />
      <input type="hidden" name="token" value={token} />
      <label className="block text-sm font-medium">
        Имя (видно на сайте как куратор)
        <input name="name" defaultValue={name} required className={inputCls} />
      </label>
      <PasswordFields />
      <button disabled={pending} className={btnCls + " w-full"}>
        Создать аккаунт
      </button>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPassword, {});
  return (
    <form action={action} className="space-y-4">
      <h1 className="text-xl font-bold">Новый пароль</h1>
      <Message state={state} />
      <input type="hidden" name="token" value={token} />
      <PasswordFields />
      <button disabled={pending} className={btnCls + " w-full"}>
        Сохранить
      </button>
    </form>
  );
}
