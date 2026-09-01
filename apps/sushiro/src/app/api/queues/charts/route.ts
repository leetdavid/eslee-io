import { sushiroQueueSnapshot } from "@eslee/db/schema";
import { asc, gte } from "drizzle-orm";
import type { QueueHistory, QueueHistoryPoint, QueueStoreHistory } from "@/lib/queues";

export const dynamic = "force-dynamic";

const defaultHours = 24;
const maximumHours = 24;

function parseHours(value: string | null) {
  if (value === null) {
    return defaultHours;
  }

  const hours = Number(value);
  return Number.isSafeInteger(hours) && hours > 0 && hours <= maximumHours ? hours : undefined;
}

export async function GET(request: Request) {
  const hours = parseHours(new URL(request.url).searchParams.get("hours"));

  if (hours === undefined) {
    return Response.json({ error: "Hours must be between 1 and 24" }, { status: 400 });
  }

  const from = new Date(Date.now() - hours * 60 * 60 * 1_000);
  const { db } = await import("@eslee/db/client");
  const snapshots = await db
    .select({
      collectedAt: sushiroQueueSnapshot.collectedAt,
      name: sushiroQueueSnapshot.name,
      nameEn: sushiroQueueSnapshot.nameEn,
      netTicketStatus: sushiroQueueSnapshot.netTicketStatus,
      storeId: sushiroQueueSnapshot.storeId,
      storeStatus: sushiroQueueSnapshot.storeStatus,
      wait: sushiroQueueSnapshot.wait,
    })
    .from(sushiroQueueSnapshot)
    .where(gte(sushiroQueueSnapshot.collectedAt, from))
    .orderBy(asc(sushiroQueueSnapshot.collectedAt), asc(sushiroQueueSnapshot.storeId));

  const global = new Map<string, QueueHistoryPoint>();
  const stores = new Map<number, QueueStoreHistory>();

  for (const snapshot of snapshots) {
    const collectedAt = snapshot.collectedAt.toISOString();
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

    if (
      snapshot.storeStatus === "OPEN" &&
      (snapshot.netTicketStatus.includes("MANUAL") || snapshot.netTicketStatus.includes("ONLINE"))
    ) {
      total.wait += snapshot.wait;
    }

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
