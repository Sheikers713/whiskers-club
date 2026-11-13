import "server-only";
import { db } from "../db";
import { t } from "../i18n/localized";

/** Cats for money pickers: in our care now first (alphabetically), then the rest. */
export async function loadPickerCats() {
  const cats = await db.cat.findMany({ select: { id: true, name: true, state: true, status: { select: { group: true } } } });
  return cats
    .map((c) => ({ id: c.id, name: t(c.name, "ru") || "без имени", active: c.state !== "ARCHIVED" && c.status.group === "ACTIVE" }))
    .sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name, "ru"));
}
