import type { Prisma } from "@prisma/client";
import { db } from "../lib/db";
import { slugify } from "../lib/slug";
import { storePhoto, storePrivateFile } from "../lib/storage";
import { translateFromRussian } from "../lib/ai/translate";
import { planTranslations, type AutoKey } from "../lib/ai/translation-plan";
import { asLocalized, type LocalizedText } from "../lib/i18n/localized";
import { catTextFields, type CatChanges, type CatTarget, type Change, type Plan, type SiteContext } from "./plan";

export type Upload = { data: Buffer; name: string };

const ru = (v: unknown) => asLocalized(v).ru ?? asLocalized(v).en ?? "";
const day = (iso: string) => new Date(`${iso}T00:00:00Z`);

export function belgradeToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Belgrade" }).format(new Date());
}

/** Rates for foreign-currency amounts: BOT_RATES="EUR=117.2,USD=100". */
function rates(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const pair of (process.env.BOT_RATES || "EUR=117.2").split(",")) {
    const [k, v] = pair.split("=");
    const n = Number(v);
    if (k && Number.isFinite(n) && n > 0) out[k.trim().toUpperCase()] = n;
  }
  return out;
}

export async function loadContext(): Promise<SiteContext> {
  const [cats, statuses, categories, campaigns] = await Promise.all([
    db.cat.findMany({
      where: { state: { not: "ARCHIVED" } },
      select: { id: true, slug: true, name: true, state: true, status: { select: { key: true } } },
      orderBy: { updatedAt: "desc" },
      take: 400,
    }),
    db.catStatus.findMany({ orderBy: { sortOrder: "asc" } }),
    db.expenseCategory.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    db.campaign.findMany({ where: { status: "ACTIVE" }, orderBy: { startDate: "desc" } }),
  ]);
  return {
    today: belgradeToday(),
    cats: cats.map((c) => ({ id: c.id, slug: c.slug, name: ru(c.name), status: c.status.key, state: c.state })),
    statuses: statuses.map((s) => ({ key: s.key, label: ru(s.label) })),
    categories: categories.map((c) => ({ key: c.key, label: ru(c.label) })),
    campaigns: campaigns.map((c, i) => ({ id: c.id, key: `campaign${i + 1}`, title: ru(c.title) })),
    rates: rates(),
  };
}

/** The site user an admin's Telegram account is linked to (for the audit log). */
export async function actorFor(telegramId: number) {
  return db.user.findFirst({ where: { telegramChatId: String(telegramId), isActive: true }, select: { id: true, name: true } });
}

async function audit(actorId: string | null, action: string, entityType: string, entityId: string, after: unknown, before?: unknown) {
  const json = (v: unknown) => (v == null ? undefined : (JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue));
  await db.auditEvent.create({
    data: { actorId, action, entityType, entityId, before: json(before), after: json({ ...(after as object), via: "telegram" }), ip: null },
  });
}

async function uniqueSlug(base: string): Promise<string> {
  const root = slugify(base) || "cat";
  for (let i = 0; i < 100; i++) {
    const candidate = i === 0 ? root : `${root}-${i + 1}`;
    if (!(await db.cat.findUnique({ where: { slug: candidate }, select: { id: true } }))) return candidate;
  }
  return `${root}-${Date.now()}`;
}

/** Fills English and Serbian machine drafts the same way the admin form does. */
async function translateTexts(
  texts: Record<string, LocalizedText>,
  before: Record<string, LocalizedText> | null,
  beforeAuto: string[],
  notes: string[],
) {
  const plan = planTranslations({ submitted: texts, before, beforeAuto });
  const auto = new Set<string>(plan.keepAuto);
  // Keep marks of untouched fields that were not part of this change.
  for (const k of beforeAuto) if (!(k.split(".")[0] in texts)) auto.add(k);
  if (Object.keys(plan.sources).length) {
    const result = await translateFromRussian(plan.sources);
    if (result.ok) {
      for (const [field, locales] of Object.entries(plan.targets)) {
        for (const l of locales) {
          const v = result.values[l][field];
          if (!v) continue;
          texts[field] = { ...texts[field], [l]: v };
          auto.add(`${field}.${l}` satisfies AutoKey);
        }
      }
    } else notes.push(`Перевод на EN/SR не сделан: ${result.reason}.`);
  }
  return [...auto];
}

async function addPhotos(catId: string, uploads: Upload[], actorId: string | null, makeCover: boolean, notes: string[]) {
  const last = await db.mediaAsset.aggregate({ where: { catId }, _max: { sortOrder: true } });
  let order = (last._max.sortOrder ?? 0) + 1;
  let firstId: string | null = null;
  for (const u of uploads) {
    try {
      const stored = await storePhoto(u.data);
      const asset = await db.mediaAsset.create({ data: { ...stored, kind: "PHOTO", catId, sortOrder: order++, createdById: actorId } });
      firstId ??= asset.id;
      await audit(actorId, "media.upload", "MediaAsset", asset.id, { catId, storageKey: stored.storageKey });
    } catch (e) {
      notes.push(`Фото ${u.name} не принято: ${e instanceof Error ? e.message : "ошибка"}.`);
    }
  }
  const cat = await db.cat.findUnique({ where: { id: catId }, select: { coverId: true } });
  if (firstId && (makeCover || !cat?.coverId)) await db.cat.update({ where: { id: catId }, data: { coverId: firstId } });
  return firstId ? uploads.length : 0;
}

function catData(c: CatChanges) {
  const data: Prisma.CatUncheckedUpdateInput = { ...c.enums };
  if (c.birthDate) data.birthDate = day(c.birthDate);
  if (c.color) data.color = c.color;
  return data;
}

async function statusFor(key: string | undefined) {
  return key ? db.catStatus.findUnique({ where: { key } }) : null;
}

export type ApplyResult = { done: string[]; notes: string[] };

/** Writes a confirmed plan. Each change is saved on its own; a failure stops the rest. */
export async function applyPlan(plan: Plan, ctx: SiteContext, uploads: Upload[], actorId: string | null): Promise<ApplyResult> {
  const done: string[] = [];
  const notes: string[] = [];
  const site = (process.env.APP_URL || "").replace(/\/+$/, "");
  let newCat: { id: string; slug: string } | null = null;

  const resolve = (t: CatTarget) => (t.kind === "existing" ? t.cat.id : newCat?.id);

  for (const ch of plan.changes) {
    try {
      await applyOne(ch);
    } catch (e) {
      console.error("[bot] apply failed:", e);
      notes.push(`Ошибка при сохранении (${ch.type}): ${e instanceof Error ? e.message : "неизвестно"}. Остальное не сохранено.`);
      break;
    }
  }
  return { done, notes };

  async function applyOne(ch: Change) {
    switch (ch.type) {
      case "create_cat": {
        const status = (await statusFor(ch.changes.statusKey)) ?? (await statusFor("ready"));
        if (!status) throw new Error("на сайте нет статусов котов");
        const texts: Record<string, LocalizedText> = {};
        for (const f of catTextFields) texts[f] = ch.changes.texts[f] ? { ru: ch.changes.texts[f] } : {};
        const autoTranslated = await translateTexts(texts, null, [], notes);
        const state = ch.changes.visibility ?? "PUBLISHED";
        const slug = await uniqueSlug(texts.name.en || texts.name.ru || "cat");
        const cat = await db.cat.create({
          data: {
            ...(catData(ch.changes) as Prisma.CatUncheckedCreateInput),
            slug,
            name: texts.name,
            summary: texts.summary,
            story: texts.story,
            character: texts.character,
            health: texts.health,
            specialNeeds: texts.specialNeeds,
            adoptionTerms: texts.adoptionTerms,
            hasSpecialNeeds: !!ch.changes.texts.specialNeeds,
            originalLocale: "ru",
            autoTranslated,
            statusId: status.id,
            state,
            publishedAt: state === "PUBLISHED" ? new Date() : null,
            adoptedAt: status.group === "ADOPTED" ? new Date() : null,
          },
        });
        newCat = { id: cat.id, slug };
        await audit(actorId, "cat.create", "Cat", cat.id, { slug, texts, state, status: status.key });
        let photos = 0;
        if (ch.withPhotos) photos = await addPhotos(cat.id, uploads, actorId, true, notes);
        done.push(`Новый кот: ${site}/ru/cats/${slug}${photos ? ` (${photos} фото)` : ""}${state !== "PUBLISHED" ? " — пока не опубликован" : ""}`);
        return;
      }
      case "update_cat": {
        const before = await db.cat.findUniqueOrThrow({ where: { id: ch.cat.id } });
        const data = catData(ch.changes);
        const fields = Object.keys(ch.changes.texts) as (typeof catTextFields)[number][];
        if (fields.length) {
          const texts: Record<string, LocalizedText> = {};
          const prev: Record<string, LocalizedText> = {};
          for (const f of fields) {
            prev[f] = asLocalized(before[f]);
            // The bot writes Russian; the other languages are re-drafted when untouched.
            texts[f] = { ...prev[f], ru: ch.changes.texts[f] };
          }
          data.autoTranslated = await translateTexts(texts, prev, before.autoTranslated, notes);
          for (const f of fields) data[f] = texts[f];
          if (ch.changes.texts.specialNeeds) data.hasSpecialNeeds = true;
        }
        const status = await statusFor(ch.changes.statusKey);
        if (status) {
          data.statusId = status.id;
          if (status.group === "ADOPTED" && !before.adoptedAt) data.adoptedAt = day(ctx.today);
        }
        if (ch.changes.visibility) {
          data.state = ch.changes.visibility;
          if (ch.changes.visibility === "PUBLISHED" && !before.publishedAt) data.publishedAt = new Date();
        }
        await db.cat.update({ where: { id: ch.cat.id }, data });
        await audit(actorId, ch.changes.visibility && ch.changes.visibility !== before.state ? `cat.state.${ch.changes.visibility.toLowerCase()}` : "cat.update", "Cat", ch.cat.id, data, before);
        done.push(`Анкета ${ch.cat.name} обновлена: ${site}/ru/cats/${ch.cat.slug}`);
        return;
      }
      case "cat_news": {
        const catId = resolve(ch.cat);
        if (!catId) throw new Error("кот для новости не создан");
        const text: Record<string, LocalizedText> = { text: { ru: ch.text } };
        await translateTexts(text, null, [], notes);
        const saved = await db.catUpdate.create({
          data: { catId, text: text.text, date: day(ch.date), state: "PUBLISHED", createdById: actorId },
        });
        await audit(actorId, "cat_update.create", "CatUpdate", saved.id, { catId, text: text.text, date: ch.date });
        done.push(`Новость у ${ch.cat.kind === "new" ? ch.cat.name : ch.cat.cat.name} опубликована`);
        return;
      }
      case "add_photos": {
        const catId = resolve(ch.cat);
        if (!catId) throw new Error("кот для фото не создан");
        const n = await addPhotos(catId, uploads, actorId, ch.cover, notes);
        done.push(`${n} фото добавлено в галерею ${ch.cat.kind === "new" ? ch.cat.name : ch.cat.cat.name}`);
        return;
      }
      case "donation": {
        const data = {
          date: day(ch.date),
          amountRsd: ch.money.amountRsd,
          donorName: ch.donorName ?? null,
          publicName: ch.publicName ?? null,
          showName: ch.showName && !!ch.publicName,
          method: ch.method ?? null,
          comment: ch.comment ?? null,
          internalComment: ch.money.original ? `Из Telegram: ${ch.money.original}` : null,
          campaignId: ch.campaign?.id ?? null,
          catId: ch.campaign ? null : (ch.cat?.id ?? null),
          state: "PUBLISHED" as const,
          createdById: actorId,
        };
        const saved = await db.donation.create({ data });
        await audit(actorId, "donation.create", "Donation", saved.id, data);
        done.push(`Пожертвование ${ch.money.amountRsd} RSD записано`);
        return;
      }
      case "expense": {
        const category = await db.expenseCategory.findUniqueOrThrow({ where: { key: ch.categoryKey } });
        const fileIds: string[] = [];
        if (ch.withReceipt) {
          for (const u of uploads) {
            const meta = await storePrivateFile(u.data, u.name);
            fileIds.push((await db.storedFile.create({ data: { ...meta, createdById: actorId } })).id);
          }
        }
        const proof = fileIds.length ? "DOCUMENT" : "NONE";
        const state = proof === "NONE" && !ch.noReceiptReason ? "DRAFT" : "PUBLISHED";
        const data = {
          date: day(ch.date),
          amountRsd: ch.money.amountRsd,
          vendor: ch.vendor ?? null,
          categoryId: category.id,
          description: ch.description,
          paymentMethod: ch.method ?? null,
          proof: proof as "DOCUMENT" | "NONE",
          noReceiptReason: proof === "NONE" ? (ch.noReceiptReason ?? null) : null,
          payer: ch.payer ?? null,
          internalComment: ch.money.original ? `Из Telegram: ${ch.money.original}` : null,
          campaignId: ch.campaign?.id ?? null,
          state: state as "DRAFT" | "PUBLISHED",
          createdById: actorId,
        };
        const saved = await db.$transaction(async (tx) => {
          const e = await tx.expense.create({ data });
          if (ch.cats.length) await tx.expenseCat.createMany({ data: ch.cats.map((c) => ({ expenseId: e.id, catId: c.id })) });
          if (fileIds.length) await tx.expenseFile.createMany({ data: fileIds.map((fileId) => ({ expenseId: e.id, fileId, isPublic: false })) });
          return e;
        });
        await audit(actorId, "expense.create", "Expense", saved.id, { ...data, catIds: ch.cats.map((c) => c.id), addedFiles: fileIds });
        done.push(
          state === "DRAFT"
            ? `Расход ${ch.money.amountRsd} RSD сохранён черновиком (нет чека): ${site}/admin/expenses/${saved.id}`
            : `Расход ${ch.money.amountRsd} RSD записан`,
        );
        return;
      }
    }
  }
}
