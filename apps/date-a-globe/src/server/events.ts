import "server-only";

import { DateAGlobeEvent } from "@eslee/db/date-a-globe";
import { inArray } from "drizzle-orm";
import { createEngine, type Engine } from "@/engine";
import { type GameEvent, gameEventSchema } from "@/lib/events";
import { type Database, getDatabase } from "@/server/database";

// The asked set changes only when a maintainer reviews, so each instance keeps it for a minute.
const TTL = 60_000;
let cached: { at: number; events: GameEvent[]; engine: Engine } | null = null;

export async function askedEvents(db: Database): Promise<GameEvent[]> {
  const rows = await db
    .select()
    .from(DateAGlobeEvent)
    .where(inArray(DateAGlobeEvent.status, ["live", "trial"]));
  return rows.map((r) =>
    gameEventSchema.parse({
      id: r.id,
      title: r.title,
      kind: r.kind,
      question: r.question,
      hint: r.hint,
      spans: r.spans,
      region: r.region,
      lat: r.lat,
      lon: r.lon,
      size: r.size,
      regional: r.regional,
      trial: r.status === "trial",
    }),
  );
}

/** The live and trial events, and an engine over them, as of the last minute. */
export async function currentEvents(now = new Date()) {
  if (!cached || now.getTime() - cached.at > TTL) {
    const events = await askedEvents(await getDatabase());
    cached = { at: now.getTime(), events, engine: createEngine(events, { now }) };
  }
  return cached;
}

/** Drop the cache after a review changes what is asked. */
export const forgetEvents = () => {
  cached = null;
};
