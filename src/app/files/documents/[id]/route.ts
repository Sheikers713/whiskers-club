import { db } from "@/lib/db";
import { serveStored } from "@/lib/serve-file";

export const dynamic = "force-dynamic";

// Only the redacted public copy is ever served publicly; the original stays private.
export async function GET(_req: Request, ctx: RouteContext<"/files/documents/[id]">) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response("Not found", { status: 404 });
  const doc = await db.medicalDocument.findFirst({
    where: { id, state: "PUBLISHED", cat: { state: "PUBLISHED" } },
    include: { redactedFile: true },
  });
  if (!doc?.redactedFile) return new Response("Not found", { status: 404 });
  return serveStored(doc.redactedFile.storageKey, doc.redactedFile.mime);
}
