import type { MultiLineString, MultiPolygon } from "geojson";
import { feature, mesh } from "topojson-client";
import type { Topology } from "topojson-specification";
import built from "./built.json";
import type { LensBase, Plate } from "./types";

const BUILT = new Set<string>(built);

const firstGeometry = <T>(topology: Topology, name: string) =>
  (feature(topology, topology.objects[name] as never) as unknown as { features: { geometry: T }[] })
    .features[0]?.geometry as T;

let globe: Promise<MultiPolygon> | null = null;
/** Coarse world land for the locator globe. */
export function globeLand() {
  globe ??= import("world-atlas/land-110m.json").then((m) =>
    firstGeometry<MultiPolygon>(m.default as unknown as Topology, "land"),
  );
  return globe;
}

let today: Promise<LensBase> | null = null;
/** Today's land and borders at 1:50m, loaded once, for dragging a pin onto a place when sending in an event. */
export function todaysMap() {
  today ??= Promise.all([
    import("world-atlas/land-50m.json"),
    import("world-atlas/countries-50m.json"),
  ]).then(([land, countries]) => {
    const c = countries.default as unknown as Topology;
    return {
      land: firstGeometry<MultiPolygon>(land.default as unknown as Topology, "land"),
      borders: mesh(c, c.objects.countries as never, (a, b) => a !== b) as MultiLineString,
      lakes: { type: "MultiPolygon", coordinates: [] },
      rivers: { type: "MultiLineString", coordinates: [] },
      seas: [],
    };
  });
  return today;
}

/** The event's plate once the owner has approved it on Doop; until then the game shows the locator globe alone. */
export async function approvedPlate(eventId: string): Promise<Plate | null> {
  if (!BUILT.has(eventId)) return null;
  const res = await fetch(`/plates/${eventId}.json`);
  return res.ok ? ((await res.json()) as Plate) : null;
}
