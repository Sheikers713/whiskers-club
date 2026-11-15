import { describe, expect, it } from "vitest";
import { defaultTheme, normalizeTheme, normalizeVariants, themeCss } from "./theme";

describe("theme", () => {
  it("keeps the default as is and fills gaps in old saved themes", () => {
    expect(normalizeTheme(defaultTheme)).toEqual(defaultTheme);
    const old = normalizeTheme({ colors: { milk: "#eef0e4", ink: "#111111" } });
    expect(old.chrome).toEqual({ headerBg: "#eef0e4", headerText: "#111111", footerBg: defaultTheme.colors.creamDeep, footerText: "#111111" });
    expect(old.shadow.enabled).toBe(true);
  });

  it("only lets validated values into the CSS", () => {
    const css = themeCss(normalizeTheme({ colors: { ink: "red;}</style><script>" }, bodyFont: "x" }));
    expect(css).not.toContain("<");
    expect(css).toContain(`--color-ink:${defaultTheme.colors.ink}`);
  });

  it("drops malformed saved themes", () => {
    const v = normalizeVariants([
      { id: "a", name: "  Синяя  ", theme: {} },
      { id: "a", name: "Дубль", theme: {} },
      { id: "bad id!", name: "x", theme: {} },
      { id: "b", name: "", theme: {} },
      null,
    ]);
    expect(v.map((x) => [x.id, x.name])).toEqual([["a", "Синяя"]]);
    expect(v[0].theme).toEqual(defaultTheme);
  });
});
