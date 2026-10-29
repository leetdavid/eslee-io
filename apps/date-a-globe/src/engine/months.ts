// Months are counted from January 1805, the earliest globe the game dates.
export type Month = number;

export const FIRST_YEAR = 1805;
const NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const monthOf = (year: number, month = 1): Month => (year - FIRST_YEAR) * 12 + (month - 1);
export const yearOf = (m: Month) => FIRST_YEAR + Math.floor(m / 12);
export const monthName = (m: Month) => NAMES[((m % 12) + 12) % 12];
export const monthLabel = (m: Month) => `${monthName(m)} ${yearOf(m)}`;

/** The month a game is played in, which is the last month a globe could have been printed. */
export const currentMonth = (now: Date): Month =>
  monthOf(now.getUTCFullYear(), now.getUTCMonth() + 1);

/** An event date is "YYYY" or "YYYY-MM". A year alone leaves the month unknown. */
export function parseDate(s: string): { month: Month; precise: boolean } {
  const match = /^(\d{4})(?:-(\d{2}))?$/.exec(s);
  if (!match) throw new Error(`Bad event date "${s}"`);
  const year = Number(match[1]);
  return match[2]
    ? { month: monthOf(year, Number(match[2])), precise: true }
    : { month: monthOf(year), precise: false };
}

/** "Nov 1860" for a precise date, "1860" for a year alone. */
export const dateLabel = (s: string) => {
  const { month, precise } = parseDate(s);
  return precise ? monthLabel(month) : String(yearOf(month));
};
