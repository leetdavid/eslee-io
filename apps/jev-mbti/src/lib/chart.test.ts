import { describe, expect, it } from "vitest";
import {
  correctedTypes,
  finalPoint,
  gradeOf,
  isReviewComplete,
  normalizeCorrection,
  plotSchema,
  pointsFor,
  questionIn,
  type Review,
  ranksOf,
  reviewedCount,
} from "@/lib/chart";
import { MBTI_TYPES } from "@/lib/mbti";
import { cryPlot } from "@/lib/test-fixtures";

const note = { ko: "메모", en: "Note" };
const explanation = { ko: "이유", en: "Reason" };

function fullReview(corrections: Partial<Record<(typeof MBTI_TYPES)[number], number>>): Review {
  return {
    types: Object.fromEntries(
      MBTI_TYPES.map((type) => [
        type,
        {
          explanation,
          ...(corrections[type] !== undefined
            ? { correction: { x: corrections[type], note } }
            : {}),
        },
      ]),
    ),
    summary: { ko: "총평", en: "Overall" },
  };
}

describe("chart model", () => {
  it("validates a stored plot, including one value per axis for every type", () => {
    expect(plotSchema.safeParse(cryPlot).success).toBe(true);
    const missing = { ...cryPlot, placements: { ...cryPlot.placements, ISTP: undefined } };
    expect(plotSchema.safeParse(missing).success).toBe(false);
    const extraAxis = { ...cryPlot, axes: [cryPlot.axes[0], cryPlot.axes[0]] };
    expect(plotSchema.safeParse(extraAxis).success).toBe(false);
  });

  it("shows corrected types at the review's point and others at Jev's", () => {
    const review = fullReview({ ISFJ: 0.82 });
    expect(finalPoint(cryPlot, review, "ISFJ")).toEqual({ x: 0.82 });
    expect(finalPoint(cryPlot, review, "INFP")).toEqual({ x: 0.93 });
    expect(finalPoint(cryPlot, null, "ISFJ")).toEqual({ x: 0.6 });
  });

  it("ranks highest first and orders corrections by final rank", () => {
    const review = fullReview({ ISFJ: 0.82, ESFP: 0.76, INTJ: 0.38 });
    const ranks = ranksOf(pointsFor(cryPlot, review));
    expect(ranks.INFP).toBe(1);
    expect(ranks.ISFJ).toBe(3);
    expect(ranks.INTJ).toBe(9);
    expect(correctedTypes(cryPlot, review)).toEqual(["ISFJ", "ESFP", "INTJ"]);
  });

  it("grades by the number of placements the review kept", () => {
    expect(gradeOf(fullReview({ ISFJ: 0.82, ESFP: 0.76, INTJ: 0.38 }))).toBe(13);
    expect(gradeOf(fullReview({}))).toBe(16);
  });

  it("drops corrections that barely move a type and clamps the rest", () => {
    expect(normalizeCorrection(cryPlot, "ISFJ", { x: 0.65, note })).toBeUndefined();
    expect(normalizeCorrection(cryPlot, "ISFJ", { x: 1.4, note })).toEqual({ x: 1, note });
    // One-axis charts ignore vertical moves.
    expect(normalizeCorrection(cryPlot, "ISFJ", { y: 0.9, note })).toBeUndefined();
  });

  it("shows the question in the viewer's language, keeping the original wording in its own", () => {
    const chart = {
      question: "영화 보다가  제일 먼저 우는 MBTI는?",
      questionLanguage: "ko" as const,
      plot: cryPlot,
    };
    // The visitor's exact wording, spacing included, beats the stored copy.
    expect(questionIn(chart, "ko")).toBe("영화 보다가  제일 먼저 우는 MBTI는?");
    expect(questionIn(chart, "en")).toBe("Which type cries first at a movie?");
  });

  it("knows when a streamed review is complete", () => {
    const partial: Review = { types: { INFP: { explanation } } };
    expect(reviewedCount(partial)).toBe(1);
    expect(isReviewComplete(partial)).toBe(false);
    expect(isReviewComplete(fullReview({}))).toBe(true);
  });
});
