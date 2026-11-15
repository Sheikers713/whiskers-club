import { describe, expect, it } from "vitest";
import { normalizeTheme, themePresets } from "./theme";

// WCAG relative luminance and contrast ratio.
function lum(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const contrast = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

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
