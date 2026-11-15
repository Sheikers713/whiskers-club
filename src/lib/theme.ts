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
  orange: { label: "Второй акцент", hint: "Кнопка PayPal, обводка фокуса, украшения «О нас»" },
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
  // Soft drop shadow under cards: px, and opacity in percent.
  shadow: { enabled: boolean; color: string; blur: number; offsetY: number; opacity: number };
  // Header and footer: own background and text colour (light or dark).
  chrome: { headerBg: string; headerText: string; footerBg: string; footerText: string };
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
  shadow: { enabled: true, color: "#3b4a2a", blur: 24, offsetY: 8, opacity: 18 },
  chrome: { headerBg: "#f4eee4", headerText: "#242322", footerBg: "#e9dfd0", footerText: "#242322" },
};

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
  const sh = (r.shadow && typeof r.shadow === "object" ? r.shadow : {}) as Record<string, unknown>;
  const ch = (r.chrome && typeof r.chrome === "object" ? r.chrome : {}) as Record<string, unknown>;
  const d = defaultTheme;
  const colors = Object.fromEntries(colorKeys.map((k) => [k, hex(c[k], d.colors[k])])) as Theme["colors"];
  return {
    colors,
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
    shadow: {
      // Themes saved before the shadow existed get it switched on, as the default has it.
      enabled: typeof sh.enabled === "boolean" ? sh.enabled : d.shadow.enabled,
      color: hex(sh.color, d.shadow.color),
      blur: clamp(sh.blur, 0, 80, d.shadow.blur),
      offsetY: clamp(sh.offsetY, 0, 40, d.shadow.offsetY),
      opacity: clamp(sh.opacity, 0, 60, d.shadow.opacity),
    },
    // Themes saved before header/footer colours existed keep the look they had.
    chrome: {
      headerBg: hex(ch.headerBg, colors.milk),
      headerText: hex(ch.headerText, colors.ink),
      footerBg: hex(ch.footerBg, colors.creamDeep),
      footerText: hex(ch.footerText, colors.ink),
    },
  };
}

/** WCAG relative luminance of a #rrggbb colour. */
export function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio of two #rrggbb colours. */
export function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
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
  // Header and footer: their own text colours; soft text and lines mixed from them.
  // When they match the page they reuse the page tokens, so nothing shifts.
  const ch = t.chrome;
  const plainHeader = ch.headerBg === t.colors.milk && ch.headerText === t.colors.ink;
  const plainFooter = ch.footerBg === t.colors.creamDeep && ch.footerText === t.colors.ink;
  const mix = (fg: string, pct: number, bg: string) => `color-mix(in oklab, ${fg} ${pct}%, ${bg})`;
  vars["--header-bg"] = ch.headerBg;
  vars["--header-text"] = ch.headerText;
  vars["--header-soft"] = plainHeader ? t.colors.inkSoft : mix(ch.headerText, 75, ch.headerBg);
  vars["--header-line"] = plainHeader ? t.colors.line : mix(ch.headerText, 16, ch.headerBg);
  vars["--header-panel"] = plainHeader ? t.colors.paper : ch.headerBg;
  // See-through over a page-coloured header so the gradient shows; nearly solid when coloured.
  vars["--header-alpha"] = ch.headerBg === t.colors.milk ? "72%" : "94%";
  vars["--footer-bg"] = ch.footerBg;
  vars["--footer-text"] = ch.footerText;
  vars["--footer-soft"] = plainFooter ? t.colors.inkSoft : mix(ch.footerText, 75, ch.footerBg);
  vars["--footer-line"] = plainFooter ? t.colors.line : mix(ch.footerText, 16, ch.footerBg);
  // The black-and-red wordmark disappears on a dark bar: show the light one there.
  const dark = (h: string) => luminance(h) < 0.3;
  vars["--header-logo-dark"] = dark(ch.headerBg) ? "none" : "block";
  vars["--header-logo-light"] = dark(ch.headerBg) ? "block" : "none";
  vars["--footer-logo-dark"] = dark(ch.footerBg) ? "none" : "block";
  vars["--footer-logo-light"] = dark(ch.footerBg) ? "block" : "none";

  const sh = t.shadow;
  const [r, gr, b] = [1, 3, 5].map((i) => parseInt(sh.color.slice(i, i + 2), 16));
  // A negative spread keeps the blur under the card instead of a halo around it.
  vars["--card-shadow"] = sh.enabled && sh.opacity > 0
    ? `0 ${sh.offsetY}px ${sh.blur}px -${Math.round(sh.blur / 4)}px rgb(${r} ${gr} ${b} / ${sh.opacity / 100})`
    : "0 0 #0000";
  return vars;
}

/** The <style> body for the site layout. Overrides the brand book defaults only when a theme was saved. */
export function themeCss(theme: Theme): string {
  const decl = Object.entries(themeVars(theme))
    .map(([k, v]) => `${k}:${v};`)
    .join("");
  return `html:root{${decl}}`;
}



/** A named theme kept for later (not on the site until it is published). */
export type ThemeVariant = { id: string; name: string; theme: Theme };

/** Saved themes as stored: anything malformed is dropped, names trimmed. */
export function normalizeVariants(raw: unknown): ThemeVariant[] {
  if (!Array.isArray(raw)) return [];
  const out: ThemeVariant[] = [];
  for (const v of raw.slice(0, 50)) {
    if (!v || typeof v !== "object") continue;
    const r = v as Record<string, unknown>;
    const id = typeof r.id === "string" && /^[\w-]{1,64}$/.test(r.id) ? r.id : null;
    const name = typeof r.name === "string" ? r.name.trim().slice(0, 60) : "";
    if (!id || !name || out.some((o) => o.id === id)) continue;
    out.push({ id, name, theme: normalizeTheme(r.theme) });
  }
  return out;
}
