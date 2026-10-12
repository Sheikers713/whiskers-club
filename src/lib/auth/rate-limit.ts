import "server-only";
import { db } from "../db";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_EMAIL = 5;
const MAX_PER_IP = 20;

/** True when there were too many failed logins recently. */
export async function isLoginBlocked(email: string, ip: string | null): Promise<boolean> {
  const since = new Date(Date.now() - WINDOW_MS);
  const [byEmail, byIp] = await Promise.all([
    db.loginAttempt.count({ where: { email, success: false, createdAt: { gte: since } } }),
    ip
      ? db.loginAttempt.count({ where: { ip, success: false, createdAt: { gte: since } } })
      : Promise.resolve(0),
  ]);
  return byEmail >= MAX_PER_EMAIL || byIp >= MAX_PER_IP;
}

export async function recordLoginAttempt(email: string, ip: string | null, success: boolean) {
  await db.loginAttempt.create({ data: { email, ip, success } });
}
