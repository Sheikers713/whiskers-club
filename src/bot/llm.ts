import { z } from "zod";
import { rawPlanSchema, type RawPlan, type SiteContext } from "./plan";

/**
 * Reads a free-form admin message with the local model (Ollama, the same one
 * that translates cat texts) and returns proposed changes as JSON.
 */
const model = () => process.env.OLLAMA_MODEL || "gemma4:26b";
const baseUrl = () => (process.env.OLLAMA_URL || "http://host.docker.internal:11434").replace(/\/+$/, "");

const jsonSchema = z.toJSONSchema(rawPlanSchema);

export function buildSystemPrompt(ctx: SiteContext): string {
  const cats = ctx.cats.map((c) => `${c.slug} | ${c.name} | ${c.status}${c.state === "PUBLISHED" ? "" : ` | ${c.state}`}`).join("\n");
  return `You are the assistant of the admins of Whiskers Club, a volunteer cat rescue in Belgrade, Serbia.
Admins write you short free-form messages (usually in Russian, sometimes with photos) about cats, donations and expenses.
Turn each message into a list of changes for the website database. Today is ${ctx.today}.

Action types (field "type"):
- "create_cat": a new cat arrived. Fields: name (Russian), sex, birthDate (YYYY-MM-DD; estimate from age: "2 месяца" -> today minus 2 months, day 01), color, status, visibility, summary (one-two sentences), story, character, health, specialNeeds, sterilized, vaccinated, chipped, fiv, felv, goodWithCats, goodWithDogs, goodWithKids.
- "update_cat": change facts about an existing cat ("cat" = its slug). Same fields as create_cat. Use "status" when the situation changes (adopted -> "adopted", passed away -> "memorial", went to foster -> "foster", in treatment -> "treatment"). visibility "HIDDEN" removes a cat from the site, "PUBLISHED" shows it.
  Only set long text fields (story, character, health, summary...) when the admin clearly dictates the new full text for that section; for events use "cat_news".
  Test results and procedures go to fields: "сдал тесты, FIV отрицательный" -> fiv NEGATIVE; "стерилизовали" -> sterilized YES; "привили" -> vaccinated YES.
- "cat_news": a dated news item on the cat's page ("cat" = slug, "text" = the news in Russian, polished but faithful, third person, no invented facts and no added commentary or wishes; "date" if the admin names another day). Most messages about how a cat is doing are news.
- "add_photos": the message has photos for a cat's gallery ("cat" = slug; "cover": true if the admin asks to make it the main photo). Photos of a receipt/чек/счёт belong to the expense: never add_photos for them.
- "donation": money received. amount, currency (RSD unless stated: "евро"/"€" -> EUR), date, donorName (who, private), publicName + showName true only if the donor agreed to be named publicly, method (bank, PayPal, cash...), comment (short public note), cat (slug) or campaign (key) if earmarked.
- "expense": money spent. amount, currency, date, category (one of the keys below), description (Russian, what was bought/paid for), vendor (clinic, shop), cats (slugs it was for), campaign (key), payer (only if the admin names who paid; private), method, noReceiptReason (only if the admin says there is no receipt and why).

One message may need several actions, e.g. a vet visit = cat_news + expense + update_cat (test results). For a brand-new cat with photos use create_cat (photos are attached to it automatically) and refer to it as "cat": "new" in other actions.
Use "cat" values from the list below only (the slug, first column). If the cat or anything essential is unclear, return no action for it and ask in "question" (in Russian, short).
If the message is not about the site at all, return an empty "actions" list and answer in "question".
Never invent amounts, dates, names or medical facts. Omit fields you don't know; never output empty strings or placeholders.

Cats (slug | name | status):
${cats || "(no cats yet)"}

Statuses: ${ctx.statuses.map((s) => `${s.key} (${s.label})`).join(", ")}
Expense categories: ${ctx.categories.map((c) => `${c.key} (${c.label})`).join(", ")}
Active campaigns: ${ctx.campaigns.map((c) => `${c.key} (${c.title})`).join(", ") || "none"}`;
}

export type ParseResult = { ok: true; plan: RawPlan } | { ok: false; reason: string };

export async function parseMessage(
  ctx: SiteContext,
  text: string,
  photoCount: number,
  timeoutMs = 180_000,
): Promise<ParseResult> {
  const user = `${photoCount ? `[${photoCount} photo(s) attached]\n` : ""}${text || "(no text)"}`;
  try {
    const res = await fetch(`${baseUrl()}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(timeoutMs),
      body: JSON.stringify({
        model: model(),
        stream: false,
        format: jsonSchema,
        think: false,
        options: { temperature: 0.1, num_ctx: 16384 },
        messages: [
          { role: "system", content: buildSystemPrompt(ctx) },
          { role: "user", content: user },
        ],
      }),
    });
    if (!res.ok) return { ok: false, reason: `Ollama ответила ${res.status}` };
    const body = (await res.json()) as { message?: { content?: string } };
    const parsed = rawPlanSchema.safeParse(JSON.parse(body.message?.content ?? ""));
    if (!parsed.success) {
      console.error("[bot] model returned an invalid plan:", body.message?.content, parsed.error);
      return { ok: false, reason: "модель вернула непонятный ответ" };
    }
    return { ok: true, plan: parsed.data };
  } catch (e) {
    console.error("[bot] parseMessage failed:", e);
    return { ok: false, reason: e instanceof Error && e.name === "TimeoutError" ? "модель думала слишком долго" : "Ollama недоступна" };
  }
}
