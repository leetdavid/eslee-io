import { createHash, randomBytes } from "node:crypto";
import { sushiroTicketReport as reports } from "@eslee/db/schema";
import { and, desc, eq, gte, inArray, isNull, lte } from "drizzle-orm";
import type { NextRequest, NextResponse } from "next/server";
import type { QueueStore } from "@/lib/queues";
import { exactTicketSeen, hongKongInput } from "@/lib/ticket-reports";

const cookieName = "sushiro-ticket-session";

export function ticketOwner(request: NextRequest) {
  const existing = request.cookies.get(cookieName)?.value;
  const token =
    existing && /^[A-Za-z0-9_-]{43}$/.test(existing)
      ? existing
      : randomBytes(32).toString("base64url");
  return {
    token,
    hash: createHash("sha256").update(token).digest("hex"),
    fresh: token !== existing,
  };
}

export function privateTicketResponse(
  response: NextResponse,
  owner?: ReturnType<typeof ticketOwner>,
) {
  response.headers.set("Cache-Control", "private, no-store");
  if (owner?.fresh)
    response.cookies.set(cookieName, owner.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 180 * 24 * 60 * 60,
    });
  return response;
}

export function sameOrigin(request: NextRequest) {
  return request.headers.get("origin") === new URL(request.url).origin;
}

export const ticketReportFields = {
  id: reports.id,
  storeId: reports.storeId,
  storeName: reports.storeName,
  storeNameEn: reports.storeNameEn,
  ticketNumber: reports.ticketNumber,
  takenAt: reports.takenAt,
  submittedAt: reports.submittedAt,
  calledAt: reports.calledAt,
  callReportedAt: reports.callReportedAt,
  firstSeenCalledAt: reports.firstSeenCalledAt,
  lastCheckedAt: reports.lastCheckedAt,
  leftAt: reports.leftAt,
};

export async function ownTicketReports(ownerHash: string) {
  const { db } = await import("@/lib/db");
  return db
    .select(ticketReportFields)
    .from(reports)
    .where(eq(reports.ownerHash, ownerHash))
    .orderBy(desc(reports.submittedAt))
    .limit(20);
}

/** A sighting is an observation of the feed, never an inferred actual call time. */
export async function reconcileTicketReports(
  stores: readonly Pick<QueueStore, "id" | "storeStatus" | "storeQueue">[],
  observedAt: Date,
  ownerHash?: string,
) {
  const { db } = await import("@/lib/db");
  const pending = await db
    .select({
      id: reports.id,
      storeId: reports.storeId,
      ticketKey: reports.ticketKey,
      takenAt: reports.takenAt,
      queueDate: reports.queueDate,
    })
    .from(reports)
    .where(
      and(
        eq(reports.queueDate, hongKongInput(observedAt).slice(0, 10)),
        isNull(reports.firstSeenCalledAt),
        isNull(reports.leftAt),
        lte(reports.takenAt, observedAt),
        gte(reports.takenAt, new Date(observedAt.valueOf() - 24 * 60 * 60_000)),
        ownerHash ? eq(reports.ownerHash, ownerHash) : undefined,
      ),
    );
  const byStore = new Map(stores.map((store) => [store.id, store]));
  const checked = pending.filter((report) => byStore.get(report.storeId)?.storeStatus === "OPEN");
  if (!checked.length) return 0;
  const matches = checked.filter((report) =>
    exactTicketSeen(report, byStore.get(report.storeId)?.storeQueue ?? [], observedAt),
  );
  await db
    .update(reports)
    .set({ lastCheckedAt: observedAt })
    .where(
      inArray(
        reports.id,
        checked.map(({ id }) => id),
      ),
    );
  if (matches.length)
    await db
      .update(reports)
      .set({ firstSeenCalledAt: observedAt })
      .where(
        and(
          inArray(
            reports.id,
            matches.map(({ id }) => id),
          ),
          isNull(reports.firstSeenCalledAt),
        ),
      );
  return matches.length;
}
