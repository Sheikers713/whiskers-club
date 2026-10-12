"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { CampaignStatus, ProofLevel, PublicationState } from "@prisma/client";
import { db } from "../db";
import { audit } from "../audit";
import { requireUser } from "../auth/session";
import { bool, date, ids, int, localized, optStr, str } from "../admin/form";
import { storePrivateFile } from "../storage";

// Two-step workflow (decision 5.5): draft -> published. Whoever entered a
// record may publish it; every change keeps the previous values in the audit.
const states: PublicationState[] = ["DRAFT", "PUBLISHED", "HIDDEN", "ARCHIVED"];

function pick<T extends string>(value: string, allowed: T[], fallback: T): T {
  return (allowed as string[]).includes(value) ? (value as T) : fallback;
}

export type ActionResult = { error: string } | void;

async function attachFiles(fd: FormData, userId: string) {
  const files = fd.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  const stored: string[] = [];
  for (const file of files) {
    const meta = await storePrivateFile(Buffer.from(await file.arrayBuffer()), file.name);
    const row = await db.storedFile.create({ data: { ...meta, createdById: userId } });
    stored.push(row.id);
  }
  return stored;
}

function refresh() {
  revalidatePath("/", "layout");
}

// ---------------------------------------------------------------------------
// Donations

export async function saveDonation(fd: FormData): Promise<ActionResult> {
  const user = await requireUser(["FINANCE"]);
  const id = optStr(fd, "id");
  const amountRsd = int(fd, "amountRsd");
  const day = date(fd, "date");
  if (!amountRsd || amountRsd <= 0) return { error: "Укажите сумму в динарах." };
  if (!day) return { error: "Укажите дату." };
  const campaignId = optStr(fd, "campaignId");
  const catId = optStr(fd, "catId");
  const data = {
    date: day,
    amountRsd,
    donorName: optStr(fd, "donorName", 200),
    publicName: optStr(fd, "publicName", 120),
    showName: bool(fd, "showName"),
    method: optStr(fd, "method", 120),
    comment: optStr(fd, "comment", 300),
    internalComment: optStr(fd, "internalComment", 2000),
    campaignId,
    catId: campaignId ? null : catId,
    state: pick(str(fd, "state"), states, "DRAFT"),
  };
  const before = id ? await db.donation.findUnique({ where: { id } }) : null;
  if (id && !before) redirect("/admin/donations");
  let fileIds: string[] = [];
  try {
    fileIds = await attachFiles(fd, user.id);
  } catch (e) {
    return { error: `Файл не принят: ${e instanceof Error ? e.message : "ошибка"}` };
  }
  const saved = id
    ? await db.donation.update({ where: { id }, data })
    : await db.donation.create({ data: { ...data, createdById: user.id } });
  if (fileIds.length) await db.donationFile.createMany({ data: fileIds.map((fileId) => ({ donationId: saved.id, fileId })) });
  await audit({
    actorId: user.id,
    action: id ? "donation.update" : "donation.create",
    entityType: "Donation",
    entityId: saved.id,
    before: before ?? undefined,
    after: { ...data, addedFiles: fileIds },
  });
  refresh();
  redirect(`/admin/donations/${saved.id}?saved=1`);
}

// ---------------------------------------------------------------------------
// Expenses

const proofs: ProofLevel[] = ["FISCAL_VERIFIED", "DOCUMENT", "NONE"];

export async function saveExpense(fd: FormData): Promise<ActionResult> {
  const user = await requireUser(["FINANCE"]);
  const id = optStr(fd, "id");
  const amountRsd = int(fd, "amountRsd");
  const day = date(fd, "date");
  const description = str(fd, "description", 1000);
  const categoryId = str(fd, "categoryId");
  if (!amountRsd || amountRsd <= 0) return { error: "Укажите сумму в динарах." };
  if (!day) return { error: "Укажите дату." };
  if (!description) return { error: "Опишите, на что потрачено." };
  if (!(await db.expenseCategory.findUnique({ where: { id: categoryId } }))) return { error: "Выберите категорию." };

  const before = id ? await db.expense.findUnique({ where: { id }, include: { cats: true, files: true } }) : null;
  if (id && !before) redirect("/admin/expenses");

  const hasNewFiles = fd.getAll("files").some((f) => f instanceof File && f.size > 0);
  const hasFiles = hasNewFiles || (before?.files.length ?? 0) > 0;
  // QR verification arrives in wave 2; until then a file means "document attached".
  let proof = pick(str(fd, "proof"), proofs, hasFiles ? "DOCUMENT" : "NONE");
  if (proof === "FISCAL_VERIFIED" && before?.proof !== "FISCAL_VERIFIED") proof = hasFiles ? "DOCUMENT" : "NONE";
  if (proof === "DOCUMENT" && !hasFiles) proof = "NONE";
  const noReceiptReason = optStr(fd, "noReceiptReason", 500);
  if (proof === "NONE" && !noReceiptReason) return { error: "Для расхода без чека укажите причину." };

  const catIds = ids(fd, "cats");
  const data = {
    date: day,
    amountRsd,
    vendor: optStr(fd, "vendor", 200),
    categoryId,
    description,
    publicSummary: localized(fd, "publicSummary", 500),
    paymentMethod: optStr(fd, "paymentMethod", 120),
    proof,
    noReceiptReason,
    fiscalId: optStr(fd, "fiscalId", 200),
    payer: optStr(fd, "payer", 120),
    internalComment: optStr(fd, "internalComment", 2000),
    campaignId: optStr(fd, "campaignId"),
    state: pick(str(fd, "state"), states, "DRAFT"),
  };

  let fileIds: string[] = [];
  try {
    fileIds = await attachFiles(fd, user.id);
  } catch (e) {
    return { error: `Файл не принят: ${e instanceof Error ? e.message : "ошибка"}` };
  }
  const publicFiles = new Set(ids(fd, "publicFiles"));
  const newFilesPublic = bool(fd, "newFilesPublic");

  const saved = await db.$transaction(async (tx) => {
    const e = id ? await tx.expense.update({ where: { id }, data }) : await tx.expense.create({ data: { ...data, createdById: user.id } });
    await tx.expenseCat.deleteMany({ where: { expenseId: e.id } });
    if (catIds.length) await tx.expenseCat.createMany({ data: catIds.map((catId) => ({ expenseId: e.id, catId })) });
    for (const f of before?.files ?? []) {
      await tx.expenseFile.update({
        where: { expenseId_fileId: { expenseId: e.id, fileId: f.fileId } },
        data: { isPublic: publicFiles.has(f.fileId) },
      });
    }
    if (fileIds.length)
      await tx.expenseFile.createMany({ data: fileIds.map((fileId) => ({ expenseId: e.id, fileId, isPublic: newFilesPublic })) });
    return e;
  });
  await audit({
    actorId: user.id,
    action: id ? "expense.update" : "expense.create",
    entityType: "Expense",
    entityId: saved.id,
    before: before ?? undefined,
    after: { ...data, catIds, addedFiles: fileIds, publicFiles: [...publicFiles] },
  });
  refresh();
  redirect(`/admin/expenses/${saved.id}?saved=1`);
}

// ---------------------------------------------------------------------------
// Campaigns

const campaignStatuses: CampaignStatus[] = ["ACTIVE", "COMPLETED", "CANCELLED"];

export async function saveCampaign(fd: FormData): Promise<ActionResult> {
  const user = await requireUser(["FINANCE"]);
  const id = optStr(fd, "id");
  const title = localized(fd, "title", 200);
  const targetRsd = int(fd, "targetRsd");
  const startDate = date(fd, "startDate");
  if (!Object.keys(title).length) return { error: "Укажите название сбора." };
  if (!targetRsd || targetRsd <= 0) return { error: "Укажите цель в динарах." };
  if (!startDate) return { error: "Укажите дату начала." };
  const catIds = ids(fd, "cats");
  const status = pick(str(fd, "status"), campaignStatuses, "ACTIVE");
  const state = pick(str(fd, "state"), states, "DRAFT");

  // A cat has at most one active public campaign at a time (TZ 9.2).
  if (status === "ACTIVE" && state === "PUBLISHED" && catIds.length) {
    const clash = await db.campaignCat.findFirst({
      where: { catId: { in: catIds }, campaignId: { not: id ?? undefined }, campaign: { status: "ACTIVE", state: "PUBLISHED" } },
      include: { cat: { select: { name: true } } },
    });
    if (clash) return { error: "У одного из котов уже есть активный публичный сбор. Сначала завершите его." };
  }

  const data = {
    title,
    description: localized(fd, "description"),
    categoryId: optStr(fd, "categoryId"),
    targetRsd,
    startDate,
    endDate: date(fd, "endDate"),
    status,
    state,
  };
  const before = id ? await db.campaign.findUnique({ where: { id }, include: { cats: true } }) : null;
  if (id && !before) redirect("/admin/campaigns");
  const saved = await db.$transaction(async (tx) => {
    const c = id ? await tx.campaign.update({ where: { id }, data }) : await tx.campaign.create({ data });
    await tx.campaignCat.deleteMany({ where: { campaignId: c.id } });
    if (catIds.length) await tx.campaignCat.createMany({ data: catIds.map((catId) => ({ campaignId: c.id, catId })) });
    return c;
  });
  await audit({ actorId: user.id, action: id ? "campaign.update" : "campaign.create", entityType: "Campaign", entityId: saved.id, before: before ?? undefined, after: { ...data, catIds } });
  refresh();
  redirect(`/admin/campaigns/${saved.id}?saved=1`);
}

/** Moves money between a campaign and the general fund (decision 5.6). */
export async function createTransfer(fd: FormData): Promise<ActionResult> {
  const user = await requireUser(["FINANCE"]);
  const campaignId = str(fd, "campaignId");
  const path = `/admin/campaigns/${campaignId}`;
  const amountRsd = int(fd, "amountRsd");
  if (!amountRsd || amountRsd <= 0) return { error: "Укажите сумму перераспределения." };
  const direction = str(fd, "direction");
  const data = {
    date: date(fd, "date") ?? new Date(),
    amountRsd,
    fromCampaignId: direction === "out" ? campaignId : null,
    toCampaignId: direction === "out" ? null : campaignId,
    note: localized(fd, "note", 300),
    state: "PUBLISHED" as const,
    createdById: user.id,
  };
  const t = await db.fundTransfer.create({ data });
  await audit({ actorId: user.id, action: "transfer.create", entityType: "FundTransfer", entityId: t.id, after: data });
  refresh();
  redirect(`${path}?saved=1`);
}

// ---------------------------------------------------------------------------
// Payment methods (donation details shown on the site)

export async function savePaymentMethod(fd: FormData): Promise<ActionResult> {
  const user = await requireUser(["FINANCE"]);
  const id = optStr(fd, "id");
  const title = localized(fd, "title", 120);
  if (!Object.keys(title).length) return { error: "Укажите название способа." };
  const url = optStr(fd, "url", 500);
  if (url && !/^https:\/\//.test(url)) return { error: "Ссылка должна начинаться с https://" };
  const data = {
    title,
    value: optStr(fd, "value", 500),
    url,
    currencyNote: optStr(fd, "currencyNote", 60),
    instructions: localized(fd, "instructions", 2000),
    sortOrder: int(fd, "sortOrder") ?? 0,
    isActive: bool(fd, "isActive"),
  };
  const before = id ? await db.paymentMethod.findUnique({ where: { id } }) : null;
  const saved = id ? await db.paymentMethod.update({ where: { id }, data }) : await db.paymentMethod.create({ data });
  await audit({ actorId: user.id, action: id ? "payment_method.update" : "payment_method.create", entityType: "PaymentMethod", entityId: saved.id, before: before ?? undefined, after: data });
  refresh();
  redirect("/admin/payment-methods?saved=1");
}
