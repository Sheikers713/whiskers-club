import "server-only";
import { db } from "./db";
import type { LocalizedText } from "./i18n/localized";

/** Site-wide settings editable by the superadmin. */
export type SiteSettings = {
  // RSD per 1 EUR, used only for the approximate euro hint (decision 1.8).
  eurRate: number;
  // Cats helped before the site existed are added to the counters (decision 3.4).
  counterOffsets: { rescued: number; adopted: number; sterilized: number };
  heroText: LocalizedText;
  aboutText: LocalizedText;
  malaStory: LocalizedText;
  privacyText: LocalizedText;
  instagramUrl: string;
  telegramUrl: string;
  contactEmail: string;
  contactText: LocalizedText;
};

export const defaultSettings: SiteSettings = {
  eurRate: 117,
  counterOffsets: { rescued: 27, adopted: 0, sterilized: 0 },
  heroText: {},
  aboutText: {},
  malaStory: {},
  privacyText: {},
  instagramUrl: "https://www.instagram.com/whiskersclub.rs/",
  telegramUrl: "",
  contactEmail: "",
  contactText: {},
};

export async function getSettings(): Promise<SiteSettings> {
  const rows = await db.siteSetting.findMany();
  const out: Record<string, unknown> = { ...defaultSettings };
  for (const row of rows) {
    if (row.key in defaultSettings) out[row.key] = row.value;
  }
  return out as SiteSettings;
}

export async function setSetting<K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) {
  await db.siteSetting.upsert({
    where: { key },
    create: { key, value: value as object },
    update: { value: value as object },
  });
}
