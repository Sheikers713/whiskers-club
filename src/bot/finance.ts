/**
 * Step-by-step expense and donation entry for volunteers (/расход, /донат).
 *
 * This file is pure: parsing what a volunteer typed, the order of questions,
 * the summary text and the keyboards. Talking to Telegram lives in
 * finance-flow.ts and writing to the database in finance-save.ts.
 */

export type Kind = "expense" | "donation";

export type Step =
  | "amount"
  | "date"
  | "cats"
  | "category"
  | "description"
  | "receipt"
  | "reason"
  | "method"
  | "donor"
  | "confirm";

export type FlowCat = { id: string; name: string };
export type Option = { key: string; label: string };

export type ReceiptUpload = { data: Buffer; name: string };

export type Draft = {
  kind: Kind;
  amountRsd?: number;
  /** "50 EUR по курсу 117.2" when the amount was not in dinars. */
  original?: string;
  date?: string; // YYYY-MM-DD
  catIds: string[];
  categoryKey?: string;
  description?: string;
  receipts: ReceiptUpload[];
  /** Set when the volunteer pressed «Без чека». */
  noReceipt?: boolean;
  noReceiptReason?: string;
  method?: string;
  donorName?: string;
  /** Filled from the receipt QR code; `verified` = confirmed by the tax office. */
  scanned?: { verified: boolean };
};

export const STEPS: Record<Kind, Step[]> = {
  // No category step: it is guessed from the description (statistics only).
  expense: ["amount", "date", "cats", "description", "receipt", "reason", "confirm"],
  donation: ["amount", "date", "cats", "method", "donor", "description", "confirm"],
};

/** The first step after `step` that still needs an answer. */
export function nextStep(d: Draft, step?: Step): Step {
  const steps = STEPS[d.kind];
  const from = step ? steps.indexOf(step) + 1 : 0;
  for (const s of steps.slice(from)) {
    if (s === "reason" && !d.noReceipt) continue;
    // What the receipt QR code filled in is shown in the summary, not asked again.
    if (d.scanned && ((s === "date" && d.date) || (s === "description" && d.description) || (s === "receipt" && d.receipts.length))) continue;
    return s;
  }
  return "confirm";
}

// ---------------------------------------------------------------------------
// Parsing what people type

const CURRENCY: Record<string, string> = {
  "€": "EUR",
  eur: "EUR",
  euro: "EUR",
  евро: "EUR",
  $: "USD",
  usd: "USD",
  долл: "USD",
  доллар: "USD",
  долларов: "USD",
  rsd: "RSD",
  din: "RSD",
  дин: "RSD",
  динар: "RSD",
  динаров: "RSD",
  usdt: "USD",
  usdc: "USD",
  лари: "GEL",
  gel: "GEL",
  "₾": "GEL",
  "₽": "RUB",
  rub: "RUB",
  руб: "RUB",
  рублей: "RUB",
};

export type ParsedAmount = { ok: true; amountRsd: number; original?: string } | { ok: false; reason: string };

/** "1500", "1 500", "1.500,50", "50 eur", "€50", "$20". Rounded to whole dinars. */
export function parseAmount(text: string, rates: Record<string, number>): ParsedAmount {
  const t = text.trim().toLowerCase().replace(/ /g, " ");
  const m = t.match(/^([^\d\s]*)\s*([\d\s.,]+?)\s*([^\d\s.,]*)\.?$/u);
  if (!m) return { ok: false, reason: "Напишите сумму числом, например 1500 или 20 eur." };
  const sym = (m[1] || m[3] || "rsd").replace(/\.$/, "");
  const currency = CURRENCY[sym];
  if (!currency) return { ok: false, reason: `Не знаю валюту «${sym}». Напишите сумму в динарах.` };
  let num = m[2].replace(/\s/g, "");
  // "1.500" and "1,500" are thousands; "12,50" and "12.5" are decimals.
  if (/^\d{1,3}([.,]\d{3})+$/.test(num)) num = num.replace(/[.,]/g, "");
  else num = num.replace(",", ".");
  const value = Number(num);
  if (!Number.isFinite(value) || value <= 0) return { ok: false, reason: "Сумма должна быть больше нуля." };
  if (currency === "RSD") {
    const rsd = Math.round(value);
    if (rsd > 5_000_000) return { ok: false, reason: "Слишком большая сумма, проверьте нули." };
    return { ok: true, amountRsd: rsd };
  }
  const rate = rates[currency];
  if (!rate) return { ok: false, reason: `Курса для ${currency} нет. Напишите сумму в динарах.` };
  return { ok: true, amountRsd: Math.round(value * rate), original: `${value} ${currency} по курсу ${rate}` };
}

function iso(y: number, m: number, d: number): string | null {
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return dt.toISOString().slice(0, 10);
}

export function shiftDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export type ParsedDate = { ok: true; date: string } | { ok: false; reason: string };

/** "сегодня", "вчера", "12.11", "12.11.2026", "12.11.26", "2026-11-12". */
export function parseDate(text: string, today: string): ParsedDate {
  const t = text.trim().toLowerCase();
  let date: string | null = null;
  if (t === "сегодня") date = today;
  else if (t === "вчера") date = shiftDays(today, -1);
  else if (t === "позавчера") date = shiftDays(today, -2);
  else if (/^\d{4}-\d{2}-\d{2}$/.test(t)) date = iso(+t.slice(0, 4), +t.slice(5, 7), +t.slice(8, 10));
  else {
    const m = t.match(/^(\d{1,2})[./-](\d{1,2})(?:[./-](\d{2}|\d{4}))?\.?$/);
    if (m) {
      const thisYear = +today.slice(0, 4);
      let y = m[3] ? +m[3] : thisYear;
      if (y < 100) y += 2000;
      date = iso(y, +m[2], +m[1]);
      // "28.12" typed in January means last December.
      if (date && !m[3] && date > today) date = iso(y - 1, +m[2], +m[1]);
    }
  }
  if (!date) return { ok: false, reason: "Не понял дату. Напишите, например, 12.11 или 12.11.2026." };
  if (date > today) return { ok: false, reason: "Дата в будущем. Напишите дату, когда были деньги." };
  if (date < shiftDays(today, -400)) return { ok: false, reason: "Дата больше года назад. Такое лучше внести в админке." };
  return { ok: true, date };
}

/** Splits a sum into whole-dinar shares that add up exactly (first shares get the remainder). */
export function splitEvenly(total: number, n: number): number[] {
  if (n <= 1) return [total];
  const base = Math.floor(total / n);
  const rest = total - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < rest ? 1 : 0));
}

// ---------------------------------------------------------------------------
// Text

export const rsd = (n: number) => `${new Intl.NumberFormat("ru-RU").format(n).replace(/ /g, " ")} RSD`;

export function ruDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-");
  return `${d}.${m}.${y}`;
}

export type Lookup = { cats: FlowCat[]; categories: Option[] };

export function catNames(d: Draft, look: Lookup): string {
  if (!d.catIds.length) return "фонд Whiskers Club";
  return d.catIds.map((id) => look.cats.find((c) => c.id === id)?.name ?? "?").join(", ");
}

export function summary(d: Draft, look: Lookup): string {
  const lines: string[] = [d.kind === "expense" ? "🧾 Расход" : "💚 Донат"];
  if (d.amountRsd != null) {
    lines.push(`Сумма: ${rsd(d.amountRsd)}${d.original ? ` (${d.original})` : ""}`);
  }
  if (d.date) lines.push(`Дата: ${ruDate(d.date)}`);
  lines.push(`Коты: ${catNames(d, look)}`);
  if (d.amountRsd != null && d.catIds.length > 1) {
    const shares = splitEvenly(d.amountRsd, d.catIds.length);
    lines.push(
      shares[0] === shares[shares.length - 1]
        ? `  делится поровну: по ${rsd(shares[0])}`
        : `  делится поровну: ${shares.map(rsd).join(" / ")}`,
    );
  }
  if (d.kind === "donation") {
    if (d.method) lines.push(`Способ оплаты: ${d.method}`);
    lines.push(`От кого: ${d.donorName || "Аноним"}`);
  }
  if (d.description) lines.push(`${d.kind === "expense" ? "Описание" : "Комментарий"}: ${d.description}`);
  if (d.kind === "expense") {
    if (d.receipts.length) {
      const qr = d.scanned ? (d.scanned.verified ? ", QR сверен с налоговой" : ", QR прочитан") : "";
      lines.push(`Чек: ${d.receipts.length === 1 ? "есть" : `${d.receipts.length} файла`}${qr}`);
    }
    else if (d.noReceipt) lines.push(`Чек: без чека${d.noReceiptReason ? ` (${d.noReceiptReason})` : ""}`);
  }
  return lines.join("\n");
}

export type Button = { text: string; callback_data: string };

/** Callback data is limited to 64 bytes, so options are referred to by index. */
const cb = (flow: string, action: string, arg: string | number = "") => `f:${flow}:${action}:${arg}`;

export const NO_RECEIPT_REASONS = ["Рынок / частник, чек не дают", "Чек потерялся", "Перевод на карту"];
export const DONOR_SKIP = "Аноним";

export function question(step: Step, d: Draft, flow: string, look: Lookup & { methods: string[] }): { text: string; buttons: Button[][] } {
  const back: Button[] = [{ text: "✖️ Отменить", callback_data: cb(flow, "cancel") }];
  switch (step) {
    case "amount":
      return {
        text:
          d.kind === "expense"
            ? "🧾 Новый расход. Сколько? Напишите сумму, например 1500 или 20 eur.\nИли пришлите фото фискального чека с QR-кодом, я заполню сумму, дату и что куплено сам."
            : "💚 Новый донат. Сколько? Напишите сумму, например 1500 или 20 eur.",
        buttons: [back],
      };
    case "date":
      return {
        text: "Когда? Нажмите кнопку или напишите дату, например 12.11.",
        buttons: [[{ text: "Сегодня", callback_data: cb(flow, "date", 0) }, { text: "Вчера", callback_data: cb(flow, "date", 1) }], back],
      };
    case "cats":
      return { text: catsText(d), buttons: catButtons(d, flow, look.cats) };
    case "category":
      return {
        text: "На что? Выберите категорию.",
        buttons: [...rows(look.categories.map((c, i) => ({ text: c.label, callback_data: cb(flow, "category", i) })), 2), back],
      };
    case "description":
      return {
        text:
          d.kind === "expense"
            ? "Опишите расход одной строкой, например «Корм Monge для Нами, 2 кг»."
            : "Комментарий к донату, его увидят на сайте. Например «На лечение Жука».",
        buttons: d.kind === "donation" ? [[{ text: "Без комментария", callback_data: cb(flow, "nodesc") }], back] : [back],
      };
    case "receipt":
      return {
        text: "Пришлите фото чека (можно несколько) или PDF. Если чека нет, нажмите «Без чека».",
        buttons: [
          ...(d.receipts.length ? [[{ text: `Готово, чеков: ${d.receipts.length} ➡️`, callback_data: cb(flow, "receiptdone") }]] : []),
          [{ text: "Без чека", callback_data: cb(flow, "noreceipt") }],
          back,
        ],
      };
    case "reason":
      return {
        text: "Почему без чека? Выберите или напишите своими словами.",
        buttons: [...NO_RECEIPT_REASONS.map((r, i) => [{ text: r, callback_data: cb(flow, "reason", i) }]), back],
      };
    case "method":
      return {
        text: "Как пришли деньги?",
        buttons: [...rows(look.methods.map((m, i) => ({ text: m, callback_data: cb(flow, "method", i) })), 2), back],
      };
    case "donor":
      return {
        text: "От кого? Напишите имя, оно будет на сайте. Если человек хочет остаться анонимным, нажмите «Аноним».",
        buttons: [[{ text: DONOR_SKIP, callback_data: cb(flow, "nodonor") }], back],
      };
    case "confirm":
      return {
        text: `Проверьте:\n\n${summary(d, look)}`,
        buttons: [
          [{ text: "✅ Сохранить", callback_data: cb(flow, "save") }, { text: "✏️ Исправить", callback_data: cb(flow, "fix") }],
          back,
        ],
      };
  }
}

function catsText(d: Draft): string {
  const who = d.kind === "expense" ? "расход" : "донат";
  return `Для каких котов ${who}? Можно выбрать несколько, сумма разделится поровну. Потом нажмите «Готово».${
    d.catIds.length ? `\nВыбрано: ${d.catIds.length}` : ""
  }`;
}

export function catButtons(d: Draft, flow: string, cats: FlowCat[]): Button[][] {
  const toggles = cats.map((c, i) => ({ text: `${d.catIds.includes(c.id) ? "✅ " : ""}${c.name}`, callback_data: cb(flow, "cat", i) }));
  return [
    ...rows(toggles, 3),
    [
      {
        text: d.catIds.length ? `Готово (${d.catIds.length}) ➡️` : "Фонд Whiskers Club ➡️",
        callback_data: cb(flow, "catsdone"),
      },
    ],
    [{ text: "✖️ Отменить", callback_data: cb(flow, "cancel") }],
  ];
}

/** Which field to change from the summary. */
export function fixButtons(d: Draft, flow: string): Button[][] {
  const fields: [Step, string][] =
    d.kind === "expense"
      ? [["amount", "Сумма"], ["date", "Дата"], ["cats", "Коты"], ["description", "Описание"], ["receipt", "Чек"]]
      : [["amount", "Сумма"], ["date", "Дата"], ["cats", "Коты"], ["method", "Способ оплаты"], ["donor", "От кого"], ["description", "Комментарий"]];
  return [...rows(fields.map(([s, label]) => ({ text: label, callback_data: cb(flow, "edit", s) })), 3), [{ text: "⬅️ Назад", callback_data: cb(flow, "back") }]];
}

function rows<T>(items: T[], per: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += per) out.push(items.slice(i, i + per));
  return out;
}

/** Words that start a flow without a slash command (the reply keyboard sends these). */
export const EXPENSE_BUTTON = "🧾 Расход";
export const DONATION_BUTTON = "💚 Донат";

export function flowCommand(text: string): Kind | null {
  const t = text.trim().toLowerCase().replace(/@\w+$/, "");
  if (["/расход", "/expense", "расход", EXPENSE_BUTTON.toLowerCase()].includes(t)) return "expense";
  if (["/донат", "/donation", "/donat", "донат", DONATION_BUTTON.toLowerCase()].includes(t)) return "donation";
  return null;
}
