import "server-only";

import { randomBytes } from "node:crypto";
import { DateAGlobeEvent, DateAGlobePlay } from "@eslee/db/date-a-globe";
import { and, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { type Engine, MAX_TURNS, REGIONS, type Result, type Setup, type Turn } from "@/engine";
import type { GameEvent } from "@/lib/events";
import type { Database } from "@/server/database";

/** A trial goes live after this many counted answers if enough agree with the results. */
export const TRIAL_GLOBES = 50;
export const TRIAL_AGREEMENT = 0.8;

export const setupSchema = z.object({
  kind: z.enum(["globe", "world", "part"]),
  regions: z.array(z.enum(REGIONS)).max(REGIONS.length),
});
export const turnsSchema = z
  .array(
    z.object({
      eventId: z.string().max(80),
      answer: z.enum(["yes", "no", "cant"]),
      reason: z.enum(["narrow", "settle", "hinge", "trial"]).optional(),
    }),
  )
  .min(1)
  .max(MAX_TURNS);

export interface SavedPlay {
  id: string;
  setup: Setup;
  turns: Turn[];
  result: Result;
  printedYear: number | null;
  createdAt: Date;
}

const newId = () => randomBytes(8).toString("base64url").slice(0, 10);

/**
 * Saves a finished game. The result is worked out again here rather than taken from the browser,
 * and each trial answer is compared with it. A game picked up from a saved one (`from`, after Keep going
 * or a re-check) doesn't count the trial answers that game already counted.
 */
export async function savePlay(
  db: Database,
  engine: Engine,
  events: GameEvent[],
  setup: Setup,
  submitted: Turn[],
  from?: string,
): Promise<SavedPlay> {
  const turns = submitted.filter((t) => engine.knows(t.eventId));
  const result = engine.result(turns);
  const id = newId();
  const [row] = await db
    .insert(DateAGlobePlay)
    .values({ id, setup, turns, result, era: result.era })
    .returning({ createdAt: DateAGlobePlay.createdAt });

  const trialIds = new Set(events.filter((e) => e.trial).map((e) => e.id));
  const earlier = from ? await loadPlay(db, from) : null;
  const counted = new Set(earlier?.turns.map((t) => t.eventId));
  for (const t of turns) {
    if (!trialIds.has(t.eventId) || t.answer === "cant" || counted.has(t.eventId)) continue;
    const p = engine.expected(turns, t.eventId);
    // Answers the result can't call either way say nothing about the event.
    if (p > 0.35 && p < 0.65) continue;
    await recordTrialAnswer(db, t.eventId, (t.answer === "yes") === p >= 0.5);
  }
  return { id, setup, turns, result, printedYear: null, createdAt: row?.createdAt ?? new Date() };
}

/** Counts one trial answer, and decides the trial once it has enough. Returns whether the event changed. */
export async function recordTrialAnswer(db: Database, eventId: string, agrees: boolean) {
  const [row] = await db
    .update(DateAGlobeEvent)
    .set({
      trialAnswers: sql`${DateAGlobeEvent.trialAnswers} + 1`,
      trialAgreements: sql`${DateAGlobeEvent.trialAgreements} + ${agrees ? 1 : 0}`,
    })
    .where(and(eq(DateAGlobeEvent.id, eventId), eq(DateAGlobeEvent.status, "trial")))
    .returning({
      answers: DateAGlobeEvent.trialAnswers,
      agreements: DateAGlobeEvent.trialAgreements,
    });
  if (!row || row.answers < TRIAL_GLOBES) return false;
  const passed = row.agreements / row.answers >= TRIAL_AGREEMENT;
  await db
    .update(DateAGlobeEvent)
    .set({
      status: passed ? "live" : "waiting",
      reviewNote: passed
        ? null
        : `Trial ended: ${row.agreements} of ${row.answers} answers agreed with the results.`,
      updatedAt: new Date(),
    })
    .where(and(eq(DateAGlobeEvent.id, eventId), eq(DateAGlobeEvent.status, "trial")));
  return true;
}

export async function loadPlay(db: Database, id: string): Promise<SavedPlay | null> {
  const [row] = await db.select().from(DateAGlobePlay).where(eq(DateAGlobePlay.id, id)).limit(1);
  if (!row) return null;
  return {
    id: row.id,
    setup: row.setup as Setup,
    turns: row.turns as Turn[],
    result: row.result as Result,
    printedYear: row.printedYear,
    createdAt: row.createdAt,
  };
}

/** The player knows when their globe was printed. Kept once, to calibrate the engine later. */
export async function confirmPrinted(db: Database, id: string, year: number) {
  const updated = await db
    .update(DateAGlobePlay)
    .set({ printedYear: year, printedAt: new Date() })
    .where(and(eq(DateAGlobePlay.id, id), isNull(DateAGlobePlay.printedYear)))
    .returning({ id: DateAGlobePlay.id });
  return updated.length > 0;
}
