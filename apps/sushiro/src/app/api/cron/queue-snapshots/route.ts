import { sushiroQueueSnapshot } from "@eslee/db/schema";
import { fetchQueues } from "@/lib/sushiro";

export const maxDuration = 60;

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const collectedAt = new Date();
    const { stores } = await fetchQueues();
    const { db } = await import("@eslee/db/client");

    await db.insert(sushiroQueueSnapshot).values(
      stores.map(({ id: storeId, ...store }) => ({
        ...store,
        storeId,
        collectedAt,
      })),
    );

    return Response.json({ collectedAt, storesCollected: stores.length });
  } catch {
    return Response.json({ error: "Unable to collect Sushiro queue data" }, { status: 502 });
  }
}
