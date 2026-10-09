import { describe, expect, it } from "vitest";
import {
  COMPACT_SIZES,
  DESKTOP_SIZES,
  layoutHorizontal,
  layoutPlane,
  layoutVertical,
  MOBILE_SIZES,
  overlaps,
  type Placed,
  type Rect,
  rectOf,
  type Sized,
} from "@/lib/layout";
import { MBTI_TYPES, type MbtiType } from "@/lib/mbti";
import { cryPositions } from "@/lib/test-fixtures";

function noOverlaps(items: Placed[], size: Sized) {
  const rects = items.map((item) => rectOf(item, size));
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i] as Rect;
      const b = rects[j] as Rect;
      if (overlaps(a, b)) return `${items[i]?.type} overlaps ${items[j]?.type}`;
    }
  }
  return null;
}

function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1_664_525 + 1_013_904_223) % 4_294_967_296;
    return state / 4_294_967_296;
  };
}

const corrections = { ISFJ: 0.82, ESFP: 0.76, INTJ: 0.38 };
const input = {
  points: { ...cryPositions, ...corrections },
  spots: { ISFJ: cryPositions.ISFJ, ESFP: cryPositions.ESFP, INTJ: cryPositions.INTJ },
  order: ["ISFJ", "ESFP", "INTJ"] as MbtiType[],
};

describe("one-axis layouts", () => {
  it("stacks every sticker without overlap and draws one arrow per correction", () => {
    const layout = layoutHorizontal(input, 800, DESKTOP_SIZES);
    expect(layout.stickers).toHaveLength(16);
    expect(noOverlaps(layout.stickers, DESKTOP_SIZES.sticker)).toBeNull();
    expect(noOverlaps(layout.spots, DESKTOP_SIZES.spot)).toBeNull();
    expect(layout.arrows.map((arrow) => arrow.type)).toEqual(["ISFJ", "ESFP", "INTJ"]);
    expect(layout.marks.map((mark) => mark.n)).toEqual([1, 2, 3]);
    // Jev's pencil row sits between the stickers and the axis.
    const lowestSticker = Math.max(...layout.stickers.map((item) => item.cy));
    for (const spot of layout.spots) expect(spot.cy).toBeGreaterThan(lowestSticker);
  });

  it("keeps the mobile ladder inside its width without overlap, even when crowded", () => {
    const crowded = Object.fromEntries(MBTI_TYPES.map((type) => [type, 0.5])) as Record<
      MbtiType,
      number
    >;
    for (const points of [input.points, crowded]) {
      const layout = layoutVertical({ ...input, points }, 338, 600, MOBILE_SIZES);
      expect(noOverlaps(layout.stickers, MOBILE_SIZES.sticker)).toBeNull();
      for (const item of layout.stickers) {
        const rect = rectOf(item, MOBILE_SIZES.sticker);
        expect(rect.x).toBeGreaterThanOrEqual(0);
        expect(rect.x + rect.w).toBeLessThanOrEqual(338);
      }
    }
  });

  it("keeps a crowded end inside the chart and clear of the end labels", () => {
    const piled = Object.fromEntries(
      MBTI_TYPES.map((type, index) => [type, index < 9 ? 0.01 + index * 0.015 : 0.95]),
    ) as Record<MbtiType, number>;
    const layout = layoutVertical({ points: piled, spots: {}, order: [] }, 338, 600, MOBILE_SIZES);
    expect(noOverlaps(layout.stickers, MOBILE_SIZES.sticker)).toBeNull();
    for (const item of layout.stickers) {
      const rect = rectOf(item, MOBILE_SIZES.sticker);
      expect(rect.y).toBeGreaterThanOrEqual(24);
      expect(rect.y + rect.h).toBeLessThanOrEqual(layout.height - 24);
    }
  });

  it("puts the higher end at the top of the ladder", () => {
    const layout = layoutVertical(input, 338, 600, MOBILE_SIZES);
    const infp = layout.stickers.find((item) => item.type === "INFP");
    const istp = layout.stickers.find((item) => item.type === "ISTP");
    expect(infp && istp && infp.cy < istp.cy).toBe(true);
  });
});

describe("two-axis layout", () => {
  it("separates stickers and spots from each other and from axis labels", () => {
    const random = seeded(7);
    for (let run = 0; run < 25; run++) {
      const points = Object.fromEntries(
        MBTI_TYPES.map((type) => [type, { x: random(), y: random() }]),
      ) as Record<MbtiType, { x: number; y: number }>;
      const label: Rect = { x: 220, y: 172, w: 110, h: 18 };
      const layout = layoutPlane(
        { points, spots: { INTJ: { x: 0.5, y: 0.5 } }, order: ["INTJ"], obstacles: [label] },
        338,
        380,
        34,
        COMPACT_SIZES,
      );
      expect(noOverlaps(layout.stickers, COMPACT_SIZES.sticker)).toBeNull();
      for (const item of layout.stickers)
        expect(overlaps(rectOf(item, COMPACT_SIZES.sticker), label)).toBe(false);
      for (const spot of layout.spots) {
        expect(overlaps(rectOf(spot, COMPACT_SIZES.spot), label)).toBe(false);
        for (const item of layout.stickers)
          expect(
            overlaps(rectOf(spot, COMPACT_SIZES.spot), rectOf(item, COMPACT_SIZES.sticker)),
          ).toBe(false);
      }
    }
  });

  it("is deterministic", () => {
    const points = Object.fromEntries(
      MBTI_TYPES.map((type, i) => [type, { x: (i % 4) / 3, y: Math.floor(i / 4) / 3 }]),
    ) as Record<MbtiType, { x: number; y: number }>;
    const a = layoutPlane(
      { points, spots: {}, order: [], obstacles: [] },
      800,
      640,
      60,
      DESKTOP_SIZES,
    );
    const b = layoutPlane(
      { points, spots: {}, order: [], obstacles: [] },
      800,
      640,
      60,
      DESKTOP_SIZES,
    );
    expect(a).toEqual(b);
  });
});
