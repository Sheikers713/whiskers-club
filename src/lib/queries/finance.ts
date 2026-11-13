import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "../db";
import { getSettings } from "../settings";

/**
 * Money collected for each campaign: published donations plus published
 * transfers into it, minus transfers out of it (e.g. a remainder moved to the
 * general fund). Computed from records, never stored (TZ 11).
 */
export async function campaignRaised(campaignIds: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (!campaignIds.length) return out;
  const [donations, tin, tout] = await Promise.all([
    db.donation.groupBy({
      by: ["campaignId"],
      where: { state: "PUBLISHED", campaignId: { in: campaignIds } },
      _sum: { amountRsd: true },
    }),
    db.fundTransfer.groupBy({
      by: ["toCampaignId"],
      where: { state: "PUBLISHED", toCampaignId: { in: campaignIds } },
      _sum: { amountRsd: true },
    }),
    db.fundTransfer.groupBy({
      by: ["fromCampaignId"],
      where: { state: "PUBLISHED", fromCampaignId: { in: campaignIds } },
      _sum: { amountRsd: true },
    }),
  ]);
  for (const id of campaignIds) out.set(id, 0);
  for (const d of donations) if (d.campaignId) out.set(d.campaignId, (out.get(d.campaignId) ?? 0) + (d._sum.amountRsd ?? 0));
  for (const t of tin) if (t.toCampaignId) out.set(t.toCampaignId, (out.get(t.toCampaignId) ?? 0) + (t._sum.amountRsd ?? 0));
  for (const t of tout) if (t.fromCampaignId) out.set(t.fromCampaignId, (out.get(t.fromCampaignId) ?? 0) - (t._sum.amountRsd ?? 0));
  return out;
}

/** One cat's part of an expense linked to `catCount` cats (equal split). */
export function expenseShare(amountRsd: number, catCount: number): number {
  return catCount > 1 ? amountRsd / catCount : amountRsd;
}

export type ReportFilters = {
  from?: Date;
  to?: Date;
  catId?: string;
  categoryId?: string;
};

function dateRange(f: ReportFilters): Prisma.DateTimeFilter | undefined {
  if (!f.from && !f.to) return undefined;
  return { ...(f.from ? { gte: f.from } : {}), ...(f.to ? { lte: f.to } : {}) };
}

/** Public report: only published records, totals computed on the server. */
export async function getPublicReport(f: ReportFilters) {
  const date = dateRange(f);
  const donationWhere: Prisma.DonationWhereInput = {
    state: "PUBLISHED",
    ...(date ? { date } : {}),
    ...(f.catId
      ? { OR: [{ catId: f.catId }, { campaign: { cats: { some: { catId: f.catId } } } }] }
      : {}),
  };
  const expenseWhere: Prisma.ExpenseWhereInput = {
    state: "PUBLISHED",
    ...(date ? { date } : {}),
    ...(f.catId ? { cats: { some: { catId: f.catId } } } : {}),
    ...(f.categoryId ? { categoryId: f.categoryId } : {}),
  };
  const [donations, expenses, donationSum, expenseSum] = await Promise.all([
    f.categoryId
      ? Promise.resolve([])
      : db.donation.findMany({
          where: donationWhere,
          orderBy: [{ date: "desc" }, { createdAt: "desc" }],
          select: {
            id: true,
            date: true,
            amountRsd: true,
            showName: true,
            publicName: true,
            comment: true,
            cat: { select: { slug: true, name: true } },
            campaign: { select: { id: true, title: true } },
          },
        }),
    db.expense.findMany({
      where: expenseWhere,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      include: {
        category: true,
        cats: { include: { cat: { select: { slug: true, name: true, state: true } } } },
        files: { where: { isPublic: true }, select: { fileId: true } },
      },
    }),
    f.categoryId
      ? Promise.resolve({ _sum: { amountRsd: 0 } })
      : db.donation.aggregate({ where: donationWhere, _sum: { amountRsd: true } }),
    db.expense.aggregate({ where: expenseWhere, _sum: { amountRsd: true } }),
  ]);
  const incomeRsd = donationSum._sum.amountRsd ?? 0;
  // An expense shared by several cats is split equally between them, so a
  // single cat's report counts only its share.
  const expenseRsd = f.catId
    ? Math.round(expenses.reduce((sum, e) => sum + expenseShare(e.amountRsd, e.cats.length), 0))
    : (expenseSum._sum.amountRsd ?? 0);
  // The opening balance belongs to the report when the period starts on or
  // before its date (and does not end before it).
  const opening = (await getSettings()).openingBalance;
  const openingDate = opening?.date ? new Date(`${opening.date}T00:00:00Z`) : null;
  const openingRsd =
    opening?.amountRsd && openingDate && (!f.from || f.from <= openingDate) && (!f.to || f.to >= openingDate)
      ? opening.amountRsd
      : 0;
  return {
    donations,
    expenses,
    incomeRsd,
    expenseRsd,
    openingRsd,
    openingDate: openingRsd ? openingDate : null,
    balanceRsd: openingRsd + incomeRsd - expenseRsd,
  };
}

/**
 * All-time totals for the home page counters. The opening balance counts as
 * raised: it was donations too, from before the books were kept here.
 */
export async function getFinanceTotals() {
  const [inc, exp, settings] = await Promise.all([
    db.donation.aggregate({ where: { state: "PUBLISHED" }, _sum: { amountRsd: true } }),
    db.expense.aggregate({ where: { state: "PUBLISHED" }, _sum: { amountRsd: true } }),
    getSettings(),
  ]);
  const raisedRsd = inc._sum.amountRsd ?? 0;
  const spentRsd = exp._sum.amountRsd ?? 0;
  const openingRsd = settings.openingBalance?.amountRsd ?? 0;
  return { raisedRsd: openingRsd + raisedRsd, spentRsd, openingRsd, balanceRsd: openingRsd + raisedRsd - spentRsd };
}
