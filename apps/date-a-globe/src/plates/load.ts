import type { MultiLineString, MultiPolygon } from "geojson";
import { feature, mesh } from "topojson-client";
import type { Topology } from "topojson-specification";
import type { GameEvent } from "@/lib/events";
import built from "./built.json";
import type { LensBase, Plate } from "./types";

const BUILT = new Set<string>(built);

/** How far the magnifier looks, in degrees, for an event without a drawn plate. */
export function lensRadius(event: Pick<GameEvent, "kind" | "size">) {
  if (event.kind === "city" || event.kind === "rename") return 2.5;
  return { easy: 9, medium: 5, hard: 2.5 }[event.size];
}

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

let fallback: Promise<LensBase> | null = null;
/** Today's land and borders at 1:50m, loaded once, for plates that haven't been built yet. */
function fallbackBase() {
  fallback ??= Promise.all([
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
  return fallback;
}

/** The event's drawn plate if it has one, otherwise today's map around the place with a ring on it. */
export async function plateFor(event: GameEvent): Promise<Plate> {
  if (BUILT.has(event.id)) {
    const res = await fetch(`/plates/${event.id}.json`);
    if (res.ok) return (await res.json()) as Plate;
  }
  return {
    center: [event.lon, event.lat],
    radius: lensRadius(event),
    marks: [{ type: "spot", at: [event.lon, event.lat] }],
    base: await fallbackBase(),
  };
}
