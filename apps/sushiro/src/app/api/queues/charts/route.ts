import { sushiroQueueSnapshot } from "@eslee/db/schema";
import { and, asc, gte, lt, sql } from "drizzle-orm";
import { getGridChartHistory } from "@/lib/queue-cache";
import {
  gridHistoryHours,
  historyRanges,
  type QueueHistory,
  type QueueHistoryPoint,
  type QueueStoreHistory,
} from "@/lib/queues";
import { hongKongDate, hongKongDayRange } from "@/lib/stats";

export const dynamic = "force-dynamic";

const defaultHours = 24;
const chartHistoryRanges = [gridHistoryHours, ...historyRanges] as const;

type ChartHistoryRange = (typeof chartHistoryRanges)[number];

const bucketMinutes: Record<ChartHistoryRange, number> = {
  [gridHistoryHours]: 5,
  24: 5,
  168: 30,
  720: 120,
};

function parseHours(value: string | null) {
  if (value === null) {
    return defaultHours;
  }

  const hours = Number(value);
  return chartHistoryRanges.find((range) => range === hours);
}

// A single Hong Kong date is plotted in half-hour buckets for the Stats page.
const dayBucketMinutes = 30;

type ChartHistoryWindow = { bucketMinutes: number; from: Date; issuingOnly?: boolean; to?: Date };

function trailingWindow(hours: ChartHistoryRange): ChartHistoryWindow {
  return {
    bucketMinutes: bucketMinutes[hours],
    from: new Date(Date.now() - hours * 60 * 60 * 1_000),
  };
}

async function loadChartHistory({
  bucketMinutes: minutes,
  from,
  issuingOnly,
  to,
}: ChartHistoryWindow): Promise<QueueHistory> {
  const bucketInterval = sql.raw(`${minutes} * interval '1 minute'`);
  const bucketedAt = sql<string>`date_bin(${bucketInterval}, ${sushiroQueueSnapshot.collectedAt}, timestamptz '2000-01-01')`;
  const issuing = sql`${sushiroQueueSnapshot.storeStatus} = 'OPEN' and (${sushiroQueueSnapshot.netTicketStatus} like '%MANUAL%' or ${sushiroQueueSnapshot.netTicketStatus} like '%ONLINE%')`;
  const activeWait = sql<number>`round(avg(case when ${issuing} then ${sushiroQueueSnapshot.wait} else 0 end))::integer`;
  const { db } = await import("@/lib/db");
  const snapshots = await db
    .select({
      collectedAt: bucketedAt,
      name: sql<string>`max(${sushiroQueueSnapshot.name})`,
      nameEn: sql<string>`max(${sushiroQueueSnapshot.nameEn})`,
      storeId: sushiroQueueSnapshot.storeId,
      wait: activeWait,
    })
    .from(sushiroQueueSnapshot)
    .where(
      and(
        gte(sushiroQueueSnapshot.collectedAt, from),
        to ? lt(sushiroQueueSnapshot.collectedAt, to) : undefined,
        // Trend charts keep closed hours as a zero wait. Statistics leave those snapshots out, so
        // a branch that has stopped issuing tickets is not counted as having no queue.
        issuingOnly ? issuing : undefined,
      ),
    )
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

  return history;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const issuingOnly = searchParams.get("issuing") === "1";

  // ?date=YYYY-MM-DD returns one Hong Kong calendar day. It cannot be a future date.
  if (date !== null) {
    const range = hongKongDayRange(date);

    if (!range || date > hongKongDate(new Date())) {
      return Response.json(
        { error: "Date must be a past or current Hong Kong date, as YYYY-MM-DD" },
        { status: 400 },
      );
    }

    const history = await loadChartHistory({
      ...range,
      bucketMinutes: dayBucketMinutes,
      issuingOnly,
    });
    return Response.json(history, { headers: { "Cache-Control": "no-store" } });
  }

  const hours = parseHours(searchParams.get("hours"));

  if (hours === undefined) {
    return Response.json(
      { error: `Hours must be ${gridHistoryHours}, 24, 168, or 720` },
      { status: 400 },
    );
  }

  const history =
    hours === gridHistoryHours && !issuingOnly
      ? await getGridChartHistory(() => loadChartHistory(trailingWindow(hours)))
      : await loadChartHistory({ ...trailingWindow(hours), issuingOnly });

  return Response.json(history, { headers: { "Cache-Control": "no-store" } });
}
