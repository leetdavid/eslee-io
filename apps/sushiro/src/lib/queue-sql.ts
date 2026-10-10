import { sushiroQueueSnapshot } from "@eslee/db/schema";
import { sql } from "drizzle-orm";
import { hongKongHolidays } from "@/lib/holidays";

// True for a snapshot taken while the branch was open and issuing tickets. A branch that has
// stopped issuing reports a zero wait, which is not the same as having no queue.
export const issuingTickets = sql`${sushiroQueueSnapshot.storeStatus} = 'OPEN' and (${sushiroQueueSnapshot.netTicketStatus} like '%MANUAL%' or ${sushiroQueueSnapshot.netTicketStatus} like '%ONLINE%')`;

// When a snapshot was taken, on the Hong Kong clock.
export const hongKongTime = sql`(${sushiroQueueSnapshot.collectedAt} at time zone 'Asia/Hong_Kong')`;

// The dates are this app's own constants, written inline so the expression is identical
// wherever it is repeated in a query, as GROUP BY requires.
const holidayDates = sql.raw(hongKongHolidays.map((date) => `date '${date}'`).join(", "));

// The kind of day a snapshot belongs to: 1 for Monday through 7 for Sunday, with a public
// holiday counted as Sunday.
export const dayTypeOfSnapshot = sql<number>`(case when ${hongKongTime}::date in (${holidayDates}) then 7 else extract(isodow from ${hongKongTime})::int end)`;

// Minutes since Hong Kong midnight, rounded down to a slot of the given length.
export function slotOfSnapshot(minutes: 5 | 30) {
  return sql<number>`((extract(hour from ${hongKongTime}) * 60 + extract(minute from ${hongKongTime}))::int / ${sql.raw(String(minutes))}) * ${sql.raw(String(minutes))}`;
}
