import { sushiroQueueSnapshot } from "@eslee/db/schema";
import { and, gte, sql } from "drizzle-orm";
import { type PatternsResponse, summarisePatterns } from "@/lib/patterns";
import { dayTypeOfSnapshot, issuingTickets, slotOfSnapshot } from "@/lib/queue-sql";
import { hongKongDate } from "@/lib/stats";

export const dynamic = "force-dynamic";

const historyDays = 30;
const maximumAgeMs = 10 * 60_000;
const cache = new Map<string, { at: number; body: PatternsResponse }>();

// The average wait for each kind of day and half hour over the last 30 days, with the weekend
// dinner ranking. ?storeId=16 gives that branch's grid. The ranking always covers every branch.
export async function GET(request: Request) {
  const storeParameter = new URL(request.url).searchParams.get("storeId");
  const storeId = storeParameter === null ? undefined : Number(storeParameter);

  if (storeId !== undefined && !(Number.isSafeInteger(storeId) && storeId > 0)) {
    return Response.json({ error: "storeId must be a branch number" }, { status: 400 });
  }

  const key = String(storeId ?? "all");
  const cached = cache.get(key);

  if (cached && Date.now() - cached.at < maximumAgeMs) {
    return Response.json(cached.body, { headers: { "Cache-Control": "no-store" } });
  }

  const from = new Date(Date.now() - historyDays * 24 * 60 * 60_000);
  const minute = slotOfSnapshot(30);
  const { db } = await import("@/lib/db");
  const rows = await db
    .select({
      dayType: dayTypeOfSnapshot,
      first: sql<Date>`min(${sushiroQueueSnapshot.collectedAt})`,
      last: sql<Date>`max(${sushiroQueueSnapshot.collectedAt})`,
      minute,
      name: sql<string>`max(${sushiroQueueSnapshot.name})`,
      nameEn: sql<string>`max(${sushiroQueueSnapshot.nameEn})`,
      storeId: sushiroQueueSnapshot.storeId,
      wait: sql<number>`avg(${sushiroQueueSnapshot.wait})::float`,
    })
    .from(sushiroQueueSnapshot)
    .where(and(gte(sushiroQueueSnapshot.collectedAt, from), issuingTickets))
    .groupBy(sushiroQueueSnapshot.storeId, dayTypeOfSnapshot, minute);

  const times = rows.flatMap((row) => [
    new Date(row.first).valueOf(),
    new Date(row.last).valueOf(),
  ]);
  const body: PatternsResponse = {
    ...summarisePatterns(rows, storeId),
    from: times.length > 0 ? hongKongDate(new Date(Math.min(...times))) : null,
    to: times.length > 0 ? hongKongDate(new Date(Math.max(...times))) : null,
  };

  cache.set(key, { at: Date.now(), body });
  return Response.json(body, { headers: { "Cache-Control": "no-store" } });
}
