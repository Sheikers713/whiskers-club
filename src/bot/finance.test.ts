import { describe, expect, it } from "vitest";
import { catButtons, flowCommand, nextStep, parseAmount, parseDate, question, splitEvenly, summary, type Draft } from "./finance";

const rates = { EUR: 117.2, USD: 100, GEL: 40 };
const look = {
  cats: [
    { id: "c1", name: "Жук" },
    { id: "c2", name: "Нами" },
  ],
  categories: [
    { key: "food", label: "Корм" },
    { key: "other", label: "Другое" },
  ],
  methods: ["RSD перевод из сербского банка", "Наличные"],
};

describe("parseAmount", () => {
  it("reads dinars in the usual spellings", () => {
    expect(parseAmount("1500", rates)).toEqual({ ok: true, amountRsd: 1500 });
    expect(parseAmount("1 500", rates)).toEqual({ ok: true, amountRsd: 1500 });
    expect(parseAmount("1.500", rates)).toEqual({ ok: true, amountRsd: 1500 });
    expect(parseAmount("1914 дин", rates)).toEqual({ ok: true, amountRsd: 1914 });
    expect(parseAmount("99,6", rates)).toEqual({ ok: true, amountRsd: 100 });
  });
  it("converts other currencies by BOT_RATES", () => {
    expect(parseAmount("20 eur", rates)).toEqual({ ok: true, amountRsd: 2344, original: "20 EUR по курсу 117.2" });
    expect(parseAmount("€14.19", rates)).toMatchObject({ ok: true, amountRsd: 1663 });
    expect(parseAmount("116 usdt", rates)).toMatchObject({ ok: true, amountRsd: 11600 });
    expect(parseAmount("120 лари", rates)).toMatchObject({ ok: true, amountRsd: 4800 });
  });
  it("refuses nonsense", () => {
    expect(parseAmount("корм", rates).ok).toBe(false);
    expect(parseAmount("0", rates).ok).toBe(false);
    expect(parseAmount("10 btc", rates).ok).toBe(false);
    expect(parseAmount("100 руб", rates).ok).toBe(false); // no RUB rate
  });
});

describe("parseDate", () => {
  const today = "2026-11-13";
  it("understands words and short dates", () => {
    expect(parseDate("сегодня", today)).toEqual({ ok: true, date: "2026-11-13" });
    expect(parseDate("вчера", today)).toEqual({ ok: true, date: "2026-11-12" });
    expect(parseDate("2.10", today)).toEqual({ ok: true, date: "2026-10-02" });
    expect(parseDate("02.10.2026", today)).toEqual({ ok: true, date: "2026-10-02" });
    expect(parseDate("2026-09-19", today)).toEqual({ ok: true, date: "2026-09-19" });
  });
  it("puts a day-month later than today into last year", () => {
    expect(parseDate("28.12", "2027-01-05")).toEqual({ ok: true, date: "2026-12-28" });
  });
  it("refuses impossible and future dates", () => {
    expect(parseDate("31.02.2026", today).ok).toBe(false);
    expect(parseDate("14.11.2026", today).ok).toBe(false);
    expect(parseDate("завтра", today).ok).toBe(false);
  });
});

describe("splitEvenly", () => {
  it("adds up exactly", () => {
    expect(splitEvenly(3000, 2)).toEqual([1500, 1500]);
    expect(splitEvenly(1000, 3)).toEqual([334, 333, 333]);
    expect(splitEvenly(700, 1)).toEqual([700]);
  });
});

describe("flow", () => {
  it("asks expense questions in order and the reason only without a receipt", () => {
    const d: Draft = { kind: "expense", catIds: [], receipts: [] };
    const order = [];
    let s = nextStep(d);
    while (s !== "confirm") {
      order.push(s);
      s = nextStep(d, s);
    }
    expect(order).toEqual(["amount", "date", "cats", "description", "receipt"]);
    d.noReceipt = true;
    expect(nextStep(d, "receipt")).toBe("reason");
  });

  it("asks donation questions in order", () => {
    const d: Draft = { kind: "donation", catIds: [], receipts: [] };
    expect(nextStep(d, "cats")).toBe("method");
    expect(nextStep(d, "method")).toBe("donor");
    expect(nextStep(d, "donor")).toBe("description");
    expect(nextStep(d, "description")).toBe("confirm");
  });

  it("starts from commands and keyboard buttons", () => {
    expect(flowCommand("/расход")).toBe("expense");
    expect(flowCommand("/expense@WhiskersBot")).toBe("expense");
    expect(flowCommand("🧾 Расход")).toBe("expense");
    expect(flowCommand("Донат")).toBe("donation");
    expect(flowCommand("Барсику купили корм")).toBe(null);
  });

  it("marks chosen cats and keeps callback data under 64 bytes", () => {
    const d: Draft = { kind: "expense", catIds: ["c2"], receipts: [] };
    const rows = catButtons(d, "abcd1234", look.cats);
    expect(rows[0].map((b) => b.text)).toEqual(["Жук", "✅ Нами"]);
    for (const step of ["date", "cats", "category", "receipt", "reason", "method", "donor", "confirm"] as const) {
      for (const row of question(step, d, "abcd1234", look).buttons)
        for (const b of row) expect(Buffer.byteLength(b.callback_data)).toBeLessThanOrEqual(64);
    }
  });

  it("summarises a shared donation with equal shares", () => {
    const d: Draft = {
      kind: "donation",
      amountRsd: 3000,
      date: "2026-11-08",
      catIds: ["c1", "c2"],
      receipts: [],
      method: "Наличные",
      donorName: "Анна Г.",
    };
    const text = summary(d, look);
    expect(text).toContain("Сумма: 3 000 RSD");
    expect(text).toContain("Дата: 08.11.2026");
    expect(text).toContain("Коты: Жук, Нами");
    expect(text).toContain("по 1 500 RSD");
    expect(text).toContain("От кого: Анна Г.");
  });

  it("summarises an expense without a receipt", () => {
    const d: Draft = {
      kind: "expense",
      amountRsd: 500,
      date: "2026-10-02",
      catIds: [],
      categoryKey: "food",
      description: "наполнитель 10 кг с рук",
      receipts: [],
      noReceipt: true,
      noReceiptReason: "Рынок / частник, чек не дают",
    };
    const text = summary(d, look);
    expect(text).toContain("Коты: фонд Whiskers Club");
    expect(text).toContain("Чек: без чека (Рынок / частник, чек не дают)");
  });
});

import { guessCategoryKey } from "../lib/finance/category";

describe("guessCategoryKey", () => {
  it("files sheet descriptions under the right category", () => {
    expect(guessCategoryKey("корм Monge 17 пакетиков")).toBe("food");
    expect(guessCategoryKey("операция Джанин")).toBe("veterinary");
    expect(guessCategoryKey("Марси анализ крови")).toBe("tests");
    expect(guessCategoryKey("передержка Жуку на 3 дня")).toBe("foster");
    expect(guessCategoryKey("капли для глаз вигамокс и тобрекс")).toBe("medication");
    expect(guessCategoryKey("наполнитель 10 кг с рук")).toBe("litter");
    expect(guessCategoryKey("реклама Нами в инсте")).toBe("administration");
    expect(guessCategoryKey("бытовая химия на передержку")).toBe("foster");
    expect(guessCategoryKey("что-то странное")).toBe("other");
  });
});
