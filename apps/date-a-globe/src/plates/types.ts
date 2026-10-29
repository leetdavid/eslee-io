import type { LineString, MultiLineString, MultiPolygon, Polygon } from "geojson";

export type LonLat = [lon: number, lat: number];

export interface Label {
  text: string;
  at: LonLat;
}

/** How an event's plate is authored: where to look, how far in, and what to mark. */
export interface PlateSource {
  center: LonLat;
  /** Lens radius in degrees of arc. */
  radius: number;
  marks: SourceMark[];
}

export type SourceMark =
  | {
      type: "area";
      /** Natural Earth country ids (ISO 3166 numeric) merged into one shape. */
      countries?: string[];
      /** Our own outline for a border that no longer exists. */
      outline?: LonLat[];
      /** Keep only the part of the outline that lies inside these countries. */
      clipTo?: string[];
      label?: Label;
    }
  | { type: "water"; lakes?: string[]; outline?: LonLat[]; label?: Label }
  | { type: "line"; path: LonLat[]; clipTo?: string[]; label?: Label }
  | { type: "city"; at: LonLat; name: string; side?: "left" | "right" }
  | { type: "label"; label: Label };

/** A mark with its geometry resolved, ready to draw. */
export type Mark =
  | { type: "area"; geometry: Polygon | MultiPolygon; label?: Label }
  | { type: "water"; geometry: Polygon | MultiPolygon; label?: Label }
  | { type: "line"; geometry: LineString | MultiLineString; label?: Label }
  | { type: "city"; at: LonLat; name: string; side?: "left" | "right" }
  | { type: "label"; label: Label };

/** The Natural Earth base map around one lens. */
export interface LensBase {
  land: MultiPolygon;
  borders: MultiLineString;
  lakes: MultiPolygon;
  rivers: MultiLineString;
  seas: Label[];
}

/** Everything one plate needs, stored per event. */
export interface Plate {
  center: LonLat;
  radius: number;
  marks: Mark[];
  base: LensBase;
}
