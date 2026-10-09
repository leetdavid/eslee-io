import { z } from "zod";
import { LOCALES, type Locale } from "@/lib/i18n";
import { MBTI_TYPES, type MbtiType } from "@/lib/mbti";
import { LORE_TOPICS } from "@/lore/schema";

/** Seven levels give the stereotypes room to separate at the extremes. */
export const LEVEL_COUNT = 7;
/** A correction must move a type at least this far along some axis to count. */
export const MIN_CORRECTION = 0.08;
/** A running review older than this may be claimed again. */
export const STALE_REVIEW_MS = 150_000;

export const bilingualSchema = z.object({ ko: z.string().min(1), en: z.string().min(1) });
export type Bilingual = z.infer<typeof bilingualSchema>;

export const axisSchema = z.object({
  name: bilingualSchema,
  low: bilingualSchema,
  high: bilingualSchema,
  /** Ordered from the low end to the high end. `criterion` is the English situation Jev judges. */
  levels: z
    .array(z.object({ criterion: z.string().min(1), label: bilingualSchema }))
    .length(LEVEL_COUNT),
});
export type Axis = z.infer<typeof axisSchema>;

export const judgmentSchema = z.object({
  position: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
  probabilities: z.array(z.number().min(0).max(1)).length(LEVEL_COUNT),
});
export type Judgment = z.infer<typeof judgmentSchema>;

export const placementSchema = z.object({ x: judgmentSchema, y: judgmentSchema.optional() });
export type Placement = z.infer<typeof placementSchema>;

export const plotSchema = z
  .object({
    version: z.literal(1),
    /** The question in both languages; the original wording is stored separately. */
    questionText: bilingualSchema,
    axes: z.array(axisSchema).min(1).max(2),
    loreTopics: z.array(z.enum(LORE_TOPICS)).min(1).max(3),
    placements: z.record(z.enum(MBTI_TYPES), placementSchema),
    jevMs: z.number().int().nonnegative(),
  })
  .refine(
    (plot) =>
      MBTI_TYPES.every(
        (type) => (plot.placements[type].y !== undefined) === (plot.axes.length === 2),
      ),
    "Every placement needs one value per axis",
  );
export type Plot = z.infer<typeof plotSchema>;

const position = z.number().min(0).max(1);
export const correctionSchema = z.object({
  x: position.optional(),
  y: position.optional(),
  note: bilingualSchema,
});
export type Correction = z.infer<typeof correctionSchema>;

export const typeReviewSchema = z.object({
  explanation: bilingualSchema,
  correction: correctionSchema.optional(),
});
export type TypeReview = z.infer<typeof typeReviewSchema>;

export const reviewSchema = z.object({
  types: z.partialRecord(z.enum(MBTI_TYPES), typeReviewSchema),
  summary: bilingualSchema.optional(),
});
export type Review = z.infer<typeof reviewSchema>;

export const REVIEW_STATUSES = ["pending", "running", "complete", "failed"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export type ChartData = {
  id: string;
  question: string;
  questionLanguage: Locale;
  createdAt: string;
  plot: Plot;
  jevModel: string;
  review: Review | null;
  reviewStatus: ReviewStatus;
  reviewModel: string | null;
};

export const chartDataSchema = z.object({
  id: z.string(),
  question: z.string(),
  questionLanguage: z.enum(LOCALES),
  createdAt: z.string(),
  plot: plotSchema,
  jevModel: z.string(),
  review: reviewSchema.nullable(),
  reviewStatus: z.enum(REVIEW_STATUSES),
  reviewModel: z.string().nullable(),
});

/** The question as a viewer reads it: the original wording in its own language, the stored translation otherwise. */
export function questionIn(
  chart: Pick<ChartData, "question" | "questionLanguage" | "plot">,
  locale: Locale,
): string {
  return chart.questionLanguage === locale ? chart.question : chart.plot.questionText[locale];
}

export type Point = { x: number; y?: number };

export function jevPoint(plot: Plot, type: MbtiType): Point {
  const placement = plot.placements[type];
  return placement.y
    ? { x: placement.x.position, y: placement.y.position }
    : { x: placement.x.position };
}

export function correctionOf(review: Review | null, type: MbtiType): Correction | undefined {
  return review?.types[type]?.correction;
}

/** The point a type is shown at: its correction if the review moved it, otherwise its placement. */
export function finalPoint(plot: Plot, review: Review | null, type: MbtiType): Point {
  const point = jevPoint(plot, type);
  const correction = correctionOf(review, type);
  if (!correction) return point;
  return {
    x: correction.x ?? point.x,
    ...(point.y !== undefined ? { y: correction.y ?? point.y } : {}),
  };
}

export function pointsFor(plot: Plot, review: Review | null): Record<MbtiType, Point> {
  return Object.fromEntries(
    MBTI_TYPES.map((type) => [type, finalPoint(plot, review, type)]),
  ) as Record<MbtiType, Point>;
}

/** Ranks by the horizontal position, highest first. Ties keep the canonical type order. */
export function ranksOf(points: Record<MbtiType, Point>): Record<MbtiType, number> {
  const order = [...MBTI_TYPES].sort((a, b) => points[b].x - points[a].x);
  return Object.fromEntries(order.map((type, index) => [type, index + 1])) as Record<
    MbtiType,
    number
  >;
}

/** Corrected types in reading order: by final rank on one axis, canonical order on two. */
export function correctedTypes(plot: Plot, review: Review | null): MbtiType[] {
  const corrected = MBTI_TYPES.filter((type) => correctionOf(review, type));
  if (plot.axes.length === 2) return corrected;
  const ranks = ranksOf(pointsFor(plot, review));
  return corrected.sort((a, b) => ranks[a] - ranks[b]);
}

export function reviewedCount(review: Review | null): number {
  return review ? MBTI_TYPES.filter((type) => review.types[type]).length : 0;
}

export function isReviewComplete(review: Review | null): boolean {
  return reviewedCount(review) === MBTI_TYPES.length && Boolean(review?.summary);
}

/** The grade: how many of the 16 placements the review kept. */
export function gradeOf(review: Review): number {
  return MBTI_TYPES.length - MBTI_TYPES.filter((type) => review.types[type]?.correction).length;
}

/**
 * Applies the app's correction rules to the review's raw output: positions are
 * clamped, a one-axis chart ignores vertical moves, and a move smaller than
 * MIN_CORRECTION on every axis keeps Jev's placement.
 */
export function normalizeCorrection(
  plot: Plot,
  type: MbtiType,
  correction: Correction | undefined,
) {
  if (!correction) return undefined;
  const point = jevPoint(plot, type);
  const clamp = (value: number) => Math.min(1, Math.max(0, value));
  const x = correction.x === undefined ? undefined : clamp(correction.x);
  const y = point.y === undefined || correction.y === undefined ? undefined : clamp(correction.y);
  const movedX = x !== undefined && Math.abs(x - point.x) >= MIN_CORRECTION;
  const movedY =
    y !== undefined && point.y !== undefined && Math.abs(y - point.y) >= MIN_CORRECTION;
  if (!movedX && !movedY) return undefined;
  return { ...(movedX ? { x } : {}), ...(movedY ? { y } : {}), note: correction.note };
}

/** The level a position falls nearest to, for labeling. */
export function nearestLevel(position: number): number {
  return Math.round(position * (LEVEL_COUNT - 1));
}

export function pick(text: Bilingual, locale: Locale): string {
  return text[locale];
}
