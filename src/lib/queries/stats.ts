import "server-only";
import { db } from "../db";
import { getSettings } from "../settings";
import { getFinanceTotals } from "./finance";

/**
 * Home page counters, computed from the database plus the offsets for the
 * time before the site (decision 3.4: 27 cats rescued before launch).
 * Hidden records with countInStats (e.g. TNR cats) are included.
 */
export async function getHomeStats() {
  const settings = await getSettings();
  const counted = { countInStats: true, state: { not: "DRAFT" as const } };
  const [rescued, adopted, sterilized, inTreatment, money] = await Promise.all([
    db.cat.count({ where: counted }),
    db.cat.count({ where: { ...counted, status: { group: "ADOPTED" } } }),
    db.cat.count({ where: { ...counted, sterilized: "YES" } }),
    db.cat.count({ where: { ...counted, status: { key: "treatment" } } }),
    getFinanceTotals(),
  ]);
  const o = settings.counterOffsets;
  return {
    rescued: rescued + (o.rescued ?? 0),
    adopted: adopted + (o.adopted ?? 0),
    sterilized: sterilized + (o.sterilized ?? 0),
    inTreatment,
    ...money,
    eurRate: settings.eurRate,
  };
}
