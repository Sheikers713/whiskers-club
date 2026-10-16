import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { PHOTO_WIDTHS } from "./media-url";

/**
 * File storage. Today it is a directory on the server's disk (STORAGE_DIR);
 * the interface is small so it can be swapped for S3-compatible storage when
 * the site moves to a cloud server (decision 1.9).
 *
 * Files are only ever served through route handlers with an explicit content
 * type and `nosniff`, never executed or served from the web root.
 */
function root(): string {
  return path.resolve(process.env.STORAGE_DIR ?? "./data/uploads");
}

function resolveKey(key: string): string {
  const full = path.resolve(root(), key);
  if (!full.startsWith(root() + path.sep)) throw new Error("Invalid storage key");
  return full;
}

export async function putFile(key: string, data: Buffer) {
  const full = resolveKey(key);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, data, { flag: "wx" });
}

export async function getFile(key: string): Promise<Buffer | null> {
  try {
    return await readFile(resolveKey(key));
  } catch {
    return null;
  }
}

export async function fileExists(key: string): Promise<boolean> {
  try {
    await stat(resolveKey(key));
    return true;
  } catch {
    return false;
  }
}

/** Removes a gallery photo's original and its resized variants. */
export async function deletePhoto(storageKey: string) {
  for (const key of [storageKey, ...PHOTO_WIDTHS.map((w) => `${storageKey}.w${w}.webp`)]) {
    await rm(resolveKey(key), { force: true });
  }
}

function datedPrefix(kind: string): string {
  const d = new Date();
  return `${kind}/${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export const IMAGE_MIME = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
export const DOCUMENT_MIME = [...IMAGE_MIME, "application/pdf"];
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

/** Detects the real type from the first bytes instead of trusting the browser. */
export function sniffMime(data: Buffer): string | null {
  if (data.length < 12) return null;
  if (data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return "image/jpeg";
  if (data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
    return "image/png";
  if (data.subarray(0, 4).toString() === "RIFF" && data.subarray(8, 12).toString() === "WEBP")
    return "image/webp";
  if (data.subarray(0, 5).toString() === "%PDF-") return "application/pdf";
  if (data.subarray(4, 8).toString() === "ftyp") {
    const brand = data.subarray(8, 12).toString();
    if (["heic", "heix", "mif1", "msf1", "heif"].includes(brand)) return "image/heic";
  }
  return null;
}

export type StoredPhoto = {
  storageKey: string;
  width: number;
  height: number;
  sizeBytes: number;
  mime: string;
};

/**
 * Stores a gallery photo: the original is kept untouched, and WebP variants
 * (`<key>.w480.webp`, `<key>.w1200.webp`) are generated for the site. EXIF
 * (including GPS) is stripped from the variants.
 */
export async function storePhoto(data: Buffer): Promise<StoredPhoto> {
  const mime = sniffMime(data);
  if (!mime || !IMAGE_MIME.includes(mime)) throw new Error("Unsupported image type");
  if (data.length > MAX_UPLOAD_BYTES) throw new Error("File is too large");
  const id = randomUUID();
  const ext = mime.split("/")[1].replace("jpeg", "jpg");
  const storageKey = `${datedPrefix("photos")}/${id}.${ext}`;
  const image = sharp(data, { failOn: "error" }).rotate();
  const meta = await image.metadata();
  await putFile(storageKey, data);
  for (const w of PHOTO_WIDTHS) {
    const variant = await sharp(data)
      .rotate()
      .resize({ width: w, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
    await putFile(`${storageKey}.w${w}.webp`, variant);
  }
  const rotated = (meta.orientation ?? 1) >= 5;
  return {
    storageKey,
    width: (rotated ? meta.height : meta.width) ?? 0,
    height: (rotated ? meta.width : meta.height) ?? 0,
    sizeBytes: data.length,
    mime,
  };
}

/** Stores a private file (receipt, document) and returns its metadata. */
export async function storePrivateFile(data: Buffer, originalName: string, allowed = DOCUMENT_MIME) {
  const mime = sniffMime(data);
  if (!mime || !allowed.includes(mime)) throw new Error("Unsupported file type");
  if (data.length > MAX_UPLOAD_BYTES) throw new Error("File is too large");
  const ext = mime === "application/pdf" ? "pdf" : mime.split("/")[1].replace("jpeg", "jpg");
  const storageKey = `${datedPrefix("files")}/${randomUUID()}.${ext}`;
  await putFile(storageKey, data);
  return {
    storageKey,
    mime,
    sizeBytes: data.length,
    sha256: createHash("sha256").update(data).digest("hex"),
    originalName: originalName.slice(0, 200),
  };
}
