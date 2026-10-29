import "server-only";

import { createHmac } from "node:crypto";
import { DateAGlobeRateLimit } from "@eslee/db/date-a-globe";
import { lt, sql } from "drizzle-orm";
import type { Database } from "@/server/database";

export class RateLimitedError extends Error {
  constructor(readonly retryAfterMinutes: number) {
    super("Rate limited");
  }
}

const DAY = 86_400_000;
/** Per address per day. */
const LIMITS = { submit: 5, play: 200, place: 60, source: 40 } as const;
export type LimitKind = keyof typeof LIMITS;

/** A per-day key for an address. The address itself is never stored. */
export function senderKey(ip: string, now = Date.now()) {
  const secret = process.env.RATE_LIMIT_SECRET;
  if (!secret) throw new Error("Rate limits are not configured");
  return createHmac("sha256", secret)
    .update(`${Math.floor(now / DAY)}:${ip}`)
    .digest("hex");
}

/** Counts one action against today's allowance for this address, or throws when it is used up. */
export async function charge(db: Database, kind: LimitKind, ip: string, now = Date.now()) {
  const day = Math.floor(now / DAY);
  const key = `${kind}:${senderKey(ip, now)}`;
  await db.delete(DateAGlobeRateLimit).where(lt(DateAGlobeRateLimit.expiresAt, new Date(now)));
  const resetsAt = (day + 1) * DAY;
  const [row] = await db
    .insert(DateAGlobeRateLimit)
    .values({ key, count: 1, expiresAt: new Date(resetsAt) })
    .onConflictDoUpdate({
      target: DateAGlobeRateLimit.key,
      set: { count: sql`${DateAGlobeRateLimit.count} + 1` },
    })
    .returning({ count: DateAGlobeRateLimit.count });
  if (!row || row.count > LIMITS[kind]) {
    throw new RateLimitedError(Math.max(1, Math.ceil((resetsAt - now) / 60_000)));
  }
}
