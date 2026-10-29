import "server-only";

import { DateAGlobeEvent } from "@eslee/db/date-a-globe";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { kindSchema, regionSchema, sizeSchema, spanSchema } from "@/lib/events";
import type { Database } from "@/server/database";

export const STATUSES = ["waiting", "trial", "live", "rejected"] as const;
export type Status = (typeof STATUSES)[number];

export const editSchema = z.object({
  title: z.string().trim().min(2).max(120),
  kind: kindSchema,
  question: z.string().trim().min(10).max(200),
  hint: z.string().trim().max(400),
  spans: z.array(spanSchema).min(1).max(4),
  region: regionSchema,
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  size: sizeSchema,
  regional: z.boolean(),
});
export type EventEdit = z.infer<typeof editSchema>;

export class ReviewError extends Error {}

export async function queueCounts(db: Database) {
  const rows = await db
    .select({ status: DateAGlobeEvent.status, n: sql<number>`count(*)::int` })
    .from(DateAGlobeEvent)
    .groupBy(DateAGlobeEvent.status);
  return Object.fromEntries(
    STATUSES.map((s) => [s, rows.find((r) => r.status === s)?.n ?? 0]),
  ) as Record<Status, number>;
}

export async function queue(db: Database, status: Status, limit = 200) {
  return db
    .select()
    .from(DateAGlobeEvent)
    .where(eq(DateAGlobeEvent.status, status))
    .orderBy(desc(DateAGlobeEvent.updatedAt))
    .limit(limit);
}

export async function reviewEvent(db: Database, id: string) {
  const [row] = await db.select().from(DateAGlobeEvent).where(eq(DateAGlobeEvent.id, id)).limit(1);
  return row ?? null;
}

async function move(
  db: Database,
  id: string,
  from: Status[],
  set: Partial<typeof DateAGlobeEvent.$inferInsert>,
  by: string,
) {
  const updated = await db
    .update(DateAGlobeEvent)
    .set({ ...set, reviewedBy: by, reviewedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(DateAGlobeEvent.id, id), inArray(DateAGlobeEvent.status, from)))
    .returning({ id: DateAGlobeEvent.id });
  if (updated.length === 0) throw new ReviewError("That event has already moved on");
}

/** Approving starts a fresh trial: the event is asked but doesn't count until 50 answers agree. */
export const approve = (db: Database, id: string, by: string) =>
  move(
    db,
    id,
    ["waiting"],
    { status: "trial", trialAnswers: 0, trialAgreements: 0, reviewNote: null },
    by,
  );

export const reject = (db: Database, id: string, note: string, by: string) =>
  move(db, id, ["waiting", "trial", "live"], { status: "rejected", reviewNote: note || null }, by);

/** Back to the queue, for a live or trial event that needs another look. */
export const pause = (db: Database, id: string, by: string) =>
  move(db, id, ["trial", "live"], { status: "waiting" }, by);

/** Skip the trial for an event a maintainer has checked by hand. */
export const goLive = (db: Database, id: string, by: string) =>
  move(db, id, ["waiting", "trial"], { status: "live", reviewNote: null }, by);

export async function edit(db: Database, id: string, patch: EventEdit, by: string) {
  await move(db, id, ["waiting", "trial", "live"], patch, by);
}

/** A duplicate's sources are added to the event it repeats, then the duplicate is closed. */
export async function merge(db: Database, id: string, intoId: string, by: string) {
  if (id === intoId) throw new ReviewError("An event can't merge into itself");
  const [from, into] = await Promise.all([reviewEvent(db, id), reviewEvent(db, intoId)]);
  if (!from || !into || into.status === "rejected")
    throw new ReviewError("Pick an event we still ask");
  const sources = [...(into.sources as { url: string }[]), ...(from.sources as { url: string }[])];
  const unique = sources.filter((s, i) => sources.findIndex((t) => t.url === s.url) === i);
  await db
    .update(DateAGlobeEvent)
    .set({ sources: unique, updatedAt: new Date() })
    .where(eq(DateAGlobeEvent.id, intoId));
  await move(
    db,
    id,
    ["waiting"],
    { status: "rejected", reviewNote: `Merged into ${into.title}` },
    by,
  );
}
