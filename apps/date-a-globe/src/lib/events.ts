import { z } from "zod";
import { type EngineEvent, parseDate, REGIONS } from "@/engine";

const date = z
  .string()
  .regex(/^\d{4}(-(0[1-9]|1[0-2]))?$/, "Use a year, or a year and month like 1966-09");

export const spanSchema = z
  .object({ from: date, until: date.nullable() })
  .refine((s) => !s.until || parseDate(s.until).month > parseDate(s.from).month, {
    message: "It has to stop after it starts",
    path: ["until"],
  });

export const kindSchema = z.enum(["country", "border", "rename", "water", "city", "discovery"]);
export const sizeSchema = z.enum(["easy", "medium", "hard"]);
export const regionSchema = z.enum(REGIONS);

/** What the game needs about one event: the engine's fields plus what the question shows. */
export interface GameEvent extends EngineEvent {
  title: string;
  question: string;
  hint: string;
  lat: number;
  lon: number;
}

export const gameEventSchema = z.object({
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
  trial: z.boolean(),
});
