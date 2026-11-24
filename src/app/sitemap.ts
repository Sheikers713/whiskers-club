import type { MetadataRoute } from "next";
import { locales } from "@/lib/i18n/config";
import { db } from "@/lib/db";
import { publicCatWhere } from "@/lib/queries/cats";
import { indexingAllowed, siteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

const pages: { path: string; priority: number; changeFrequency: "daily" | "weekly" | "monthly" }[] = [
  { path: "", priority: 1, changeFrequency: "daily" },
  { path: "/cats", priority: 0.9, changeFrequency: "daily" },
  { path: "/help", priority: 0.8, changeFrequency: "weekly" },
  { path: "/transparency", priority: 0.6, changeFrequency: "weekly" },
  { path: "/about", priority: 0.6, changeFrequency: "monthly" },
  { path: "/volunteer", priority: 0.5, changeFrequency: "monthly" },
  { path: "/foster", priority: 0.5, changeFrequency: "monthly" },
  { path: "/partnership", priority: 0.4, changeFrequency: "monthly" },
  { path: "/privacy", priority: 0.1, changeFrequency: "monthly" },
];

/** Every public page in every language, with hreflang alternates. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!indexingAllowed()) return [];
  const base = siteUrl();
  const cats = await db.cat.findMany({ where: publicCatWhere, select: { slug: true, updatedAt: true } });
  const entry = (path: string, extra: Omit<MetadataRoute.Sitemap[number], "url">) =>
    locales.map((l) => ({
      url: `${base}/${l}${path}`,
      alternates: { languages: Object.fromEntries(locales.map((x) => [x, `${base}/${x}${path}`])) },
      ...extra,
    }));
  return [
    ...pages.flatMap((p) => entry(p.path, { priority: p.priority, changeFrequency: p.changeFrequency })),
    ...cats.flatMap((c) => entry(`/cats/${c.slug}`, { lastModified: c.updatedAt, priority: 0.7, changeFrequency: "weekly" })),
  ];
}
