/**
 * Speech to text for voice messages: whisper.cpp's `whisper-server` running
 * natively on the Mac (Metal), like Ollama. WHISPER_URL points at it; when it
 * is not set, voice messages are politely refused.
 */
const baseUrl = () => (process.env.WHISPER_URL || "").replace(/\/+$/, "");

export const voiceEnabled = () => !!baseUrl();

export type Transcript = { ok: true; text: string } | { ok: false; reason: string };

export async function transcribe(audio: Buffer, name: string, timeoutMs = 120_000): Promise<Transcript> {
  if (!voiceEnabled()) return { ok: false, reason: "распознавание голоса не настроено" };
  try {
    const form = new FormData();
    form.append("file", new Blob([new Uint8Array(audio)]), name);
    form.append("response_format", "json");
    form.append("language", "ru");
    // Primes the vocabulary: without it "FIV" often comes out as "FIF".
    form.append("prompt", "Заметки волонтёров приюта для кошек: тесты FIV и FeLV, стерилизация, прививки, динаров, евро, ветклиника.");
    const res = await fetch(`${baseUrl()}/inference`, { method: "POST", body: form, signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) return { ok: false, reason: `Whisper ответил ${res.status}` };
    const body = (await res.json()) as { text?: string; error?: string };
    const text = body.text?.replace(/\s+/g, " ").trim();
    if (!text) return { ok: false, reason: body.error ? `Whisper: ${body.error}` : "не расслышал ни слова" };
    return { ok: true, text };
  } catch (e) {
    console.error("[bot] transcribe failed:", e);
    return { ok: false, reason: e instanceof Error && e.name === "TimeoutError" ? "распознавание заняло слишком долго" : "Whisper недоступен" };
  }
}
