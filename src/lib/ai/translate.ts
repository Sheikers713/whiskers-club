import "server-only";
import type { TargetLocale } from "./translation-plan";

/**
 * Machine translation through Ollama running natively on the Mac (wave 2).
 * Turned on with AI_ENABLED=true; the model is OLLAMA_MODEL.
 */
export function aiEnabled(): boolean {
  return process.env.AI_ENABLED === "true";
}

const model = () => process.env.OLLAMA_MODEL || "gemma4:26b";
const baseUrl = () => (process.env.OLLAMA_URL || "http://host.docker.internal:11434").replace(/\/+$/, "");

const system = `You translate texts for the website of a volunteer cat rescue in Belgrade, Serbia.
The input is a JSON object of Russian texts. Return a JSON object {"en": {...}, "sr": {...}} with exactly the same keys.
"en" is natural English. "sr" is natural Serbian in Latin script (ekavian).
Cat names: give the usual spelling of the name in each language (Лаки -> Lucky / Laki).
Keep line breaks, emoji, numbers and medical terms (FIV, FeLV, PCR). Do not add, explain or shorten anything.`;

export type TranslationResult =
  | { ok: true; values: Record<TargetLocale, Record<string, string>> }
  | { ok: false; reason: string };

/** Translates Russian texts into English and Serbian in one request. */
export async function translateFromRussian(sources: Record<string, string>, timeoutMs = 120_000): Promise<TranslationResult> {
  const keys = Object.keys(sources);
  if (!keys.length) return { ok: true, values: { en: {}, sr: {} } };
  if (!aiEnabled()) return { ok: false, reason: "ИИ выключен (AI_ENABLED)" };
  try {
    const res = await fetch(`${baseUrl()}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(timeoutMs),
      body: JSON.stringify({
        model: model(),
        stream: false,
        format: "json",
        think: false,
        options: { temperature: 0.2 },
        messages: [
          { role: "system", content: system },
          { role: "user", content: JSON.stringify(sources) },
        ],
      }),
    });
    if (!res.ok) return { ok: false, reason: `Ollama ответила ${res.status}` };
    const body = (await res.json()) as { message?: { content?: string } };
    const parsed = JSON.parse(body.message?.content ?? "") as Record<string, Record<string, unknown>>;
    const values: Record<TargetLocale, Record<string, string>> = { en: {}, sr: {} };
    for (const l of ["en", "sr"] as const) {
      for (const k of keys) {
        const v = parsed?.[l]?.[k];
        if (typeof v === "string" && v.trim()) values[l][k] = v.trim();
      }
    }
    return { ok: true, values };
  } catch (e) {
    const reason = e instanceof Error && e.name === "TimeoutError" ? "перевод не уложился во время" : "Ollama недоступна";
    console.error("translateFromRussian failed:", e);
    return { ok: false, reason };
  }
}
