import { sushiroQueueSnapshot, sushiroStoreHours } from "@eslee/db/schema";
import { sql } from "drizzle-orm";
import { getQueues } from "@/lib/queue-cache";
import { fetchStoreHours } from "@/lib/store-hours";

export const maxDuration = 60;

const storeHoursRefreshInterval = 30 * 24 * 60 * 60 * 1_000;

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const collectedAt = new Date();
    const { stores } = await getQueues();
    const { db } = await import("@eslee/db/client");

    await db.insert(sushiroQueueSnapshot).values(
      stores.map(({ id: storeId, ...store }) => ({
        ...store,
        storeId,
        collectedAt,
      })),
    );

    const storedHours = await db.select().from(sushiroStoreHours);
    const needsStoreHours =
      storedHours.length !== stores.length ||
      storedHours.some(
        ({ updatedAt }) => Date.now() - updatedAt.valueOf() >= storeHoursRefreshInterval,
      );
    let storeHoursUpdated = false;

    if (needsStoreHours) {
      try {
        const storeHours = await fetchStoreHours(stores);
        const existingHours = new Map(storedHours.map((store) => [store.storeId, store]));
        const nextStoreHours = storeHours.map((store) => {
          const existing = existingHours.get(store.storeId);

          return store.source === "unavailable" && existing
            ? {
                ...store,
                openingHours: existing.openingHours,
                phone: existing.phone,
                source: existing.source,
              }
            : store;
        });

        await db
          .insert(sushiroStoreHours)
          .values(nextStoreHours.map((store) => ({ ...store, updatedAt: collectedAt })))
          .onConflictDoUpdate({
            set: {
              address: sql`excluded.address`,
              name: sql`excluded.name`,
              nameEn: sql`excluded.name_en`,
              openingHours: sql`excluded.opening_hours`,
              phone: sql`excluded.phone`,
              source: sql`excluded.source`,
              updatedAt: sql`excluded.updated_at`,
            },
            target: sushiroStoreHours.storeId,
          });
        storeHoursUpdated = true;
      } catch (error) {
        console.error("Unable to collect Sushiro store hours", error);
      }
    }

    return Response.json({
      collectedAt,
      storesCollected: stores.length,
      storeHoursUpdated,
    });
  } catch {
    return Response.json({ error: "Unable to collect Sushiro queue data" }, { status: 502 });
  }
}
