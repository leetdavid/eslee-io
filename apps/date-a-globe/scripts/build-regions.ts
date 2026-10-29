// Draws the setup screen's region picker: one Equal Earth path per region, with Russia split at the Urals.
// Writes src/lib/regions-map.json.
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { geoArea, geoCentroid, geoEqualEarth, geoGraticule, geoPath } from "d3-geo";
import type { Feature, MultiPolygon, Polygon, Position } from "geojson";
import polygonClipping, { type Geom } from "polygon-clipping";
import { feature } from "topojson-client";
import type { Topology } from "topojson-specification";

const require = createRequire(import.meta.url);
const world = require("world-atlas/countries-110m.json") as Topology;

const URALS_WEST: Position[][] = [
  [
    [20, 35],
    [48, 35],
    [51.5, 46.5],
    [52.5, 51],
    [57, 51.3],
    [59.3, 52],
    [59.6, 56],
    [60, 60],
    [61.5, 64],
    [65, 67.6],
    [66.5, 69],
    [69, 73],
    [69, 82],
    [20, 82],
    [20, 35],
  ],
];
// Turkey, Cyprus and the Arab states east of Egypt, plus Iran and Israel.
const MIDDLE_EAST = new Set([
  "792",
  "196",
  "760",
  "422",
  "376",
  "275",
  "400",
  "368",
  "364",
  "682",
  "414",
  "634",
  "048",
  "784",
  "512",
  "887",
]);
const NAMES = [
  "North America",
  "South America",
  "Europe",
  "Middle East",
  "Africa",
  "Asia",
  "Oceania",
] as const;

function regionOf(lon: number, lat: number) {
  if ((lon < -50 && lat >= 7.5) || (lat > 55 && lon < -10)) return "North America";
  if (lon < -30) return "South America";
  if (lon >= -25 && lon < 45 && lat >= 35) return "Europe";
  if (lon >= -20 && lon < 55 && lat < 37) return "Africa";
  if ((lon > 130 && lat < 0) || lon < -150) return "Oceania";
  return "Asia";
}

// polygon-clipping winds rings the planar way; d3 reads that as "everything except this shape".
const fixWinding = (g: Polygon): Polygon =>
  geoArea(g) > 2 * Math.PI
    ? { ...g, coordinates: g.coordinates.map((r) => r.slice().reverse()) }
    : g;

const parts: { region: string; g: Polygon }[] = [];
const countries = feature(world, world.objects.countries as never) as unknown as {
  features: Feature<Polygon | MultiPolygon>[];
};
for (const f of countries.features) {
  if (f.id === "010") continue;
  const polys =
    f.geometry.type === "MultiPolygon" ? f.geometry.coordinates : [f.geometry.coordinates];
  if (f.id === "643") {
    const west = polygonClipping.intersection(polys as Geom, URALS_WEST as Geom);
    const east = polygonClipping.difference(polys as Geom, URALS_WEST as Geom);
    for (const c of west)
      parts.push({ region: "Europe", g: fixWinding({ type: "Polygon", coordinates: c }) });
    for (const c of east)
      parts.push({ region: "Asia", g: fixWinding({ type: "Polygon", coordinates: c }) });
    continue;
  }
  for (const c of polys) {
    const g: Polygon = { type: "Polygon", coordinates: c };
    const [lon, lat] = geoCentroid(g);
    parts.push({ region: MIDDLE_EAST.has(String(f.id)) ? "Middle East" : regionOf(lon, lat), g });
  }
}

const W = 342;
const H = 170;
const projection = geoEqualEarth().fitExtent(
  [
    [2, 2],
    [W - 2, H - 2],
  ],
  {
    type: "FeatureCollection",
    features: parts.map((p) => ({ type: "Feature", properties: {}, geometry: p.g })),
  },
);
const path = geoPath(projection);
const r1 = (d: string | null) => (d ?? "").replace(/(\d+\.\d)\d+/g, "$1");
const anchor: Record<string, [number, number]> = {
  "North America": [-100, 45],
  "South America": [-60, -15],
  Europe: [15, 52],
  "Middle East": [45, 28],
  Africa: [20, 5],
  Asia: [95, 45],
  Oceania: [134, -25],
};

const out = {
  width: W,
  height: H,
  sphere: r1(path({ type: "Sphere" })),
  graticule: r1(path(geoGraticule().step([30, 30])())),
  regions: NAMES.map((name) => ({
    name,
    d: parts
      .filter((p) => p.region === name)
      .map((p) => r1(path(p.g)))
      .join(""),
    label: (projection(anchor[name] as [number, number]) ?? [0, 0]).map(
      (v) => Math.round(v * 10) / 10,
    ),
  })),
};
writeFileSync(new URL("../src/lib/regions-map.json", import.meta.url), JSON.stringify(out));
console.log("regions map written");
