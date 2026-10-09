import { describe, expect, it } from "vitest";
import {
  axesOf,
  chartPresentation,
  correctedTypes,
  finalPoint,
  gradeOf,
  isChartViewMode,
  isReviewComplete,
  needsWording,
  normalizeCorrection,
  type Plot,
  plotSchema,
  pointsFor,
  questionIn,
  type Review,
  ranksOf,
  reviewedCount,
} from "@/lib/chart";
import { MBTI_TYPES } from "@/lib/mbti";
import { cryAxis, cryPlot, fitCryPlot, fitCryWording, judgment } from "@/lib/test-fixtures";

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

  it("keeps corrected placements and ranks in clean view without any original spots or marks", () => {
    const review = fullReview({ ISFJ: 0.82 });
    const annotated = chartPresentation(cryPlot, review, "review");
    const clean = chartPresentation(cryPlot, review, "clean");
    expect(clean.points).toEqual(annotated.points);
    expect(ranksOf(clean.points).ISFJ).toBe(3);
    expect(clean.order).toEqual([]);
    expect(clean.spots).toEqual({});
    expect(annotated.order).toEqual(["ISFJ"]);
    expect(annotated.spots).toEqual({ ISFJ: { x: 0.6 } });
  });

  it("shows Jev's originals in Jev-only view even when corrections exist", () => {
    const original = chartPresentation(cryPlot, fullReview({ ISFJ: 0.82 }), "jev");
    expect(original.points.ISFJ).toEqual({ x: 0.6 });
    expect(original.order).toEqual([]);
    expect(original.spots).toEqual({});
  });

  it("keeps both corrected coordinates in a clean two-axis chart", () => {
    const plot: Plot = {
      ...cryPlot,
      axes: [cryAxis, cryAxis],
      placements: Object.fromEntries(
        MBTI_TYPES.map((type) => [type, { ...cryPlot.placements[type], y: judgment(0.4) }]),
      ) as Plot["placements"],
    };
    const review = fullReview({ ISFJ: 0.82 });
    review.types.ISFJ = { explanation, correction: { x: 0.82, y: 0.9, note } };
    const clean = chartPresentation(plot, review, "clean");
    expect(clean.points.ISFJ).toEqual({ x: 0.82, y: 0.9 });
    expect(clean.points.INFP).toEqual({ x: 0.93, y: 0.4 });
    expect(clean.spots).toEqual({});
  });

  it("shows the original placements without annotations when no review exists", () => {
    for (const view of ["review", "clean", "jev"] as const) {
      const shown = chartPresentation(cryPlot, null, view);
      expect(shown.points).toEqual(pointsFor(cryPlot, null));
      expect(shown.order).toEqual([]);
      expect(shown.spots).toEqual({});
    }
  });

  it("accepts only the three supported chart views", () => {
    expect(isChartViewMode("clean")).toBe(true);
    expect(isChartViewMode("review")).toBe(true);
    expect(isChartViewMode("jev")).toBe(true);
    expect(isChartViewMode("other")).toBe(false);
    expect(isChartViewMode(null)).toBe(false);
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
      review: null,
    };
    // The visitor's exact wording, spacing included, beats the stored copy.
    expect(questionIn(chart, "ko")).toBe("영화 보다가  제일 먼저 우는 MBTI는?");
    expect(questionIn(chart, "en")).toBe("Which type cries first at a movie?");
  });

  it("shows a Jev-first chart's original question until the review translates it", () => {
    const chart = {
      question: "영화 보다가 제일 먼저 우는 MBTI는?",
      questionLanguage: "ko" as const,
      plot: fitCryPlot,
      review: { types: {} },
    };
    expect(questionIn(chart, "en")).toBe("영화 보다가 제일 먼저 우는 MBTI는?");
    const worded = { ...chart, review: { wording: fitCryWording, types: {} } };
    expect(questionIn(worded, "en")).toBe("Which type cries first at a movie?");
  });

  it("names a Jev-first axis with the review's wording, keeping Jev's criteria", () => {
    expect(needsWording(fitCryPlot)).toBe(true);
    expect(needsWording(cryPlot)).toBe(false);
    expect(axesOf(fitCryPlot, null)).toBe(fitCryPlot.axes);
    const [axis] = axesOf(fitCryPlot, { wording: fitCryWording, types: {} });
    expect(axis?.kind).toBe("fit");
    expect(axis?.high).toEqual({ ko: "시작부터 오열", en: "Cries first" });
    expect(axis?.levels[6]?.label.en).toBe("Sobbing ten minutes in");
    expect(axis?.levels[6]?.criterion).toBe(fitCryPlot.axes[0]?.levels[6]?.criterion);
  });

  it("reads axes saved before Jev went first as suggested axes", () => {
    const { kind: _, ...older } = cryAxis;
    const parsed = plotSchema.parse({ ...cryPlot, axes: [older] });
    expect(parsed.axes[0]?.kind).toBe("suggested");
  });

  it("knows when a streamed review is complete", () => {
    const partial: Review = { types: { INFP: { explanation } } };
    expect(reviewedCount(partial)).toBe(1);
    expect(isReviewComplete(partial)).toBe(false);
    expect(isReviewComplete(fullReview({}))).toBe(true);
  });
});
