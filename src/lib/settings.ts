import "server-only";
import { db } from "./db";
import type { LocalizedText } from "./i18n/localized";
import { defaultTheme, normalizeTheme, normalizeVariants, type Theme, type ThemeVariant } from "./theme";

/** Site-wide settings editable by the superadmin. */
export type SiteSettings = {
  // RSD per 1 EUR, used only for the approximate euro hint (decision 1.8).
  eurRate: number;
  // Cats helped before the site existed are added to the counters (decision 3.4).
  counterOffsets: { rescued: number; adopted: number; sterilized: number };
  // Money on hand when the records start: the Whiskers Club general fund, tied
  // to no cat. Fixed in code (OPENING_BALANCE), not editable in the admin.
  openingBalance: { amountRsd: number; date: string };
  // Counters on the home page; off until the numbers are filled in.
  showStats: boolean;
  heroText: LocalizedText;
  aboutText: LocalizedText;
  malaStory: LocalizedText;
  privacyText: LocalizedText;
  instagramUrl: string;
  facebookUrl: string;
  youtubeUrl: string;
  tiktokUrl: string;
  telegramUrl: string;
  paypalUrl: string;
  // IPS QR code for RSD transfers from Serbian banks («IPS skeniraj»): on every
  // cat page and on «Как помочь». The reference in the code names the cat.
  ips: { enabled: boolean; account: string; recipient: string };
  // Public spreadsheet with donation reports.
  reportsUrl: string;
  contactEmail: string;
  contactText: LocalizedText;
  // Colours, fonts, radii and background of the public site («Оформление»).
  theme: Theme;
  // Themes kept in «Оформление» to try later; `theme` above is the one on the site.
  themeVariants: ThemeVariant[];
};

/**
 * Money on hand when the books start. It was 10 918 RSD on 1 September 2026
 * (Кристина, left after Mala); on 1 October 2026 all of it went to Zhuk and is
 * now an ordinary donation on him, so the fund starts at zero. Fixed in code:
 * not editable in the admin, and a value saved in the database is ignored.
 */
export const OPENING_BALANCE: SiteSettings["openingBalance"] = { amountRsd: 0, date: "2026-09-01" };

export const defaultSettings: SiteSettings = {
  eurRate: 117,
  counterOffsets: { rescued: 27, adopted: 0, sterilized: 0 },
  openingBalance: OPENING_BALANCE,
  showStats: false,
  heroText: {},
  aboutText: {},
  malaStory: {},
  privacyText: {},
  instagramUrl: "https://www.instagram.com/whiskers_club.rs/",
  facebookUrl: "https://www.facebook.com/whiskersclub.rs/",
  youtubeUrl: "https://www.youtube.com/@whiskers_club",
  tiktokUrl: "https://www.tiktok.com/@whiskers_club.rs",
  telegramUrl: "",
  paypalUrl: "https://paypal.me/natashuko",
  // The Raiffeisen account already listed under «RSD перевод из сербского банка».
  ips: { enabled: true, account: "265000000700256005", recipient: "KRISTINA NIKITINA" },
  reportsUrl: "https://docs.google.com/spreadsheets/d/1VcEOPmK-3-YhS6kpLkc3LMb6lw5ahFy0QA55CFb-AsA/edit?usp=drivesdk",
  contactEmail: "",
  contactText: {},
  theme: defaultTheme,
  themeVariants: [],
};

export async function getSettings(): Promise<SiteSettings> {
  const rows = await db.siteSetting.findMany();
  const out: Record<string, unknown> = { ...defaultSettings };
  for (const row of rows) {
    if (row.key in defaultSettings) out[row.key] = row.value;
  }
  // The first default pointed at a wrong account; saved copies of it are fixed here.
  if (out.instagramUrl === "https://www.instagram.com/whiskersclub.rs/") out.instagramUrl = defaultSettings.instagramUrl;
  out.openingBalance = OPENING_BALANCE;
  out.theme = normalizeTheme(out.theme);
  out.themeVariants = normalizeVariants(out.themeVariants);
  return out as SiteSettings;
}

export async function setSetting<K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) {
  await db.siteSetting.upsert({
    where: { key },
    create: { key, value: value as object },
    update: { value: value as object },
  });
}
