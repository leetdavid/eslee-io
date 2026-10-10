import { sushiroQueueSnapshot } from "@eslee/db/schema";
import { sql } from "drizzle-orm";

// True for a snapshot taken while the branch was open and issuing tickets. A branch that has
// stopped issuing reports a zero wait, which is not the same as having no queue.
export const issuingTickets = sql`${sushiroQueueSnapshot.storeStatus} = 'OPEN' and (${sushiroQueueSnapshot.netTicketStatus} like '%MANUAL%' or ${sushiroQueueSnapshot.netTicketStatus} like '%ONLINE%')`;
