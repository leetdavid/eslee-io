import { sushiroQueueSnapshot } from "@eslee/db/schema";
import { and, gte, inArray, lt, sql } from "drizzle-orm";
import { issuingTickets } from "@/lib/queue-sql";
import { hongKongDate, hongKongDayRange } from "@/lib/stats";
import { type UsualResponse, type UsualRow, usualSlots } from "@/lib/usual";

export const dynamic = "force-dynamic";

// Usual waits come from the last eight weeks, not counting today.
const historyDays = 56;
const maximumStores = 60;
const maximumAgeMs = 10 * 60_000;
const cache = new Map<string, { at: number; body: UsualResponse }>();

function parseStoreIds(value: string | null) {
  if (value === null) {
    return null;
  }

  const ids = value.split(",").map(Number);
  const valid =
    ids.length > 0 &&
    ids.length <= maximumStores &&
    ids.every((id) => Number.isSafeInteger(id) && id > 0);

  return valid ? [...new Set(ids)].sort((left, right) => left - right) : undefined;
}

// ?weekday=0..6 (Monday is 0) returns each branch's usual wait for every five minutes of that
// weekday. ?storeIds=1,2 limits it to those branches.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const weekdayParameter = searchParams.get("weekday");
  const weekday = Number(weekdayParameter);
  const storeIds = parseStoreIds(searchParams.get("storeIds"));

  if (weekdayParameter === null || !Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
    return Response.json({ error: "weekday must be 0 to 6, with Monday as 0" }, { status: 400 });
  }

  if (storeIds === undefined) {
    return Response.json(
      { error: `storeIds must be up to ${maximumStores} branch numbers separated by commas` },
      { status: 400 },
    );
  }

  const today = hongKongDate(new Date());
  const key = `${today}|${weekday}|${storeIds?.join(",") ?? "all"}`;
  const cached = cache.get(key);

  if (cached && Date.now() - cached.at < maximumAgeMs) {
    return Response.json(cached.body, { headers: { "Cache-Control": "no-store" } });
  }

  const startOfToday = hongKongDayRange(today)?.from ?? new Date();
  const from = new Date(startOfToday.valueOf() - historyDays * 24 * 60 * 60_000);
  const local = sql`(${sushiroQueueSnapshot.collectedAt} at time zone 'Asia/Hong_Kong')`;
  const day = sql<string>`${local}::date::text`;
  const minute = sql<number>`((extract(hour from ${local}) * 60 + extract(minute from ${local}))::int / 5) * 5`;
  const { db } = await import("@/lib/db");
  const rows = await db
    .select({
      day,
      minute,
      storeId: sushiroQueueSnapshot.storeId,
      wait: sql<number>`round(avg(${sushiroQueueSnapshot.wait}))::int`,
    })
    .from(sushiroQueueSnapshot)
    .where(
      and(
        gte(sushiroQueueSnapshot.collectedAt, from),
        lt(sushiroQueueSnapshot.collectedAt, startOfToday),
        issuingTickets,
        sql`extract(isodow from ${local}) = ${weekday + 1}`,
        storeIds ? inArray(sushiroQueueSnapshot.storeId, storeIds) : undefined,
      ),
    )
    .groupBy(sushiroQueueSnapshot.storeId, day, minute);

  const rowsByStore = new Map<number, UsualRow[]>();

  for (const row of rows) {
    rowsByStore.set(row.storeId, [...(rowsByStore.get(row.storeId) ?? []), row]);
  }

  const body: UsualResponse = {
    stores: [...rowsByStore]
      .map(([storeId, storeRows]) => ({ slots: usualSlots(storeRows), storeId }))
      .sort((left, right) => left.storeId - right.storeId),
    weekday,
  };

  cache.set(key, { at: Date.now(), body });
  return Response.json(body, { headers: { "Cache-Control": "no-store" } });
}
