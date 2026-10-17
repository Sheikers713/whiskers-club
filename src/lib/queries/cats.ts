import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "../db";
import { campaignRaised } from "./finance";

/** Cats a visitor may see: published, with a public status. */
export const publicCatWhere: Prisma.CatWhereInput = {
  state: "PUBLISHED",
  status: { isPublic: true },
};

const cardInclude = {
  status: true,
  cover: true,
  flags: { include: { flag: true } },
  campaigns: {
    where: { campaign: { state: "PUBLISHED", status: "ACTIVE" } },
    include: { campaign: true },
  },
} satisfies Prisma.CatInclude;

export type CatCardData = Prisma.CatGetPayload<{ include: typeof cardInclude }> & {
  activeCampaign: { id: string; targetRsd: number; raisedRsd: number } | null;
};

export async function getPublicFilters() {
  return db.catalogFilter.findMany({ where: { isEnabled: true }, orderBy: { sortOrder: "asc" } });
}

type FilterDef = Awaited<ReturnType<typeof getPublicFilters>>[number];

export function filterWhere(filter: FilterDef | null): Prisma.CatWhereInput {
  // "All" means every public cat, adopted and memorial ones included; only
  // non-public statuses (archive, released after TNR) stay hidden.
  if (!filter || filter.key === "all") return publicCatWhere;
  const and: Prisma.CatWhereInput[] = [
    publicCatWhere,
    { status: { group: { in: filter.statusGroups } } },
  ];
  if (filter.statusKeys.length) and.push({ status: { key: { in: filter.statusKeys } } });
  if (filter.flagKeys.length) and.push({ flags: { some: { flag: { key: { in: filter.flagKeys } } } } });
  if (filter.requireActiveCampaign)
    and.push({ campaigns: { some: { campaign: { state: "PUBLISHED", status: "ACTIVE" } } } });
  return { AND: and };
}

/**
 * Automatic catalog order (TZ 5.2): pinned first, then manual priority, then
 * the status priority (urgent, ready, treatment, ..., adopted), then newest.
 */
function sortCats<T extends { isPinned: boolean; manualPriority: number; status: { priority: number }; publishedAt: Date | null; createdAt: Date }>(cats: T[]): T[] {
  return [...cats].sort(
    (a, b) =>
      Number(b.isPinned) - Number(a.isPinned) ||
      b.manualPriority - a.manualPriority ||
      a.status.priority - b.status.priority ||
      (b.publishedAt ?? b.createdAt).getTime() - (a.publishedAt ?? a.createdAt).getTime(),
  );
}

async function withCampaigns<T extends { campaigns: Array<{ campaign: { id: string; targetRsd: number } }> }>(
  cats: T[],
): Promise<Array<T & { activeCampaign: CatCardData["activeCampaign"] }>> {
  const ids = [...new Set(cats.flatMap((c) => c.campaigns.map((cc) => cc.campaign.id)))];
  const raised = await campaignRaised(ids);
  return cats.map((c) => {
    const camp = c.campaigns[0]?.campaign;
    return {
      ...c,
      activeCampaign: camp
        ? { id: camp.id, targetRsd: camp.targetRsd, raisedRsd: raised.get(camp.id) ?? 0 }
        : null,
    };
  });
}

export async function getCatalog(filterKey: string | undefined, take?: number) {
  const filters = await getPublicFilters();
  const active = filters.find((f) => f.key === filterKey) ?? filters[0] ?? null;
  const cats = await db.cat.findMany({ where: filterWhere(active), include: cardInclude });
  const sorted = sortCats(cats);
  const page = take ? sorted.slice(0, take) : sorted;
  return { filters, active, total: cats.length, cats: await withCampaigns(page) };
}

/** Home feed: every public cat, regardless of flags. */
export async function getHomeCats(take: number) {
  const cats = await db.cat.findMany({ where: filterWhere(null), include: cardInclude });
  return withCampaigns(sortCats(cats).slice(0, take));
}

export async function getCatsWithActiveCampaign(take: number) {
  const cats = await db.cat.findMany({
    where: {
      ...publicCatWhere,
      campaigns: { some: { campaign: { state: "PUBLISHED", status: "ACTIVE" } } },
    },
    include: cardInclude,
  });
  return withCampaigns(sortCats(cats).slice(0, take));
}

export async function getPublicCat(slug: string) {
  const cat = await db.cat.findFirst({
    where: { slug, ...publicCatWhere },
    include: {
      status: true,
      cover: true,
      flags: { include: { flag: true } },
      media: { where: { isHidden: false }, orderBy: { sortOrder: "asc" } },
      curators: {
        orderBy: { sortOrder: "asc" },
        include: {
          user: {
            select: {
              name: true,
              contactTelegram: true,
              contactPhone: true,
              contactWhatsapp: true,
              contactViber: true,
              contactInstagram: true,
            },
          },
        },
      },
      updates: { where: { state: "PUBLISHED" }, orderBy: { date: "desc" } },
      bondedWith: { where: publicCatWhere, select: { slug: true, name: true } },
      bondedOf: { where: publicCatWhere, select: { slug: true, name: true } },
      documents: {
        where: { state: "PUBLISHED", redactedFileId: { not: null } },
        orderBy: { documentDate: "desc" },
      },
      campaigns: {
        where: { campaign: { state: "PUBLISHED" } },
        include: { campaign: { include: { category: true } } },
      },
    },
  });
  if (!cat) return null;

  const [donations, expenses] = await Promise.all([
    db.donation.findMany({
      where: {
        state: "PUBLISHED",
        OR: [
          { catId: cat.id },
          { campaign: { cats: { some: { catId: cat.id } } } },
        ],
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      select: { id: true, date: true, amountRsd: true, showName: true, publicName: true, comment: true, campaignId: true },
    }),
    db.expense.findMany({
      where: { state: "PUBLISHED", cats: { some: { catId: cat.id } } },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      include: { category: true, _count: { select: { cats: true } } },
    }),
  ]);

  const activeLink = cat.campaigns.find((c) => c.campaign.status === "ACTIVE");
  const raised = activeLink ? await campaignRaised([activeLink.campaign.id]) : new Map<string, number>();
  const activeCampaign = activeLink
    ? { ...activeLink.campaign, raisedRsd: raised.get(activeLink.campaign.id) ?? 0 }
    : null;

  return { cat, donations, expenses, activeCampaign };
}
