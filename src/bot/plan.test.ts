import { describe as suite, expect, it } from "vitest";
import { describe, normalize, type SiteContext } from "./plan";

const ctx: SiteContext = {
  today: "2026-10-15",
  cats: [
    { id: "c1", slug: "barsik", name: "Барсик", status: "treatment", state: "PUBLISHED" },
    { id: "c2", slug: "yuki-demo", name: "Юки (демо)", status: "ready", state: "PUBLISHED" },
  ],
  statuses: [
    { key: "ready", label: "Готов к пристройству" },
    { key: "adopted", label: "Нашёл дом" },
  ],
  categories: [
    { key: "tests", label: "Анализы" },
    { key: "other", label: "Другое" },
  ],
  campaigns: [{ id: "k1", key: "campaign1", title: "Операция Барсика" }],
  rates: { EUR: 117.2 },
};

suite("normalize", () => {
  it("finds cats by slug, name and Russian declension", () => {
    const plan = normalize(
      {
        actions: [
          { type: "cat_news", cat: "barsik", text: "a" },
          { type: "cat_news", cat: "Барсику", text: "b" },
          { type: "cat_news", cat: "Юки", text: "c" },
          { type: "cat_news", cat: "Мурзик", text: "d" },
        ],
      },
      ctx,
      { photoCount: 0 },
    );
    expect(plan.changes.map((c) => (c.type === "cat_news" && c.cat.kind === "existing" ? c.cat.cat.id : null))).toEqual(["c1", "c1", "c2"]);
    expect(plan.problems).toEqual(["Новость: не нашёл кота «Мурзик»."]);
  });

  it("merges updates about a new cat into its profile and attaches photos to it", () => {
    const plan = normalize(
      {
        actions: [
          { type: "create_cat", name: "Мила", sex: "FEMALE" },
          { type: "update_cat", cat: "new", vaccinated: "YES", status: "ready" },
          { type: "add_photos", cat: "new" },
        ],
      },
      ctx,
      { photoCount: 2 },
    );
    expect(plan.changes).toHaveLength(1);
    const c = plan.changes[0];
    expect(c.type === "create_cat" && c.changes).toMatchObject({ enums: { sex: "FEMALE", vaccinated: "YES" }, statusKey: "ready" });
    expect(c.type === "create_cat" && c.withPhotos).toBe(true);
    expect(plan.problems).toEqual([]);
  });

  it("links expenses, donations and news to a cat created in the same message", () => {
    const plan = normalize(
      {
        actions: [
          { type: "expense", amount: 10000, category: "tests", description: "Анализы", cats: ["new"] },
          { type: "create_cat", name: "Жанни", sex: "FEMALE" },
          { type: "expense", amount: 10000, category: "tests", description: "Операция", cats: ["Жанни", "barsik"] },
          { type: "donation", amount: 500, cat: "Жанни" },
          { type: "cat_news", cat: "new", text: "Тесты отрицательные" },
        ],
      },
      ctx,
      { photoCount: 0 },
    );
    expect(plan.problems).toEqual([]);
    expect(plan.changes.map((c) => c.type)).toEqual(["create_cat", "expense", "expense", "donation", "cat_news"]);
    expect(plan.changes[1]).toMatchObject({ cats: [{ kind: "new", name: "Жанни" }] });
    expect(plan.changes[2]).toMatchObject({ cats: [{ kind: "new" }, { kind: "existing", cat: { id: "c1" } }] });
    expect(plan.changes[3]).toMatchObject({ cat: { kind: "new" } });
    const text = describe(plan, ctx, 0);
    expect(text).toContain("Коты: Жанни, Барсик");
    expect(text).not.toContain("new");
  });

  it("converts foreign currency and gives receipts to the expense", () => {
    const plan = normalize(
      {
        actions: [
          { type: "donation", amount: 50, currency: "EUR", campaign: "campaign1" },
          { type: "expense", amount: 4200, category: "tests", description: "Тесты", cats: ["barsik"] },
          { type: "add_photos", cat: "barsik" },
          { type: "expense", amount: 10, currency: "USD", description: "x" },
        ],
      },
      ctx,
      { photoCount: 1 },
    );
    const [donation, expense] = plan.changes;
    expect(donation).toMatchObject({ type: "donation", money: { amountRsd: 5860 }, campaign: { id: "k1" } });
    expect(expense).toMatchObject({ type: "expense", withReceipt: true, cats: [{ kind: "existing", cat: { id: "c1" } }] });
    expect(plan.changes).toHaveLength(2);
    expect(plan.problems[0]).toContain("USD");
    expect(describe(plan, ctx, 1)).toContain("5 860 RSD");
  });
});
