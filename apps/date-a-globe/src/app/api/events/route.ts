import { currentEvents } from "@/server/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The live and trial events the game asks, without sources or notes. Cached at the edge for a minute. */
export async function GET() {
  const { events } = await currentEvents();
  return Response.json(events, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=600" },
  });
}
