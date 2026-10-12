import type { MetadataRoute } from "next";

export const dynamic = "force-dynamic";

// Temporary domains stay out of search engines until ALLOW_INDEXING=true (decision 2.4).
export default function robots(): MetadataRoute.Robots {
  if (process.env.ALLOW_INDEXING !== "true") return { rules: { userAgent: "*", disallow: "/" } };
  return { rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/files", "/api"] } };
}
