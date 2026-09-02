import { getQueues } from "@/lib/queue-cache";

export async function GET() {
  try {
    return Response.json(await getQueues(), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Unable to load Sushiro queue data" }, { status: 502 });
  }
}
