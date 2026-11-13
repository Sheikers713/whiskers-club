/**
 * Reads a Serbian fiscal receipt from a photo: finds the QR code, which holds a
 * suf.purs.gov.rs verification link, and gets the total, the date, the shop and
 * the items from the tax office. If the tax office does not answer, the total
 * and the date are still read from the link itself (they are signed into it).
 *
 * The volunteer always sees the result in the summary and can fix it.
 */
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { prepareZXingModule, readBarcodes } from "zxing-wasm/reader";
import sharp, { type Sharp } from "sharp";

export type ReceiptInfo = {
  url: string;
  amountRsd: number;
  date: string; // YYYY-MM-DD, Belgrade time
  shop?: string;
  items: string[];
  /** Details came from the tax office (not only from the link). */
  verified: boolean;
};

const HOST = "suf.purs.gov.rs";

// ---------------------------------------------------------------------------
// QR in a photo

// Plain, then contrast-stretched, then sharpened black-and-white (pale thermal paper).
const PREPS: ((s: Sharp) => Sharp)[] = [
  (s) => s,
  (s) => s.grayscale().normalise(),
  (s) => s.grayscale().normalise().sharpen({ sigma: 1.5 }).threshold(140),
];

let ready: Promise<void> | null = null;

/** Loads the ZXing decoder from node_modules (not from a CDN). */
function loadZxing(): Promise<void> {
  ready ??= (async () => {
    const wasm = await readFile(createRequire(import.meta.url).resolve("zxing-wasm/reader/zxing_reader.wasm"));
    await prepareZXingModule({
      overrides: { wasmBinary: wasm.buffer.slice(wasm.byteOffset, wasm.byteOffset + wasm.byteLength) as ArrayBuffer },
      fireImmediately: true,
    });
  })();
  return ready;
}

/**
 * The receipt link from a photo, or null when there is no readable QR code.
 * Receipt codes are big and dense (up to ~850 characters), so ZXing gets the
 * photo at a few sizes and contrasts and stops at the first hit.
 */
export async function findReceiptUrl(image: Buffer): Promise<string | null> {
  let base: Sharp;
  try {
    base = sharp(image, { failOn: "none" }).rotate(); // respect EXIF orientation
    const meta = await base.metadata();
    if (!meta.width || !meta.height) return null;
  } catch {
    return null; // not an image (a PDF, for example)
  }
  await loadZxing();
  const seen = new Set<string>();
  for (const width of [2000, 1200, 800, 3000]) {
    for (const prep of PREPS) {
      const { data, info } = await prep(base.clone().resize({ width, height: width, fit: "inside", withoutEnlargement: width < 3000 }))
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      const key = `${info.width}:${PREPS.indexOf(prep)}`;
      if (seen.has(key)) continue; // a small photo is not enlarged, so sizes repeat
      seen.add(key);
      const found = await readBarcodes(
        { data: toRgba(data, info.channels), width: info.width, height: info.height, colorSpace: "srgb" },
        { formats: ["QRCode"], tryHarder: true, tryRotate: true, tryInvert: true, tryDownscale: true, maxNumberOfSymbols: 4 },
      );
      const hit = found.find((r) => r.isValid && isReceiptUrl(r.text));
      if (hit) return hit.text.trim();
    }
  }
  return null;
}

/** RGBA pixels for ZXing; after grayscale sharp gives 2 channels (gray + alpha). */
function toRgba(data: Buffer, channels: number): Uint8ClampedArray<ArrayBuffer> {
  if (channels === 4) return new Uint8ClampedArray(data);
  const n = data.length / channels;
  const out = new Uint8ClampedArray(n * 4);
  for (let i = 0; i < n; i++) {
    const p = i * channels;
    const gray = channels <= 2;
    out[i * 4] = data[p];
    out[i * 4 + 1] = data[gray ? p : p + 1];
    out[i * 4 + 2] = data[gray ? p : p + 2];
    out[i * 4 + 3] = 255;
  }
  return out;
}

export function isReceiptUrl(text: string): boolean {
  try {
    const u = new URL(text.trim());
    return u.protocol === "https:" && u.hostname === HOST && u.searchParams.has("vl");
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// What the link itself says

/** Belgrade calendar day of a moment. */
export function belgradeDay(ms: number): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Belgrade" }).format(new Date(ms));
}

/**
 * Total and time from the `vl` parameter (TaxCore «verification URL» layout):
 * byte 25 total amount (uint64 little endian, in 1/10000 dinar), byte 33 time
 * (uint64 big endian, ms since 1970), last 16 bytes an MD5 of the rest.
 */
export function decodeLink(url: string): { amountRsd: number; date: string } | null {
  if (!isReceiptUrl(url)) return null;
  // `+` in the base64 must stay a plus, so read the raw query, not searchParams.
  const raw = new URL(url.trim()).search.slice(1).split("&").find((p) => p.startsWith("vl="));
  if (!raw) return null;
  const bytes = Buffer.from(decodeURIComponent(raw.slice(3)), "base64");
  if (bytes.length < 572 || bytes.length > 848) return null;
  const body = bytes.subarray(0, -16);
  if (createHash("md5").update(body).digest().compare(bytes.subarray(-16)) !== 0) return null;
  const amount = Number(bytes.readBigUInt64LE(25)) / 10000;
  const ms = Number(bytes.readBigUInt64BE(33));
  if (!(amount > 0) || !(ms > 0)) return null;
  return { amountRsd: Math.round(amount), date: belgradeDay(ms) };
}

// ---------------------------------------------------------------------------
// What the tax office says

/** Shop name and item names from the printed receipt text (the «journal»). */
export function parseJournal(journal: string): { shop?: string; items: string[] } {
  const text = journal.replace(/<[^>]+>/g, "\n").replace(/&nbsp;/g, " ").replace(/\r/g, "");
  const lines = text.split("\n").map((l) => l.trimEnd());
  const head = lines.findIndex((l) => /ФИСКАЛНИ РАЧУН/.test(l));
  // Header: tax id, company, shop, address, city.
  const shop = head >= 0 ? lines[head + 3]?.trim() || lines[head + 2]?.trim() : undefined;

  const items: string[] = [];
  const start = lines.findIndex((l) => /^Назив\s+Цена/.test(l.trim()));
  if (start >= 0) {
    let name = "";
    let last = "";
    for (const l of lines.slice(start + 1)) {
      if (/^-{10,}/.test(l.trim()) || /^={10,}/.test(l.trim())) break;
      // "  1.234,56    0,535    660,49": price, quantity, total close an item.
      if (/^\s*-?[\d.]+,\d{2}\s+-?[\d.,]+\s+-?[\d.]+,\d{2}\s*$/.test(l)) {
        if (name) items.push(cleanItem(name));
        name = "";
      } else {
        // Long names wrap at the paper width (40 characters) without a space.
        name += !name || last.length >= 40 ? l : ` ${l.trim()}`;
      }
      last = l;
    }
  }
  return { shop: shop || undefined, items: items.filter(Boolean) };
}

function cleanItem(name: string): string {
  return name
    .replace(/\s+/g, " ")
    .replace(/\s*\([A-ZА-ЯЂЕЖ]\)\s*$/u, "") // VAT label "(Ђ)"
    .replace(/\s*\/\s*(kom|ком|kg|кг|l|л|kut|pak)\.?\s*$/iu, "")
    .trim();
}

type Fetch = typeof fetch;

/** Reads the receipt: from the tax office when it answers, otherwise from the link alone. */
export async function readReceipt(url: string, fetchImpl: Fetch = fetch): Promise<ReceiptInfo | null> {
  const offline = decodeLink(url);
  try {
    const res = await fetchImpl(url.trim(), { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(15_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const j = (await res.json()) as {
      invoiceRequest?: { businessName?: string; locationName?: string };
      invoiceResult?: { totalAmount?: number; sdcTime?: string };
      journal?: string;
    };
    const total = Number(j.invoiceResult?.totalAmount);
    const time = Date.parse(j.invoiceResult?.sdcTime ?? "");
    if (!(total > 0) || Number.isNaN(time)) throw new Error("no total or time");
    const fromJournal = parseJournal(j.journal ?? "");
    return {
      url,
      amountRsd: Math.round(total),
      date: belgradeDay(time),
      shop: j.invoiceRequest?.locationName?.trim() || fromJournal.shop || j.invoiceRequest?.businessName?.trim(),
      items: fromJournal.items,
      verified: true,
    };
  } catch (e) {
    console.warn("[bot] receipt lookup failed, using the link only:", e instanceof Error ? e.message : e);
    return offline ? { url, ...offline, items: [], verified: false } : null;
  }
}

/** One line for «На что»: "Maxi: Monge корм 2 кг, наполнитель…". */
export function describeReceipt(r: ReceiptInfo, max = 300): string {
  const items = r.items.join(", ");
  const text = [r.shop, items].filter(Boolean).join(": ");
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}
