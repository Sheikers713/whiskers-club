import { describe, expect, it } from "vitest";
import { negotiateLocale } from "./i18n/config";
import { missingLocales, pickLocalized } from "./i18n/localized";
import { getDictionary } from "./i18n/dictionary";
import { ageInMonths, formatAge, rsdToEur } from "./format";
import { slugify } from "./slug";

describe("negotiateLocale", () => {
  it("maps neighbouring languages", () => {
    expect(negotiateLocale("hr-HR,hr;q=0.9")).toBe("sr");
    expect(negotiateLocale("uk-UA")).toBe("ru");
    expect(negotiateLocale("de-DE,ru;q=0.5")).toBe("ru");
  });
  it("respects q values and falls back to English", () => {
    expect(negotiateLocale("ru;q=0.3,sr;q=0.8")).toBe("sr");
    expect(negotiateLocale("de-DE,fr")).toBe("en");
    expect(negotiateLocale(null)).toBe("en");
  });
});

describe("pickLocalized", () => {
  it("follows requested -> en -> original (decision 1.5)", () => {
    expect(pickLocalized({ ru: "Кот", en: "Cat" }, "sr", "ru")).toEqual({ text: "Cat", locale: "en", isFallback: true });
    expect(pickLocalized({ ru: "Кот" }, "sr", "ru")).toEqual({ text: "Кот", locale: "ru", isFallback: true });
    expect(pickLocalized({ sr: "Mačka" }, "sr")).toEqual({ text: "Mačka", locale: "sr", isFallback: false });
  });
  it("ignores blank values and junk", () => {
    expect(pickLocalized({ en: "  ", ru: "Кот" }, "en").text).toBe("Кот");
    expect(pickLocalized(null, "en").text).toBe("");
    expect(missingLocales({ en: "x", ru: "" })).toEqual(["ru", "sr"]);
  });
});

describe("dictionaries", () => {
  const keys = (o: object, p = ""): string[] =>
    Object.entries(o).flatMap(([k, v]) => (v && typeof v === "object" ? keys(v, `${p}${k}.`) : [`${p}${k}`])).sort();
  it("have the same keys in every language", () => {
    const en = keys(getDictionary("en"));
    expect(keys(getDictionary("ru"))).toEqual(en);
    expect(keys(getDictionary("sr"))).toEqual(en);
  });
});

describe("age and money", () => {
  const now = new Date("2026-10-12T12:00:00Z");
  it("computes age from the birth date", () => {
    expect(ageInMonths(new Date("2025-01-10"), now)).toBe(21);
    expect(ageInMonths(new Date("2026-09-20"), now)).toBe(0);
    const en = getDictionary("en");
    expect(formatAge(new Date("2025-01-10"), en, now)).toBe("1 y 9 mo");
    expect(formatAge(new Date("2024-10-12"), en, now)).toBe("2 y");
    expect(formatAge(null, en, now)).toBe("age unknown");
  });
  it("rounds RSD to whole euros", () => {
    expect(rsdToEur(15000, 117)).toBe(128);
    expect(rsdToEur(100, 0)).toBe(0);
  });
});

describe("slugify", () => {
  it("transliterates Russian and Serbian", () => {
    expect(slugify("Нами")).toBe("nami");
    expect(slugify("Жук и Шуша")).toBe("zhuk-i-shusha");
    expect(slugify("Đurđa Čiča")).toBe("djurdja-cica");
    expect(slugify("  !!! ")).toBe("");
  });
});
