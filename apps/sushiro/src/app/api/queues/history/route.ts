import { sushiroQueueSnapshot } from "@eslee/db/schema";
import { and, desc, eq, gte, lte } from "drizzle-orm";

export const dynamic = "force-dynamic";

const defaultLimit = 288;
const maximumLimit = 1_000;

function parseDate(value: string | null) {
  if (value === null) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? undefined : date;
}

function parsePositiveInteger(value: string | null, defaultValue?: number) {
  if (value === null && defaultValue !== undefined) {
    return defaultValue;
  }

  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : undefined;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const storeId = parsePositiveInteger(searchParams.get("storeId"));
  const from = parseDate(searchParams.get("from"));
  const to = parseDate(searchParams.get("to"));
  const limit = parsePositiveInteger(searchParams.get("limit"), defaultLimit);

  if (
    (searchParams.has("storeId") && storeId === undefined) ||
    from === undefined ||
    to === undefined ||
    limit === undefined
  ) {
    return Response.json({ error: "Invalid query parameters" }, { status: 400 });
  }

  if (from && to && from > to) {
    return Response.json({ error: "The from date must be before the to date" }, { status: 400 });
  }

  const { db } = await import("@eslee/db/client");
  const snapshots = await db
    .select()
    .from(sushiroQueueSnapshot)
    .where(
      and(
        storeId ? eq(sushiroQueueSnapshot.storeId, storeId) : undefined,
        from ? gte(sushiroQueueSnapshot.collectedAt, from) : undefined,
        to ? lte(sushiroQueueSnapshot.collectedAt, to) : undefined,
      ),
    )
    .orderBy(desc(sushiroQueueSnapshot.collectedAt))
    .limit(Math.min(limit, maximumLimit));

  return Response.json({ snapshots });
}
