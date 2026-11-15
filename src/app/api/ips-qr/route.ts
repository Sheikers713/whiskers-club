import sharp from "sharp";
import { findTarget, ipsReady, payloadFor } from "@/lib/ips-donation";
import { qrSvg } from "@/lib/ips-qr";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

/**
 * IPS QR code for a donation: /api/ips-qr?cat=<slug>&amount=1000 (no cat =
 * general fund). SVG for the page; &download=1 gives a PNG to save and open
 * from the bank app's «scan from gallery» on the same phone.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const settings = await getSettings();
  if (!ipsReady(settings)) return new Response("Not found", { status: 404 });
  const target = await findTarget(url.searchParams.get("cat"));
  if (!target) return new Response("Not found", { status: 404 });
  const amount = Number(url.searchParams.get("amount"));
  if (!Number.isInteger(amount) || amount < 50 || amount > 1_000_000) return new Response("Bad amount", { status: 400 });

  const svg = await qrSvg(payloadFor(settings, target, amount));
  const cache = { "Cache-Control": "public, max-age=300" };
  if (url.searchParams.get("download")) {
    const png = await sharp(Buffer.from(svg), { density: 600 }).resize(800, 800, { kernel: "nearest" }).flatten({ background: "#ffffff" }).png().toBuffer();
    return new Response(new Uint8Array(png), {
      headers: {
        ...cache,
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="whiskers-club-ips-${target.slug ?? "fond"}-${amount}.png"`,
      },
    });
  }
  return new Response(svg, { headers: { ...cache, "Content-Type": "image/svg+xml" } });
}
