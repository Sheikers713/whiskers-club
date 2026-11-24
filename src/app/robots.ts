import type { MetadataRoute } from "next";
import { indexingAllowed, siteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

// Open to search engines unless ALLOW_INDEXING=false (keep that on temporary domains).
export default function robots(): MetadataRoute.Robots {
  if (!indexingAllowed()) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/files", "/*/cats/*/adopt"] },
    sitemap: `${siteUrl()}/sitemap.xml`,
    host: siteUrl(),
  };
}
