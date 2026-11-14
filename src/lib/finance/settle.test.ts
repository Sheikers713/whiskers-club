import { describe, expect, it } from "vitest";
import { noCatBalance, settlements } from "./settle";

describe("settlements", () => {
  const cats = [
    { id: "nami", name: "Нами", closed: true, closedOn: "2026-10-01", income: 0, spent: 4082 },
    { id: "zhuk", name: "Мистер Жук", closed: false, closedOn: null, income: 38630, spent: 53240 },
    { id: "lucky", name: "Лаки", closed: true, closedOn: "2026-11-01", income: 3000, spent: 2000.4 },
    { id: "even", name: "Ровный", closed: true, closedOn: "2026-11-02", income: 500, spent: 500 },
  ];

  it("covers a closed cat's shortfall and returns its surplus; open cats are untouched", () => {
    expect(settlements(cats)).toEqual([
      { catId: "nami", name: "Нами", closedOn: "2026-10-01", amount: 4082 },
      { catId: "lucky", name: "Лаки", closedOn: "2026-11-01", amount: -1000 },
    ]);
  });

  it("leaves the rest without a cat", () => {
    // 15 000 opening, no expenses without a cat: 15 000 − 4 082 + 1 000.
    expect(noCatBalance(15000, 0, settlements(cats))).toBe(11918);
  });
});
