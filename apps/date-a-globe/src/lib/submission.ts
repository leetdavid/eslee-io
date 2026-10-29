import { z } from "zod";
import { dateLabel } from "@/engine";
import { regionSchema, sizeSchema, spanSchema } from "@/lib/events";

/** The five things a sender can say changed. Each maps to an event kind. */
export const CHANGES = {
  country: "A country appears or disappears",
  rename: "A place gets a new name",
  border: "A border moves",
  city: "A city or capital",
  water: "A lake, canal or coastline",
} as const;
export type Change = keyof typeof CHANGES;

const name = z.string().trim().min(2, "Give the name on the map").max(80);
const optionalName = z.string().trim().max(80).optional().or(z.literal(""));

export const submissionSchema = z.object({
  change: z.enum(Object.keys(CHANGES) as [Change, ...Change[]]),
  name,
  before: optionalName,
  after: optionalName,
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  region: regionSchema,
  size: sizeSchema,
  span: spanSchema,
  sources: z.array(z.url().max(500)).min(1, "Add one link").max(3),
  question: z.string().trim().min(10).max(160),
  senderName: z.string().trim().max(40).optional().or(z.literal("")),
});
export type Submission = z.infer<typeof submissionSchema>;

/** A first wording of the question. Yes always means the feature is shown; a maintainer can reword it. */
export function draftQuestion(change: Change, name: string, before?: string) {
  const n = name.trim();
  switch (change) {
    case "country":
      return `Is there a country called ${n}?`;
    case "rename":
      return before?.trim()
        ? `Is it labelled ${n} (rather than ${before.trim()})?`
        : `Is it labelled ${n}?`;
    case "border":
      return `Does the map show ${n}?`;
    case "city":
      return `Is ${n} on the map?`;
    case "water":
      return `Is there a ${n}?`;
  }
}

/** The hint under the question, from what maps showed before and after. */
export function draftHint(
  before?: string,
  after?: string,
  span?: { from: string; until: string | null },
) {
  const parts: string[] = [];
  if (before?.trim() && span)
    parts.push(`Before ${dateLabel(span.from)}, maps show ${before.trim()}.`);
  if (after?.trim() && span?.until) parts.push(`After ${dateLabel(span.until)}, ${after.trim()}.`);
  return parts.join(" ");
}

/** The words of a name that tell it apart, for matching against the events we have. */
export function nameWords(s: string) {
  const STOP = new Set([
    "the",
    "of",
    "a",
    "an",
    "and",
    "is",
    "in",
    "on",
    "to",
    "called",
    "there",
    "country",
    "becomes",
    "renamed",
    "labelled",
    "kingdom",
    "republic",
    "state",
    "map",
    "maps",
  ]);
  return new Set(
    s
      .toLowerCase()
      .normalize("NFKD")
      .replace(/\p{M}/gu, "")
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 2 && !STOP.has(w)),
  );
}

export function similarity(a: string, b: string) {
  const A = nameWords(a);
  const B = nameWords(b);
  if (!A.size || !B.size) return 0;
  let both = 0;
  for (const w of A) if (B.has(w)) both++;
  return both / (A.size + B.size - both);
}
