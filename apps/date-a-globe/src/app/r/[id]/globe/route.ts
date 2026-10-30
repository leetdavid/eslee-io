import { currentMonth } from "@/engine";
import { politicalGlobe } from "@/eras/political";
import { resultFor } from "@/server/results";

/** The Cold War or web map globe for one result, drawn with the borders of its own years. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = (await resultFor((await params).id))?.play.result;
  if (!result || (result.era !== "mid" && result.era !== "web"))
    return new Response("Not found", { status: 404 });
  return new Response(politicalGlobe(result.era, result.window, currentMonth(new Date())), {
    headers: {
      "content-type": "image/svg+xml",
      // A result never changes; the border table only does when a review corrects it.
      "cache-control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
