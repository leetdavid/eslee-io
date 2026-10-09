import type { MbtiType } from "@/lib/mbti";

export type Rect = { x: number; y: number; w: number; h: number };
export type Sized = { w: number; h: number };
export type Placed = { type: MbtiType; cx: number; cy: number };
export type Arrow = { type: MbtiType; d: string };
export type Ring = { type: MbtiType; cx: number; cy: number; rx: number; ry: number };
export type Mark = { type: MbtiType; n: number; x: number; y: number };

export type ChartLayout = {
  width: number;
  height: number;
  stickers: Placed[];
  spots: Placed[];
  arrows: Arrow[];
  rings: Ring[];
  marks: Mark[];
};

export type Sizes = { sticker: Sized; spot: Sized; mark: number };

export const DESKTOP_SIZES: Sizes = { sticker: { w: 78, h: 36 }, spot: { w: 60, h: 26 }, mark: 24 };
export const MOBILE_SIZES: Sizes = { sticker: { w: 66, h: 32 }, spot: { w: 52, h: 22 }, mark: 22 };
export const COMPACT_SIZES: Sizes = { sticker: { w: 54, h: 26 }, spot: { w: 46, h: 20 }, mark: 20 };

export function rectOf(item: { cx: number; cy: number }, size: Sized): Rect {
  return { x: item.cx - size.w / 2, y: item.cy - size.h / 2, w: size.w, h: size.h };
}

export function overlaps(a: Rect, b: Rect, margin = 0): boolean {
  return (
    a.x < b.x + b.w + margin &&
    a.x + a.w + margin > b.x &&
    a.y < b.y + b.h + margin &&
    a.y + a.h + margin > b.y
  );
}

/** Rough text width for Pretendard/Hangul labels, used before the browser can measure. */
export function estimateTextWidth(text: string, fontSize: number): number {
  let width = 0;
  for (const char of text)
    width += /[\u1100-\u11ff\u3130-\u318f\uac00-\ud7af]/u.test(char) ? fontSize : fontSize * 0.58;
  return width;
}

function curve(from: { x: number; y: number }, to: { x: number; y: number }, bow: number): string {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  const cx = (from.x + to.x) / 2 - (dy / length) * bow;
  const cy = (from.y + to.y) / 2 + (dx / length) * bow;
  const f = (n: number) => Number(n.toFixed(1));
  return `M${f(from.x)} ${f(from.y)} Q ${f(cx)} ${f(cy)} ${f(to.x)} ${f(to.y)}`;
}

/** The nearest position on a spiral around `origin` where `size` fits without touching a blocker. */
function nearestFree(
  origin: { cx: number; cy: number },
  size: Sized,
  blockers: Rect[],
  width: number,
  height: number,
) {
  for (let radius = 0; radius <= Math.max(width, height); radius += 4) {
    const steps = radius === 0 ? 1 : Math.max(8, Math.round((2 * Math.PI * radius) / 8));
    for (let step = 0; step < steps; step++) {
      const angle = (step / steps) * 2 * Math.PI;
      const cx = origin.cx + radius * Math.cos(angle);
      const cy = origin.cy + radius * Math.sin(angle);
      const rect = rectOf({ cx, cy }, size);
      if (rect.x < 4 || rect.y < 4 || rect.x + rect.w > width - 4 || rect.y + rect.h > height - 4)
        continue;
      if (!blockers.some((blocker) => overlaps(rect, blocker, 2))) return { cx, cy };
    }
  }
  return origin;
}

function ring(item: Placed, size: Sized): Ring {
  return { type: item.type, cx: item.cx, cy: item.cy, rx: size.w / 2 + 10, ry: size.h / 2 + 7 };
}

/** Puts a correction number in the first free corner around its sticker. */
function placeMarks(
  order: MbtiType[],
  stickers: Placed[],
  taken: Rect[],
  width: number,
  height: number,
  sizes: Sizes,
) {
  const marks: Mark[] = [];
  const size = sizes.mark;
  const { w, h } = sizes.sticker;
  order.forEach((type, index) => {
    const sticker = stickers.find((item) => item.type === type);
    if (!sticker) return;
    const left = sticker.cx - w / 2;
    const top = sticker.cy - h / 2;
    const candidates: [number, number][] = [
      [left - size - 4, top - size + 4],
      [left + w + 4, top - size + 4],
      [left + w + 4, top + h - 4],
      [left - size - 4, top + h - 4],
      [sticker.cx - size / 2, top - size - 8],
      [sticker.cx - size / 2, top + h + 8],
      [left + w + 14, sticker.cy - size / 2],
      [left - size - 14, sticker.cy - size / 2],
    ];
    const free = candidates.find(
      ([x, y]) =>
        x >= 2 &&
        y >= 2 &&
        x + size <= width - 2 &&
        y + size <= height - 2 &&
        !taken.some((rect) => overlaps({ x, y, w: size, h: size }, rect, 1)),
    );
    const [x, y] = free ?? candidates[0] ?? [left, top];
    taken.push({ x, y, w: size, h: size });
    marks.push({ type, n: index + 1, x, y });
  });
  return marks;
}

type Lane = { type: MbtiType; cx: number; lane: number };

/** Assigns each item the lowest lane where it doesn't overlap a neighbour. */
export function packLanes(
  positions: [MbtiType, number][],
  width: number,
  pad: number,
  itemWidth: number,
  gap: number,
): Lane[] {
  const items = positions
    .map(([type, value]) => ({ type, cx: pad + value * (width - 2 * pad), lane: 0 }))
    .sort((a, b) => a.cx - b.cx || a.type.localeCompare(b.type));
  const lanes: [number, number][][] = [];
  for (const item of items) {
    let lane = 0;
    while (
      (lanes[lane] ?? []).some(
        ([l, r]) => item.cx + itemWidth / 2 + gap > l && item.cx - itemWidth / 2 - gap < r,
      )
    )
      lane++;
    lanes[lane] ??= [];
    lanes[lane]?.push([item.cx - itemWidth / 2, item.cx + itemWidth / 2]);
    item.lane = lane;
  }
  return items;
}

export type AxisInput = {
  /** Final horizontal positions, 0 to 1. */
  points: Record<MbtiType, number>;
  /** Jev's original positions for corrected types. */
  spots: Partial<Record<MbtiType, number>>;
  /** Corrected types in numbering order. */
  order: MbtiType[];
};

/** A horizontal one-axis chart with stickers stacked in lanes above a pencil row of Jev's spots. */
export function layoutHorizontal(
  input: AxisInput,
  width: number,
  sizes: Sizes,
  options: { topPad?: number; pad?: number } = {},
) {
  const pad = options.pad ?? 56;
  const topPad = options.topPad ?? 58;
  const gap = 6;
  const laneHeight = sizes.sticker.h + 10;
  const spotRowHeight = sizes.spot.h + 4;
  const stickers = packLanes(
    Object.entries(input.points) as [MbtiType, number][],
    width,
    pad,
    sizes.sticker.w,
    gap,
  );
  const spotLanes = packLanes(
    Object.entries(input.spots) as [MbtiType, number][],
    width,
    pad,
    sizes.spot.w,
    gap,
  );
  const spotRows = spotLanes.length ? Math.max(...spotLanes.map((item) => item.lane)) + 1 : 0;
  const maxLane = Math.max(0, ...stickers.map((item) => item.lane));
  const height =
    topPad + (maxLane + 1) * laneHeight + spotRows * spotRowHeight + (spotRows ? 10 : 0) + 84;
  const axisY = height - 58;
  const spotY = (lane: number) => axisY - 10 - sizes.spot.h / 2 - lane * spotRowHeight;
  const base = axisY - 12 - sizes.sticker.h / 2 - (spotRows ? spotRows * spotRowHeight + 10 : 0);
  const placedStickers: Placed[] = stickers.map((item) => ({
    type: item.type,
    cx: item.cx,
    cy: base - item.lane * laneHeight,
  }));
  const placedSpots: Placed[] = spotLanes.map((item) => ({
    type: item.type,
    cx: item.cx,
    cy: spotY(item.lane),
  }));
  const arrows: Arrow[] = [];
  const rings: Ring[] = [];
  for (const type of input.order) {
    const sticker = placedStickers.find((item) => item.type === type);
    const spot = placedSpots.find((item) => item.type === type);
    if (!sticker || !spot) continue;
    const from = { x: spot.cx, y: spot.cy - sizes.spot.h / 2 - 2 };
    const to = { x: sticker.cx, y: sticker.cy + sizes.sticker.h / 2 + 4 };
    arrows.push({ type, d: curve(from, to, to.x > from.x ? -22 : 22) });
    rings.push(ring(sticker, sizes.sticker));
  }
  const taken = [
    ...placedStickers.map((item) => rectOf(item, sizes.sticker)),
    ...placedSpots.map((item) => rectOf(item, sizes.spot)),
  ];
  const marks = placeMarks(input.order, placedStickers, taken, width, height, sizes);
  return {
    width,
    height,
    axisY,
    pad,
    stickers: placedStickers,
    spots: placedSpots,
    arrows,
    rings,
    marks,
  } satisfies ChartLayout & {
    axisY: number;
    pad: number;
  };
}

/** The mobile ladder: a vertical axis with the high end on top and stickers in columns on both sides. */
export function layoutVertical(input: AxisInput, width: number, usable: number, sizes: Sizes) {
  const top = 46;
  let height = top + usable + 46;
  const ax = width / 2;
  const { w, h } = sizes.sticker;
  const yOf = (value: number) => top + (1 - value) * usable;
  const inner = sizes.spot.w / 2 + 6 + w / 2;
  const lanes = [ax + inner, ax - inner, ax + inner + w + 6, ax - inner - w - 6].filter(
    (x) => x - w / 2 >= 2 && x + w / 2 <= width - 2,
  );
  const items = (Object.entries(input.points) as [MbtiType, number][])
    .map(([type, value]) => ({ type, cy: yOf(value), cx: ax }))
    .sort((a, b) => a.cy - b.cy || a.type.localeCompare(b.type));
  const occupied = lanes.map(() => [] as number[]);
  const free = (y: number) =>
    lanes.findIndex(
      (_, index) => !(occupied[index] ?? []).some((other) => Math.abs(other - y) < h + 5),
    );
  for (const item of items) {
    const ideal = item.cy;
    // The nearest free slot in either direction, staying within the axis when possible,
    // keeps a crowded end from spilling past its label.
    let placed = false;
    for (let step = 0; step <= 160 && !placed; step++) {
      const y = ideal + (step % 2 === 0 ? 1 : -1) * Math.ceil(step / 2) * 6;
      if (y < top - 8 || y > top + usable + 8) continue;
      const lane = free(y);
      if (lane < 0) continue;
      occupied[lane]?.push(y);
      item.cx = lanes[lane] ?? ax;
      item.cy = y;
      placed = true;
    }
    if (!placed) {
      item.cy = Math.max(ideal, ...occupied.flat()) + h + 5;
      occupied[0]?.push(item.cy);
      item.cx = lanes[0] ?? ax;
    }
  }
  const spots: Placed[] = [];
  for (const [type, value] of Object.entries(input.spots) as [MbtiType, number][]) {
    let cy = yOf(value);
    while (spots.some((spot) => Math.abs(spot.cy - cy) < sizes.spot.h + 4)) cy += 6;
    spots.push({ type, cx: ax, cy });
  }
  const lowest = Math.max(
    ...items.map((item) => item.cy + h / 2),
    ...spots.map((spot) => spot.cy + sizes.spot.h / 2),
  );
  height = Math.max(height, Math.ceil(lowest + 40));
  const arrows: Arrow[] = [];
  const rings: Ring[] = [];
  for (const type of input.order) {
    const sticker = items.find((item) => item.type === type);
    const spot = spots.find((item) => item.type === type);
    if (!sticker || !spot) continue;
    const right = sticker.cx > ax;
    const from = { x: ax + (right ? 1 : -1) * (sizes.spot.w / 2 + 1), y: spot.cy };
    const to = {
      x: sticker.cx + (right ? -1 : 1) * (w / 2 + 2),
      y: sticker.cy + (sticker.cy > spot.cy ? -6 : 6),
    };
    arrows.push({ type, d: curve(from, to, right ? 16 : -16) });
    rings.push(ring(sticker, sizes.sticker));
  }
  const taken = [
    ...items.map((item) => rectOf(item, sizes.sticker)),
    ...spots.map((item) => rectOf(item, sizes.spot)),
  ];
  const marks = placeMarks(input.order, items, taken, width, height, sizes);
  return {
    width,
    height,
    ax,
    top,
    usable,
    stickers: items,
    spots,
    arrows,
    rings,
    marks,
  } satisfies ChartLayout & {
    ax: number;
    top: number;
    usable: number;
  };
}

export type PlaneInput = {
  points: Record<MbtiType, { x: number; y: number }>;
  spots: Partial<Record<MbtiType, { x: number; y: number }>>;
  order: MbtiType[];
  /** Fixed rectangles, such as axis labels and the legend, that stickers avoid. */
  obstacles: Rect[];
};

/** A two-axis chart: stickers start at their points and are nudged apart until nothing overlaps. */
export function layoutPlane(
  input: PlaneInput,
  width: number,
  height: number,
  pad: number,
  sizes: Sizes,
): ChartLayout {
  const { w, h } = sizes.sticker;
  const at = (point: { x: number; y: number }) => ({
    cx: pad + point.x * (width - 2 * pad),
    cy: height - pad - point.y * (height - 2 * pad),
  });
  const stickers: Placed[] = (
    Object.entries(input.points) as [MbtiType, { x: number; y: number }][]
  )
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([type, point]) => ({ type, ...at(point) }));
  const clamp = (item: Placed, size: Sized) => {
    item.cx = Math.min(width - size.w / 2 - 6, Math.max(size.w / 2 + 6, item.cx));
    item.cy = Math.min(height - size.h / 2 - 6, Math.max(size.h / 2 + 6, item.cy));
  };
  const pushOut = (item: Placed, size: Sized, rect: Rect) => {
    const cx = rect.x + rect.w / 2;
    const cy = rect.y + rect.h / 2;
    const ox = (size.w + rect.w) / 2 + 3 - Math.abs(item.cx - cx);
    const oy = (size.h + rect.h) / 2 + 3 - Math.abs(item.cy - cy);
    if (oy < ox) item.cy += (oy + 0.5) * (item.cy >= cy ? 1 : -1);
    else item.cx += (ox + 0.5) * (item.cx >= cx ? 1 : -1);
  };
  for (let iteration = 0; iteration < 240; iteration++) {
    let moved = false;
    for (let i = 0; i < stickers.length; i++) {
      for (let j = i + 1; j < stickers.length; j++) {
        const a = stickers[i];
        const b = stickers[j];
        if (!a || !b) continue;
        const dx = b.cx - a.cx;
        const dy = b.cy - a.cy;
        const ox = w + 4 - Math.abs(dx);
        const oy = h + 4 - Math.abs(dy);
        if (ox <= 0 || oy <= 0) continue;
        moved = true;
        if (ox / w < oy / h) {
          const shift = (ox / 2 + 0.5) * (dx >= 0 ? 1 : -1);
          a.cx -= shift;
          b.cx += shift;
        } else {
          const shift = (oy / 2 + 0.5) * (dy >= 0 ? 1 : -1);
          a.cy -= shift;
          b.cy += shift;
        }
      }
    }
    for (const item of stickers) {
      for (const rect of input.obstacles) {
        if (overlaps(rectOf(item, sizes.sticker), rect, 2)) {
          moved = true;
          pushOut(item, sizes.sticker, rect);
        }
      }
      clamp(item, sizes.sticker);
    }
    if (!moved) break;
  }
  // Relaxation can stall in crowded corners; anything still touching moves to the nearest free spot.
  const settled: Rect[] = [...input.obstacles];
  for (const item of stickers) {
    if (settled.some((rect) => overlaps(rectOf(item, sizes.sticker), rect, 2))) {
      Object.assign(item, nearestFree(item, sizes.sticker, settled, width, height));
    }
    settled.push(rectOf(item, sizes.sticker));
  }
  // Jev's spots are few, so each takes the nearest free position around its point.
  const spots: Placed[] = [];
  for (const [type, point] of (
    Object.entries(input.spots) as [MbtiType, { x: number; y: number }][]
  ).sort(([a], [b]) => a.localeCompare(b))) {
    const blockers = [...settled, ...spots.map((item) => rectOf(item, sizes.spot))];
    spots.push({ type, ...nearestFree(at(point), sizes.spot, blockers, width, height) });
  }
  const arrows: Arrow[] = [];
  const rings: Ring[] = [];
  for (const type of input.order) {
    const sticker = stickers.find((item) => item.type === type);
    const spot = spots.find((item) => item.type === type);
    if (!sticker || !spot) continue;
    const dx = sticker.cx - spot.cx;
    const dy = sticker.cy - spot.cy;
    const length = Math.hypot(dx, dy) || 1;
    const ux = dx / length;
    const uy = dy / length;
    const edge = (size: Sized) =>
      Math.min(Math.abs(size.w / 2 / (ux || 1e-6)), Math.abs(size.h / 2 / (uy || 1e-6)));
    const from = {
      x: spot.cx + ux * (edge(sizes.spot) + 3),
      y: spot.cy + uy * (edge(sizes.spot) + 3),
    };
    const to = {
      x: sticker.cx - ux * (edge(sizes.sticker) + 7),
      y: sticker.cy - uy * (edge(sizes.sticker) + 7),
    };
    arrows.push({ type, d: curve(from, to, 18) });
    rings.push(ring(sticker, sizes.sticker));
  }
  const taken = [
    ...stickers.map((item) => rectOf(item, sizes.sticker)),
    ...spots.map((item) => rectOf(item, sizes.spot)),
    ...input.obstacles,
  ];
  const marks = placeMarks(input.order, stickers, taken, width, height, sizes);
  return { width, height, stickers, spots, arrows, rings, marks };
}
