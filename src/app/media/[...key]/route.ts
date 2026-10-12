import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { serveStored } from "@/lib/serve-file";

export const dynamic = "force-dynamic";

// Public gallery photos: only the resized WebP variants are served here.
export async function GET(_req: Request, ctx: RouteContext<"/media/[...key]">) {
  const { key } = await ctx.params;
  const path = key.join("/");
  const m = path.match(/^(photos\/\d{4}\/\d{2}\/[0-9a-f-]{36}\.[a-z]+)\.w(480|1200)\.webp$/);
  if (!m) return new Response("Not found", { status: 404 });
  const asset = await db.mediaAsset.findFirst({ where: { storageKey: m[1], kind: "PHOTO" }, select: { isHidden: true } });
  if (!asset) return new Response("Not found", { status: 404 });
  if (asset.isHidden && !(await getCurrentUser())) return new Response("Not found", { status: 404 });
  return serveStored(path, "image/webp", { immutable: !asset.isHidden });
}
