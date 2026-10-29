// Renders built plates to standalone SVG files, for reviewing them outside the app.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import type { MultiPolygon } from "geojson";
import { feature } from "topojson-client";
import type { Topology } from "topojson-specification";
import { renderPlate } from "../src/plates/render";
import type { Plate } from "../src/plates/types";

const require = createRequire(import.meta.url);
const land110 = require("world-atlas/land-110m.json") as Topology;
const land = feature(land110, land110.objects.land as never) as unknown as {
  features: { geometry: MultiPolygon }[];
};
const globeLand = land.features[0]?.geometry;
if (!globeLand) throw new Error("world-atlas land-110m has no land");

const dir = new URL("../public/plates/", import.meta.url).pathname;
const out = process.argv[2] ?? "/tmp/dag-plates";
mkdirSync(out, { recursive: true });
for (const file of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
  const plate = JSON.parse(readFileSync(dir + file, "utf8")) as Plate;
  writeFileSync(
    `${out}/${file.replace(".json", ".svg")}`,
    renderPlate(plate, globeLand, { idPrefix: file.replace(".json", "") }),
  );
}
console.log(`rendered to ${out}`);
