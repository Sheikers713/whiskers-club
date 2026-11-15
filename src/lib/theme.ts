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
  // Soft drop shadow under cards: px, and opacity in percent.
  shadow: { enabled: boolean; color: string; blur: number; offsetY: number; opacity: number };
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
};

type PresetStyle = {
  body: FontKey;
  display: FontKey;
  weight: number;
  tracking: number;
  radius: [card: number, control: number];
  // [from, to, angle], or none for a flat background.
  gradient?: [string, string, number];
  // [colour, blur, offsetY, opacity %], or none for no card shadow.
  shadow?: [string, number, number, number];
};

/**
 * A compact preset. Colours in colorKeys order:
 * page, cards, blocks, text, soft text, lines, main accent, second accent, success, hero, sun.
 */
function preset(key: string, label: string, note: string, c: string[], st: PresetStyle) {
  const colors = Object.fromEntries(colorKeys.map((k, i) => [k, c[i]])) as Theme["colors"];
  const theme: Theme = {
    colors,
    bodyFont: st.body,
    displayFont: st.display,
    displayWeight: st.weight,
    displayTracking: st.tracking,
    radiusCard: st.radius[0],
    radiusControl: st.radius[1],
    gradient: st.gradient
      ? { enabled: true, from: st.gradient[0], to: st.gradient[1], angle: st.gradient[2] }
      : { ...defaultTheme.gradient, enabled: false },
    shadow: st.shadow
      ? { enabled: true, color: st.shadow[0], blur: st.shadow[1], offsetY: st.shadow[2], opacity: st.shadow[3] }
      : { ...defaultTheme.shadow, enabled: false },
  };
  return { key, label, note, theme };
}

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
        orange: "#b5741d",
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
      shadow: { enabled: true, color: "#33402c", blur: 28, offsetY: 10, opacity: 20 },
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
      shadow: { enabled: true, color: "#2f3d2b", blur: 22, offsetY: 8, opacity: 16 },
    },
  },
  // Bolder and more contrasting sets. Every one keeps body text and white-on-accent
  // buttons readable (WCAG AA); theme.test.ts checks that.
  preset("newspaper", "Газета", "Чёрное на белом, красный акцент и красное солнце, заголовки с засечками, прямые углы",
    ["#f7f5f0", "#ffffff", "#e8e4da", "#111111", "#4a4a4a", "#cfcac0", "#d7261e", "#c2410c", "#2f7a3b", "#d9d4c7", "#d7261e"],
    { body: "golos", display: "playfair", weight: 900, tracking: -20, radius: [0, 0] }),
  preset("swiss", "Швейцарский плакат", "Чистый белый, чёрный текст, красный герой с белым солнцем, широкие заголовки",
    ["#ffffff", "#ffffff", "#f1f1f1", "#000000", "#444444", "#dddddd", "#e10600", "#c2410c", "#1d7a35", "#e10600", "#ffffff"],
    { body: "golos", display: "unbounded", weight: 800, tracking: -40, radius: [0, 0] }),
  preset("mustard-black", "Горчица и чёрный", "Жёлтый герой, чёрное солнце и чёрные кнопки, тёплый кремовый фон",
    ["#fbf3d9", "#fffaf0", "#f2e1a8", "#141414", "#4d4636", "#e0cf98", "#141414", "#a35f00", "#3e7b3a", "#f0c330", "#141414"],
    { body: "onest", display: "montserrat", weight: 900, tracking: -40, radius: [4, 4] }),
  preset("concrete", "Бетон", "Холодный серый, почти чёрный текст, ярко-оранжевый акцент, без скруглений",
    ["#eeeeec", "#fafafa", "#dededa", "#161616", "#555555", "#c9c9c5", "#c73600", "#c2410c", "#3a7d44", "#bdbdb8", "#ff7a1a"],
    { body: "golos", display: "unbounded", weight: 800, tracking: -30, radius: [0, 0], shadow: ["#161616", 20, 8, 12] }),
  preset("neon-lime", "Лайм и чёрный", "Чёрные кнопки-пилюли, лаймовый герой с чёрным солнцем, без скруглений карточек",
    ["#f5f5f0", "#ffffff", "#e4f8c4", "#0d0d0d", "#474747", "#d4d4cc", "#0d0d0d", "#4f7f00", "#2b7a3a", "#c6f36b", "#0d0d0d"],
    { body: "golos", display: "unbounded", weight: 800, tracking: -30, radius: [0, 999] }),
  preset("ultramarine", "Ультрамарин и жёлтый", "Синие кнопки, жёлтый герой с синим солнцем, тёмно-синий текст",
    ["#fdfbf1", "#ffffff", "#fff2b8", "#0d1340", "#474d73", "#e8e1b8", "#2433b5", "#a86a00", "#2f7d4e", "#ffd93b", "#2433b5"],
    { body: "onest", display: "montserrat", weight: 900, tracking: -40, radius: [10, 10] }),
  preset("cobalt", "Кобальт", "Белый и голубоватый фон, кобальтовые кнопки-пилюли, коралловый второй акцент",
    ["#f4f6fb", "#ffffff", "#e3e8f5", "#0f1630", "#47506b", "#cdd5ea", "#1d3fd8", "#c2410c", "#2f8a5b", "#b9c6ef", "#ffcc33"],
    { body: "onest", display: "unbounded", weight: 700, tracking: -30, radius: [14, 999], gradient: ["#eef2fd", "#f7f1e9", 160], shadow: ["#1d3fd8", 26, 10, 14] }),
  preset("fuchsia", "Фуксия", "Розовый градиент, малиновые кнопки, округлый шрифт, жёлтое солнце",
    ["#fdf2f6", "#ffffff", "#f9dbe7", "#2a0f1e", "#6b4457", "#efc9d8", "#c2185b", "#c2410c", "#2e7d5b", "#f6b8cf", "#ffd23f"],
    { body: "rubik", display: "rubik", weight: 800, tracking: -30, radius: [20, 999], gradient: ["#fde7ef", "#fff3e6", 160], shadow: ["#7a1040", 24, 8, 14] }),
  preset("orange", "Апельсин", "Сочный оранжевый акцент, тёплый фон, широкие заголовки, кнопки-пилюли",
    ["#fff6ec", "#ffffff", "#ffe3c4", "#1e1208", "#614a37", "#f3d2ad", "#c24400", "#b45309", "#2c7a4b", "#ffc48a", "#ff9f1c"],
    { body: "rubik", display: "unbounded", weight: 800, tracking: -30, radius: [16, 999], shadow: ["#7a3300", 24, 8, 16] }),
  preset("cherry", "Вишня и крем", "Глубокий вишнёвый, кремовый фон, классика с засечками",
    ["#f8f0ea", "#fffaf6", "#efdcd0", "#2a0d14", "#6a4a50", "#e6cfc3", "#8c1c3a", "#b4532a", "#4f7a55", "#e5b9b9", "#f3c969"],
    { body: "lora", display: "playfair", weight: 800, tracking: -20, radius: [8, 8], shadow: ["#5a1024", 22, 8, 14] }),
  preset("terracotta", "Терракота", "Обожжённая глина, тёплый беж, заголовки с засечками",
    ["#f6ece2", "#fffaf5", "#ecd8c6", "#2b1a12", "#6b5244", "#e2cbb6", "#a63d1c", "#b4532a", "#5b7a4a", "#d8a789", "#f2c14e"],
    { body: "onest", display: "lora", weight: 700, tracking: -10, radius: [6, 6], gradient: ["#f3e3d3", "#f7efe4", 170], shadow: ["#5a2a14", 22, 8, 16] }),
  preset("emerald", "Изумруд", "Глубокий зелёный акцент, свежий светлый фон, жёлтое солнце",
    ["#f1f7f3", "#ffffff", "#dcebe2", "#0e2a1f", "#466257", "#c8ddd0", "#0f6e4a", "#b45309", "#2f8f5e", "#a9d3b8", "#f4c542"],
    { body: "montserrat", display: "montserrat", weight: 800, tracking: -40, radius: [12, 8], shadow: ["#0e2a1f", 24, 8, 14] }),
  preset("sea", "Морская волна", "Бирюзовые кнопки, градиент море → песок",
    ["#eef6f8", "#ffffff", "#d6eaef", "#0b2730", "#45616a", "#c3dde4", "#00708a", "#b45309", "#2e8b57", "#9fd0dc", "#ffd166"],
    { body: "golos", display: "montserrat", weight: 800, tracking: -40, radius: [16, 12], gradient: ["#e4f2f6", "#f6efe4", 165], shadow: ["#0b2730", 24, 8, 14] }),
  preset("sand-ocean", "Песок и океан", "Тёплый песок, глубокий синий акцент, мягкий градиент",
    ["#f7f1e6", "#fffcf6", "#ede1cc", "#13232f", "#4f5c66", "#e2d4bd", "#0e5a8a", "#b4532a", "#4c7c5a", "#9cc3d9", "#f2b84b"],
    { body: "onest", display: "montserrat", weight: 800, tracking: -30, radius: [14, 999], gradient: ["#f3ead9", "#e3eef3", 170], shadow: ["#13232f", 24, 8, 14] }),
  preset("mint-coral", "Мята и коралл", "Мятный градиент, коралловые кнопки, округлые заголовки",
    ["#effaf6", "#ffffff", "#d6f1e7", "#10302a", "#4a6660", "#c4e6da", "#c23b2e", "#b4532a", "#1f7a5c", "#9fdcc6", "#ff8a65"],
    { body: "golos", display: "comfortaa", weight: 700, tracking: -20, radius: [18, 12], gradient: ["#e3f6ef", "#fdf0e6", 160], shadow: ["#10302a", 24, 8, 14] }),
  preset("lavender", "Лаванда", "Сиреневый градиент, фиолетовые кнопки-пилюли, тёплое солнце",
    ["#f5f3fb", "#ffffff", "#e6e0f5", "#1f1937", "#5b5577", "#d6cfee", "#5b3fd1", "#b4532a", "#3f8a6c", "#c9bdf0", "#ffc857"],
    { body: "onest", display: "comfortaa", weight: 700, tracking: -20, radius: [20, 999], gradient: ["#ece8fb", "#fbf0ee", 160], shadow: ["#2a1f5c", 26, 10, 14] }),
  preset("peach-indigo", "Персик и индиго", "Персиковый фон, индиговые кнопки и индиговое солнце",
    ["#fff3ec", "#ffffff", "#ffe0d0", "#1f1b3a", "#57536f", "#f2d2c2", "#3b2fa0", "#b4532a", "#2e7d5c", "#ffb59a", "#3b2fa0"],
    { body: "onest", display: "comfortaa", weight: 700, tracking: -20, radius: [24, 999], gradient: ["#ffe9de", "#f5eefc", 160], shadow: ["#1f1b3a", 26, 10, 14] }),
  preset("dusty-rose", "Пыльная роза", "Приглушённый розовый, ягодные кнопки, серифные заголовки",
    ["#f7efed", "#fffaf9", "#ecdcd8", "#2e1f22", "#6a5558", "#e3d0cc", "#a2445a", "#b4532a", "#5f7f63", "#d9b8b5", "#f0c987"],
    { body: "onest", display: "playfair", weight: 700, tracking: -10, radius: [12, 999], gradient: ["#f3e4e2", "#f1ebe0", 165], shadow: ["#4a2630", 24, 8, 14] }),
  preset("choco-mint", "Шоколад и мята", "Шоколадные кнопки на мятном фоне, тёплое солнце",
    ["#f3f8f5", "#ffffff", "#dcefe5", "#2b1a10", "#634c3d", "#c9e2d6", "#5a3420", "#b4532a", "#2f8466", "#a8dcc5", "#f5b971"],
    { body: "golos", display: "lora", weight: 700, tracking: -10, radius: [14, 10], shadow: ["#2b1a10", 22, 8, 14] }),
  preset("graphite", "Графит и белый", "Строгая монохромная тема: тёмно-серые кнопки, белые карточки, лёгкая тень",
    ["#f3f4f1", "#ffffff", "#e1e4dc", "#1b1f1a", "#545a52", "#cfd3ca", "#2d332b", "#4f7f00", "#3d7a3d", "#cfe86a", "#ffffff"],
    { body: "rubik", display: "rubik", weight: 800, tracking: -30, radius: [12, 12], shadow: ["#1b1f1a", 22, 8, 14] }),
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
  const sh = (r.shadow && typeof r.shadow === "object" ? r.shadow : {}) as Record<string, unknown>;
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
    shadow: {
      // Themes saved before the shadow existed get it switched on, as the default has it.
      enabled: typeof sh.enabled === "boolean" ? sh.enabled : d.shadow.enabled,
      color: hex(sh.color, d.shadow.color),
      blur: clamp(sh.blur, 0, 80, d.shadow.blur),
      offsetY: clamp(sh.offsetY, 0, 40, d.shadow.offsetY),
      opacity: clamp(sh.opacity, 0, 60, d.shadow.opacity),
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
