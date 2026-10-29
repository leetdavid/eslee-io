import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { DateAGlobeEvent } from "@eslee/db/date-a-globe";
import { z } from "zod";
import { kindSchema, regionSchema, sizeSchema, spanSchema } from "@/lib/events";
import type { Database } from "@/server/database";

const researched = z.array(
  z.object({
    id: z.string(),
    title: z.string(),
    kind: kindSchema,
    question: z.string(),
    hint: z.string(),
    spans: z.array(spanSchema).min(1),
    region: regionSchema,
    lat: z.number(),
    lon: z.number(),
    size: sizeSchema,
    regional: z.boolean(),
    sources: z.array(z.object({ url: z.url(), says: z.string() })),
    validation: z.enum(["verified", "uncertain", "conflict"]),
    notes: z.string().nullable(),
  }),
);

/**
 * Adds the researched events that aren't in the database yet. Verified ones go live; ones whose sources
 * disagree or are unsure wait for a maintainer. Events already there are left alone, so reviews stick.
 */
export async function seedEvents(db: Database, file = join(process.cwd(), "data", "events.json")) {
  const events = researched.parse(JSON.parse(await readFile(file, "utf8")));
  const rows = events.map(({ validation, ...e }) => ({
    ...e,
    status: validation === "verified" ? "live" : "waiting",
    origin: "research",
    checks: validation === "verified" ? null : { research: validation },
  }));
  let added = 0;
  for (let i = 0; i < rows.length; i += 200) {
    const inserted = await db
      .insert(DateAGlobeEvent)
      .values(rows.slice(i, i + 200))
      .onConflictDoNothing()
      .returning({ id: DateAGlobeEvent.id });
    added += inserted.length;
  }
  return { added, total: rows.length };
}
