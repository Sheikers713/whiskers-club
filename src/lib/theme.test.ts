import { describe, expect, it } from "vitest";
import { applyScheme, colorSchemes, contrast, normalizeTheme, themePresets } from "./theme";

describe("theme presets", () => {
  it("have unique keys and survive normalisation unchanged", () => {
    expect(new Set(themePresets.map((p) => p.key)).size).toBe(themePresets.length);
    for (const p of themePresets) expect(normalizeTheme(p.theme)).toEqual(p.theme);
  });

  for (const p of themePresets) {
    it(`${p.label}: text and buttons stay readable`, () => {
      const c = p.theme.colors;
      const aa = (fg: string, bg: string, min: number, what: string) =>
        expect(contrast(fg, bg), `${what} ${fg} on ${bg}`).toBeGreaterThanOrEqual(min);
      for (const bg of [c.milk, c.paper, c.creamDeep]) {
        aa(c.ink, bg, 7, "text");
        aa(c.inkSoft, bg, 4.5, "soft text");
      }
      aa("#ffffff", c.brick, 4.5, "white on main button");
      aa(c.brick, c.paper, 4.5, "accent links");
      aa(c.orange, c.paper, 3, "second accent");
      aa(c.sage, c.paper, 3, "success");
      aa(c.milk, c.ink, 7, "light text on dark buttons");
    });
  }
});

describe("colour schemes", () => {
  const cobalt = themePresets.find((p) => p.key === "cobalt")!.theme;

  it("have unique keys and keep the page, gradient and fonts", () => {
    expect(new Set(colorSchemes.map((s) => s.key)).size).toBe(colorSchemes.length);
    for (const s of colorSchemes) {
      const t = applyScheme(cobalt, s);
      expect(t.colors.milk).toBe(cobalt.colors.milk);
      expect(t.gradient).toEqual(cobalt.gradient);
      expect([t.bodyFont, t.displayFont, t.radiusCard]).toEqual([cobalt.bodyFont, cobalt.displayFont, cobalt.radiusCard]);
    }
  });

  for (const s of colorSchemes) {
    it(`${s.label}: readable on the cobalt background`, () => {
      const c = applyScheme(cobalt, s).colors;
      const aa = (fg: string, bg: string, min: number, what: string) =>
        expect(contrast(fg, bg), `${what} ${fg} on ${bg}`).toBeGreaterThanOrEqual(min);
      for (const bg of [c.milk, c.paper, c.creamDeep, cobalt.gradient.from, cobalt.gradient.to]) {
        aa(c.ink, bg, 7, "text");
        aa(c.inkSoft, bg, 4.5, "soft text");
      }
      aa("#ffffff", c.brick, 4.5, "white on main button");
      aa(c.brick, c.paper, 4.5, "accent links");
      aa(c.orange, c.paper, 3, "second accent");
      aa(c.sage, c.paper, 3, "success");
      aa(s.chrome.headerText, s.chrome.headerBg, 7, "header text");
      aa(s.chrome.footerText, s.chrome.footerBg, 7, "footer text");
    });
  }
});
