import { sushiroQueueSnapshot, sushiroStoreHours, sushiroTicketReport } from "@eslee/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { db } = await import("@/lib/db");
    // Selecting each table's columns checks that the deployed schema matches
    // the candidate build, even when a preview database has no rows yet.
    await Promise.all([
      db.select().from(sushiroQueueSnapshot).limit(1),
      db.select().from(sushiroStoreHours).limit(1),
      db.select().from(sushiroTicketReport).limit(1),
    ]);
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Sushiro database health check failed", error);
    return Response.json({ ok: false }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
