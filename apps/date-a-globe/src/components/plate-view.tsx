"use client";

import { useEffect, useState } from "react";
import type { GameEvent } from "@/lib/events";
import { globeLand, plateFor } from "@/plates/load";
import { renderPlate } from "@/plates/render";

/** The question's plate: a locator globe, a zoom cone and the magnifier, drawn in the browser. */
export function PlateView({ event, label }: { event: GameEvent; label?: string }) {
  const [svg, setSvg] = useState<{ id: string; markup: string } | null>(null);

  useEffect(() => {
    let live = true;
    Promise.all([plateFor(event), globeLand()])
      .then(([plate, land]) => {
        if (live)
          setSvg({ id: event.id, markup: renderPlate(plate, land, { idPrefix: `p-${event.id}` }) });
      })
      .catch(() => {
        if (live) setSvg(null);
      });
    return () => {
      live = false;
    };
  }, [event]);

  const ready = svg?.id === event.id;
  return (
    <figure
      className={ready ? "plate" : "plate loading"}
      role="img"
      aria-label={label ?? `A globe turned to ${event.title}, with a magnifier on the place`}
      // The markup comes from our renderer, which escapes every label.
      // biome-ignore lint/security/noDangerouslySetInnerHtml: generated SVG, no user markup
      dangerouslySetInnerHTML={ready ? { __html: svg.markup } : undefined}
    />
  );
}
