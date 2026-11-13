/**
 * Telegram side of /расход and /донат: one open entry per chat, asked step by
 * step. Every question is a new message (an edited old message sits above the
 * volunteer's answer and looks like silence), except the cat picker, whose
 * ✅ marks are toggled in place.
 */
import { randomBytes } from "node:crypto";
import { belgradeToday, rates } from "./apply";
import {
  catButtons,
  fixButtons,
  nextStep,
  NO_RECEIPT_REASONS,
  parseAmount,
  parseDate,
  question,
  rsd,
  shiftDays,
  summary,
  type Draft,
  type Kind,
  type ReceiptUpload,
  type Step,
} from "./finance";
import { loadFlowLookup, saveDraft, undoEntry, type FlowLookup, type Who } from "./finance-save";
import type { Telegram, TgCallbackQuery, TgUser } from "./telegram";

type Flow = {
  id: string;
  draft: Draft;
  step: Step;
  /** Came here from «Исправить»: after this answer go back to the summary. */
  fixing: boolean;
  look: FlowLookup;
  /** Message that holds the current question's buttons. */
  messageId: number;
  touchedAt: number;
};

const flows = new Map<number, Flow>();
const FLOW_TTL = 12 * 60 * 60 * 1000;

export function hasFlow(chatId: number): boolean {
  const f = flows.get(chatId);
  if (f && Date.now() - f.touchedAt > FLOW_TTL) flows.delete(chatId);
  return flows.has(chatId);
}

export function cancelFlow(chatId: number): boolean {
  return flows.delete(chatId);
}

export async function startFlow(tg: Telegram, chatId: number, kind: Kind) {
  const look = await loadFlowLookup();
  const flow: Flow = {
    id: randomBytes(4).toString("hex"),
    draft: { kind, catIds: [], receipts: [] },
    step: "amount",
    fixing: false,
    look,
    messageId: 0,
    touchedAt: Date.now(),
  };
  flows.set(chatId, flow);
  await ask(tg, chatId, flow);
}

async function ask(tg: Telegram, chatId: number, flow: Flow, prefix = "") {
  // Retire the buttons of the previous question so old taps can't land.
  if (flow.messageId) await tg.editButtons(chatId, flow.messageId, []).catch(() => undefined);
  const q = question(flow.step, flow.draft, flow.id, flow.look);
  const sent = await tg.sendMessage(chatId, prefix ? `${prefix}\n\n${q.text}` : q.text, q.buttons);
  flow.messageId = sent.message_id;
  flow.touchedAt = Date.now();
}

async function advance(tg: Telegram, chatId: number, flow: Flow, prefix = "") {
  flow.step = flow.fixing ? "confirm" : nextStep(flow.draft, flow.step);
  if (flow.step === "confirm") flow.fixing = false;
  await ask(tg, chatId, flow, prefix);
}

/** Text, photos or files while an entry is open. Returns false when there is no open entry. */
export async function onFlowMessage(tg: Telegram, chatId: number, text: string, uploads: ReceiptUpload[]): Promise<boolean> {
  if (!hasFlow(chatId)) return false;
  const flow = flows.get(chatId)!;
  const d = flow.draft;
  const today = belgradeToday();

  if (uploads.length) {
    if (d.kind !== "expense" || !["receipt", "reason", "confirm"].includes(flow.step)) {
      await ask(tg, chatId, flow, "Фото сейчас не нужно.");
      return true;
    }
    d.receipts.push(...uploads);
    d.noReceipt = false;
    d.noReceiptReason = undefined;
    flow.step = "receipt";
    await advance(tg, chatId, flow, `📎 Чек получен (${d.receipts.length}).`);
    return true;
  }
  if (!text) {
    await ask(tg, chatId, flow, "Не понял сообщение.");
    return true;
  }

  switch (flow.step) {
    case "amount": {
      const a = parseAmount(text, rates());
      if (!a.ok) { await ask(tg, chatId, flow, a.reason); return true; }
      d.amountRsd = a.amountRsd;
      d.original = a.original;
      await advance(tg, chatId, flow, a.original ? `Это ${rsd(a.amountRsd)} (${a.original}).` : "");
      return true;
    }
    case "date": {
      const p = parseDate(text, today);
      if (!p.ok) { await ask(tg, chatId, flow, p.reason); return true; }
      d.date = p.date;
      await advance(tg, chatId, flow);
      return true;
    }
    case "description":
      d.description = text.slice(0, 500);
      await advance(tg, chatId, flow);
      return true;
    case "reason":
      d.noReceiptReason = text.slice(0, 300);
      await advance(tg, chatId, flow);
      return true;
    case "donor":
      d.donorName = text.slice(0, 120);
      await advance(tg, chatId, flow);
      return true;
    case "method":
      d.method = text.slice(0, 80);
      await advance(tg, chatId, flow);
      return true;
    case "cats": {
      // Typed names work too: "Нами, Жук".
      const names = text.split(/[,;\n]| и /).map((s) => s.trim().toLowerCase()).filter(Boolean);
      const found = flow.look.cats.filter((c) => names.some((n) => c.name.toLowerCase().startsWith(n.slice(0, Math.max(3, n.length - 2)))));
      if (!found.length) { await ask(tg, chatId, flow, "Не нашёл таких котов среди активных. Нажмите на имена кнопками."); return true; }
      d.catIds = [...new Set([...d.catIds, ...found.map((c) => c.id)])];
      await ask(tg, chatId, flow, `Отметил: ${found.map((c) => c.name).join(", ")}.`);
      return true;
    }
    default:
      await ask(tg, chatId, flow, "Нажмите одну из кнопок.");
      return true;
  }
}

export function whoFrom(user: TgUser, actor: { id: string; name: string } | null): Who {
  const name = [user.first_name, user.username ? `@${user.username}` : ""].filter(Boolean).join(" ") || String(user.id);
  return { telegramId: user.id, label: actor?.name ?? name, actorId: actor?.id ?? null };
}

/** Button taps: "f:<flow>:<action>:<arg>" and "u:<entry>" (undo). */
export async function onFlowCallback(tg: Telegram, q: TgCallbackQuery, who: Who): Promise<boolean> {
  const data = q.data ?? "";
  const chatId = q.message?.chat.id;
  if (!chatId) return false;

  if (data.startsWith("u:")) {
    const r = await undoEntry(data.slice(2), who);
    await tg.answerCallback(q.id, r.ok ? "Отменено" : undefined);
    if (q.message) await tg.editButtons(chatId, q.message.message_id, []).catch(() => undefined);
    await tg.sendMessage(chatId, r.text);
    return true;
  }
  if (!data.startsWith("f:")) return false;

  const [, id, action, arg] = data.split(":");
  const flow = flows.get(chatId);
  if (!flow || flow.id !== id) {
    await tg.answerCallback(q.id, "Эта запись уже закрыта");
    if (q.message) await tg.editButtons(chatId, q.message.message_id, []).catch(() => undefined);
    return true;
  }
  const d = flow.draft;
  const today = belgradeToday();
  flow.touchedAt = Date.now();

  switch (action) {
    case "cancel":
      flows.delete(chatId);
      await tg.answerCallback(q.id, "Отменено");
      await tg.editButtons(chatId, flow.messageId, []).catch(() => undefined);
      await tg.sendMessage(chatId, "Отменил, ничего не записано.");
      return true;
    case "date":
      d.date = shiftDays(today, -Number(arg || 0));
      break;
    case "cat": {
      const cat = flow.look.cats[Number(arg)];
      if (cat) d.catIds = d.catIds.includes(cat.id) ? d.catIds.filter((c) => c !== cat.id) : [...d.catIds, cat.id];
      await tg.answerCallback(q.id);
      await tg.editButtons(chatId, flow.messageId, catButtons(d, flow.id, flow.look.cats)).catch(() => undefined);
      return true;
    }
    case "catsdone":
      break;
    case "category": {
      const c = flow.look.categories[Number(arg)];
      if (!c) {
        await tg.answerCallback(q.id);
        return true;
      }
      d.categoryKey = c.key;
      break;
    }
    case "nodesc":
      d.description = undefined;
      break;
    case "receiptdone":
      break;
    case "noreceipt":
      d.receipts = [];
      d.noReceipt = true;
      d.noReceiptReason = undefined;
      await tg.answerCallback(q.id);
      flow.step = "reason";
      await ask(tg, chatId, flow);
      return true;
    case "reason":
      d.noReceiptReason = NO_RECEIPT_REASONS[Number(arg)];
      break;
    case "method":
      d.method = flow.look.methods[Number(arg)];
      break;
    case "nodonor":
      d.donorName = undefined;
      break;
    case "fix":
      await tg.answerCallback(q.id);
      await tg.editButtons(chatId, flow.messageId, fixButtons(d, flow.id)).catch(() => undefined);
      return true;
    case "back":
      await tg.answerCallback(q.id);
      flow.step = "confirm";
      await ask(tg, chatId, flow);
      return true;
    case "edit":
      await tg.answerCallback(q.id);
      flow.step = arg as Step;
      flow.fixing = true;
      await ask(tg, chatId, flow);
      return true;
    case "save": {
      await tg.answerCallback(q.id, "Сохраняю…");
      flows.delete(chatId);
      await tg.editMessage(chatId, flow.messageId, `${summary(d, flow.look)}\n\n⏳ Сохраняю…`).catch(() => undefined);
      try {
        const saved = await saveDraft(d, who);
        await tg.editMessage(
          chatId,
          flow.messageId,
          `${summary(d, flow.look)}\n\n${saved.text}\nВ админке: ${saved.adminUrl}\n\nОшиблись? Отменить можно в течение суток.${
            who.actorId
              ? ""
              : `\n\nЧтобы на сайте было видно, кто внёс, впишите ваш Telegram id ${who.telegramId} в админке: «Профиль» → «Telegram chat id для уведомлений».`
          }`,
          [[{ text: "↩️ Отменить запись", callback_data: `u:${saved.entry}` }]],
        );
      } catch (e) {
        console.error("[bot] finance save failed:", e);
        flows.set(chatId, flow);
        await tg.sendMessage(chatId, `Не получилось сохранить: ${e instanceof Error ? e.message : "ошибка"}. Попробуйте ещё раз.`, [
          [{ text: "✅ Сохранить", callback_data: `f:${flow.id}:save:` }, { text: "✖️ Отменить", callback_data: `f:${flow.id}:cancel:` }],
        ]);
      }
      return true;
    }
    default:
      await tg.answerCallback(q.id);
      return true;
  }
  await tg.answerCallback(q.id);
  await advance(tg, chatId, flow);
  return true;
}
