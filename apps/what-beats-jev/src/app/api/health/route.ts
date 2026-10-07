import { sql } from "drizzle-orm";
import { getDatabase } from "@/server/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (!process.env.TYPESAFE_API_KEY || !process.env.RATE_LIMIT_SECRET)
      throw new Error("Missing configuration");
    const result = await getDatabase().execute<{ table_name: string | null }>(
      sql`select to_regclass('public.game_matchup')::text as table_name`,
    );
    if (!result[0]?.table_name) throw new Error("Migrations are not applied");
    return Response.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json(
      { status: "unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
