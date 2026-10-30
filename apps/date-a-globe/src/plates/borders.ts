import type { GeometryObject } from "topojson-specification";
import table from "../../data/borders.json";
import oldTable from "../../data/old-lines.json";
import { type Month, parseDate } from "../engine/months";
import type { Span } from "../engine/types";

/** A stretch of months, both ends included. */
export interface Stretch {
  from: Month;
  to: Month;
}

// When each of today's borders was on maps, keyed by the two Natural Earth names in order ("Egypt / Sudan").
// `merged` holds the times the two sides were one state, with no line between them at all.
const dated = table as Record<string, { spans: Span[]; merged?: Span[]; note: string }>;

const nameOf = (g: GeometryObject) => String((g.properties as { name?: string } | undefined)?.name);
export const borderKey = (a: GeometryObject, b: GeometryObject) =>
  [nameOf(a), nameOf(b)].sort().join(" / ");

/** An event's spans as stretches of months, an open span running to `now`. */
export const stretchesOf = (spans: Span[], now: Month): Stretch[] =>
  spans.map((s) => ({
    from: parseDate(s.from).month,
    to: s.until ? parseDate(s.until).month : now,
  }));

/**
 * Whether one of today's borders was on maps through every stretch. Plates and era globes draw a border only
 * when this holds; a border missing from data/borders.json never does. Nothing before 1805 is asked, so a
 * stretch that starts earlier only needs the border from 1805.
 */
export function borderStood(key: string, stretches: Stretch[], now: Month) {
  const spans = dated[key]?.spans;
  if (!spans) return false;
  return stretches.every((s) =>
    spans.some(
      (d) =>
        parseDate(d.from).month <= Math.max(0, s.from) &&
        (d.until ? parseDate(d.until).month : now) >= s.to,
    ),
  );
}

/** Whether the two sides of one of today's borders were one state in the middle of a stretch. */
export function borderMerged(key: string, stretch: Stretch, now: Month) {
  const mid = Math.round((stretch.from + stretch.to) / 2);
  return (dated[key]?.merged ?? []).some(
    (d) => parseDate(d.from).month <= mid && (d.until ? parseDate(d.until).month : now) > mid,
  );
}

/** Borders that today's map no longer has (the inner German border, the 38th parallel), with when they stood. */
export const oldLines = oldTable as {
  name: string;
  spans: Span[];
  note: string;
  path: [number, number][];
}[];

/** Whether an old line stood through every stretch. */
export const oldLineStood = (line: (typeof oldLines)[number], stretches: Stretch[], now: Month) =>
  stretches.every((s) =>
    stretchesOf(line.spans, now).some((d) => d.from <= Math.max(0, s.from) && d.to >= s.to),
  );

/** Whether an old line was on maps in the middle of a stretch. */
export const oldLineAt = (line: (typeof oldLines)[number], stretch: Stretch, now: Month) => {
  const mid = Math.round((stretch.from + stretch.to) / 2);
  return stretchesOf(line.spans, now).some((d) => d.from <= mid && d.to > mid);
};
