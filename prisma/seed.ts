// Reference data every installation needs. Safe to run repeatedly: existing
// rows are left alone so admin edits are never overwritten.
//
// Also creates the first superadmin from ADMIN_EMAIL / ADMIN_PASSWORD when no
// user exists yet.
import { PrismaClient, type StatusGroup } from "@prisma/client";
import { hash } from "@node-rs/argon2";

const db = new PrismaClient();

type L = { en: string; ru: string; sr: string };

const statuses: Array<{
  key: string;
  label: L;
  color: string;
  group: StatusGroup;
  priority: number;
  isPublic?: boolean;
}> = [
  { key: "urgent", label: { en: "Urgent help", ru: "Срочная помощь", sr: "Hitna pomoć" }, color: "#c82424", group: "ACTIVE", priority: 10 },
  { key: "ready", label: { en: "Ready for adoption", ru: "Готов к пристройству", sr: "Spreman za udomljavanje" }, color: "#5f6e5b", group: "ACTIVE", priority: 20 },
  { key: "reserved", label: { en: "Reserved", ru: "Забронирован", sr: "Rezervisan" }, color: "#51443e", group: "ACTIVE", priority: 25 },
  { key: "treatment", label: { en: "In treatment", ru: "На лечении", sr: "Na lečenju" }, color: "#cf6437", group: "ACTIVE", priority: 30 },
  { key: "quarantine", label: { en: "Quarantine", ru: "Карантин", sr: "Karantin" }, color: "#8d98a0", group: "ACTIVE", priority: 40 },
  { key: "foster", label: { en: "Foster care", ru: "На передержке", sr: "Privremeni dom" }, color: "#71816d", group: "ACTIVE", priority: 50 },
  { key: "adopted", label: { en: "Adopted", ru: "Нашёл дом", sr: "Udomljen" }, color: "#e39a46", group: "ADOPTED", priority: 90 },
  { key: "tnr", label: { en: "Released after TNR", ru: "Выпущен после TNR", sr: "Pušten posle TNR" }, color: "#616161", group: "ARCHIVE", priority: 95, isPublic: false },
  { key: "memorial", label: { en: "Memorial", ru: "Память", sr: "Sećanje" }, color: "#424242", group: "ARCHIVE", priority: 97 },
  { key: "archive", label: { en: "Archive", ru: "Архив", sr: "Arhiva" }, color: "#9e9e9e", group: "ARCHIVE", priority: 99, isPublic: false },
];

const flags: Array<{ key: string; label: L }> = [
  { key: "looking_for_home", label: { en: "Looking for a home", ru: "Ищет дом", sr: "Traži dom" } },
  { key: "foster", label: { en: "In foster care", ru: "На передержке", sr: "U privremenom domu" } },
  { key: "urgent", label: { en: "Urgent", ru: "Срочно", sr: "Hitno" } },
];

const filters: Array<{
  key: string;
  label: L;
  statusGroups?: StatusGroup[];
  statusKeys?: string[];
  flagKeys?: string[];
  requireActiveCampaign?: boolean;
}> = [
  { key: "all", label: { en: "All cats", ru: "Все", sr: "Sve" } },
  { key: "looking", label: { en: "Looking for a home", ru: "Ищут дом", sr: "Traže dom" }, flagKeys: ["looking_for_home"] },
  { key: "fundraising", label: { en: "Need help", ru: "Нужна помощь", sr: "Potrebna pomoć" }, requireActiveCampaign: true },
  { key: "treatment", label: { en: "In treatment", ru: "На лечении", sr: "Na lečenju" }, statusKeys: ["urgent", "treatment", "quarantine"] },
  { key: "foster", label: { en: "Foster care", ru: "Передержка", sr: "Privremeni dom" }, flagKeys: ["foster"] },
  { key: "happy", label: { en: "Happy endings", ru: "Нашли дом", sr: "Srećni krajevi" }, statusGroups: ["ADOPTED"] },
];

const categories: Array<{ key: string; label: L }> = [
  { key: "veterinary", label: { en: "Veterinary care", ru: "Ветеринария", sr: "Veterinarske usluge" } },
  { key: "tests", label: { en: "Tests", ru: "Анализы", sr: "Analize" } },
  { key: "medication", label: { en: "Medication", ru: "Лекарства", sr: "Lekovi" } },
  { key: "food", label: { en: "Food", ru: "Корм", sr: "Hrana" } },
  { key: "litter", label: { en: "Litter", ru: "Наполнитель", sr: "Posip" } },
  { key: "transport", label: { en: "Transportation", ru: "Транспорт", sr: "Prevoz" } },
  { key: "foster", label: { en: "Foster care", ru: "Передержка", sr: "Privremeni smeštaj" } },
  { key: "equipment", label: { en: "Equipment", ru: "Снаряжение", sr: "Oprema" } },
  { key: "administration", label: { en: "Administration", ru: "Администрирование", sr: "Administracija" } },
  { key: "other", label: { en: "Other", ru: "Другое", sr: "Ostalo" } },
];

async function main() {
  for (const [i, s] of statuses.entries()) {
    await db.catStatus.upsert({
      where: { key: s.key },
      update: {},
      create: { ...s, sortOrder: i, isPublic: s.isPublic ?? true },
    });
  }
  for (const [i, f] of flags.entries()) {
    await db.catFlag.upsert({ where: { key: f.key }, update: {}, create: { ...f, sortOrder: i } });
  }
  for (const [i, f] of filters.entries()) {
    await db.catalogFilter.upsert({
      where: { key: f.key },
      update: {},
      create: {
        key: f.key,
        label: f.label,
        sortOrder: i,
        statusGroups: f.statusGroups ?? ["ACTIVE"],
        statusKeys: f.statusKeys ?? [],
        flagKeys: f.flagKeys ?? [],
        requireActiveCampaign: f.requireActiveCampaign ?? false,
      },
    });
  }
  for (const [i, c] of categories.entries()) {
    await db.expenseCategory.upsert({ where: { key: c.key }, update: {}, create: { ...c, sortOrder: i } });
  }

  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if ((await db.user.count()) === 0) {
    if (!email || !password) {
      console.warn("No users yet. Set ADMIN_EMAIL and ADMIN_PASSWORD and run the seed again.");
    } else {
      await db.user.create({
        data: {
          email,
          name: process.env.ADMIN_NAME ?? "Admin",
          roles: ["SUPERADMIN"],
          passwordHash: await hash(password, { memoryCost: 19456, timeCost: 2, parallelism: 1 }),
        },
      });
      console.log(`Created superadmin ${email}`);
    }
  }
  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
