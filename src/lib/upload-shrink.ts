/**
 * Runs in the browser before a form with receipt photos is sent. A phone
 * camera photo is 4–15 MB; over mobile internet that upload is slow and
 * fragile. The server would shrink it to ~2000 px anyway (compressReceipt),
 * so the browser does the same first and sends a few hundred KB instead.
 *
 * Anything the browser cannot decode (HEIC, PDF, a broken file) is sent
 * as is, and the server handles it like before.
 */
const MAX_SIDE = 2000;
const SHRINK_FROM_BYTES = 1.5 * 1024 * 1024;
const DECODABLE = ["image/jpeg", "image/png", "image/webp"];

async function shrinkImage(file: File): Promise<File> {
  if (!DECODABLE.includes(file.type) || file.size < SHRINK_FROM_BYTES) return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

/** A copy of the form data with every non-empty photo shrunk. */
export async function shrinkFormFiles(fd: FormData): Promise<FormData> {
  const out = new FormData();
  for (const [key, value] of fd.entries()) {
    out.append(key, value instanceof File && value.size > 0 ? await shrinkImage(value) : value);
  }
  return out;
}

/**
 * Tells the server why a send failed in the browser, so it shows up in the
 * app's logs (the request itself never reached the server).
 */
export function reportClientError(where: string, e: unknown, fd?: FormData) {
  try {
    const files = fd
      ? [...fd.values()]
          .filter((v): v is File => v instanceof File && v.size > 0)
          .map((f) => ({ name: f.name.slice(0, 80), type: f.type, size: f.size }))
      : [];
    const body = JSON.stringify({
      where,
      error: e instanceof Error ? `${e.name}: ${e.message}` : String(e),
      files,
      online: navigator.onLine,
      ua: navigator.userAgent,
    }).slice(0, 4000);
    void fetch("/api/client-error", { method: "POST", body, keepalive: true }).catch(() => undefined);
  } catch {
    // Reporting must never break the page.
  }
}
