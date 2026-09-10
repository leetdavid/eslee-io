import { type ZoomTransform, zoomIdentity } from "d3-zoom";

export type MapDimensions = {
  canvas: { width: number; height: number };
  viewport: { width: number; height: number };
};

export function fitMapTransform({ canvas, viewport }: MapDimensions) {
  return zoomIdentity.translate(
    (viewport.width - canvas.width) / 2,
    (viewport.height - canvas.height) / 2,
  );
}

export function constrainMapTransform(
  transform: ZoomTransform,
  { canvas, viewport }: MapDimensions,
) {
  const width = canvas.width * transform.k;
  const height = canvas.height * transform.k;
  const visibleX = Math.min(48, width / 2, viewport.width / 2);
  const visibleY = Math.min(48, height / 2, viewport.height / 2);

  // Leave room to zoom around a finger or cursor, but keep some map within reach.
  return zoomIdentity
    .translate(
      Math.max(visibleX - width, Math.min(viewport.width - visibleX, transform.x)),
      Math.max(visibleY - height, Math.min(viewport.height - visibleY, transform.y)),
    )
    .scale(transform.k);
}

export function resizeMapTransform(
  transform: ZoomTransform,
  previous: MapDimensions,
  next: MapDimensions,
) {
  const center = transform.invert([previous.viewport.width / 2, previous.viewport.height / 2]);

  return constrainMapTransform(
    zoomIdentity
      .translate(
        next.viewport.width / 2 -
          (center[0] / previous.canvas.width) * next.canvas.width * transform.k,
        next.viewport.height / 2 -
          (center[1] / previous.canvas.height) * next.canvas.height * transform.k,
      )
      .scale(transform.k),
    next,
  );
}
