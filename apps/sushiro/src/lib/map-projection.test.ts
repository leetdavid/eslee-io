import { describe, expect, it } from "vitest";
import { projectMapLocation } from "@/lib/map-projection";

describe("projectMapLocation", () => {
  it("anchors the published northwest coordinate to the image origin", () => {
    const point = projectMapLocation({ latitude: 22.562136, longitude: 113.834541 });

    expect(point.x).toBe(0);
    expect(point.y).toBe(0);
  });

  it("accounts for the padding added by rounding the local SVG viewBox", () => {
    const point = projectMapLocation({ latitude: 22.562136, longitude: 114.441018 });

    expect((point.x / 100) * 613).toBeCloseTo(612.52246, 5);
    expect(point.x).toBeLessThan(100);
    expect(point.y).toBe(0);
  });

  // Reference SVG coordinates calculated with the original MapSVG converter.
  it.each([
    {
      name: "Aberdeen",
      latitude: 22.2491324346046,
      longitude: 114.1548938784846,
      svgX: 323.5462073540596,
      svgY: 341.9375188029407,
    },
    {
      name: "Whampoa Deli Place",
      latitude: 22.303642,
      longitude: 114.188333,
      svgX: 357.3186553955381,
      svgY: 282.4443809808022,
    },
    {
      name: "Sheung Wan",
      latitude: 22.2863892107209,
      longitude: 114.15353717194392,
      svgX: 322.1759769450037,
      svgY: 301.2770261456617,
    },
  ])("matches the source projection for $name", ({ latitude, longitude, svgX, svgY }) => {
    const point = projectMapLocation({ latitude, longitude });

    expect((point.x / 100) * 613).toBeCloseTo(svgX, 5);
    expect((point.y / 100) * 445).toBeCloseTo(svgY, 5);
  });
});
