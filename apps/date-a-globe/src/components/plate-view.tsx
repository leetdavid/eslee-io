"use client";

import { useEffect, useState } from "react";
import type { GameEvent } from "@/lib/events";
import { approvedPlate, globeLand } from "@/plates/load";
import { renderLocator, renderPlate } from "@/plates/render";

/**
 * The question's plate, drawn in the browser: a locator globe, a zoom cone and the magnifier once the owner has
 * approved it, and the locator globe alone until then.
 */
export function PlateView({ event, label }: { event: GameEvent; label?: string }) {
  const [svg, setSvg] = useState<{ id: string; markup: string; lens: boolean } | null>(null);

  useEffect(() => {
    let live = true;
    Promise.all([approvedPlate(event.id), globeLand()])
      .then(([plate, land]) => {
        if (!live) return;
        const idPrefix = `p-${event.id}`;
        setSvg({
          id: event.id,
          markup: plate
            ? renderPlate(plate, land, { idPrefix })
            : renderLocator([event.lon, event.lat], land, { idPrefix }),
          lens: !!plate,
        });
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
      aria-label={
        label ??
        (ready && !svg.lens
          ? `A globe turned to ${event.title}, with a ring on the place`
          : `A globe turned to ${event.title}, with a magnifier on the place`)
      }
      // The markup comes from our renderer, which escapes every label.
      // biome-ignore lint/security/noDangerouslySetInnerHtml: generated SVG, no user markup
      dangerouslySetInnerHTML={ready ? { __html: svg.markup } : undefined}
    />
  );
}
