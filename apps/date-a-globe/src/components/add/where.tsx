"use client";

import { useEffect, useRef, useState } from "react";
import type { GameEvent } from "@/lib/events";
import { globeLand, plateFor } from "@/plates/load";
import { PLATE_WIDTH, renderPlate } from "@/plates/render";

const LENS_R = 98;

/** A plate the sender drags to put the place under the ring. Reports the centre when a drag ends. */
export function PinMap({
  lat,
  lon,
  radius,
  onMove,
}: {
  lat: number;
  lon: number;
  radius: number;
  onMove: (lat: number, lon: number) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ lat, lon });
  const [svg, setSvg] = useState("");
  const drag = useRef<{ x: number; y: number; lat: number; lon: number } | null>(null);

  useEffect(() => setView({ lat, lon }), [lat, lon]);

  useEffect(() => {
    let live = true;
    const frame = requestAnimationFrame(() => {
      const event = {
        id: "pin",
        kind: "country",
        size: "medium",
        lat: view.lat,
        lon: view.lon,
      } as GameEvent;
      Promise.all([plateFor(event), globeLand()]).then(([plate, land]) => {
        if (live) setSvg(renderPlate({ ...plate, radius }, land, { idPrefix: "pin" }));
      });
    });
    return () => {
      live = false;
      cancelAnimationFrame(frame);
    };
  }, [view, radius]);

  // Pixels per degree at the lens centre, in the plate's own units, scaled to the element's width.
  const degreesPer = (px: number) => {
    const scale = (box.current?.clientWidth ?? PLATE_WIDTH) / PLATE_WIDTH;
    const perDegree = ((LENS_R / Math.sin((radius * Math.PI) / 180)) * Math.PI) / 180;
    return px / (perDegree * scale);
  };

  return (
    <div
      ref={box}
      className="plate touch-none select-none"
      style={{ cursor: "grab" }}
      role="application"
      aria-label="Drag the map so the ring sits on the place"
      onPointerDown={(e) => {
        (e.target as Element).setPointerCapture?.(e.pointerId);
        drag.current = { x: e.clientX, y: e.clientY, ...view };
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d) return;
        const nextLat = Math.max(-80, Math.min(80, d.lat + degreesPer(e.clientY - d.y)));
        const cos = Math.max(0.2, Math.cos((nextLat * Math.PI) / 180));
        let nextLon = d.lon - degreesPer(e.clientX - d.x) / cos;
        if (nextLon > 180) nextLon -= 360;
        if (nextLon < -180) nextLon += 360;
        setView({ lat: nextLat, lon: nextLon });
      }}
      onPointerUp={() => {
        if (!drag.current) return;
        drag.current = null;
        onMove(Math.round(view.lat * 100) / 100, Math.round(view.lon * 100) / 100);
      }}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: generated SVG, no user markup
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
