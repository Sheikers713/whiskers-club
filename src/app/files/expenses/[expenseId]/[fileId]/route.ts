import { db } from "@/lib/db";
import { serveStored } from "@/lib/serve-file";

export const dynamic = "force-dynamic";

// Receipts marked public on a published expense.
export async function GET(_req: Request, ctx: RouteContext<"/files/expenses/[expenseId]/[fileId]">) {
  const { expenseId, fileId } = await ctx.params;
  const uuid = /^[0-9a-f-]{36}$/;
  if (!uuid.test(expenseId) || !uuid.test(fileId)) return new Response("Not found", { status: 404 });
  const link = await db.expenseFile.findFirst({
    where: { expenseId, fileId, isPublic: true, expense: { state: "PUBLISHED" } },
    include: { file: true },
  });
  if (!link) return new Response("Not found", { status: 404 });
  return serveStored(link.file.storageKey, link.file.mime);
}
