// Turns authored plate sources (data/plate-sources.json) into finished plates (public/plates/<event id>.json):
// the marks' geometry resolved from Natural Earth, plus the base map around each magnifier.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { geoArea, geoCentroid, geoCircle, geoDistance } from "d3-geo";
import type {
  FeatureCollection,
  Geometry,
  LineString,
  MultiLineString,
  MultiPolygon,
  Polygon,
  Position,
} from "geojson";
import polygonClipping, { type Geom } from "polygon-clipping";
import { merge, mesh } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import type { Label, LensBase, LonLat, Mark, Plate, PlateSource } from "../src/plates/types";

const require = createRequire(import.meta.url);
const root = new URL("..", import.meta.url);
const read = <T>(path: string): T => JSON.parse(readFileSync(path, "utf8")) as T;

// Natural Earth layers that world-atlas doesn't carry, downloaded once into .cache/ne.
const NE_URL = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/";
async function ne<G extends Geometry>(name: string): Promise<FeatureCollection<G>> {
  const path = new URL(`.cache/ne/${name}.geojson`, root).pathname;
  if (!existsSync(path)) {
    const res = await fetch(`${NE_URL}${name}.geojson`);
    if (!res.ok) throw new Error(`Natural Earth ${name}: HTTP ${res.status}`);
    mkdirSync(new URL(".cache/ne/", root).pathname, { recursive: true });
    writeFileSync(path, await res.text());
  }
  return read(path);
}

const atlas = {
  "10m": require("world-atlas/countries-10m.json") as Topology,
  "50m": require("world-atlas/countries-50m.json") as Topology,
};
type Area = Polygon | MultiPolygon;
type Line = LineString | MultiLineString;
const lakes = { "10m": await ne<Area>("ne_10m_lakes"), "50m": await ne<Area>("ne_50m_lakes") };
const rivers = {
  "10m": await ne<Line>("ne_10m_rivers_lake_centerlines"),
  "50m": await ne<Line>("ne_50m_rivers_lake_centerlines"),
};
const seas = await ne<Area>("ne_10m_geography_marine_polys");

type Res = "10m" | "50m";
const countriesOf = (res: Res) =>
  atlas[res].objects.countries as GeometryCollection<{ name: string }>;
let tolerance = 0.01;
type XY = [number, number];
// GeoJSON types a position as number[]; read one as x, y.
const xy = (p: Position | undefined): XY => [p?.[0] ?? 0, p?.[1] ?? 0];
const pt = (line: Position[], i: number) => xy(line[i]);
const round = (p: Position): Position => {
  const [x, y] = xy(p);
  return [Math.round(x * 1000) / 1000, Math.round(y * 1000) / 1000];
};

// Douglas–Peucker on lon/lat, keeping points that move the line by more than the tolerance.
// A closed ring starts and ends on the same point, so it is split at its farthest point first.
function simplify(line: Position[], closed = false): Position[] {
  if (closed) {
    if (line.length <= 4) return line;
    let far = 1;
    let best = -1;
    const [x0, y0] = pt(line, 0);
    line.forEach((p, i) => {
      const [x, y] = xy(p);
      const dist = Math.hypot(x - x0, y - y0);
      if (dist > best) {
        best = dist;
        far = i;
      }
    });
    const ring = [...simplify(line.slice(0, far + 1)), ...simplify(line.slice(far)).slice(1)];
    return ring.length >= 4 ? ring : [];
  }
  if (line.length <= 2) return line;
  const keep = new Uint8Array(line.length);
  keep[0] = keep[line.length - 1] = 1;
  const stack: [number, number][] = [[0, line.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop() as [number, number];
    const [ax, ay] = pt(line, a);
    const [bx, by] = pt(line, b);
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy) || 1e-12;
    let worst = -1;
    let at = -1;
    for (let i = a + 1; i < b; i++) {
      const [x, y] = pt(line, i);
      const dist = Math.abs(dy * x - dx * y + bx * ay - by * ax) / len;
      if (dist > worst) {
        worst = dist;
        at = i;
      }
    }
    if (worst > tolerance) {
      keep[at] = 1;
      stack.push([a, at], [at, b]);
    }
  }
  return line.filter((_, i) => keep[i]);
}

// polygon-clipping returns rings in planar order; d3 reads them on the sphere, where a ring that
// encloses more than a hemisphere means the opposite area. Flip any polygon that comes out inside out.
function sphericalOrder(polys: Position[][][]): Position[][][] {
  return polys.map((poly) => {
    const area = geoArea({ type: "Polygon", coordinates: poly });
    return area > 2 * Math.PI ? poly.map((ring) => ring.slice().reverse()) : poly;
  });
}
const toMulti = (polys: Position[][][]): MultiPolygon => ({
  type: "MultiPolygon",
  coordinates: sphericalOrder(
    polys
      .map((poly) =>
        poly.map((ring) => simplify(ring.map(round), true)).filter((ring) => ring.length >= 4),
      )
      .filter((poly) => poly.length > 0),
  ),
});
const polysOf = (g: Polygon | MultiPolygon): Position[][][] =>
  g.type === "Polygon" ? [g.coordinates] : g.coordinates;

function lensBox(center: LonLat, radius: number): Position[][] {
  const reach = Math.min(radius * 1.7, 80);
  const dLon = Math.min(179.9, reach / Math.max(0.2, Math.cos((center[1] * Math.PI) / 180)));
  wholeShapes =
    center[0] - dLon < -180 ||
    center[0] + dLon > 180 ||
    center[1] + reach > 89.9 ||
    center[1] - reach < -89.9;
  const [w, e] = [Math.max(-180, center[0] - dLon), Math.min(180, center[0] + dLon)];
  const [s, n] = [Math.max(-89.9, center[1] - reach), Math.min(89.9, center[1] + reach)];
  return [
    [
      [w, s],
      [e, s],
      [e, n],
      [w, n],
      [w, s],
    ],
  ];
}

// A box cut at the antimeridian or a pole leaves seams the magnifier would draw, so such lenses
// keep every shape that reaches into the box whole and let the projection clip them.
let wholeShapes = false;
const boxEdges = (box: Position[][]) => {
  const ring = box[0] ?? [];
  const [w, s] = pt(ring, 0);
  const [e, n] = pt(ring, 2);
  return (p: Position) => {
    const [x, y] = xy(p);
    return x >= w && x <= e && y >= s && y <= n;
  };
};
function clipPolys(polys: Position[][][], box: Position[][]): Position[][][] {
  if (!polys.length) return [];
  if (wholeShapes) {
    const inside = boxEdges(box);
    return polys.filter((poly) => (poly[0] ?? []).some(inside));
  }
  return polygonClipping.intersection(polys as Geom, box as Geom) as Position[][][];
}

function clipLines(lines: Position[][], box: Position[][]): Position[][] {
  const inside = boxEdges(box);
  const out: Position[][] = [];
  for (const line of lines) {
    let run: Position[] = [];
    line.forEach((p, i) => {
      if (
        inside(p) ||
        (i > 0 && inside(pt(line, i - 1))) ||
        (i < line.length - 1 && inside(pt(line, i + 1)))
      )
        run.push(round(p));
      else if (run.length) {
        if (run.length > 1) out.push(run);
        run = [];
      }
    });
    if (run.length > 1) out.push(run);
  }
  return out;
}

function countryShape(res: Res, ids: string[]): Position[][][] {
  const geoms = countriesOf(res).geometries.filter((g) => ids.includes(String(g.id)));
  if (geoms.length !== ids.length) throw new Error(`Unknown country id among ${ids.join(", ")}`);
  return polysOf(merge(atlas[res], geoms as never) as MultiPolygon);
}

function lakeShape(res: Res, names: string[]): Position[][][] {
  const found = lakes[res].features.filter((f) => names.includes(String(f.properties?.name)));
  if (!found.length) throw new Error(`No lake named ${names.join(" or ")}`);
  return found.flatMap((f) => polysOf(f.geometry));
}

function build(id: string, src: PlateSource): Plate {
  const res: Res = src.radius <= 2.5 ? "10m" : "50m";
  // About half a pixel at the magnifier's scale (98 px across the lens radius).
  tolerance = (0.5 * src.radius) / 98;
  const box = lensBox(src.center, src.radius);
  const merged = new Set(
    src.marks.flatMap((m) =>
      m.type === "area" && m.countries && m.countries.length > 1 ? m.countries : [],
    ),
  );

  const marks: Mark[] = src.marks.map((m) => {
    if (m.type === "city" || m.type === "label" || m.type === "spot") return m;
    if (m.type === "line") {
      let coords: Position[][] = [m.path];
      if (m.clipTo) {
        // Keep the stretches of the line that run through the named countries.
        const shape = countryShape(res, m.clipTo);
        const isIn = (p: Position) => shape.some((poly) => geoContainsPoly(poly, p));
        coords = splitBy(m.path, isIn);
      }
      const geometry: MultiLineString = {
        type: "MultiLineString",
        coordinates: coords.map((l) => l.map(round)),
      };
      return { type: "line", geometry, label: m.label };
    }
    let polys: Position[][][] = [];
    if (m.type === "area" && m.countries) polys = countryShape(res, m.countries);
    if (m.type === "water" && m.lakes) polys = lakeShape(res, m.lakes);
    if (m.outline) {
      const own: Position[][][] = [[[...m.outline, xy(m.outline[0])]]];
      polys = polys.length
        ? (polygonClipping.union(polys as Geom, own as Geom) as Position[][][])
        : own;
    }
    if (m.type === "area" && m.clipTo)
      polys = polygonClipping.intersection(
        polys as Geom,
        countryShape(res, m.clipTo) as Geom,
      ) as Position[][][];
    return { type: m.type, geometry: toMulti(polys), label: m.label };
  });

  const topo = atlas[res];
  const land = toMulti(
    clipPolys(polysOf(merge(topo, countriesOf(res).geometries as never) as MultiPolygon), box),
  );
  const borderLines = mesh(
    topo,
    countriesOf(res),
    (a, b) => a !== b && !(merged.has(String(a.id)) && merged.has(String(b.id))),
  );
  const borders: MultiLineString = {
    type: "MultiLineString",
    coordinates: clipLines(borderLines.coordinates, box).map((l) => simplify(l)),
  };
  // Reservoirs and the modern Aral Sea would date the base map, so they appear only as an event's own mark.
  const baseLakes = lakes[res].features.filter(
    (f) => f.properties?.featurecla !== "Reservoir" && !/Aral/.test(String(f.properties?.name)),
  );
  const lakePolys = clipPolys(
    baseLakes.flatMap((f) => polysOf(f.geometry)),
    box,
  );
  // Only the bigger rivers, fewer the wider the view. Centrelines through lakes stay in: the lake fill
  // covers them, and where a reservoir is left out they show the river as it ran before the dam.
  const riverRank = src.radius > 20 ? 2 : src.radius > 8 ? 4 : 7;
  const riverLines = rivers[res].features
    .filter((f) => Number(f.properties?.scalerank ?? 99) <= riverRank)
    .flatMap((f) =>
      f.geometry.type === "LineString" ? [f.geometry.coordinates] : f.geometry.coordinates,
    );
  const riverMesh: MultiLineString = {
    type: "MultiLineString",
    coordinates: clipLines(riverLines, box).map((l) => simplify(l)),
  };

  const maxRank = src.radius > 20 ? 2 : src.radius > 8 ? 4 : 7;
  const seaLabels: Label[] = [];
  for (const f of seas.features) {
    const rank = Number(f.properties?.scalerank ?? 9);
    if (rank > maxRank || !f.properties?.name) continue;
    const view = geoCircle()
      .center(src.center)
      .radius(src.radius * 0.8)().coordinates as Position[][];
    let part: Position[][][] = [];
    try {
      part = polygonClipping.intersection(
        polysOf(f.geometry) as Geom,
        [view.map((r) => r.slice().reverse())] as Geom,
      ) as Position[][][];
    } catch {
      continue;
    }
    if (!part.length) continue;
    const c = geoCentroid({ type: "MultiPolygon", coordinates: sphericalOrder(part) }) as LonLat;
    if ((geoDistance(c, src.center) * 180) / Math.PI > src.radius * 0.85) continue;
    seaLabels.push({
      text: String(f.properties.name),
      at: [Math.round(c[0] * 100) / 100, Math.round(c[1] * 100) / 100],
    });
  }

  const base: LensBase = {
    land,
    borders,
    lakes: toMulti(lakePolys),
    rivers: riverMesh,
    seas: seaLabels,
  };
  console.log(`${id}: ${res}, ${JSON.stringify({ base, marks }).length / 1000} kB`);
  return { center: src.center, radius: src.radius, marks, base };
}

// Point-in-polygon on lon/lat, good enough at plate scale.
function geoContainsPoly(poly: Position[][], p: Position) {
  let inside = false;
  for (const ring of poly) {
    const [x, y] = xy(p);
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = pt(ring, i);
      const [xj, yj] = pt(ring, j);
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
  }
  return inside;
}
function splitBy(path: LonLat[], keep: (p: Position) => boolean): Position[][] {
  // Densify first so a long straight segment can be cut where it crosses a coast.
  const dense: Position[] = [];
  path.forEach((p, i) => {
    if (i === 0) {
      dense.push(p);
      return;
    }
    const [qx, qy] = xy(path[i - 1]);
    const steps = Math.max(1, Math.ceil(Math.hypot(p[0] - qx, p[1] - qy) / 0.02));
    for (let k = 1; k <= steps; k++)
      dense.push([qx + ((p[0] - qx) * k) / steps, qy + ((p[1] - qy) * k) / steps]);
  });
  const out: Position[][] = [];
  let run: Position[] = [];
  for (const p of dense) {
    if (keep(p)) run.push(p);
    else if (run.length) {
      if (run.length > 1) out.push(run);
      run = [];
    }
  }
  if (run.length > 1) out.push(run);
  return out;
}

const sources = read<Record<string, PlateSource>>(
  new URL("data/plate-sources.json", root).pathname,
);
const only = process.argv.slice(2);
const outDir = new URL("public/plates/", root).pathname;
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
// The game reads this list to know which events have a drawn plate; the rest get a ring on the place.
writeFileSync(
  new URL("src/plates/built.json", root).pathname,
  `${JSON.stringify(Object.keys(sources).sort())}\n`,
);
for (const [id, src] of Object.entries(sources)) {
  if (only.length && !only.includes(id)) continue;
  writeFileSync(`${outDir}${id}.json`, JSON.stringify(build(id, src)));
}
