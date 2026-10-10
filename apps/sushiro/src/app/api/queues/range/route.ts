import { sushiroQueueSnapshot } from "@eslee/db/schema";
import { min } from "drizzle-orm";
import { hongKongDate } from "@/lib/stats";

export const dynamic = "force-dynamic";

// The first recorded day changes at most once, so one lookup an hour is plenty.
const maximumAgeMs = 60 * 60_000;
let cached: { at: number; first: string | null } | null = null;

// The Hong Kong date of the earliest queue snapshot. Stats cannot show a day before it.
export async function GET() {
  if (!cached || Date.now() - cached.at > maximumAgeMs) {
    const { db } = await import("@/lib/db");
    const [row] = await db
      .select({ earliest: min(sushiroQueueSnapshot.collectedAt) })
      .from(sushiroQueueSnapshot);

    cached = { at: Date.now(), first: row?.earliest ? hongKongDate(row.earliest) : null };
  }

  return Response.json({ first: cached.first }, { headers: { "Cache-Control": "no-store" } });
}
