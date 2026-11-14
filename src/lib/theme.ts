/*
 * Site theme: the design tokens a superadmin can change in «Оформление».
 *
 * The base values live in globals.css (@theme). A saved theme only overrides
 * CSS custom properties on <html>, so every Tailwind class that already uses a
 * token (bg-brick, text-ink-soft, rounded-[var(--radius-card)] …) follows it.
 * Shared by the server (site layout) and the client (live preview), so no
 * server-only imports here.
 */

export const colorKeys = [
  "milk",
  "paper",
  "creamDeep",
  "ink",
  "inkSoft",
  "line",
  "brick",
  "orange",
  "sage",
  "olive",
  "sun",
] as const;
export type ColorKey = (typeof colorKeys)[number];

/** Admin labels and the role of each colour on the site. */
export const colorLabels: Record<ColorKey, { label: string; hint: string }> = {
  milk: { label: "Фон страницы", hint: "Основной фон, плашки, поля" },
  paper: { label: "Карточки", hint: "Фон карточек и полей ввода" },
  creamDeep: { label: "Блоки и подвал", hint: "Второстепенные секции, подвал" },
  ink: { label: "Текст", hint: "Основной текст и тёмные кнопки" },
  inkSoft: { label: "Текст второстепенный", hint: "Подписи, пояснения" },
  line: { label: "Линии", hint: "Рамки и разделители" },
  brick: { label: "Главный акцент", hint: "Кнопки «Помочь», ссылки" },
  orange: { label: "Второй акцент", hint: "Обводка фокуса, «Нашёл дом»" },
  sage: { label: "Успех", hint: "«Собрано», «подтверждено»" },
  olive: { label: "Фон героя", hint: "Подложка с точками за котом" },
  sun: { label: "Солнце", hint: "Первое солнце в герое" },
};

const cssVar: Record<ColorKey, string> = {
  milk: "--color-milk",
  paper: "--color-paper",
  creamDeep: "--color-cream-deep",
  ink: "--color-ink",
  inkSoft: "--color-ink-soft",
  line: "--color-line",
  brick: "--color-brick",
  orange: "--color-orange",
  sage: "--color-sage",
  olive: "--color-olive",
  sun: "--color-sun",
};

/** Self-hosted variable fonts, all with Cyrillic and Serbian Latin (č ć š ž đ). */
export const fonts = {
  manrope: { label: "Manrope", family: "\"Manrope Variable\"", fallback: "sans-serif" },
  onest: { label: "Onest", family: "\"Onest Variable\"", fallback: "sans-serif" },
  golos: { label: "Golos Text", family: "\"Golos Text Variable\"", fallback: "sans-serif" },
  rubik: { label: "Rubik", family: "\"Rubik Variable\"", fallback: "sans-serif" },
  montserrat: { label: "Montserrat", family: "\"Montserrat Variable\"", fallback: "sans-serif" },
  unbounded: { label: "Unbounded (широкий)", family: "\"Unbounded Variable\"", fallback: "sans-serif" },
  comfortaa: { label: "Comfortaa (округлый)", family: "\"Comfortaa Variable\"", fallback: "sans-serif" },
  lora: { label: "Lora (с засечками)", family: "\"Lora Variable\"", fallback: "serif" },
  playfair: { label: "Playfair Display (с засечками)", family: "\"Playfair Display Variable\"", fallback: "serif" },
} as const;
export type FontKey = keyof typeof fonts;

export type Theme = {
  colors: Record<ColorKey, string>;
  bodyFont: FontKey;
  displayFont: FontKey;
  // Poster headings: weight 400–900 and tracking in thousandths of an em.
  displayWeight: number;
  displayTracking: number;
  // px; 999 means a pill.
  radiusCard: number;
  radiusControl: number;
  gradient: { enabled: boolean; from: string; to: string; angle: number };
};

/** The brand book look the site has today. Saving nothing keeps exactly this. */
export const defaultTheme: Theme = {
  colors: {
    milk: "#f4eee4",
    paper: "#f8f3eb",
    creamDeep: "#e9dfd0",
    ink: "#242322",
    inkSoft: "#5d5852",
    line: "#ddd3c4",
    brick: "#c82424",
    orange: "#cf6437",
    sage: "#5f6e5b",
    olive: "#aebcaa",
    sun: "#efc766",
  },
  bodyFont: "manrope",
  displayFont: "manrope",
  displayWeight: 800,
  displayTracking: -45,
  radiusCard: 10,
  radiusControl: 7,
  gradient: { enabled: false, from: "#e4e9d8", to: "#ebdfc8", angle: 160 },
};

export const themePresets: { key: string; label: string; note: string; theme: Theme }[] = [
  { key: "brand", label: "Бренд-бук (сейчас)", note: "Как сайт выглядит сейчас", theme: defaultTheme },
  {
    key: "sage",
    label: "Шалфей и мох",
    note: "Градиент шалфей → беж, тёмно-моховые кнопки-пилюли, горчичное солнце, широкие заголовки",
    theme: {
      colors: {
        milk: "#eef0e4",
        paper: "#fbfaf4",
        creamDeep: "#e2e3d0",
        ink: "#22261f",
        inkSoft: "#575d4f",
        line: "#d5d8c4",
        brick: "#33402c",
        orange: "#c9862b",
        sage: "#56704c",
        olive: "#b7c2a0",
        sun: "#e6b43f",
      },
      bodyFont: "onest",
      displayFont: "unbounded",
      displayWeight: 700,
      displayTracking: -30,
      radiusCard: 22,
      radiusControl: 999,
      gradient: { enabled: true, from: "#e3e9d6", to: "#e9dcc2", angle: 160 },
    },
  },
  {
    key: "red-sage",
    label: "Красный на шалфее",
    note: "Фирменный красный остаётся, фон уходит в зелёный градиент, текст тёмно-зелёный",
    theme: {
      colors: {
        milk: "#eff0e6",
        paper: "#fbfaf5",
        creamDeep: "#e3e2d2",
        ink: "#1f2a24",
        inkSoft: "#55605a",
        line: "#d6d9ca",
        brick: "#c82424",
        orange: "#d27a2c",
        sage: "#5f6e5b",
        olive: "#aebcaa",
        sun: "#efc766",
      },
      bodyFont: "golos",
      displayFont: "montserrat",
      displayWeight: 900,
      displayTracking: -40,
      radiusCard: 16,
      radiusControl: 12,
      gradient: { enabled: true, from: "#e2e9da", to: "#efe3cd", angle: 165 },
    },
  },
];

const HEX = /^#[0-9a-f]{6}$/i;
const clamp = (v: unknown, min: number, max: number, dflt: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(Math.min(max, Math.max(min, n))) : dflt;
};
const hex = (v: unknown, dflt: string) => (typeof v === "string" && HEX.test(v) ? v.toLowerCase() : dflt);
const font = (v: unknown, dflt: FontKey): FontKey => (typeof v === "string" && v in fonts ? (v as FontKey) : dflt);

/** Anything stored or posted becomes a valid theme; unknown values fall back to the default. */
export function normalizeTheme(raw: unknown): Theme {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<Record<keyof Theme, unknown>>;
  const c = (r.colors && typeof r.colors === "object" ? r.colors : {}) as Record<string, unknown>;
  const g = (r.gradient && typeof r.gradient === "object" ? r.gradient : {}) as Record<string, unknown>;
  const d = defaultTheme;
  return {
    colors: Object.fromEntries(colorKeys.map((k) => [k, hex(c[k], d.colors[k])])) as Theme["colors"],
    bodyFont: font(r.bodyFont, d.bodyFont),
    displayFont: font(r.displayFont, d.displayFont),
    displayWeight: clamp(r.displayWeight, 300, 900, d.displayWeight),
    displayTracking: clamp(r.displayTracking, -80, 80, d.displayTracking),
    radiusCard: clamp(r.radiusCard, 0, 40, d.radiusCard),
    radiusControl: clamp(r.radiusControl, 0, 999, d.radiusControl),
    gradient: {
      enabled: g.enabled === true,
      from: hex(g.from, d.gradient.from),
      to: hex(g.to, d.gradient.to),
      angle: clamp(g.angle, 0, 360, d.gradient.angle),
    },
  };
}

const stack = (k: FontKey) => `${fonts[k].family}, ui-${fonts[k].fallback}, system-ui, ${fonts[k].fallback}`;

/** CSS custom properties for a theme (values are already validated). */
export function themeVars(theme: Theme): Record<string, string> {
  const t = normalizeTheme(theme);
  const vars: Record<string, string> = {};
  for (const k of colorKeys) vars[cssVar[k]] = t.colors[k];
  // Hover and light tints follow the accents, so they never clash with a new colour.
  vars["--color-brick-dark"] = "color-mix(in oklab, var(--color-brick) 78%, black)";
  vars["--color-brick-soft"] = "color-mix(in oklab, var(--color-brick) 15%, white)";
  vars["--color-sage-soft"] = "color-mix(in oklab, var(--color-sage) 18%, white)";
  vars["--font-sans"] = stack(t.bodyFont);
  vars["--font-display"] = stack(t.displayFont);
  vars["--display-weight"] = String(t.displayWeight);
  vars["--display-tracking"] = `${t.displayTracking / 1000}em`;
  vars["--radius-card"] = `${t.radiusCard}px`;
  vars["--radius-control"] = `${t.radiusControl}px`;
  const g = t.gradient;
  // A soft two-colour wash with a pale light spot, like a studio backdrop.
  vars["--page-bg"] = g.enabled
    ? `radial-gradient(ellipse 70% 55% at 62% 38%, color-mix(in oklab, ${g.from} 45%, white 55%) 0%, transparent 70%), ` +
      `linear-gradient(${g.angle}deg, ${g.from} 0%, color-mix(in oklab, ${g.from} 55%, ${g.to}) 50%, ${g.to} 100%)`
    : "var(--color-milk)";
  return vars;
}

/** The <style> body for the site layout. Overrides the brand book defaults only when a theme was saved. */
export function themeCss(theme: Theme): string {
  const decl = Object.entries(themeVars(theme))
    .map(([k, v]) => `${k}:${v};`)
    .join("");
  return `html:root{${decl}}`;
}
