import { type GeoPermissibleObjects, geoGraticule, geoOrthographic, geoPath } from "d3-geo";
import { merge, mesh, neighbors } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import world from "world-atlas/countries-110m.json";
import type { Month } from "../engine/months";
import {
  borderKey,
  borderMerged,
  borderStood,
  oldLineAt,
  oldLineStood,
  oldLines,
  type Stretch,
} from "../plates/borders";
import { GLOBES } from "./globes";

const topology = world as unknown as Topology;
const countries = topology.objects.countries as GeometryCollection<{ name: string }>;
const geometries = countries.geometries;
const adjacent = neighbors(geometries as never);

// The Cold War classroom globe's pastel inks, and the web map's flat land with mauve borders.
const MID = {
  sea: "#B7D8E8",
  shelf: "#D3EAF3",
  halo: "#C6E1EC",
  ink: "#1D1D1B",
  fills: ["#F4B9C4", "#F6DC7A", "#B5DBA4", "#CDBDE3", "#F6C79C"],
};
const WEB = { sea: "#AAD3DF", land: "#F2EFE9", border: "#A98BAE", glow: "#E6DCE8" };

/**
 * The countries a globe printed across `range` would show. Today's countries are joined where the two sides
 * were one state (the Soviet republics, Yugoslavia); a border that stood through the whole range is drawn,
 * and one that ran somewhere else then is drawn dashed, as approximate.
 */
export function unitsFor(range: Stretch, now: Month) {
  const parent = geometries.map((_, i) => i);
  const find = (i: number): number => {
    while (parent[i] !== i) i = parent[i] = parent[parent[i] ?? i] ?? i;
    return i;
  };
  const looks = new Map<string, "solid" | "dashed" | "none">();
  const look = (a: number, b: number) => {
    const ga = geometries[a];
    const gb = geometries[b];
    if (!ga || !gb) return "none";
    const key = borderKey(ga, gb);
    if (!looks.has(key))
      looks.set(
        key,
        borderStood(key, [range], now)
          ? "solid"
          : borderMerged(key, range, now)
            ? "none"
            : "dashed",
      );
    return looks.get(key) ?? "none";
  };
  adjacent.forEach((list, a) => {
    for (const b of list) if (a < b && look(a, b) === "none") parent[find(a)] = find(b);
  });
  const unit = geometries.map((_, i) => find(i));
  return { unit, look };
}

/** Five colour slots, so that no two neighbouring units share one. Bigger neighbourhoods are coloured first. */
function colour(unit: number[]) {
  const touching = new Map<number, Set<number>>();
  adjacent.forEach((list, a) => {
    for (const b of list) {
      const [ua, ub] = [unit[a] ?? a, unit[b] ?? b];
      if (ua === ub) continue;
      touching.set(ua, (touching.get(ua) ?? new Set()).add(ub));
      touching.set(ub, (touching.get(ub) ?? new Set()).add(ua));
    }
  });
  const slot = new Map<number, number>();
  const units = [...new Set(unit)].sort(
    (a, b) => (touching.get(b)?.size ?? 0) - (touching.get(a)?.size ?? 0) || a - b,
  );
  for (const u of units) {
    const used = new Set([...(touching.get(u) ?? [])].map((v) => slot.get(v)));
    slot.set(u, [0, 1, 2, 3, 4].find((k) => !used.has(k)) ?? u % 5);
  }
  return slot;
}

const r1 = (d: string | null | undefined) => (d ?? "").replace(/(\d+\.\d)\d+/g, "$1");

/**
 * The Cold War classroom or web map globe for a result: the countries and borders a globe printed across
 * the result's range would show, drawn in the era's look. Pins use the same projection (GLOBES).
 */
export function politicalGlobe(era: "mid" | "web", range: Stretch, now: Month): string {
  const g = GLOBES[era];
  const c = g.size / 2;
  const path = geoPath(
    geoOrthographic().scale(g.r).translate([c, c]).rotate(g.rotate).clipAngle(90).precision(0.4),
  );
  const d = (o: GeoPermissibleObjects) => r1(path(o));
  const { unit, look } = unitsFor(range, now);
  const land = d(merge(topology, geometries as never));
  const lines = (want: "solid" | "dashed") =>
    mesh(topology, countries as never, (a, b) => {
      if (a === b) return false;
      const ia = geometries.indexOf(a as never);
      const ib = geometries.indexOf(b as never);
      return look(Math.min(ia, ib), Math.max(ia, ib)) === want;
    });
  // Lines today's map no longer has: solid if they stood through the range, dashed if only partly.
  const old = (whole: boolean) =>
    oldLines
      .filter((l) =>
        whole
          ? oldLineStood(l, [range], now)
          : !oldLineStood(l, [range], now) && oldLineAt(l, range, now),
      )
      .map((l) => l.path);
  const solid = lines("solid");
  const dashed = lines("dashed");
  const borders = d({ ...solid, coordinates: [...solid.coordinates, ...old(true)] });
  const approximate = d({ ...dashed, coordinates: [...dashed.coordinates, ...old(false)] });

  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${g.size} ${g.size}" width="${g.size}" height="${g.size}">`;
  s += `<clipPath id="${era}-c"><circle cx="${c}" cy="${c}" r="${g.r}"/></clipPath><g clip-path="url(#${era}-c)">`;
  if (era === "mid") {
    const slot = colour(unit);
    s += `<rect width="${g.size}" height="${g.size}" fill="${MID.sea}"/>`;
    s += `<path d="${land}" fill="none" stroke="${MID.halo}" stroke-width="${(g.r * 0.07).toFixed(1)}"/>`;
    s += `<path d="${land}" fill="none" stroke="${MID.shelf}" stroke-width="${(g.r * 0.035).toFixed(1)}"/>`;
    s += `<path d="${d(geoGraticule().step([15, 15])())}" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width=".6"/>`;
    for (const u of new Set(unit)) {
      const members = geometries.filter((_, i) => unit[i] === u);
      const shape = d(merge(topology, members as never));
      if (shape) s += `<path d="${shape}" fill="${MID.fills[slot.get(u) ?? 0]}"/>`;
    }
    s += `<path d="${borders}" fill="none" stroke="${MID.ink}" stroke-opacity=".7" stroke-width=".6"/>`;
    s += `<path d="${approximate}" fill="none" stroke="${MID.ink}" stroke-opacity=".7" stroke-width=".6" stroke-dasharray="1.6 1.4"/>`;
    s += `<path d="${land}" fill="none" stroke="${MID.ink}" stroke-opacity=".85" stroke-width=".8"/></g>`;
    s += `<radialGradient id="${era}-s" cx="36%" cy="30%" r="80%"><stop offset="0" stop-color="#fff" stop-opacity=".28"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="${MID.ink}" stop-opacity=".22"/></radialGradient>`;
    s += `<circle cx="${c}" cy="${c}" r="${g.r}" fill="url(#${era}-s)"/>`;
    s += `<circle cx="${c}" cy="${c}" r="${g.r}" fill="none" stroke="${MID.ink}" stroke-width="1.2"/>`;
  } else {
    s += `<rect width="${g.size}" height="${g.size}" fill="${WEB.sea}"/><path d="${land}" fill="${WEB.land}"/>`;
    s += `<path d="${borders}" fill="none" stroke="${WEB.glow}" stroke-width="3"/><path d="${borders}" fill="none" stroke="${WEB.border}" stroke-width="1"/>`;
    s += `<path d="${approximate}" fill="none" stroke="${WEB.border}" stroke-width="1" stroke-dasharray="2.5 2"/></g>`;
    s += `<radialGradient id="${era}-s" cx="40%" cy="35%" r="75%"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".16"/></radialGradient>`;
    s += `<circle cx="${c}" cy="${c}" r="${g.r}" fill="url(#${era}-s)"/>`;
  }
  return `${s}</svg>`;
}
