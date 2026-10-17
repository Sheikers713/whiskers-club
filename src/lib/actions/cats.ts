"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { PublicationState, Sex, TestResult, TriState } from "@prisma/client";
import { db } from "../db";
import { audit } from "../audit";
import { requireUser } from "../auth/session";
import { bool, date, ids, int, localized, optStr, str } from "../admin/form";
import { slugify } from "../slug";
import { deletePhoto, storePhoto } from "../storage";
import { translateFromRussian } from "../ai/translate";
import { planTranslations, type AutoKey } from "../ai/translation-plan";
import { asLocalized, type LocalizedText } from "../i18n/localized";

const states: PublicationState[] = ["DRAFT", "PUBLISHED", "HIDDEN", "ARCHIVED"];
const tri: TriState[] = ["YES", "NO", "UNKNOWN"];
const tests: TestResult[] = ["NEGATIVE", "POSITIVE", "PENDING", "NOT_TESTED"];
const sexes: Sex[] = ["FEMALE", "MALE", "UNKNOWN"];

const textFields = ["name", "summary", "story", "character", "health", "specialNeeds", "adoptionTerms"] as const;

function pick<T extends string>(value: string, allowed: T[], fallback: T): T {
  return (allowed as string[]).includes(value) ? (value as T) : fallback;
}

async function uniqueSlug(base: string, exceptId?: string): Promise<string> {
  const root = slugify(base) || "cat";
  for (let i = 0; i < 100; i++) {
    const candidate = i === 0 ? root : `${root}-${i + 1}`;
    const found = await db.cat.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!found || found.id === exceptId) return candidate;
  }
  return `${root}-${Date.now()}`;
}

/** Birth date from "X years Y months"; both empty means unknown. */
function approxBirthDate(fd: FormData): Date | null {
  const y = int(fd, "ageYears");
  const m = int(fd, "ageMonths");
  if (y === null && m === null) return null;
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear() - (y ?? 0), now.getUTCMonth() - (m ?? 0), 1));
}

export async function saveCat(fd: FormData): Promise<{ error: string } | void> {
  const user = await requireUser(["EDITOR"]);
  const id = optStr(fd, "id");
  const texts: Record<string, LocalizedText> = {
    name: localized(fd, "name", 80),
    summary: localized(fd, "summary", 400),
    story: localized(fd, "story"),
    character: localized(fd, "character"),
    health: localized(fd, "health"),
    adoptionTerms: localized(fd, "adoptionTerms"),
    // Special needs now live inside the health text (the form shows them merged).
    specialNeeds: {},
  };
  if (!texts.name.ru) return { error: "Укажите имя кота по-русски." };

  const status = await db.catStatus.findUnique({ where: { id: str(fd, "statusId") } });
  if (!status) return { error: "Выберите статус." };

  const before = id
    ? await db.cat.findUnique({ where: { id }, include: { flags: true, curators: true, bondedWith: { select: { id: true } } } })
    : null;
  if (id && !before) redirect("/admin/cats");

  const state = pick(str(fd, "state"), states, "DRAFT");
  const flagIds = ids(fd, "flags");
  const curatorIds = ids(fd, "curators");
  const bondedIds = ids(fd, "bonded").filter((b) => b !== id);

  // Admins write in Russian; English and Serbian are machine drafts they can edit later.
  const plan = planTranslations({
    submitted: texts,
    before: before ? Object.fromEntries(textFields.map((f) => [f, asLocalized(before[f])])) : null,
    beforeAuto: before?.autoTranslated,
    force: bool(fd, "retranslate"),
  });
  const autoTranslated = new Set<string>(plan.keepAuto);
  let translationNote: string | null = null;
  if (Object.keys(plan.sources).length) {
    const result = await translateFromRussian(plan.sources);
    if (result.ok) {
      for (const [field, locales] of Object.entries(plan.targets)) {
        for (const l of locales) {
          const v = result.values[l][field];
          if (!v) continue;
          texts[field] = { ...texts[field], [l]: v };
          autoTranslated.add(`${field}.${l}` satisfies AutoKey);
        }
      }
    } else {
      translationNote = `Сохранено без перевода: ${result.reason}. На сайте пока будет русский текст.`;
    }
  }

  const exact = bool(fd, "birthDateExact");
  const requestedSlug = str(fd, "slug", 60);
  const slug = await uniqueSlug(requestedSlug || texts.name.en || texts.name.ru, id ?? undefined);

  const data = {
    slug,
    name: texts.name,
    summary: texts.summary,
    story: texts.story,
    character: texts.character,
    health: texts.health,
    adoptionTerms: texts.adoptionTerms,
    specialNeeds: texts.specialNeeds,
    originalLocale: "ru",
    autoTranslated: [...autoTranslated],
    sex: pick(str(fd, "sex"), sexes, "UNKNOWN"),
    birthDate: exact ? date(fd, "birthDate") : approxBirthDate(fd),
    birthDateExact: exact,
    color: optStr(fd, "color", 80),
    sterilized: pick(str(fd, "sterilized"), tri, "UNKNOWN"),
    vaccinated: pick(str(fd, "vaccinated"), tri, "UNKNOWN"),
    chipped: pick(str(fd, "chipped"), tri, "UNKNOWN"),
    fiv: pick(str(fd, "fiv"), tests, "NOT_TESTED"),
    felv: pick(str(fd, "felv"), tests, "NOT_TESTED"),
    hasSpecialNeeds: false,
    statusId: status.id,
    state,
    isPinned: bool(fd, "isPinned"),
    manualPriority: int(fd, "manualPriority") ?? 0,
    countInStats: bool(fd, "countInStats"),
    intakeDate: date(fd, "intakeDate") ?? before?.intakeDate ?? new Date(),
    publishedAt: state === "PUBLISHED" ? (before?.publishedAt ?? new Date()) : (before?.publishedAt ?? null),
    adoptedAt:
      status.group === "ADOPTED" ? (date(fd, "adoptedAt") ?? before?.adoptedAt ?? new Date()) : (date(fd, "adoptedAt") ?? null),
  };

  const cat = await db.$transaction(async (tx) => {
    const saved = id
      ? await tx.cat.update({ where: { id }, data })
      : await tx.cat.create({ data: { ...data, createdAt: new Date() } });
    await tx.catFlagOnCat.deleteMany({ where: { catId: saved.id } });
    if (flagIds.length) await tx.catFlagOnCat.createMany({ data: flagIds.map((flagId) => ({ catId: saved.id, flagId })) });
    await tx.catCurator.deleteMany({ where: { catId: saved.id } });
    if (curatorIds.length)
      await tx.catCurator.createMany({ data: curatorIds.map((userId, i) => ({ catId: saved.id, userId, sortOrder: i })) });
    await tx.cat.update({
      where: { id: saved.id },
      data: { bondedWith: { set: bondedIds.map((b) => ({ id: b })) } },
    });
    return saved;
  });

  await audit({
    actorId: user.id,
    action: id ? (before?.state !== state ? `cat.state.${state.toLowerCase()}` : "cat.update") : "cat.create",
    entityType: "Cat",
    entityId: cat.id,
    before: before ?? undefined,
    after: { ...data, flagIds, curatorIds, bondedIds },
  });
  revalidatePath("/", "layout");
  redirect(`/admin/cats/${cat.id}?${translationNote ? `notice=${encodeURIComponent(translationNote)}` : "saved=1"}`);
}

export async function uploadPhotos(fd: FormData) {
  const user = await requireUser(["EDITOR"]);
  const catId = str(fd, "catId");
  const cat = await db.cat.findUnique({ where: { id: catId }, select: { id: true, coverId: true } });
  if (!cat) redirect("/admin/cats");
  const files = fd.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  const last = await db.mediaAsset.aggregate({ where: { catId }, _max: { sortOrder: true } });
  let order = (last._max.sortOrder ?? 0) + 1;
  const errors: string[] = [];
  let firstId: string | null = null;
  for (const file of files) {
    try {
      const stored = await storePhoto(Buffer.from(await file.arrayBuffer()));
      const asset = await db.mediaAsset.create({
        data: { ...stored, kind: "PHOTO", catId, sortOrder: order++, createdById: user.id },
      });
      firstId ??= asset.id;
      await audit({ actorId: user.id, action: "media.upload", entityType: "MediaAsset", entityId: asset.id, after: { catId, storageKey: stored.storageKey } });
    } catch (e) {
      errors.push(`${file.name}: ${e instanceof Error ? e.message : "ошибка"}`);
    }
  }
  if (!cat!.coverId && firstId) await db.cat.update({ where: { id: catId }, data: { coverId: firstId } });
  revalidatePath("/", "layout");
  const q = errors.length ? `error=${encodeURIComponent("Не загружены: " + errors.join("; "))}` : "saved=1";
  redirect(`/admin/cats/${catId}?${q}#photos`);
}

export async function updatePhoto(fd: FormData) {
  const user = await requireUser(["EDITOR"]);
  const id = str(fd, "id");
  const asset = await db.mediaAsset.findUnique({ where: { id } });
  if (!asset?.catId) redirect("/admin/cats");
  const op = str(fd, "op");
  if (op === "cover") {
    await db.cat.update({ where: { id: asset!.catId! }, data: { coverId: asset!.id } });
  } else if (op === "hide" || op === "show") {
    await db.mediaAsset.update({ where: { id }, data: { isHidden: op === "hide" } });
    if (op === "hide") await db.cat.updateMany({ where: { coverId: id }, data: { coverId: null } });
  } else if (op === "up" || op === "down") {
    const siblings = await db.mediaAsset.findMany({ where: { catId: asset!.catId }, orderBy: { sortOrder: "asc" } });
    const i = siblings.findIndex((s) => s.id === id);
    const j = op === "up" ? i - 1 : i + 1;
    if (i >= 0 && j >= 0 && j < siblings.length) {
      const reordered = [...siblings];
      [reordered[i], reordered[j]] = [reordered[j], reordered[i]];
      await db.$transaction(reordered.map((s, k) => db.mediaAsset.update({ where: { id: s.id }, data: { sortOrder: k } })));
    }
  } else if (op === "delete") {
    await db.cat.updateMany({ where: { coverId: id }, data: { coverId: null } });
    await db.mediaAsset.delete({ where: { id } });
    if (asset!.storageKey) await deletePhoto(asset!.storageKey);
  } else if (op === "alt") {
    await db.mediaAsset.update({ where: { id }, data: { alt: localized(fd, "alt", 200) } });
  }
  await audit({ actorId: user.id, action: `media.${op}`, entityType: "MediaAsset", entityId: id });
  revalidatePath("/", "layout");
  redirect(`/admin/cats/${asset!.catId}?saved=1#photos`);
}

export async function addInstagramLink(fd: FormData) {
  const user = await requireUser(["EDITOR"]);
  const catId = str(fd, "catId");
  const url = str(fd, "url", 500);
  let ok = false;
  try {
    const u = new URL(url);
    ok = u.protocol === "https:" && /(^|\.)instagram\.com$/.test(u.hostname);
  } catch {}
  if (!ok) redirect(`/admin/cats/${catId}?error=${encodeURIComponent("Нужна ссылка на instagram.com")}#photos`);
  const asset = await db.mediaAsset.create({ data: { kind: "INSTAGRAM", url, catId, sortOrder: 1000, createdById: user.id } });
  await audit({ actorId: user.id, action: "media.instagram_add", entityType: "MediaAsset", entityId: asset.id, after: { url, catId } });
  revalidatePath("/", "layout");
  redirect(`/admin/cats/${catId}?saved=1#photos`);
}

export async function saveCatUpdate(fd: FormData) {
  const user = await requireUser(["EDITOR"]);
  const catId = str(fd, "catId");
  const id = optStr(fd, "id");
  const text = localized(fd, "text");
  if (!Object.keys(text).length && !id) redirect(`/admin/cats/${catId}?error=${encodeURIComponent("Пустая новость.")}#updates`);
  const state = pick(str(fd, "state"), states, "PUBLISHED");
  const data = { text, date: date(fd, "date") ?? new Date(), state };
  const before = id ? await db.catUpdate.findUnique({ where: { id } }) : null;
  const saved = id
    ? await db.catUpdate.update({ where: { id }, data })
    : await db.catUpdate.create({ data: { ...data, catId, createdById: user.id } });
  await audit({ actorId: user.id, action: id ? "cat_update.update" : "cat_update.create", entityType: "CatUpdate", entityId: saved.id, before: before ?? undefined, after: data });
  revalidatePath("/", "layout");
  redirect(`/admin/cats/${catId}?saved=1#updates`);
}
