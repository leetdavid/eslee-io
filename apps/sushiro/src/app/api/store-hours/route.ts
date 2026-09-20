import { sushiroStoreHours } from "@eslee/db/schema";
import { asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const { db } = await import("@/lib/db");
  const stores = await db.select().from(sushiroStoreHours).orderBy(asc(sushiroStoreHours.name));

  return Response.json({ stores });
}
