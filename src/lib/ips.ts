/**
 * NBS IPS QR payment codes ("IPS skeniraj") for RSD donations from Serbian
 * banks. The code carries the account, an amount, the purpose and a
 * reference number, so every transfer made from it arrives with a cat code
 * the bot can match later on the bank statement.
 *
 * Format: https://ips.nbs.rs/PDF/pdfPreporukeValidacijaLat.pdf
 * Pure: no database, no QR drawing (that is ips-qr.ts).
 */

/** Reference for donations to the general fund; cats get 1 + four digits. */
export const GENERAL_REFERENCE = "10000";

/** True for an 18-digit Serbian account number with a correct check pair. */
export function isValidAccount(account: string): boolean {
  if (!/^\d{18}$/.test(account)) return false;
  return mod97Check(account.slice(0, 16)) === account.slice(16);
}

/** "265-7002560-05" or "265000000700256005" -> 18 digits, or null. */
export function normalizeAccount(raw: string): string | null {
  const parts = raw.trim().split(/[\s-]+/).filter(Boolean);
  let digits: string;
  if (parts.length === 3 && parts.every((p) => /^\d+$/.test(p))) {
    digits = parts[0] + parts[1].padStart(13, "0") + parts[2];
  } else {
    digits = raw.replace(/\D/g, "");
  }
  return isValidAccount(digits) ? digits : null;
}

/** ISO 7064 MOD 97-10 check pair, as for model 97 and account numbers. */
function mod97Check(digits: string): string {
  let rest = 0;
  for (const d of `${digits}00`) rest = (rest * 10 + Number(d)) % 97;
  return String(98 - rest).padStart(2, "0");
}

/** The cat's reference number without the model: "1" + its code in four digits. */
export function catReference(donationCode: number): string {
  return `1${String(donationCode).padStart(4, "0")}`;
}

/**
 * Model 97 with its check pair: "97" + CC + reference. Banks are only bound
 * to carry the reference through intact when it follows model 97.
 */
export function model97(reference: string): string {
  return `97${mod97Check(reference)}${reference}`;
}

/** The reference back from a statement line ("97 43-10012", "9743 10012"), or null. */
export function findReference(text: string): string | null {
  for (const m of text.replace(/[\s-]/g, "").matchAll(/97(\d{2})(1\d{4})/g)) {
    if (mod97Check(m[2]) === m[1]) return m[2];
  }
  return null;
}

const CYR: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", ђ: "đ", е: "e", ё: "e", ж: "ž", з: "z", и: "i", й: "j", ј: "j", к: "k",
  л: "l", љ: "lj", м: "m", н: "n", њ: "nj", о: "o", п: "p", р: "r", с: "s", т: "t", ћ: "ć", у: "u", ф: "f",
  х: "h", ц: "c", ч: "č", џ: "dž", ш: "š", щ: "šč", ъ: "", ы: "i", ь: "", э: "e", ю: "ju", я: "ja",
};

/** Cyrillic to Serbian Latin, so the purpose reads the same in every bank. */
export function toLatin(text: string): string {
  return [...text]
    .map((ch) => {
      const low = ch.toLowerCase();
      const lat = CYR[low];
      if (lat === undefined) return ch;
      return ch === low ? lat : lat.charAt(0).toUpperCase() + lat.slice(1);
    })
    .join("");
}

/** Whole dinars as the I tag wants them: "RSD1000,". */
function amountTag(amountRsd: number): string {
  return `RSD${Math.max(0, Math.round(amountRsd))},`;
}

/** One line, at most `max` characters, without the field separator. */
function clean(text: string, max: number): string {
  return text.replace(/[|\r\n]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max).trim();
}

export type IpsPayment = {
  account: string;
  /** Name of the payee; a second line (city) is optional. */
  recipient: string;
  amountRsd: number;
  purpose: string;
  /** Reference without the model, e.g. catReference(12). */
  reference?: string;
};

/** The text inside the QR code. */
export function ipsPayload(p: IpsPayment): string {
  const recipient = p.recipient
    .split(/\r?\n/)
    .map((l) => clean(l, 70))
    .filter(Boolean)
    .slice(0, 3)
    .join("\n")
    .slice(0, 70);
  const tags = [
    "K:PR",
    "V:01",
    "C:1",
    `R:${p.account}`,
    `N:${recipient}`,
    `I:${amountTag(p.amountRsd)}`,
    // 289: non-cash transfer ordered by a private person.
    "SF:289",
    `S:${clean(toLatin(p.purpose), 35)}`,
  ];
  if (p.reference) tags.push(`RO:${model97(p.reference)}`);
  return tags.join("|");
}

/** "Donacija za Nami" (35 characters at most). */
export function catPurpose(catName: string): string {
  return clean(`Donacija za ${toLatin(catName)}`, 35);
}

export const GENERAL_PURPOSE = "Donacija Whiskers Club";

/** Amounts offered as buttons next to the code. */
export const IPS_AMOUNTS = [500, 1000, 2000, 5000];
