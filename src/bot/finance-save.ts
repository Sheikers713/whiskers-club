/**
 * Database side of the volunteer expense/donation flow: what to offer
 * (active cats, categories, payment methods) and saving / undoing an entry.
 *
 * Every row the bot makes carries importKey "tg:<telegram user>:<entry>:<n>",
 * so an entry can be found and undone later, even after the bot restarts.
 */
import { randomBytes } from "node:crypto";
import { db } from "../lib/db";
import { asLocalized } from "../lib/i18n/localized";
import { compressReceipt, deleteFile, storePrivateFile } from "../lib/storage";
import { guessCategoryKey } from "../lib/finance/category";
import { rsd, splitEvenly, type Draft, type FlowCat, type Option } from "./finance";

const ru = (v: unknown) => asLocalized(v).ru ?? asLocalized(v).en ?? "";

export const UNDO_WINDOW_MS = 24 * 60 * 60 * 1000;

export type FlowLookup = { cats: FlowCat[]; categories: Option[]; methods: string[] };

/** Cats that are in our care right now (status group ACTIVE), alphabetically. */
export async function loadFlowLookup(): Promise<FlowLookup> {
  const [cats, categories, methods] = await Promise.all([
    db.cat.findMany({
      where: { state: { not: "ARCHIVED" }, status: { group: "ACTIVE" } },
      select: { id: true, name: true },
    }),
    db.expenseCategory.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    db.paymentMethod.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
  ]);
  return {
    cats: cats.map((c) => ({ id: c.id, name: ru(c.name) || "без имени" })).sort((a, b) => a.name.localeCompare(b.name, "ru")),
    categories: categories.map((c) => ({ key: c.key, label: ru(c.label) })),
    // Same choices as the donation form in the admin.
    methods: [...new Set([...methods.map((m) => ru(m.title)).filter(Boolean), "Наличные", "Другое"])],
  };
}

export type Who = { telegramId: number; label: string; actorId: string | null };

export type Saved = { entry: string; text: string; adminUrl: string };

export async function saveDraft(d: Draft, who: Who): Promise<Saved> {
  if (d.amountRsd == null || !d.date) throw new Error("не хватает суммы или даты");
  const entry = randomBytes(5).toString("hex");
  const key = (i: number) => `tg:${who.telegramId}:${entry}:${i}`;
  const site = (process.env.APP_URL || "").replace(/\/+$/, "");
  const note = [`Внесено через Telegram: ${who.label}`, d.original ? `Пересчёт: ${d.original}` : ""].filter(Boolean).join(". ");
  const date = new Date(`${d.date}T00:00:00Z`);

  if (d.kind === "donation") {
    // A donation for several cats becomes one row per cat with an equal share,
    // so each cat page and the totals stay right.
    const targets: (string | null)[] = d.catIds.length ? d.catIds : [null];
    const shares = splitEvenly(d.amountRsd, targets.length);
    const shareNote = targets.length > 1 ? `. Часть доната ${d.amountRsd} RSD на ${targets.length} котов` : "";
    const rows = await db.$transaction(
      targets.map((catId, i) =>
        db.donation.create({
          data: {
            date,
            amountRsd: shares[i],
            donorName: d.donorName ?? null,
            showName: false,
            method: d.method ?? null,
            comment: d.description ?? null,
            internalComment: note + shareNote,
            catId,
            state: "PUBLISHED",
            importKey: key(i),
            createdById: who.actorId,
          },
        }),
      ),
    );
    for (const r of rows) await audit(who, "donation.create", "Donation", r.id, r);
    return { entry, text: `💚 Донат ${rsd(d.amountRsd)} записан, он уже на сайте.`, adminUrl: `${site}/admin/donations/${rows[0].id}` };
  }

  const category =
    (await db.expenseCategory.findUnique({ where: { key: d.categoryKey ?? guessCategoryKey(d.description ?? "") } })) ??
    (await db.expenseCategory.findUnique({ where: { key: "other" } }));
  if (!category) throw new Error("нет такой категории расходов");
  const fileIds: string[] = [];
  for (const r of d.receipts) {
    const small = await compressReceipt(r.data, r.name);
    const meta = await storePrivateFile(small.data, small.name);
    fileIds.push((await db.storedFile.create({ data: { ...meta, createdById: who.actorId } })).id);
  }
  const noReceipt = fileIds.length === 0;
  const data = {
    date,
    amountRsd: d.amountRsd,
    categoryId: category.id,
    description: d.description ?? "",
    proof: (noReceipt ? "NONE" : "DOCUMENT") as "NONE" | "DOCUMENT",
    noReceiptReason: noReceipt ? (d.noReceiptReason ?? "Без чека") : null,
    payer: who.label,
    internalComment: note,
    state: "PUBLISHED" as const,
    importKey: key(0),
    createdById: who.actorId,
  };
  const saved = await db.$transaction(async (tx) => {
    const e = await tx.expense.create({ data });
    if (d.catIds.length) await tx.expenseCat.createMany({ data: d.catIds.map((catId) => ({ expenseId: e.id, catId })) });
    if (fileIds.length) await tx.expenseFile.createMany({ data: fileIds.map((fileId) => ({ expenseId: e.id, fileId, isPublic: false })) });
    return e;
  });
  await audit(who, "expense.create", "Expense", saved.id, { ...data, catIds: d.catIds, addedFiles: fileIds });
  return {
    entry,
    text: `🧾 Расход ${rsd(d.amountRsd)} записан${noReceipt ? " (без чека)" : `, чек сохранён`}. Он уже на сайте.`,
    adminUrl: `${site}/admin/expenses/${saved.id}`,
  };
}

export type UndoResult = { ok: true; text: string } | { ok: false; text: string };

/** Removes an entry the same volunteer made in the last 24 hours. */
export async function undoEntry(entry: string, who: Who, now = Date.now()): Promise<UndoResult> {
  if (!/^[0-9a-f]{10}$/.test(entry)) return { ok: false, text: "Не нашёл эту запись." };
  const prefix = `tg:${who.telegramId}:${entry}:`;
  const [donations, expenses] = await Promise.all([
    db.donation.findMany({ where: { importKey: { startsWith: prefix } } }),
    db.expense.findMany({ where: { importKey: { startsWith: prefix } }, include: { files: { include: { file: true } }, cats: true } }),
  ]);
  const rows = [...donations, ...expenses];
  if (!rows.length) return { ok: false, text: "Запись уже отменена или удалена в админке." };
  if (rows.some((r) => now - r.createdAt.getTime() > UNDO_WINDOW_MS)) {
    return { ok: false, text: "Прошло больше суток, отменить из бота уже нельзя. Попросите админа поправить запись в админке." };
  }
  await db.$transaction(async (tx) => {
    if (donations.length) await tx.donation.deleteMany({ where: { id: { in: donations.map((r) => r.id) } } });
    for (const e of expenses) {
      await tx.expense.delete({ where: { id: e.id } }); // cats and file links cascade
      await tx.storedFile.deleteMany({ where: { id: { in: e.files.map((f) => f.fileId) } } });
    }
  });
  for (const e of expenses) for (const f of e.files) await deleteFile(f.file.storageKey).catch(() => undefined);
  for (const r of donations) await audit(who, "donation.undo", "Donation", r.id, null, r);
  for (const r of expenses) await audit(who, "expense.undo", "Expense", r.id, null, r);
  return { ok: true, text: "↩️ Запись отменена и убрана с сайта." };
}

async function audit(who: Who, action: string, entityType: string, entityId: string, after: unknown, before?: unknown) {
  const json = (v: unknown) => (v == null ? undefined : JSON.parse(JSON.stringify(v)));
  await db.auditEvent.create({
    data: {
      actorId: who.actorId,
      action,
      entityType,
      entityId,
      before: json(before),
      after: json({ ...((after as object) ?? {}), via: "telegram", telegram: who.label }),
      ip: null,
    },
  });
}
