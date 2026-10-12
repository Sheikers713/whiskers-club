import "server-only";

/**
 * Transactional email (invitations and password resets only, decision 1.6).
 * Uses the Resend HTTP API when RESEND_API_KEY is set; otherwise the message
 * is printed to the server log and the admin UI shows the link to copy.
 */
export async function sendMail(to: string, subject: string, text: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;
  if (!key || !from) {
    console.info(`[mail disabled] to=${to} subject=${subject}\n${text}`);
    return false;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, text }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) console.error(`[mail] failed ${res.status}: ${await res.text()}`);
  return res.ok;
}

export function appUrl(path: string): string {
  const base = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${base}${path}`;
}
