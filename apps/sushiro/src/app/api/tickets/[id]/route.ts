import { sushiroTicketReport as reports } from "@eslee/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { eventTime } from "@/lib/ticket-reports";
import {
  privateTicketResponse,
  sameOrigin,
  ticketOwner,
  ticketReportFields,
} from "@/lib/ticket-reports.server";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "origin" }, { status: 403 });
  const { id } = await context.params;
  const owner = ticketOwner(request);
  if (owner.fresh || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: "missing" }, { status: 404 });
  }
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object")
    return NextResponse.json({ error: "save" }, { status: 400 });
  const data = body as Record<string, unknown>;
  try {
    const { db } = await import("@/lib/db");
    const ownership = and(eq(reports.id, id), eq(reports.ownerHash, owner.hash));
    const [existing] = await db
      .select({ takenAt: reports.takenAt })
      .from(reports)
      .where(ownership)
      .limit(1);
    if (!existing) return NextResponse.json({ error: "missing" }, { status: 404 });
    const now = new Date();
    if (data.action === "leave") {
      const [report] = await db
        .update(reports)
        .set({ leftAt: now })
        .where(and(ownership, isNull(reports.calledAt)))
        .returning(ticketReportFields);
      return privateTicketResponse(NextResponse.json({ report }, { status: report ? 200 : 409 }));
    }
    const latest = new Date(Math.min(now.valueOf(), existing.takenAt.valueOf() + 24 * 60 * 60_000));
    const calledAt =
      data.action === "called" ? eventTime(data.calledAt, existing.takenAt, latest) : null;
    if (!calledAt)
      return NextResponse.json({ errors: { calledAt: "calledTime" } }, { status: 400 });
    const [report] = await db
      .update(reports)
      .set({ calledAt, callReportedAt: now, leftAt: null })
      .where(ownership)
      .returning(ticketReportFields);
    return privateTicketResponse(NextResponse.json({ report }));
  } catch (error) {
    console.error("Unable to update ticket report", error);
    return privateTicketResponse(NextResponse.json({ error: "save" }, { status: 503 }));
  }
}
