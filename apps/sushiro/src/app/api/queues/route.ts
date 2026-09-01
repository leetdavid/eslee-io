import { unstable_cache } from "next/cache";
import { fetchQueues } from "@/lib/sushiro";

const getQueues = unstable_cache(fetchQueues, ["sushiro-queues"], { revalidate: 60 });

export async function GET() {
  try {
    return Response.json(await getQueues());
  } catch {
    return Response.json({ error: "Unable to load Sushiro queue data" }, { status: 502 });
  }
}
