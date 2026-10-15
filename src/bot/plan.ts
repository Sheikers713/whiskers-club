import { z } from "zod";

/**
 * What the model may propose. The schema is flat (one object type with
 * optional fields) because local models follow flat JSON schemas far more
 * reliably than unions. `normalize` turns it into checked, typed changes.
 */
const tri = z.enum(["YES", "NO", "UNKNOWN"]);
const test = z.enum(["NEGATIVE", "POSITIVE", "PENDING", "NOT_TESTED"]);

export const actionTypes = ["create_cat", "update_cat", "cat_news", "add_photos", "donation", "expense"] as const;

export const rawActionSchema = z.object({
  type: z.enum(actionTypes),
  cat: z.string().optional(),
  // Cat profile.
  name: z.string().optional(),
  sex: z.enum(["FEMALE", "MALE", "UNKNOWN"]).optional(),
  birthDate: z.string().optional(),
  color: z.string().optional(),
  status: z.string().optional(),
  visibility: z.enum(["PUBLISHED", "HIDDEN", "DRAFT"]).optional(),
  summary: z.string().optional(),
  story: z.string().optional(),
  character: z.string().optional(),
  health: z.string().optional(),
  specialNeeds: z.string().optional(),
  adoptionTerms: z.string().optional(),
  sterilized: tri.optional(),
  vaccinated: tri.optional(),
  chipped: tri.optional(),
  fiv: test.optional(),
  felv: test.optional(),
  goodWithCats: tri.optional(),
  goodWithDogs: tri.optional(),
  goodWithKids: tri.optional(),
  cover: z.boolean().optional(),
  // News.
  text: z.string().optional(),
  date: z.string().optional(),
  // Money.
  amount: z.number().optional(),
  currency: z.string().optional(),
  donorName: z.string().optional(),
  publicName: z.string().optional(),
  showName: z.boolean().optional(),
  method: z.string().optional(),
  comment: z.string().optional(),
  category: z.string().optional(),
  description: z.string().optional(),
  vendor: z.string().optional(),
  cats: z.array(z.string()).optional(),
  campaign: z.string().optional(),
  payer: z.string().optional(),
  noReceiptReason: z.string().optional(),
});

export const rawPlanSchema = z.object({
  actions: z.array(rawActionSchema),
  question: z.string().optional(),
});

export type RawAction = z.infer<typeof rawActionSchema>;
export type RawPlan = z.infer<typeof rawPlanSchema>;

// ---------------------------------------------------------------------------
// What the bot knows about the site when it reads a message.

export type CatRef = { id: string; slug: string; name: string; status: string; state: string };
export type SiteContext = {
  today: string; // YYYY-MM-DD, Europe/Belgrade
  cats: CatRef[];
  statuses: { key: string; label: string }[];
  categories: { key: string; label: string }[];
  campaigns: { id: string; key: string; title: string }[];
  /** RSD per unit of foreign currency, e.g. { EUR: 117.2 }. */
  rates: Record<string, number>;
};

export const catTextFields = ["name", "summary", "story", "character", "health", "specialNeeds", "adoptionTerms"] as const;
export type CatTextField = (typeof catTextFields)[number];
const catEnumFields = [
  "sex",
  "sterilized",
  "vaccinated",
  "chipped",
  "fiv",
  "felv",
  "goodWithCats",
  "goodWithDogs",
  "goodWithKids",
] as const;
export type CatEnumField = (typeof catEnumFields)[number];

export type CatChanges = {
  texts: Partial<Record<CatTextField, string>>;
  enums: Partial<Pick<RawAction, CatEnumField>>;
  birthDate?: string;
  color?: string;
  statusKey?: string;
  visibility?: "PUBLISHED" | "HIDDEN" | "DRAFT";
};

/** A reference to a cat: an existing one, or the one created earlier in the same plan. */
export type CatTarget = { kind: "existing"; cat: CatRef } | { kind: "new"; name: string };

export type Money = { amountRsd: number; original?: string };

export type Change =
  | { type: "create_cat"; changes: CatChanges; withPhotos: boolean }
  | { type: "update_cat"; cat: CatRef; changes: CatChanges }
  | { type: "cat_news"; cat: CatTarget; text: string; date: string }
  | { type: "add_photos"; cat: CatTarget; cover: boolean }
  | {
      type: "donation";
      date: string;
      money: Money;
      donorName?: string;
      publicName?: string;
      showName: boolean;
      method?: string;
      comment?: string;
      cat?: CatRef;
      campaign?: { id: string; title: string };
    }
  | {
      type: "expense";
      date: string;
      money: Money;
      categoryKey: string;
      description: string;
      vendor?: string;
      cats: CatRef[];
      campaign?: { id: string; title: string };
      payer?: string;
      method?: string;
      noReceiptReason?: string;
      withReceipt: boolean;
    };

export type Plan = { changes: Change[]; problems: string[]; question?: string };

// ---------------------------------------------------------------------------
// Normalization

const clean = (s: string | undefined, max = 4000) => {
  const v = s?.trim();
  return v ? v.slice(0, max) : undefined;
};

const lower = (s: string) => s.toLowerCase().replace(/ё/g, "е").trim();

/** Finds a cat by slug, or failing that by its Russian name. */
export function findCat(ctx: SiteContext, ref: string | undefined): CatRef | undefined {
  if (!ref) return undefined;
  const r = lower(ref);
  return (
    ctx.cats.find((c) => c.slug === r) ??
    ctx.cats.find((c) => lower(c.name) === r) ??
    ctx.cats.find((c) => lower(c.name).startsWith(`${r} `)) ??
    // Russian declension: "Барсику", "Барсика" -> "Барсик".
    ctx.cats.find((c) => lower(c.name).length >= 3 && r.startsWith(lower(c.name).slice(0, Math.max(3, lower(c.name).length - 1))))
  );
}

function isoDate(value: string | undefined): string | undefined {
  const v = value?.trim();
  if (v && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`))) return v;
  return undefined;
}

function money(a: RawAction, ctx: SiteContext, problems: string[], what: string): Money | null {
  if (typeof a.amount !== "number" || !Number.isFinite(a.amount) || a.amount <= 0) {
    problems.push(`${what}: не понял сумму.`);
    return null;
  }
  const currency = (a.currency ?? "RSD").toUpperCase().replace("DIN", "RSD").replace("€", "EUR");
  if (currency === "RSD") return { amountRsd: Math.round(a.amount) };
  const rate = ctx.rates[currency];
  if (!rate) {
    problems.push(`${what}: сумма в ${currency}, а курса для неё нет. Напишите сумму в динарах.`);
    return null;
  }
  return { amountRsd: Math.round(a.amount * rate), original: `${a.amount} ${currency} по курсу ${rate}` };
}

function catChanges(a: RawAction, ctx: SiteContext, problems: string[]): CatChanges {
  const changes: CatChanges = { texts: {}, enums: {} };
  for (const f of catTextFields) {
    const v = clean(a[f], f === "name" ? 80 : f === "summary" ? 400 : 20_000);
    if (v) changes.texts[f] = v;
  }
  for (const f of catEnumFields) if (a[f]) (changes.enums as Record<string, string>)[f] = a[f];
  if (a.birthDate) {
    const d = isoDate(a.birthDate);
    if (d) changes.birthDate = d;
    else problems.push(`Не понял дату рождения «${a.birthDate}».`);
  }
  if (clean(a.color)) changes.color = clean(a.color, 80);
  if (a.status) {
    const s = ctx.statuses.find((x) => x.key === a.status || lower(x.label) === lower(a.status!));
    if (s) changes.statusKey = s.key;
    else problems.push(`Нет статуса «${a.status}».`);
  }
  if (a.visibility) changes.visibility = a.visibility;
  return changes;
}

function isEmptyChanges(c: CatChanges) {
  return (
    !Object.keys(c.texts).length &&
    !Object.keys(c.enums).length &&
    !c.birthDate &&
    !c.color &&
    !c.statusKey &&
    !c.visibility
  );
}

/**
 * Checks the model's proposal against the database context. Anything that
 * cannot be resolved becomes a human-readable problem instead of a change.
 */
export function normalize(raw: RawPlan, ctx: SiteContext, opts: { photoCount: number }): Plan {
  const problems: string[] = [];
  const changes: Change[] = [];
  let newCatName: string | undefined;
  let photosUsed = false;

  const target = (ref: string | undefined, what: string): CatTarget | null => {
    if (newCatName && ref && (ref === "new" || lower(ref) === lower(newCatName))) return { kind: "new", name: newCatName };
    const cat = findCat(ctx, ref);
    if (cat) return { kind: "existing", cat };
    problems.push(ref ? `${what}: не нашёл кота «${ref}».` : `${what}: не понял, о каком коте речь.`);
    return null;
  };

  for (const a of raw.actions) {
    switch (a.type) {
      case "create_cat": {
        const c = catChanges(a, ctx, problems);
        if (!c.texts.name) {
          problems.push("Новый кот: не понял имя.");
          break;
        }
        if (findCat(ctx, c.texts.name) && lower(findCat(ctx, c.texts.name)!.name) === lower(c.texts.name))
          problems.push(`Кот с именем «${c.texts.name}» уже есть на сайте; если это другой кот, всё равно будет создан новый.`);
        newCatName = c.texts.name;
        const withPhotos: boolean = opts.photoCount > 0 && !photosUsed;
        photosUsed ||= withPhotos;
        changes.push({ type: "create_cat", changes: c, withPhotos });
        break;
      }
      case "update_cat": {
        const created = changes.find((c) => c.type === "create_cat");
        if (created && newCatName && a.cat && (a.cat === "new" || lower(a.cat) === lower(newCatName))) {
          // Facts about the cat created in this same message go into its profile.
          const extra = catChanges(a, ctx, problems);
          Object.assign(created.changes.texts, extra.texts);
          Object.assign(created.changes.enums, extra.enums);
          for (const k of ["birthDate", "color", "statusKey", "visibility"] as const)
            if (extra[k]) (created.changes as Record<string, unknown>)[k] = extra[k];
          break;
        }
        const cat = findCat(ctx, a.cat);
        if (!cat) {
          problems.push(a.cat ? `Не нашёл кота «${a.cat}».` : "Не понял, какого кота обновить.");
          break;
        }
        const c = catChanges(a, ctx, problems);
        if (!isEmptyChanges(c)) changes.push({ type: "update_cat", cat, changes: c });
        break;
      }
      case "cat_news": {
        const text = clean(a.text, 4000);
        const t = target(a.cat, "Новость");
        if (!t) break;
        if (!text) {
          problems.push("Новость: пустой текст.");
          break;
        }
        changes.push({ type: "cat_news", cat: t, text, date: isoDate(a.date) ?? ctx.today });
        break;
      }
      case "add_photos": {
        if (!opts.photoCount) {
          problems.push("Фото: в сообщении нет фотографий.");
          break;
        }
        if (photosUsed) break;
        const t = target(a.cat, "Фото");
        if (!t) break;
        photosUsed = true;
        changes.push({ type: "add_photos", cat: t, cover: a.cover ?? false });
        break;
      }
      case "donation": {
        const m = money(a, ctx, problems, "Пожертвование");
        if (!m) break;
        const cat = a.cat ? findCat(ctx, a.cat) : undefined;
        if (a.cat && !cat) problems.push(`Пожертвование: не нашёл кота «${a.cat}», запишу в общий фонд.`);
        const campaign = a.campaign ? ctx.campaigns.find((c) => c.key === a.campaign) : undefined;
        changes.push({
          type: "donation",
          date: isoDate(a.date) ?? ctx.today,
          money: m,
          donorName: clean(a.donorName, 200),
          publicName: clean(a.publicName, 120),
          showName: a.showName ?? false,
          method: clean(a.method, 120),
          comment: clean(a.comment, 300),
          cat: campaign ? undefined : cat,
          campaign: campaign && { id: campaign.id, title: campaign.title },
        });
        break;
      }
      case "expense": {
        const m = money(a, ctx, problems, "Расход");
        if (!m) break;
        const category = ctx.categories.find((c) => c.key === a.category) ?? ctx.categories.find((c) => c.key === "other");
        if (!category) {
          problems.push("Расход: нет категорий расходов на сайте.");
          break;
        }
        const description = clean(a.description, 1000) ?? clean(a.comment, 1000);
        if (!description) {
          problems.push("Расход: не понял, на что потрачено.");
          break;
        }
        const cats: CatRef[] = [];
        for (const ref of [...(a.cats ?? []), ...(a.cat ? [a.cat] : [])]) {
          const c = findCat(ctx, ref);
          if (c && !cats.includes(c)) cats.push(c);
          else if (!c) problems.push(`Расход: не нашёл кота «${ref}», расход будет без привязки к нему.`);
        }
        const campaign = a.campaign ? ctx.campaigns.find((c) => c.key === a.campaign) : undefined;
        const withReceipt: boolean = opts.photoCount > 0 && !photosUsed;
        photosUsed ||= withReceipt;
        changes.push({
          type: "expense",
          date: isoDate(a.date) ?? ctx.today,
          money: m,
          categoryKey: category.key,
          description,
          vendor: clean(a.vendor, 200),
          cats,
          campaign: campaign && { id: campaign.id, title: campaign.title },
          payer: clean(a.payer, 120),
          method: clean(a.method, 120),
          noReceiptReason: clean(a.noReceiptReason, 500),
          withReceipt,
        });
        break;
      }
    }
  }
  if (opts.photoCount && !photosUsed && changes.length)
    problems.push("Фотографии не к чему приложить: напишите, к какому коту или расходу они относятся.");
  return { changes, problems, question: clean(raw.question, 500) };
}

// ---------------------------------------------------------------------------
// Preview shown in Telegram before anything is written.

const enumRu: Record<string, string> = {
  YES: "да",
  NO: "нет",
  UNKNOWN: "неизвестно",
  NEGATIVE: "отрицательный",
  POSITIVE: "положительный",
  PENDING: "ждём результат",
  NOT_TESTED: "не тестировали",
  FEMALE: "кошка",
  MALE: "кот",
};
const fieldRu: Record<string, string> = {
  name: "Имя",
  summary: "Кратко",
  story: "История",
  character: "Характер",
  health: "Здоровье",
  specialNeeds: "Особые потребности",
  adoptionTerms: "Условия пристройства",
  sex: "Пол",
  sterilized: "Стерилизация",
  vaccinated: "Прививки",
  chipped: "Чип",
  fiv: "FIV",
  felv: "FeLV",
  goodWithCats: "Ладит с кошками",
  goodWithDogs: "Ладит с собаками",
  goodWithKids: "Ладит с детьми",
};
const visibilityRu = { PUBLISHED: "опубликован на сайте", HIDDEN: "скрыт с сайта", DRAFT: "черновик" };

export const rsd = (n: number) => `${n.toLocaleString("ru-RU").replace(/[\u00a0\u202f]/g, " ")} RSD`;
const short = (s: string, n = 300) => (s.length > n ? `${s.slice(0, n)}…` : s);

function describeCat(c: CatChanges, ctx: SiteContext): string[] {
  const lines: string[] = [];
  for (const [f, v] of Object.entries(c.texts)) lines.push(`  ${fieldRu[f]}: ${short(v)}`);
  for (const [f, v] of Object.entries(c.enums)) lines.push(`  ${fieldRu[f]}: ${enumRu[v] ?? v}`);
  if (c.birthDate) lines.push(`  Дата рождения: ${c.birthDate}`);
  if (c.color) lines.push(`  Окрас: ${c.color}`);
  if (c.statusKey) lines.push(`  Статус: ${ctx.statuses.find((s) => s.key === c.statusKey)?.label ?? c.statusKey}`);
  if (c.visibility) lines.push(`  Видимость: ${visibilityRu[c.visibility]}`);
  return lines;
}

function withoutName(texts: CatChanges["texts"]): CatChanges["texts"] {
  const rest = { ...texts };
  delete rest.name;
  return rest;
}

const catName = (t: CatTarget) => (t.kind === "new" ? `${t.name} (новый)` : t.cat.name);

export function describe(plan: Plan, ctx: SiteContext, photoCount: number): string {
  const out: string[] = [];
  plan.changes.forEach((ch, i) => {
    const n = `${i + 1}.`;
    switch (ch.type) {
      case "create_cat":
        out.push(`${n} 🐱 Новый кот «${ch.changes.texts.name}»`);
        out.push(...describeCat({ ...ch.changes, texts: withoutName(ch.changes.texts) }, ctx));
        if (!ch.changes.statusKey) out.push("  Статус: Готов к пристройству");
        if (!ch.changes.visibility) out.push(`  Видимость: ${visibilityRu.PUBLISHED}`);
        if (ch.withPhotos) out.push(`  Фото: ${photoCount}, первое станет обложкой`);
        break;
      case "update_cat":
        out.push(`${n} ✏️ ${ch.cat.name}: изменения анкеты`);
        out.push(...describeCat(ch.changes, ctx));
        break;
      case "cat_news":
        out.push(`${n} 📰 Новость у ${catName(ch.cat)} (${ch.date}):`);
        out.push(`  ${short(ch.text, 600)}`);
        break;
      case "add_photos":
        out.push(`${n} 📷 ${photoCount} фото в галерею ${catName(ch.cat)}${ch.cover ? ", первое станет обложкой" : ""}`);
        break;
      case "donation": {
        out.push(`${n} 💚 Пожертвование ${rsd(ch.money.amountRsd)} (${ch.date})`);
        if (ch.money.original) out.push(`  Пересчёт: ${ch.money.original}`);
        if (ch.donorName) out.push(`  От: ${ch.donorName} (видно только админам)`);
        out.push(`  На сайте: ${ch.showName && ch.publicName ? ch.publicName : "Аноним"}`);
        if (ch.method) out.push(`  Способ: ${ch.method}`);
        if (ch.comment) out.push(`  Комментарий: ${ch.comment}`);
        out.push(`  Куда: ${ch.campaign ? `сбор «${ch.campaign.title}»` : ch.cat ? `на ${ch.cat.name}` : "общий фонд"}`);
        break;
      }
      case "expense": {
        out.push(`${n} 🧾 Расход ${rsd(ch.money.amountRsd)} (${ch.date})`);
        if (ch.money.original) out.push(`  Пересчёт: ${ch.money.original}`);
        out.push(`  Категория: ${ctx.categories.find((c) => c.key === ch.categoryKey)?.label ?? ch.categoryKey}`);
        out.push(`  Описание: ${short(ch.description)}`);
        if (ch.vendor) out.push(`  Где: ${ch.vendor}`);
        if (ch.cats.length) out.push(`  Коты: ${ch.cats.map((c) => c.name).join(", ")}`);
        if (ch.campaign) out.push(`  Сбор: ${ch.campaign.title}`);
        if (ch.payer) out.push(`  Платил: ${ch.payer} (видно только админам)`);
        if (ch.withReceipt) out.push(`  Чек: ${photoCount} фото, закрыт от публики`);
        else if (ch.noReceiptReason) out.push(`  Без чека: ${ch.noReceiptReason}`);
        else out.push("  ⚠️ Нет чека и причины: сохраню черновиком. Пришлите фото чека или причину.");
        break;
      }
    }
  });
  if (plan.problems.length) {
    out.push("", "Не получилось разобрать:");
    for (const p of plan.problems) out.push(`• ${p}`);
  }
  if (plan.question) out.push("", `❓ ${plan.question}`);
  return out.join("\n");
}
