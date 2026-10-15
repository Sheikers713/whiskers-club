/**
 * Whiskers Club admin bot.
 *
 * Admins write free-form updates ("Барсика привили, заплатили 3500 в Vet Plus",
 * photos of a new cat...). The local model turns them into proposed changes,
 * the bot shows them with Confirm / Cancel buttons, and only a confirmed
 * proposal is written to the database (the site reads it at request time).
 *
 * Run: node --conditions=react-server --import tsx src/bot/main.ts
 * Env: TELEGRAM_BOT_TOKEN, TELEGRAM_ADMIN_IDS (comma-separated Telegram user
 * ids), DATABASE_URL, STORAGE_DIR, OLLAMA_URL, OLLAMA_MODEL, AI_ENABLED, APP_URL.
 */
import { randomBytes } from "node:crypto";
import { db } from "../lib/db";
import { actorFor, applyPlan, loadContext, type Upload } from "./apply";
import { parseMessage } from "./llm";
import { describe, normalize, type Plan, type SiteContext } from "./plan";
import { Telegram, type TgMessage, type TgUpdate } from "./telegram";

const token = process.env.TELEGRAM_BOT_TOKEN;
const admins = new Set(
  (process.env.TELEGRAM_ADMIN_IDS || "")
    .split(/[\s,]+/)
    .filter(Boolean)
    .map(Number),
);

type Proposal = {
  id: string;
  chatId: number;
  userId: number;
  previewId: number;
  text: string;
  uploads: Upload[];
  plan: Plan;
  ctx: SiteContext;
  createdAt: number;
};

/** Open proposals by chat; one per chat, a newer message refines it. Lost on restart. */
const proposals = new Map<number, Proposal>();
const PROPOSAL_TTL = 6 * 60 * 60 * 1000;

const HELP = `Пишите обычным текстом, что произошло, можно с фото. Например:
• «Новая кошка Мила, ~3 месяца, трёхцветная, привита, с котами ладит» + фото
• «Барсику сделали тесты: FIV и FeLV отрицательные, 4200 дин в Vet Plus, чек на фото»
• «Пришло 50 евро от Анны на лечение Рыжика»
• «Тигра забрали домой!»
Я покажу, что изменю на сайте, и запишу только после «✅ Сохранить». Если что-то не так, просто напишите уточнение.`;

// ---------------------------------------------------------------------------

async function collectUploads(tg: Telegram, messages: TgMessage[]): Promise<{ uploads: Upload[]; errors: string[] }> {
  const uploads: Upload[] = [];
  const errors: string[] = [];
  for (const m of messages) {
    try {
      if (m.photo?.length) {
        const biggest = m.photo[m.photo.length - 1];
        uploads.push({ data: await tg.download(biggest.file_id), name: `telegram-${m.message_id}.jpg` });
      } else if (m.document && /^(image\/|application\/pdf)/.test(m.document.mime_type ?? "")) {
        uploads.push({ data: await tg.download(m.document.file_id), name: m.document.file_name ?? `telegram-${m.message_id}` });
      } else if (m.document) {
        errors.push(`Файл ${m.document.file_name ?? ""} пропущен: принимаю только фото и PDF.`);
      }
    } catch (e) {
      errors.push(`Не смог скачать файл: ${e instanceof Error ? e.message : "ошибка"}.`);
    }
  }
  return { uploads, errors };
}

const buttons = (id: string, canSave: boolean) => [
  [
    ...(canSave ? [{ text: "✅ Сохранить", callback_data: `ok:${id}` }] : []),
    { text: "✖️ Отмена", callback_data: `no:${id}` },
  ],
];

async function propose(tg: Telegram, chatId: number, userId: number, text: string, uploads: Upload[], extra: string[], previous?: Proposal) {
  const status = previous
    ? await tg.editMessage(chatId, previous.previewId, "Учитываю уточнение…").catch(() => tg.sendMessage(chatId, "Учитываю уточнение…"))
    : await tg.sendMessage(chatId, "Разбираю сообщение…");
  const typing = setInterval(() => tg.typing(chatId), 4500);
  await tg.typing(chatId);
  try {
    const ctx = await loadContext();
    const parsed = await parseMessage(ctx, text, uploads.length);
    if (!parsed.ok) {
      await tg.editMessage(chatId, status.message_id, `Не получилось разобрать: ${parsed.reason}. Попробуйте ещё раз чуть позже.`);
      return;
    }
    const plan = normalize(parsed.plan, ctx, { photoCount: uploads.length });
    plan.problems.unshift(...extra);
    if (!plan.changes.length) {
      const msg = [plan.question, ...plan.problems].filter(Boolean).join("\n") || "Не нашёл, что изменить на сайте.";
      // Keep the text so the answer to the question can refine it.
      const id = randomBytes(6).toString("hex");
      proposals.set(chatId, { id, chatId, userId, previewId: status.message_id, text, uploads, plan, ctx, createdAt: Date.now() });
      await tg.editMessage(chatId, status.message_id, msg, buttons(id, false));
      return;
    }
    const id = randomBytes(6).toString("hex");
    proposals.set(chatId, { id, chatId, userId, previewId: status.message_id, text, uploads, plan, ctx, createdAt: Date.now() });
    await tg.editMessage(
      chatId,
      status.message_id,
      `Вот что я изменю на сайте:\n\n${describe(plan, ctx, uploads.length)}\n\nЕсли что-то не так, напишите уточнение.`,
      buttons(id, true),
    );
  } finally {
    clearInterval(typing);
  }
}

async function onMessages(tg: Telegram, messages: TgMessage[]) {
  const first = messages[0];
  const chatId = first.chat.id;
  const userId = first.from?.id ?? 0;
  const text = messages.map((m) => m.text ?? m.caption ?? "").filter(Boolean).join("\n").trim();

  if (first.chat.type !== "private") return;
  if (!admins.has(userId)) {
    await tg.sendMessage(chatId, `Этот бот только для админов Whiskers Club. Ваш Telegram id: ${userId}. Перешлите его администратору, чтобы получить доступ.`);
    console.log(`[bot] message from non-admin ${userId} (@${first.from?.username ?? "-"})`);
    return;
  }

  if (text.startsWith("/")) {
    const [cmd, ...args] = text.split(/\s+/);
    if (cmd === "/start" || cmd === "/help") return void (await tg.sendMessage(chatId, HELP));
    if (cmd === "/id") return void (await tg.sendMessage(chatId, `Ваш Telegram id: ${userId}`));
    if (cmd === "/cancel") {
      proposals.delete(chatId);
      return void (await tg.sendMessage(chatId, "Отменил."));
    }
    if (cmd === "/link") {
      const email = args[0]?.toLowerCase();
      const user = email ? await db.user.findUnique({ where: { email } }) : null;
      if (!user) return void (await tg.sendMessage(chatId, "Напишите /link и email, с которым вы входите в админку сайта."));
      await db.user.update({ where: { id: user.id }, data: { telegramChatId: String(userId) } });
      return void (await tg.sendMessage(chatId, `Готово: изменения из Telegram будут записаны от имени ${user.name}, и сюда будут приходить уведомления сайта.`));
    }
    return void (await tg.sendMessage(chatId, HELP));
  }

  const { uploads, errors } = await collectUploads(tg, messages);
  if (!text && !uploads.length) return;

  // A message right after a proposal refines it ("нет, это было вчера").
  const open = proposals.get(chatId);
  if (open && Date.now() - open.createdAt < PROPOSAL_TTL && !uploads.length) {
    await propose(tg, chatId, userId, `${open.text}\n\nУточнение от админа: ${text}`, open.uploads, errors, open);
    return;
  }
  if (open && uploads.length && !text) {
    // Photos sent separately after the text belong to it.
    await propose(tg, chatId, userId, open.text, [...open.uploads, ...uploads], errors, open);
    return;
  }
  if (!text) {
    await tg.sendMessage(chatId, "Получил фото. Напишите, что это: новый кот, фото для галереи кота или чек расхода?");
    proposals.set(chatId, {
      id: randomBytes(6).toString("hex"),
      chatId,
      userId,
      previewId: 0,
      text: "",
      uploads,
      plan: { changes: [], problems: [] },
      ctx: await loadContext(),
      createdAt: Date.now(),
    });
    return;
  }
  await propose(tg, chatId, userId, text, open && !open.text ? [...open.uploads, ...uploads] : uploads, errors);
}

async function onCallback(tg: Telegram, q: NonNullable<TgUpdate["callback_query"]>) {
  const [action, id] = (q.data ?? "").split(":");
  const chatId = q.message?.chat.id;
  if (!chatId || !admins.has(q.from.id)) return void (await tg.answerCallback(q.id));
  const p = proposals.get(chatId);
  if (!p || p.id !== id) {
    await tg.answerCallback(q.id, "Это предложение уже неактуально");
    if (q.message) await tg.editMessage(chatId, q.message.message_id, `${q.message.text ?? ""}\n\n(устарело)`).catch(() => undefined);
    return;
  }
  proposals.delete(chatId);
  if (action === "no") {
    await tg.answerCallback(q.id, "Отменено");
    await tg.editMessage(chatId, p.previewId, "Отменено, ничего не изменил.");
    return;
  }
  await tg.answerCallback(q.id, "Сохраняю…");
  await tg.editMessage(chatId, p.previewId, `${describe(p.plan, p.ctx, p.uploads.length)}\n\n⏳ Сохраняю…`);
  const actor = await actorFor(q.from.id);
  const result = await applyPlan(p.plan, p.ctx, p.uploads, actor?.id ?? null);
  const lines = [...result.done.map((d) => `✅ ${d}`), ...result.notes.map((n) => `⚠️ ${n}`)];
  if (!actor) lines.push("", "Подсказка: /link ваш@email свяжет Telegram с вашим аккаунтом в админке.");
  await tg.editMessage(chatId, p.previewId, `${describe(p.plan, p.ctx, p.uploads.length)}\n\n${lines.join("\n")}`);
}

// ---------------------------------------------------------------------------

async function main() {
  if (!token) {
    console.log("[bot] TELEGRAM_BOT_TOKEN is not set; the bot is idle.");
    // Stay up so `restart: unless-stopped` does not loop.
    await new Promise(() => undefined);
    return;
  }
  const tg = new Telegram(token);
  const me = await tg.call<{ username: string }>("getMe");
  console.log(`[bot] @${me.username} started; admins: ${[...admins].join(", ") || "none"}`);
  await tg.call("setMyCommands", {
    commands: [
      { command: "help", description: "Как пользоваться" },
      { command: "link", description: "Связать с аккаунтом админки: /link email" },
      { command: "cancel", description: "Отменить текущее предложение" },
      { command: "id", description: "Мой Telegram id" },
    ],
  }).catch((e) => console.error("[bot] setMyCommands", e));

  // Albums arrive as separate messages with one media_group_id; wait for all of them.
  const albums = new Map<string, { messages: TgMessage[]; timer: NodeJS.Timeout }>();
  // One chat is handled at a time, in order.
  const queues = new Map<number, Promise<unknown>>();
  const enqueue = (chatId: number, job: () => Promise<unknown>) => {
    const next = (queues.get(chatId) ?? Promise.resolve())
      .then(job)
      .catch(async (e) => {
        console.error("[bot] handler failed:", e);
        await tg.sendMessage(chatId, "Что-то пошло не так, ничего не сохранено. Попробуйте ещё раз.").catch(() => undefined);
      });
    queues.set(chatId, next);
  };

  let offset = 0;
  for (;;) {
    let updates: TgUpdate[] = [];
    try {
      updates = await tg.getUpdates(offset);
    } catch (e) {
      console.error("[bot] getUpdates failed:", e instanceof Error ? e.message : e);
      await new Promise((r) => setTimeout(r, 5000));
      continue;
    }
    for (const u of updates) {
      offset = u.update_id + 1;
      if (u.callback_query) {
        const q = u.callback_query;
        enqueue(q.message?.chat.id ?? 0, () => onCallback(tg, q));
      } else if (u.message) {
        const m = u.message;
        if (m.media_group_id) {
          const album = albums.get(m.media_group_id) ?? { messages: [], timer: undefined as unknown as NodeJS.Timeout };
          clearTimeout(album.timer);
          album.messages.push(m);
          album.timer = setTimeout(() => {
            albums.delete(m.media_group_id!);
            enqueue(m.chat.id, () => onMessages(tg, album.messages));
          }, 2000);
          albums.set(m.media_group_id, album);
        } else {
          enqueue(m.chat.id, () => onMessages(tg, [m]));
        }
      }
    }
    for (const [chatId, p] of proposals) if (Date.now() - p.createdAt > PROPOSAL_TTL) proposals.delete(chatId);
  }
}

main().catch((e) => {
  console.error("[bot] fatal:", e);
  process.exit(1);
});
