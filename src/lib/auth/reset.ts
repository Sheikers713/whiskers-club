import "server-only";
import { db } from "../db";
import { appUrl } from "../mailer";
import { hashToken, newToken } from "./tokens";

/** Creates a one-time password reset link valid for 2 hours. */
export async function createResetLink(userId: string): Promise<string> {
  const token = newToken();
  await db.passwordReset.create({
    data: { userId, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 2 * 3600 * 1000) },
  });
  return appUrl(`/admin/reset/${token}`);
}
