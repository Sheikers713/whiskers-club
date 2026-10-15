import { describe, expect, it } from "vitest";
import { planTranslations } from "./translation-plan";

describe("planTranslations", () => {
  it("translates every Russian field of a new cat", () => {
    const plan = planTranslations({ submitted: { name: { ru: "Лаки" }, story: { ru: "История" }, health: {} } });
    expect(plan.sources).toEqual({ name: "Лаки", story: "История" });
    expect(plan.targets).toEqual({ name: ["en", "sr"], story: ["en", "sr"] });
    expect(plan.keepAuto).toEqual([]);
  });

  it("keeps untouched drafts when Russian did not change", () => {
    const before = { story: { ru: "А", en: "A", sr: "A" } };
    const plan = planTranslations({ submitted: { story: { ru: "А", en: "A", sr: "A" } }, before, beforeAuto: ["story.en", "story.sr"] });
    expect(plan.sources).toEqual({});
    expect(plan.keepAuto).toEqual(["story.en", "story.sr"]);
  });

  it("refreshes untouched drafts when Russian changed, but keeps hand edits", () => {
    const before = { story: { ru: "А", en: "A", sr: "A" } };
    const plan = planTranslations({
      submitted: { story: { ru: "Б", en: "A", sr: "Ručno" } },
      before,
      beforeAuto: ["story.en", "story.sr"],
    });
    expect(plan.targets).toEqual({ story: ["en"] });
    expect(plan.keepAuto).toEqual([]);
  });

  it("fills a language an admin cleared and retranslates everything on force", () => {
    const before = { name: { ru: "Юки", en: "Yuki", sr: "Juki" } };
    expect(planTranslations({ submitted: { name: { ru: "Юки", en: "Yuki" } }, before }).targets).toEqual({ name: ["sr"] });
    expect(planTranslations({ submitted: { name: { ru: "Юки", en: "Yuki", sr: "Juki" } }, before, force: true }).targets).toEqual({
      name: ["en", "sr"],
    });
  });
});
