"use server";

/**
 * Inline editing for the money table (/admin/finance): one cell at a time,
 * plus quick «add row». Every change is audited like the full forms.
 */
import { revalidatePath } from "next/cache";
import { db } from "../db";
import { audit } from "../audit";
import { requireUser } from "../auth/session";
import { compressReceipt, deleteFile, storePrivateFile } from "../storage";
import { guessCategoryKey } from "../finance/category";

export type SheetResult = { error: string } | { ok: true };

const isId = (v: string) => /^[0-9a-f-]{36}$/.test(v);

function parseDay(v: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const d = new Date(`${v}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseAmount(v: string): number | null {
  const n = Math.round(Number(v.replace(/[\s ]/g, "").replace(",", ".")));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function refresh() {
  revalidatePath("/", "layout");
}

async function storeReceipts(files: File[], userId: string): Promise<string[]> {
  const ids: string[] = [];
  for (const f of files) {
    const small = await compressReceipt(Buffer.from(await f.arrayBuffer()), f.name);
    const meta = await storePrivateFile(small.data, small.name);
    ids.push((await db.storedFile.create({ data: { ...meta, createdById: userId } })).id);
  }
  return ids;
}

const realFiles = (fd: FormData) => fd.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);

// ---------------------------------------------------------------------------
// Expenses

/** The category follows «На что» (it is for statistics only). */
async function categoryFor(description: string) {
  const c = await db.expenseCategory.findUnique({ where: { key: guessCategoryKey(description) } });
  return c ? { categoryId: c.id } : {};
}

export type ExpenseField = "date" | "amountRsd" | "description" | "noReceiptReason";

export async function updateExpenseField(id: string, field: ExpenseField, value: string): Promise<SheetResult> {
  const user = await requireUser(["FINANCE"]);
  if (!isId(id)) return { error: "Нет такой записи." };
  const before = await db.expense.findUnique({ where: { id } });
  if (!before) return { error: "Запись уже удалена." };
  const v = value.trim();
  let data: Record<string, unknown>;
  switch (field) {
    case "date": {
      const d = parseDay(v);
      if (!d) return { error: "Неверная дата." };
      data = { date: d };
      break;
    }
    case "amountRsd": {
      const a = parseAmount(v);
      if (!a) return { error: "Сумма должна быть больше нуля." };
      data = { amountRsd: a };
      break;
    }
    case "description":
      if (!v) return { error: "Опишите, на что потрачено." };
      data = { description: v.slice(0, 1000), publicSummary: {}, ...(await categoryFor(v)) };
      break;
    case "noReceiptReason":
      if (before.proof === "NONE" && !v) return { error: "Для расхода без чека нужна причина." };
      data = { noReceiptReason: v.slice(0, 500) || null };
      break;
    default:
      return { error: "Это поле здесь не меняется." };
  }
  await db.expense.update({ where: { id }, data });
  await audit({ actorId: user.id, action: "expense.update", entityType: "Expense", entityId: id, before, after: { ...data, via: "sheet" } });
  refresh();
  return { ok: true };
}

export async function updateExpenseCats(id: string, catIds: string[]): Promise<SheetResult> {
  const user = await requireUser(["FINANCE"]);
  if (!isId(id)) return { error: "Нет такой записи." };
  const before = await db.expense.findUnique({ where: { id }, include: { cats: true } });
  if (!before) return { error: "Запись уже удалена." };
  const clean = [...new Set(catIds.filter(isId))];
  await db.$transaction([
    db.expenseCat.deleteMany({ where: { expenseId: id } }),
    ...(clean.length ? [db.expenseCat.createMany({ data: clean.map((catId) => ({ expenseId: id, catId })) })] : []),
  ]);
  await audit({
    actorId: user.id,
    action: "expense.update",
    entityType: "Expense",
    entityId: id,
    before: { catIds: before.cats.map((c) => c.catId) },
    after: { catIds: clean, via: "sheet" },
  });
  refresh();
  return { ok: true };
}

/** Adds receipt files to an existing expense (it then counts as «with receipt»). */
export async function addExpenseReceipt(fd: FormData): Promise<SheetResult> {
  const user = await requireUser(["FINANCE"]);
  const id = String(fd.get("id") ?? "");
  if (!isId(id)) return { error: "Нет такой записи." };
  const files = realFiles(fd);
  if (!files.length) return { error: "Выберите файл." };
  let fileIds: string[];
  try {
    fileIds = await storeReceipts(files, user.id);
  } catch (e) {
    return { error: `Файл не принят: ${e instanceof Error ? e.message : "ошибка"}` };
  }
  await db.$transaction([
    db.expenseFile.createMany({ data: fileIds.map((fileId) => ({ expenseId: id, fileId, isPublic: false })) }),
    db.expense.updateMany({ where: { id, proof: "NONE" }, data: { proof: "DOCUMENT", noReceiptReason: null } }),
  ]);
  await audit({ actorId: user.id, action: "expense.update", entityType: "Expense", entityId: id, after: { addedFiles: fileIds, via: "sheet" } });
  refresh();
  return { ok: true };
}

export async function addExpenseRow(fd: FormData): Promise<SheetResult> {
  const user = await requireUser(["FINANCE"]);
  const day = parseDay(String(fd.get("date") ?? ""));
  const amountRsd = parseAmount(String(fd.get("amountRsd") ?? ""));
  const description = String(fd.get("description") ?? "").trim().slice(0, 1000);
  if (!day) return { error: "Укажите дату." };
  if (!amountRsd) return { error: "Укажите сумму в динарах." };
  if (!description) return { error: "Опишите, на что потрачено." };
  const category =
    (await db.expenseCategory.findUnique({ where: { key: guessCategoryKey(description) } })) ??
    (await db.expenseCategory.findUnique({ where: { key: "other" } }));
  if (!category) return { error: "Нет категорий расходов." };
  const catIds = [...new Set(fd.getAll("cats").map(String).filter(isId))];
  const files = realFiles(fd);
  let fileIds: string[] = [];
  try {
    fileIds = await storeReceipts(files, user.id);
  } catch (e) {
    return { error: `Файл не принят: ${e instanceof Error ? e.message : "ошибка"}` };
  }
  const reason = String(fd.get("noReceiptReason") ?? "").trim().slice(0, 500);
  const data = {
    date: day,
    amountRsd,
    description,
    categoryId: category.id,
    proof: (fileIds.length ? "DOCUMENT" : "NONE") as "DOCUMENT" | "NONE",
    noReceiptReason: fileIds.length ? null : reason || "найти чек",
    state: "PUBLISHED" as const,
    createdById: user.id,
  };
  const saved = await db.$transaction(async (tx) => {
    const e = await tx.expense.create({ data });
    if (catIds.length) await tx.expenseCat.createMany({ data: catIds.map((catId) => ({ expenseId: e.id, catId })) });
    if (fileIds.length) await tx.expenseFile.createMany({ data: fileIds.map((fileId) => ({ expenseId: e.id, fileId, isPublic: false })) });
    return e;
  });
  await audit({ actorId: user.id, action: "expense.create", entityType: "Expense", entityId: saved.id, after: { ...data, catIds, addedFiles: fileIds, via: "sheet" } });
  refresh();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Donations

export type DonationField = "date" | "amountRsd" | "donorName" | "method" | "catId";

export async function updateDonationField(id: string, field: DonationField, value: string): Promise<SheetResult> {
  const user = await requireUser(["FINANCE"]);
  if (!isId(id)) return { error: "Нет такой записи." };
  const before = await db.donation.findUnique({ where: { id } });
  if (!before) return { error: "Запись уже удалена." };
  const v = value.trim();
  let data: Record<string, unknown>;
  switch (field) {
    case "date": {
      const d = parseDay(v);
      if (!d) return { error: "Неверная дата." };
      data = { date: d };
      break;
    }
    case "amountRsd": {
      const a = parseAmount(v);
      if (!a) return { error: "Сумма должна быть больше нуля." };
      data = { amountRsd: a };
      break;
    }
    case "donorName":
      // One name for admins and the site; hiding it stays as it was (new names are shown).
      data = { donorName: v.slice(0, 200) || null, publicName: v.slice(0, 120) || null, ...(before.donorName || before.publicName ? {} : { showName: !!v }) };
      break;
    case "method":
      data = { method: v.slice(0, 120) || null };
      break;
    case "catId":
      if (v && !isId(v)) return { error: "Нет такого кота." };
      // A donation goes either to a cat or to a campaign.
      data = { catId: v || null, ...(v ? { campaignId: null } : {}) };
      break;
    default:
      return { error: "Это поле здесь не меняется." };
  }
  await db.donation.update({ where: { id }, data });
  await audit({ actorId: user.id, action: "donation.update", entityType: "Donation", entityId: id, before, after: { ...data, via: "sheet" } });
  refresh();
  return { ok: true };
}

export async function addDonationRow(fd: FormData): Promise<SheetResult> {
  const user = await requireUser(["FINANCE"]);
  const day = parseDay(String(fd.get("date") ?? ""));
  const amountRsd = parseAmount(String(fd.get("amountRsd") ?? ""));
  if (!day) return { error: "Укажите дату." };
  if (!amountRsd) return { error: "Укажите сумму в динарах." };
  const catId = String(fd.get("catId") ?? "");
  const name = String(fd.get("donorName") ?? "").trim();
  const data = {
    date: day,
    amountRsd,
    donorName: name.slice(0, 200) || null,
    publicName: name.slice(0, 120) || null,
    method: String(fd.get("method") ?? "").trim().slice(0, 120) || null,
    catId: isId(catId) ? catId : null,
    showName: !!name,
    state: "PUBLISHED" as const,
    createdById: user.id,
  };
  const saved = await db.donation.create({ data });
  await audit({ actorId: user.id, action: "donation.create", entityType: "Donation", entityId: saved.id, after: { ...data, via: "sheet" } });
  refresh();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Deleting a row (with its receipt files). The audit log keeps the full record.

export async function deleteExpenseRow(id: string): Promise<SheetResult> {
  const user = await requireUser(["FINANCE"]);
  if (!isId(id)) return { error: "Нет такой записи." };
  const before = await db.expense.findUnique({ where: { id }, include: { cats: true, files: { include: { file: true } } } });
  if (!before) return { error: "Запись уже удалена." };
  const files = before.files.map((f) => f.file);
  await db.$transaction(async (tx) => {
    await tx.expense.delete({ where: { id } }); // cat and file links cascade
    // A file shared with another record stays.
    for (const f of files) {
      const used = (await tx.expenseFile.count({ where: { fileId: f.id } })) + (await tx.donationFile.count({ where: { fileId: f.id } }));
      if (!used) await tx.storedFile.delete({ where: { id: f.id } });
    }
  });
  for (const f of files) {
    if (!(await db.storedFile.findUnique({ where: { id: f.id } }))) await deleteFile(f.storageKey).catch(() => undefined);
  }
  await audit({ actorId: user.id, action: "expense.delete", entityType: "Expense", entityId: id, before, after: { via: "sheet" } });
  refresh();
  return { ok: true };
}

export async function deleteDonationRow(id: string): Promise<SheetResult> {
  const user = await requireUser(["FINANCE"]);
  if (!isId(id)) return { error: "Нет такой записи." };
  const before = await db.donation.findUnique({ where: { id }, include: { files: { include: { file: true } } } });
  if (!before) return { error: "Запись уже удалена." };
  const files = before.files.map((f) => f.file);
  await db.$transaction(async (tx) => {
    await tx.donation.delete({ where: { id } });
    for (const f of files) {
      const used = (await tx.expenseFile.count({ where: { fileId: f.id } })) + (await tx.donationFile.count({ where: { fileId: f.id } }));
      if (!used) await tx.storedFile.delete({ where: { id: f.id } });
    }
  });
  for (const f of files) {
    if (!(await db.storedFile.findUnique({ where: { id: f.id } }))) await deleteFile(f.storageKey).catch(() => undefined);
  }
  await audit({ actorId: user.id, action: "donation.delete", entityType: "Donation", entityId: id, before, after: { via: "sheet" } });
  refresh();
  return { ok: true };
}
