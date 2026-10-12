"use server";

import { redirect } from "next/navigation";
import { db } from "../db";
import { audit } from "../audit";
import { hashPassword, MIN_PASSWORD_LENGTH, verifyPassword } from "../auth/password";
import { isLoginBlocked, recordLoginAttempt } from "../auth/rate-limit";
import { clientIp, createSession, destroySession, requireUser } from "../auth/session";
import { hashToken } from "../auth/tokens";
import { createResetLink } from "../auth/reset";
import { sendMail } from "../mailer";
import { str } from "../admin/form";

export type AuthState = { error?: string; ok?: string };

// Used to spend the same time on unknown emails as on wrong passwords.
const DUMMY_HASH = "$argon2id$v=19$m=19456,t=2,p=1$42LAF2npJ0d2htg7q18frA$stuUMlJ1iPq29jihysA6SesSf8cvFGRpiQ+IkmTUlnE";

export async function login(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const email = str(fd, "email", 200).toLowerCase();
  const password = String(fd.get("password") ?? "");
  const ip = await clientIp();
  if (await isLoginBlocked(email, ip)) {
    return { error: "Слишком много неудачных попыток. Попробуйте через 15 минут." };
  }
  const user = await db.user.findUnique({ where: { email } });
  const ok = await verifyPassword(user?.passwordHash ?? DUMMY_HASH, password);
  if (!user || !ok || !user.isActive) {
    await recordLoginAttempt(email, ip, false);
    await audit({ actorId: user?.id ?? null, action: "auth.login_failed", after: { email } });
    return { error: "Неверный email или пароль." };
  }
  await recordLoginAttempt(email, ip, true);
  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await createSession(user.id);
  await audit({ actorId: user.id, action: "auth.login" });
  redirect("/admin");
}

export async function logout() {
  const user = await requireUser();
  await destroySession();
  await audit({ actorId: user.id, action: "auth.logout" });
  redirect("/admin/login");
}

function checkPassword(fd: FormData): string | null {
  const password = String(fd.get("password") ?? "");
  const repeat = String(fd.get("repeat") ?? "");
  if (password.length < MIN_PASSWORD_LENGTH) return `Пароль должен быть не короче ${MIN_PASSWORD_LENGTH} символов.`;
  if (password !== repeat) return "Пароли не совпадают.";
  return null;
}

export async function acceptInvite(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const token = str(fd, "token", 200);
  const invite = await db.invitation.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!invite || invite.acceptedAt || invite.revokedAt || invite.expiresAt < new Date()) {
    return { error: "Приглашение недействительно или истекло. Попросите новое." };
  }
  const bad = checkPassword(fd);
  if (bad) return { error: bad };
  if (await db.user.findUnique({ where: { email: invite.email } })) {
    return { error: "Пользователь с этим email уже есть." };
  }
  const user = await db.$transaction(async (tx) => {
    const u = await tx.user.create({
      data: {
        email: invite.email,
        name: str(fd, "name", 120) || invite.name,
        roles: invite.roles,
        passwordHash: await hashPassword(String(fd.get("password"))),
      },
    });
    await tx.invitation.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } });
    return u;
  });
  await audit({ actorId: user.id, action: "user.invite_accepted", entityType: "User", entityId: user.id, after: { email: user.email, roles: user.roles } });
  await createSession(user.id);
  redirect("/admin/profile");
}

export async function requestReset(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const email = str(fd, "email", 200).toLowerCase();
  const user = await db.user.findUnique({ where: { email } });
  if (user?.isActive) {
    const url = await createResetLink(user.id);
    await sendMail(user.email, "Whiskers Club: восстановление пароля", `Чтобы задать новый пароль, откройте ссылку (действует 2 часа):\n${url}`);
    await audit({ actorId: user.id, action: "auth.reset_requested" });
  }
  // Same answer whether or not the email exists.
  return { ok: "Если такой адрес есть, мы отправили на него ссылку. Если письмо не пришло, попросите суперадмина создать ссылку вручную." };
}

export async function resetPassword(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const token = str(fd, "token", 200);
  const reset = await db.passwordReset.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!reset || reset.usedAt || reset.expiresAt < new Date()) {
    return { error: "Ссылка недействительна или истекла." };
  }
  const bad = checkPassword(fd);
  if (bad) return { error: bad };
  await db.$transaction([
    db.user.update({ where: { id: reset.userId }, data: { passwordHash: await hashPassword(String(fd.get("password"))) } }),
    db.passwordReset.update({ where: { id: reset.id }, data: { usedAt: new Date() } }),
    // A new password signs out every other device.
    db.session.deleteMany({ where: { userId: reset.userId } }),
  ]);
  await audit({ actorId: reset.userId, action: "auth.password_reset", entityType: "User", entityId: reset.userId });
  await createSession(reset.userId);
  redirect("/admin");
}

export async function changePassword(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const me = await requireUser();
  const user = await db.user.findUniqueOrThrow({ where: { id: me.id } });
  if (!(await verifyPassword(user.passwordHash, String(fd.get("current") ?? "")))) {
    return { error: "Текущий пароль неверный." };
  }
  const bad = checkPassword(fd);
  if (bad) return { error: bad };
  await db.user.update({ where: { id: me.id }, data: { passwordHash: await hashPassword(String(fd.get("password"))) } });
  await audit({ actorId: me.id, action: "auth.password_changed", entityType: "User", entityId: me.id });
  return { ok: "Пароль изменён." };
}

export async function logoutEverywhere() {
  const me = await requireUser();
  await db.session.deleteMany({ where: { userId: me.id } });
  await audit({ actorId: me.id, action: "auth.logout_all" });
  redirect("/admin/login");
}
