import "server-only";
import { getFile } from "./storage";

/** Serves a stored file inline with safe headers. */
export async function serveStored(
  storageKey: string,
  mime: string,
  opts: { immutable?: boolean; filename?: string } = {},
): Promise<Response> {
  const data = await getFile(storageKey);
  if (!data) return new Response("Not found", { status: 404 });
  const headers = new Headers({
    "Content-Type": mime,
    "Content-Length": String(data.length),
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
    "Cache-Control": opts.immutable ? "public, max-age=31536000, immutable" : "private, no-store",
  });
  if (opts.filename) {
    headers.set("Content-Disposition", `inline; filename*=UTF-8''${encodeURIComponent(opts.filename)}`);
  }
  return new Response(new Uint8Array(data), { headers });
}
