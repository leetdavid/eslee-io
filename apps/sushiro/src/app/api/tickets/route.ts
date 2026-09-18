import { sushiroTicketReport as reports } from "@eslee/db/schema";
import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { getQueues } from "@/lib/queue-cache";
import { parseTicketReport } from "@/lib/ticket-reports";
import {
  ownTicketReports,
  privateTicketResponse,
  reconcileTicketReports,
  sameOrigin,
  ticketOwner,
  ticketReportFields,
} from "@/lib/ticket-reports.server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const owner = ticketOwner(request);
  try {
    const snapshot = await getQueues().catch(() => null);
    if (snapshot && !owner.fresh)
      await reconcileTicketReports(snapshot.stores, new Date(), owner.hash);
    return privateTicketResponse(
      NextResponse.json({
        reports: owner.fresh ? [] : await ownTicketReports(owner.hash),
        stores: snapshot?.stores ?? [],
        feedAvailable: snapshot !== null,
      }),
      owner,
    );
  } catch (error) {
    console.error("Unable to load ticket reports", error);
    return privateTicketResponse(NextResponse.json({ error: "load" }, { status: 503 }));
  }
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "origin" }, { status: 403 });
  const body: unknown = await request.json().catch(() => null);
  const parsed = parseTicketReport(body, new Date());
  if (!parsed.success) return NextResponse.json({ errors: parsed.errors }, { status: 400 });
  try {
    const { stores } = await getQueues();
    const store = stores.find(({ id }) => id === parsed.data.storeId);
    if (!store) return NextResponse.json({ errors: { storeId: "store" } }, { status: 400 });
    const owner = ticketOwner(request);
    const { db } = await import("@eslee/db/client");
    const inserted = await db
      .insert(reports)
      .values({
        ...parsed.data,
        ownerHash: owner.hash,
        storeName: store.name,
        storeNameEn: store.nameEn,
      })
      .onConflictDoNothing()
      .returning(ticketReportFields);
    const report =
      inserted[0] ??
      (
        await db
          .select(ticketReportFields)
          .from(reports)
          .where(
            and(
              eq(reports.ownerHash, owner.hash),
              eq(reports.storeId, store.id),
              eq(reports.queueDate, parsed.data.queueDate),
              eq(reports.ticketKey, parsed.data.ticketKey),
            ),
          )
          .limit(1)
      )[0];
    return privateTicketResponse(
      NextResponse.json({ report }, { status: inserted.length ? 201 : 200 }),
      owner,
    );
  } catch (error) {
    console.error("Unable to save ticket report", error);
    return privateTicketResponse(NextResponse.json({ error: "save" }, { status: 503 }));
  }
}
