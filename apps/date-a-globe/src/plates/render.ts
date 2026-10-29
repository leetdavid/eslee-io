import { type GeoPermissibleObjects, geoGraticule, geoOrthographic, geoPath } from "d3-geo";
import type { MultiPolygon } from "geojson";
import type { Label, LonLat, Plate } from "./types";

// A plate is 366 × 250: a locator globe on the left, a zoom cone, and a magnifier on the right.
export const PLATE_WIDTH = 366;
export const PLATE_HEIGHT = 250;
const GLOBE = { cx: 86, cy: 142, r: 76 };
const LENS = { cx: 262, cy: 118, r: 98 };
// The locator globe turns so the place sits up and to the right, towards the magnifier.
const GLOBE_OFFSET: LonLat = [28, 6];

const INK = "#161513";
const RED = "#D7382F";
const RED_INK = "#8E1F14";
const SEA = "#D3E2E7";
const LAND = "#F3F0E8";
const TINT = "#FBE3DF";
const WATER = "#A9C8D6";
const RIVER = "#8DB3C4";
const SEA_TEXT = "#3E6474";
const FONT = "Geologica, system-ui, sans-serif";

const f1 = (v: number) => (Math.round(v * 10) / 10).toString();
const escapeText = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const halo = (color = LAND) =>
  `paint-order="stroke" stroke="${color}" stroke-width="3" stroke-linejoin="round"`;

function graticuleStep(radius: number) {
  if (radius > 20) return 15;
  if (radius > 8) return 5;
  if (radius > 3) return 2;
  return 1;
}

/** Draws an event's plate as an SVG string. `globeLand` is the coarse world land for the locator globe. */
export function renderPlate(
  plate: Plate,
  globeLand: MultiPolygon,
  opts: { idPrefix?: string } = {},
): string {
  const id = opts.idPrefix ?? "p";
  const [lon, lat] = plate.center;

  const globe = geoOrthographic()
    .scale(GLOBE.r)
    .translate([GLOBE.cx, GLOBE.cy])
    .rotate([-(lon - GLOBE_OFFSET[0]), -(lat - GLOBE_OFFSET[1])])
    .clipAngle(90)
    .precision(0.5);
  const globePath = geoPath(globe);
  const target = globe(plate.center) ?? [GLOBE.cx, GLOBE.cy];

  const lens = geoOrthographic()
    .scale(LENS.r / Math.sin((plate.radius * Math.PI) / 180))
    .translate([LENS.cx, LENS.cy])
    .rotate([-lon, -lat])
    .clipAngle(Math.min(90, plate.radius * 1.6))
    .clipExtent([
      [LENS.cx - LENS.r - 20, LENS.cy - LENS.r - 20],
      [LENS.cx + LENS.r + 20, LENS.cy + LENS.r + 20],
    ])
    .precision(0.2);
  const lensPath = geoPath(lens);
  const d = (g: GeoPermissibleObjects) => lensPath(g) ?? "";
  const at = (p: LonLat) => lens(p) ?? [LENS.cx, LENS.cy];

  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${PLATE_WIDTH} ${PLATE_HEIGHT}" width="${PLATE_WIDTH}" height="${PLATE_HEIGHT}" font-family="${FONT}">`;

  // Locator globe: coastlines only, so it never gives away a border.
  s += `<clipPath id="${id}-g"><circle cx="${GLOBE.cx}" cy="${GLOBE.cy}" r="${GLOBE.r}"/></clipPath>`;
  s += `<g clip-path="url(#${id}-g)"><rect width="${PLATE_WIDTH}" height="${PLATE_HEIGHT}" fill="${SEA}"/>`;
  s += `<path d="${globePath(geoGraticule().step([15, 15])()) ?? ""}" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width=".6"/>`;
  s += `<path d="${globePath(globeLand) ?? ""}" fill="${LAND}" stroke="${INK}" stroke-opacity=".55" stroke-width=".7"/></g>`;
  s += `<circle cx="${GLOBE.cx}" cy="${GLOBE.cy}" r="${GLOBE.r}" fill="none" stroke="${INK}" stroke-width="1.2"/>`;

  // Zoom cone from a ring on the globe to the magnifier: the two outer tangents of the ring and the lens.
  const [tx, ty] = target;
  const dist = Math.hypot(LENS.cx - tx, LENS.cy - ty);
  const [ux, uy] = [(LENS.cx - tx) / dist, (LENS.cy - ty) / dist];
  const c = (10 - LENS.r) / dist;
  const sn = Math.sqrt(Math.max(0, 1 - c * c));
  const tangent = (k: 1 | -1) => {
    const [vx, vy] = [c * ux - k * sn * uy, c * uy + k * sn * ux];
    return {
      ring: `${f1(tx + 10 * vx)} ${f1(ty + 10 * vy)}`,
      lens: `${f1(LENS.cx + LENS.r * vx)} ${f1(LENS.cy + LENS.r * vy)}`,
    };
  };
  const [ta, tb] = [tangent(1), tangent(-1)];
  s += `<path d="M${ta.ring}L${ta.lens}L${tb.lens}L${tb.ring}Z" fill="${RED}" fill-opacity=".1"/>`;
  s += `<path d="M${ta.ring}L${ta.lens}M${tb.ring}L${tb.lens}" stroke="${INK}" stroke-opacity=".6" stroke-width=".9"/>`;
  s += `<circle cx="${f1(tx)}" cy="${f1(ty)}" r="10" fill="none" stroke="${RED}" stroke-width="2"/>`;

  // Magnifier.
  const step = graticuleStep(plate.radius);
  s += `<clipPath id="${id}-l"><circle cx="${LENS.cx}" cy="${LENS.cy}" r="${LENS.r}"/></clipPath><g clip-path="url(#${id}-l)">`;
  s += `<rect width="${PLATE_WIDTH}" height="${PLATE_HEIGHT}" fill="${SEA}"/>`;
  s += `<path d="${d(geoGraticule().step([step, step])())}" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width=".7"/>`;
  s += `<path d="${d(plate.base.land)}" fill="${LAND}"/>`;
  s += `<path d="${d(plate.base.rivers)}" fill="none" stroke="${RIVER}" stroke-width=".9" stroke-linejoin="round"/>`;
  s += `<path d="${d(plate.base.lakes)}" fill="${SEA}"/>`;
  for (const m of plate.marks) {
    if (m.type === "area") s += `<path d="${d(m.geometry)}" fill="${TINT}"/>`;
    if (m.type === "water") s += `<path d="${d(m.geometry)}" fill="${WATER}"/>`;
  }
  s += `<path d="${d(plate.base.borders)}" fill="none" stroke="${INK}" stroke-opacity=".45" stroke-width=".9"/>`;
  s += `<path d="${d(plate.base.land)}" fill="none" stroke="${INK}" stroke-width="1"/>`;
  s += `<path d="${d(plate.base.lakes)}" fill="none" stroke="${INK}" stroke-opacity=".6" stroke-width=".8"/>`;
  for (const m of plate.marks) {
    if (m.type === "area")
      s += `<path d="${d(m.geometry)}" fill="none" stroke="${RED}" stroke-width="2.4" stroke-dasharray="5 3"/>`;
    // Lake shores are too wiggly for dashes, so they get a thin solid line.
    if (m.type === "water")
      s += `<path d="${d(m.geometry)}" fill="none" stroke="${RED}" stroke-width="1.4" stroke-linejoin="round"/>`;
    if (m.type === "line")
      s += `<path d="${d(m.geometry)}" fill="none" stroke="${RED}" stroke-width="3" stroke-dasharray="6 3" stroke-linecap="round"/>`;
  }

  // Labels: the event's own names first, then seas where there is room.
  const placed: { x: number; y: number; w: number }[] = [];
  const room = (x: number, y: number, w: number) =>
    Math.hypot(Math.abs(x - LENS.cx) + w / 2, Math.abs(y - LENS.cy) + 6) < LENS.r - 6 &&
    placed.every((p) => Math.abs(p.x - x) > (p.w + w) / 2 + 4 || Math.abs(p.y - y) > 14);
  const featureLabel = (l: Label) => {
    let [x, y] = at(l.at);
    const w = l.text.length * 8.2;
    // Nudge a name towards the middle until it fits inside the magnifier.
    for (
      let i = 0;
      i < 40 && Math.hypot(Math.abs(x - LENS.cx) + w / 2, Math.abs(y - LENS.cy) + 6) > LENS.r - 4;
      i++
    ) {
      x += (LENS.cx - x) * 0.1;
      y += (LENS.cy - y) * 0.1;
    }
    placed.push({ x, y, w });
    return `<text x="${f1(x)}" y="${f1(y + 4)}" text-anchor="middle" font-size="11" font-weight="700" letter-spacing="1.6" fill="${RED_INK}" ${halo()}>${escapeText(l.text)}</text>`;
  };
  for (const m of plate.marks) {
    if (m.type === "city") {
      const [x, y] = at(m.at);
      const left = m.side === "left";
      placed.push({ x: left ? x - 30 : x + 30, y, w: m.name.length * 7.5 + 12 });
      s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="4.5" fill="${INK}" stroke="#fff" stroke-width="1.6"/>`;
      s += `<text x="${f1(left ? x - 9 : x + 9)}" y="${f1(y + 4.5)}" text-anchor="${left ? "end" : "start"}" font-size="12.5" font-weight="700" fill="${INK}" ${halo()}>${escapeText(m.name)}</text>`;
    } else if (m.label) s += featureLabel(m.label);
  }
  for (const sea of plate.base.seas) {
    const [x, y] = at(sea.at);
    const w = sea.text.length * 5.6;
    if (!room(x, y, w)) continue;
    placed.push({ x, y, w });
    s += `<text x="${f1(x)}" y="${f1(y + 3)}" text-anchor="middle" font-size="9.5" font-style="italic" letter-spacing=".3" fill="${SEA_TEXT}" ${halo(SEA)}>${escapeText(sea.text)}</text>`;
  }
  s += `</g><circle cx="${LENS.cx}" cy="${LENS.cy}" r="${LENS.r + 2}" fill="none" stroke="${INK}" stroke-width="3"/>`;
  return `${s}</svg>`;
}
