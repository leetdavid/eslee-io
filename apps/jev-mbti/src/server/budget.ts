import "server-only";

import { createHmac } from "node:crypto";
import { JevMbtiRateLimit } from "@eslee/db/jev-mbti";
import { lt, sql } from "drizzle-orm";
import type { Database } from "@/server/database";

export class RateLimitedError extends Error {
  constructor(readonly retryAfterMinutes: number) {
    super("Rate limited");
  }
}

const WINDOW_MS = 10 * 60_000;
/** Model-backed actions per visitor per ten minutes. */
const VISITOR_LIMITS = { ask: 12, review: 20 } as const;
/** Model-backed actions per day across the whole site. */
const DAILY_LIMIT = 4_000;

export type BudgetKind = keyof typeof VISITOR_LIMITS;

/**
 * Charges one model-backed action. Saved charts never pass through here, so
 * reopening or reusing a chart is free.
 */
export async function reserveBudget(db: Database, kind: BudgetKind, ip: string, now = Date.now()) {
  const secret = process.env.RATE_LIMIT_SECRET;
  if (!secret) throw new Error("Request budget is not configured");
  const window = Math.floor(now / WINDOW_MS);
  const day = Math.floor(now / 86_400_000);
  const visitor = createHmac("sha256", secret).update(`${day}:${ip}`).digest("hex");
  await db.delete(JevMbtiRateLimit).where(lt(JevMbtiRateLimit.expiresAt, new Date(now)));
  const budgets = [
    {
      key: `${kind}:${visitor}:${window}`,
      limit: VISITOR_LIMITS[kind],
      resetsAt: (window + 1) * WINDOW_MS,
    },
    { key: `global:${day}`, limit: DAILY_LIMIT, resetsAt: (day + 1) * 86_400_000 },
  ];
  for (const budget of budgets) {
    const [row] = await db
      .insert(JevMbtiRateLimit)
      .values({ key: budget.key, requests: 1, expiresAt: new Date(budget.resetsAt + WINDOW_MS) })
      .onConflictDoUpdate({
        target: JevMbtiRateLimit.key,
        set: { requests: sql`${JevMbtiRateLimit.requests} + 1` },
      })
      .returning({ requests: JevMbtiRateLimit.requests });
    if (!row || row.requests > budget.limit) {
      throw new RateLimitedError(Math.max(1, Math.ceil((budget.resetsAt - now) / 60_000)));
    }
  }
}
