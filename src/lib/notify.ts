import "server-only";
import type { Role } from "@prisma/client";
import { db } from "./db";

/**
 * Sends a Telegram message to admins with the given roles who have linked a
 * chat (decision 1.6). Silently does nothing until TELEGRAM_BOT_TOKEN is set.
 * Failures never break the action that triggered the notification.
 */
export async function notifyAdmins(roles: Role[], text: string, extraUserIds: string[] = []) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  try {
    const users = await db.user.findMany({
      where: {
        isActive: true,
        telegramChatId: { not: null },
        OR: [{ roles: { hasSome: [...roles, "SUPERADMIN"] } }, { id: { in: extraUserIds } }],
      },
      select: { telegramChatId: true },
    });
    await Promise.allSettled(
      users.map((u) =>
        fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: u.telegramChatId, text, disable_web_page_preview: true }),
          signal: AbortSignal.timeout(10_000),
        }),
      ),
    );
  } catch (err) {
    console.error("[notify] failed", err);
  }
}
