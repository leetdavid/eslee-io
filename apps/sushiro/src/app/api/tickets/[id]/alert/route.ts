import { type NextRequest, NextResponse } from "next/server";
import { parseLanguage } from "@/lib/language";
import { parsePushSubscription } from "@/lib/ticket-push";
import { pushKeys, removeTicketPush, saveTicketPush } from "@/lib/ticket-push.server";
import { isTicketReportId } from "@/lib/ticket-reports";
import { privateTicketResponse, sameOrigin, ticketOwner } from "@/lib/ticket-reports.server";

type Context = { params: Promise<{ id: string }> };

// Turns pushed alerts on for one of the owner's waiting tickets.
export async function PUT(request: NextRequest, context: Context) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "origin" }, { status: 403 });
  const { id } = await context.params;
  const owner = ticketOwner(request);
  if (owner.fresh || !isTicketReportId(id)) {
    return NextResponse.json({ error: "missing" }, { status: 404 });
  }
  if (!pushKeys()) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  const body: unknown = await request.json().catch(() => null);
  const data = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const subscription = parsePushSubscription(data.subscription);
  const language = parseLanguage(typeof data.language === "string" ? data.language : null);
  if (!subscription || !language) {
    return NextResponse.json({ error: "subscription" }, { status: 400 });
  }
  try {
    const saved = await saveTicketPush(id, owner.hash, subscription, language);
    return privateTicketResponse(
      NextResponse.json(saved ? { ok: true } : { error: "missing" }, { status: saved ? 200 : 404 }),
    );
  } catch (error) {
    console.error("Unable to save a ticket alert", error);
    return privateTicketResponse(NextResponse.json({ error: "save" }, { status: 503 }));
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "origin" }, { status: 403 });
  const { id } = await context.params;
  const owner = ticketOwner(request);
  if (owner.fresh || !isTicketReportId(id)) {
    return NextResponse.json({ error: "missing" }, { status: 404 });
  }
  try {
    await removeTicketPush(id, owner.hash);
    return privateTicketResponse(NextResponse.json({ ok: true }));
  } catch (error) {
    console.error("Unable to remove a ticket alert", error);
    return privateTicketResponse(NextResponse.json({ error: "save" }, { status: 503 }));
  }
}
