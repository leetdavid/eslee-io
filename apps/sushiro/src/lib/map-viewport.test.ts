import { zoomIdentity } from "d3-zoom";
import { describe, expect, it } from "vitest";
import {
  constrainMapTransform,
  fitMapTransform,
  type MapDimensions,
  resizeMapTransform,
} from "@/lib/map-viewport";

const portrait: MapDimensions = {
  canvas: { width: 358, height: 260 },
  viewport: { width: 390, height: 540 },
};
const landscape: MapDimensions = {
  canvas: { width: 410, height: 298 },
  viewport: { width: 560, height: 360 },
};

describe("map viewport", () => {
  it("fits the entire map in the center of the available viewport", () => {
    const transform = fitMapTransform(portrait);

    expect(transform.k).toBe(1);
    expect(transform.apply([portrait.canvas.width / 2, portrait.canvas.height / 2])).toEqual([
      portrait.viewport.width / 2,
      portrait.viewport.height / 2,
    ]);
    expect(transform.x).toBeGreaterThanOrEqual(0);
    expect(transform.y).toBeGreaterThanOrEqual(0);
  });

  it("preserves off-center focal zoom even while the map is smaller than the viewport", () => {
    const initial = fitMapTransform(portrait);
    const pointer: [number, number] = [280, 320];
    const point = initial.invert(pointer);
    const scale = 1.2;
    const zoomed = zoomIdentity
      .translate(pointer[0] - point[0] * scale, pointer[1] - point[1] * scale)
      .scale(scale);

    const constrained = constrainMapTransform(zoomed, portrait);
    expect(constrained.apply(point)[0]).toBeCloseTo(pointer[0]);
    expect(constrained.apply(point)[1]).toBeCloseTo(pointer[1]);
  });

  it("keeps part of the map visible after an extreme pan", () => {
    const transform = constrainMapTransform(
      zoomIdentity.translate(100_000, -100_000).scale(8),
      portrait,
    );

    expect(portrait.viewport.width - transform.x).toBeGreaterThanOrEqual(48);
    expect(transform.applyY(portrait.canvas.height)).toBeGreaterThanOrEqual(48);
    expect(transform.k).toBe(8);
  });

  it("keeps the same map location centered when the device rotates", () => {
    const initial = zoomIdentity.translate(-450, -200).scale(3);
    const before = initial.invert([portrait.viewport.width / 2, portrait.viewport.height / 2]);
    const resized = resizeMapTransform(initial, portrait, landscape);
    const after = resized.invert([landscape.viewport.width / 2, landscape.viewport.height / 2]);

    expect(after[0] / landscape.canvas.width).toBeCloseTo(before[0] / portrait.canvas.width);
    expect(after[1] / landscape.canvas.height).toBeCloseTo(before[1] / portrait.canvas.height);
    expect(resized.k).toBe(initial.k);
  });

  it("keeps a fitted map fitted after a resize", () => {
    const resized = resizeMapTransform(fitMapTransform(portrait), portrait, landscape);
    expect(resized).toEqual(fitMapTransform(landscape));
  });
});
