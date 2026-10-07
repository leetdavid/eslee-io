import "server-only";

import { createHash, createHmac } from "node:crypto";
import { GameMatchup, GameRateLimit } from "@eslee/db/what-beats-jev";
import { TRPCError } from "@trpc/server";
import { eq, lt, sql } from "drizzle-orm";
import { type Judgment, phraseIdentity, type Submission } from "@/lib/game";
import { getDatabase, getRequestBudgetDatabase } from "@/server/database";
import { evaluateMatchup, JUDGE_VERSION } from "@/server/judge";

async function reserveRequest(ip: string) {
  const secret = process.env.RATE_LIMIT_SECRET;
  if (!secret) throw new Error("Request budget is not configured");
  const now = Date.now();
  const minute = Math.floor(now / 60_000);
  const day = Math.floor(now / 86_400_000);
  const caller = createHmac("sha256", secret).update(`${day}:${ip}`).digest("hex");
  const db = getRequestBudgetDatabase();
  await db.delete(GameRateLimit).where(lt(GameRateLimit.expiresAt, new Date(now)));
  const budgets = [
    { key: `${caller}:${minute}`, limit: 30, expiresAt: new Date((minute + 2) * 60_000) },
    { key: `global:${day}`, limit: 5_000, expiresAt: new Date((day + 2) * 86_400_000) },
  ];
  for (const budget of budgets) {
    const [row] = await db
      .insert(GameRateLimit)
      .values({ key: budget.key, requests: 1, expiresAt: budget.expiresAt })
      .onConflictDoUpdate({
        target: GameRateLimit.key,
        set: { requests: sql`${GameRateLimit.requests} + 1` },
      })
      .returning({ requests: GameRateLimit.requests });
    if (!row || row.requests > budget.limit) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: "Too many new matchups right now. Your chain is safe. Try again shortly.",
      });
    }
  }
}

export async function judgeMatchup(input: Submission, ip: string): Promise<Judgment> {
  const challenge = phraseIdentity(input.challenge);
  const answer = phraseIdentity(input.answer);
  const cacheKey = createHash("sha256")
    .update(JSON.stringify([challenge, answer]))
    .digest("hex");
  const db = getDatabase();
  const cached = await db
    .select()
    .from(GameMatchup)
    .where(eq(GameMatchup.cacheKey, cacheKey))
    .limit(1);
  if (cached[0]) {
    if (cached[0].challenge !== challenge || cached[0].answer !== answer)
      throw new Error("Cache identity mismatch");
    return {
      beats: cached[0].beats,
      confidence: cached[0].confidence,
      model: cached[0].model,
      source: "cache",
      isNewMatchup: false,
    };
  }

  return db.transaction(async (tx) => {
    await tx.execute(sql`set local lock_timeout = '15s'`);
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${cacheKey}, 0))`);
    const existing = await tx
      .select()
      .from(GameMatchup)
      .where(eq(GameMatchup.cacheKey, cacheKey))
      .limit(1);
    if (existing[0]) {
      return {
        beats: existing[0].beats,
        confidence: existing[0].confidence,
        model: existing[0].model,
        source: "cache" as const,
        isNewMatchup: false,
      };
    }
    // Only the model-call owner consumes quota. The independent connection
    // retains its charge even if inference fails, without charging followers.
    await reserveRequest(ip);
    const verdict = await evaluateMatchup({ challenge, answer });
    await tx
      .insert(GameMatchup)
      .values({ cacheKey, challenge, answer, ...verdict, judgeVersion: JUDGE_VERSION });
    return {
      beats: verdict.beats,
      confidence: verdict.confidence,
      model: verdict.model,
      source: "jev" as const,
      isNewMatchup: verdict.beats,
    };
  });
}
