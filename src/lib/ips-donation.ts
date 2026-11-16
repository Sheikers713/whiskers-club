import "server-only";
import { db } from "./db";
import { GENERAL_REFERENCE, catReference, ipsPayload, isValidAccount, model97 } from "./ips";
import { publicCatWhere } from "./queries/cats";
import type { SiteSettings } from "./settings";

/** What the donation box shows and encodes: for one cat, or for the general fund. */
export type IpsTarget = { slug: string | null; reference: string };

export function catTarget(cat: { slug: string; donationCode: number }): IpsTarget {
  return { slug: cat.slug, reference: catReference(cat.donationCode) };
}

export const generalTarget: IpsTarget = { slug: null, reference: GENERAL_REFERENCE };

/** The cat's target when the cat is public, the general fund for no slug, null otherwise. */
export async function findTarget(slug: string | null): Promise<IpsTarget | null> {
  if (!slug) return generalTarget;
  const cat = await db.cat.findFirst({
    where: { slug, ...publicCatWhere },
    select: { slug: true, donationCode: true },
  });
  return cat ? catTarget(cat) : null;
}

export function ipsReady(settings: SiteSettings): boolean {
  return settings.ips.enabled && isValidAccount(settings.ips.account) && settings.ips.recipient.trim() !== "";
}

export function payloadFor(settings: SiteSettings, target: IpsTarget, amountRsd: number): string {
  return ipsPayload({ account: settings.ips.account, recipient: settings.ips.recipient, amountRsd, reference: target.reference });
}

/** "265-0000007002560-05", as banks print it. */
export function formatAccount(account: string): string {
  return `${account.slice(0, 3)}-${account.slice(3, 16)}-${account.slice(16)}`;
}

/** "97 35-10012", as typed into a payment form: model, then the number. */
export function formatReference(reference: string): { model: string; number: string } {
  const full = model97(reference);
  return { model: "97", number: full.slice(2) };
}
