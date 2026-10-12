import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/roles";
import { serveStored } from "@/lib/serve-file";

export const dynamic = "force-dynamic";

// Private originals (receipts, documents) for signed-in admins only.
export async function GET(_req: Request, ctx: RouteContext<"/admin/files/[id]">) {
  const user = await getCurrentUser();
  if (!user) return new Response("Not found", { status: 404 });
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response("Not found", { status: 404 });
  const file = await db.storedFile.findUnique({
    where: { id },
    include: { _count: { select: { donationFiles: true, expenseFiles: true } } },
  });
  if (!file) return new Response("Not found", { status: 404 });
  const financial = file._count.donationFiles + file._count.expenseFiles > 0;
  if (financial && !hasRole(user.roles, ["FINANCE"])) return new Response("Forbidden", { status: 403 });
  return serveStored(file.storageKey, file.mime, { filename: file.originalName });
}
