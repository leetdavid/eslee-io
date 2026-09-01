import { sushiroQueueSnapshot } from "@eslee/db/schema";
import { asc, gte, sql } from "drizzle-orm";
import {
  type HistoryRange,
  historyRanges,
  type QueueHistory,
  type QueueHistoryPoint,
  type QueueStoreHistory,
} from "@/lib/queues";

export const dynamic = "force-dynamic";

const defaultHours = 24;
const bucketMinutes: Record<HistoryRange, number> = {
  24: 5,
  168: 30,
  720: 120,
};

function parseHours(value: string | null) {
  if (value === null) {
    return defaultHours;
  }

  const hours = Number(value);
  return historyRanges.find((range) => range === hours);
}

export async function GET(request: Request) {
  const hours = parseHours(new URL(request.url).searchParams.get("hours"));

  if (hours === undefined) {
    return Response.json({ error: "Hours must be 24, 168, or 720" }, { status: 400 });
  }

  const from = new Date(Date.now() - hours * 60 * 60 * 1_000);
  const bucketInterval = sql.raw(`${bucketMinutes[hours]} * interval '1 minute'`);
  const bucketedAt = sql<string>`date_bin(${bucketInterval}, ${sushiroQueueSnapshot.collectedAt}, timestamptz '2000-01-01')`;
  const activeWait = sql<number>`round(avg(case when ${sushiroQueueSnapshot.storeStatus} = 'OPEN' and (${sushiroQueueSnapshot.netTicketStatus} like '%MANUAL%' or ${sushiroQueueSnapshot.netTicketStatus} like '%ONLINE%') then ${sushiroQueueSnapshot.wait} else 0 end))::integer`;
  const { db } = await import("@eslee/db/client");
  const snapshots = await db
    .select({
      collectedAt: bucketedAt,
      name: sql<string>`max(${sushiroQueueSnapshot.name})`,
      nameEn: sql<string>`max(${sushiroQueueSnapshot.nameEn})`,
      storeId: sushiroQueueSnapshot.storeId,
      wait: activeWait,
    })
    .from(sushiroQueueSnapshot)
    .where(gte(sushiroQueueSnapshot.collectedAt, from))
    .groupBy(sushiroQueueSnapshot.storeId, bucketedAt)
    .orderBy(asc(bucketedAt), asc(sushiroQueueSnapshot.storeId));

  const global = new Map<string, QueueHistoryPoint>();
  const stores = new Map<number, QueueStoreHistory>();

  for (const snapshot of snapshots) {
    const collectedAt = new Date(snapshot.collectedAt).toISOString();
    const point = { collectedAt, wait: snapshot.wait };
    const store = stores.get(snapshot.storeId) ?? {
      latestWait: 0,
      name: snapshot.name,
      nameEn: snapshot.nameEn,
      points: [],
      storeId: snapshot.storeId,
    };

    store.points.push(point);
    store.latestWait = snapshot.wait;
    store.name = snapshot.name;
    store.nameEn = snapshot.nameEn;

    stores.set(snapshot.storeId, store);

    const total = global.get(collectedAt) ?? { collectedAt, wait: 0 };

    total.wait += snapshot.wait;
    global.set(collectedAt, total);
  }

  const history: QueueHistory = {
    global: [...global.values()],
    stores: [...stores.values()].sort(
      (left, right) => right.latestWait - left.latestWait || left.storeId - right.storeId,
    ),
  };

  return Response.json(history);
}
