import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/**
 * Admin pages report here when sending a form failed in the browser
 * (upload cut off, file unreadable). Only written to the app log.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response(null, { status: 401 });
  const text = (await request.text()).slice(0, 4000);
  console.error(`[client-error] user=${user.name ?? user.id} ${text}`);
  return new Response(null, { status: 204 });
}
