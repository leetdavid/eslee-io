import "server-only";

import { randomBytes } from "node:crypto";
import { DateAGlobeEvent, DateAGlobePlay } from "@eslee/db/date-a-globe";
import { inArray, ne, sql } from "drizzle-orm";
import { parseDate, yearOf } from "@/engine";
import { draftHint, type Submission } from "@/lib/submission";
import { type KnownEvent, runChecks } from "@/server/checks";
import type { Database } from "@/server/database";
import { charge, senderKey } from "@/server/limits";

const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

export async function knownEvents(db: Database): Promise<KnownEvent[]> {
  return (await db
    .select({
      id: DateAGlobeEvent.id,
      title: DateAGlobeEvent.title,
      kind: DateAGlobeEvent.kind,
      region: DateAGlobeEvent.region,
      lat: DateAGlobeEvent.lat,
      lon: DateAGlobeEvent.lon,
      spans: DateAGlobeEvent.spans,
      status: DateAGlobeEvent.status,
    })
    .from(DateAGlobeEvent)
    .where(ne(DateAGlobeEvent.status, "rejected"))) as KnownEvent[];
}

/** Checks a submission and puts it in the review queue, whatever the checks say. */
export async function submit(db: Database, s: Submission, ip: string, now = Date.now()) {
  await charge(db, "submit", ip, now);
  const checks = await runChecks(s, await knownEvents(db));
  const id = `${slug(s.name) || "event"}-${randomBytes(3).toString("hex")}`;
  await db.insert(DateAGlobeEvent).values({
    id,
    status: "waiting",
    title: s.name,
    kind: s.change,
    question: s.question,
    hint: draftHint(s.before, s.after, s.span),
    spans: [s.span],
    region: s.region,
    lat: s.lat,
    lon: s.lon,
    size: s.size,
    regional: false,
    sources: checks.sources.map((c) => ({ url: c.url, says: c.quote ?? "" })),
    notes:
      [s.before && `Before: ${s.before}.`, s.after && `After: ${s.after}.`]
        .filter(Boolean)
        .join(" ") || null,
    origin: "submission",
    senderName: s.senderName || null,
    senderKey: senderKey(ip, now),
    checks,
  });
  return { id, checks };
}

/** The sender's own events, by the ids their browser kept, with how far each got. */
export async function myEvents(db: Database, ids: string[]) {
  if (ids.length === 0) return [];
  const rows = await db
    .select({
      id: DateAGlobeEvent.id,
      title: DateAGlobeEvent.title,
      status: DateAGlobeEvent.status,
      spans: DateAGlobeEvent.spans,
      reviewNote: DateAGlobeEvent.reviewNote,
    })
    .from(DateAGlobeEvent)
    .where(inArray(DateAGlobeEvent.id, ids));
  return Promise.all(
    rows.map(async (r) => {
      const [asked] = await db
        .select({ n: sql<number>`count(*)::int` })
        .from(DateAGlobePlay)
        .where(sql`${DateAGlobePlay.turns} @> ${JSON.stringify([{ eventId: r.id }])}::jsonb`);
      const spans = r.spans as { from: string }[];
      return {
        id: r.id,
        title: r.title,
        status: r.status,
        year: yearOf(parseDate(spans[0]?.from ?? "1805").month),
        asked: asked?.n ?? 0,
        note: r.reviewNote,
      };
    }),
  );
}

/** Asked events per decade, so the add page can say where more are needed. */
export async function coverage(db: Database) {
  const rows = await db
    .select({ spans: DateAGlobeEvent.spans })
    .from(DateAGlobeEvent)
    .where(inArray(DateAGlobeEvent.status, ["live", "trial"]));
  const decades = new Map<number, number>();
  for (let d = 1800; d <= 2020; d += 10) decades.set(d, 0);
  for (const r of rows)
    for (const sp of r.spans as { from: string; until: string | null }[])
      for (const d of [sp.from, sp.until]) {
        if (!d) continue;
        const year = yearOf(parseDate(d).month);
        if (year < 1805) continue;
        const decade = Math.floor(year / 10) * 10;
        decades.set(decade, (decades.get(decade) ?? 0) + 1);
      }
  return [...decades].map(([decade, changes]) => ({ decade, changes }));
}
