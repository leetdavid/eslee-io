import "server-only";

import { DateAGlobeEvent } from "@eslee/db/date-a-globe";
import { and, eq, inArray } from "drizzle-orm";
import { cache } from "react";
import { createEngine, type EngineEvent, parseDate, type Span, yearOf } from "@/engine";
import { getDatabase } from "@/server/database";
import { loadPlay } from "@/server/plays";

export interface ResultEvent {
  id: string;
  title: string;
  lat: number;
  lon: number;
  spans: { from: string; until: string | null }[];
}

/** A saved game and the events it asked, for the result page and its share image. */
export const resultFor = cache(async (id: string) => {
  if (!/^[\w-]{6,12}$/.test(id)) return null;
  const db = await getDatabase();
  const play = await loadPlay(db, id);
  if (!play) return null;
  const ids = [...new Set(play.turns.map((t) => t.eventId))];
  const rows = ids.length
    ? await db
        .select({
          id: DateAGlobeEvent.id,
          title: DateAGlobeEvent.title,
          lat: DateAGlobeEvent.lat,
          lon: DateAGlobeEvent.lon,
          spans: DateAGlobeEvent.spans,
          status: DateAGlobeEvent.status,
          kind: DateAGlobeEvent.kind,
          size: DateAGlobeEvent.size,
          region: DateAGlobeEvent.region,
          regional: DateAGlobeEvent.regional,
        })
        .from(DateAGlobeEvent)
        .where(inArray(DateAGlobeEvent.id, ids))
    : [];
  const events = new Map(rows.map((r) => [r.id, { ...r, spans: r.spans as ResultEvent["spans"] }]));
  const trial = new Set(rows.filter((r) => r.status === "trial").map((r) => r.id));
  // Replay the answers over just these events to show how each one narrowed the range.
  const engine = createEngine(
    rows.map((r) => ({
      id: r.id,
      kind: r.kind as EngineEvent["kind"],
      spans: r.spans as Span[],
      size: r.size as EngineEvent["size"],
      region: r.region as EngineEvent["region"],
      regional: r.regional,
      trial: r.status === "trial",
    })),
    { now: play.createdAt },
  );
  const known = play.turns.filter((t) => events.has(t.eventId));
  const steps = play.turns.map((t) =>
    t.answer === "cant" || !events.has(t.eventId)
      ? null
      : engine.windowOf(engine.posterior(known.slice(0, known.indexOf(t) + 1))),
  );
  return { play, events, trial, steps, months: engine.months };
});

/** Other changes that reached maps around the most likely year, for "also new on maps". */
export async function alsoNew(year: number, exclude: string[]) {
  const db = await getDatabase();
  const rows = await db
    .select({
      id: DateAGlobeEvent.id,
      title: DateAGlobeEvent.title,
      spans: DateAGlobeEvent.spans,
      size: DateAGlobeEvent.size,
    })
    .from(DateAGlobeEvent)
    .where(and(eq(DateAGlobeEvent.status, "live")));
  return rows
    .filter((r) => !exclude.includes(r.id))
    .filter((r) =>
      (r.spans as ResultEvent["spans"]).some(
        (s) =>
          Math.abs(yearOf(Math.max(0, parseDate(s.from).month)) - year) <= 1 &&
          parseDate(s.from).month > 0,
      ),
    )
    .sort((a, b) => (a.size === "easy" ? -1 : 0) - (b.size === "easy" ? -1 : 0))
    .slice(0, 3)
    .map((r) => r.title);
}
