/**
 * Money without a cat (the 15 000 opening balance, any later donation without
 * a cat, minus expenses without a cat) is only touched when a cat leaves our
 * care (adopted, died, archived). At that moment the cat's balance is brought
 * to zero: a shortfall is covered from the money without a cat, a surplus goes
 * back to it. Nothing is stored: it follows from the records, so a late receipt
 * for an adopted cat simply moves its settlement.
 */

export type CatMoney = {
  id: string;
  name: string;
  /** Left our care (status group is not ACTIVE). */
  closed: boolean;
  /** When it left (YYYY-MM-DD), for ordering and display. */
  closedOn: string | null;
  income: number;
  spent: number;
};

/** amount > 0: covered from the money without a cat; < 0: surplus returned to it. */
export type Settlement = { catId: string; name: string; closedOn: string | null; amount: number };

export function settlements(cats: CatMoney[]): Settlement[] {
  return cats
    .filter((c) => c.closed && Math.round(c.spent - c.income) !== 0)
    .map((c) => ({ catId: c.id, name: c.name, closedOn: c.closedOn, amount: Math.round(c.spent - c.income) }))
    .sort((a, b) => (a.closedOn ?? "").localeCompare(b.closedOn ?? "") || a.name.localeCompare(b.name, "ru"));
}

/** What is left without a cat after the settlements. */
export function noCatBalance(income: number, spent: number, s: Settlement[]): number {
  return income - spent - s.reduce((sum, x) => sum + x.amount, 0);
}
