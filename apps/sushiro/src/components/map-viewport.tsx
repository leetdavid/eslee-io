"use client";

import { select } from "d3-selection";
import "d3-transition";
import { type D3ZoomEvent, type ZoomBehavior, zoom, zoomTransform } from "d3-zoom";
import {
  type KeyboardEvent,
  type ReactNode,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  constrainMapTransform,
  fitMapTransform,
  type MapDimensions,
  resizeMapTransform,
} from "@/lib/map-viewport";
import { copy, type Language } from "@/lib/queue-presentation";

const minZoom = 1;
const maxZoom = 8;
const zoomFactor = 1.5;

type MapViewportProps = {
  children: ReactNode;
  language: Language;
};

function dimensions(viewport: HTMLDivElement, canvas: HTMLDivElement): MapDimensions {
  return {
    canvas: { width: canvas.clientWidth, height: canvas.clientHeight },
    viewport: { width: viewport.clientWidth, height: viewport.clientHeight },
  };
}

export function MapViewport({ children, language }: MapViewportProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<ZoomBehavior<HTMLDivElement, unknown> | null>(null);
  const [scale, setScale] = useState(minZoom);
  const instructionsId = useId();
  const text = copy[language];

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const canvas = canvasRef.current;
    if (!viewport || !canvas) return;

    let size = dimensions(viewport, canvas);
    const selection = select<HTMLDivElement, unknown>(viewport);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const behavior = zoom<HTMLDivElement, unknown>()
      .scaleExtent([minZoom, maxZoom])
      .constrain((transform) => constrainMapTransform(transform, size))
      .touchable(() => true)
      .clickDistance(6)
      .filter((event: MouseEvent | TouchEvent | WheelEvent) => {
        if (event.target instanceof Element && event.target.closest(".map-zoom-controls")) {
          return false;
        }
        return (!event.ctrlKey || event.type === "wheel") && !("button" in event && event.button);
      })
      .on("start", (event: D3ZoomEvent<HTMLDivElement, unknown>) => {
        viewport.dataset.dragging = String(
          event.sourceEvent?.type === "mousedown" || event.sourceEvent?.type === "touchstart",
        );
      })
      .on("zoom", ({ transform }: D3ZoomEvent<HTMLDivElement, unknown>) => {
        canvas.style.transform = `translate(${transform.x}px, ${transform.y}px) scale(${transform.k})`;
        canvas.style.setProperty("--map-zoom", String(transform.k));
        setScale(transform.k);
      })
      .on("end", () => {
        viewport.dataset.dragging = "false";
      });

    function updateMotion() {
      behavior.duration(reducedMotion.matches ? 0 : 180);
    }

    updateMotion();
    reducedMotion.addEventListener("change", updateMotion);
    zoomRef.current = behavior;
    selection.call(behavior).call(behavior.transform, fitMapTransform(size));
    selection.on("wheel.map", (event: WheelEvent) => event.preventDefault(), { passive: false });

    const observer = new ResizeObserver(() => {
      const next = dimensions(viewport, canvas);
      const transform = resizeMapTransform(zoomTransform(viewport), size, next);
      size = next;
      selection.interrupt().call(behavior.transform, transform);
    });
    observer.observe(viewport);
    observer.observe(canvas);

    return () => {
      observer.disconnect();
      reducedMotion.removeEventListener("change", updateMotion);
      selection.interrupt().on(".zoom", null).on(".map", null);
      zoomRef.current = null;
    };
  }, []);

  function changeZoom(factor: number) {
    const viewport = viewportRef.current;
    const behavior = zoomRef.current;
    if (!viewport || !behavior) return;

    const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 180;
    select(viewport).interrupt().transition().duration(duration).call(behavior.scaleBy, factor);
  }

  function fitMap() {
    const viewport = viewportRef.current;
    const canvas = canvasRef.current;
    const behavior = zoomRef.current;
    if (!viewport || !canvas || !behavior) return;

    const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 180;
    select(viewport)
      .interrupt()
      .transition()
      .duration(duration)
      .call(behavior.transform, fitMapTransform(dimensions(viewport, canvas)));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget || event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }
    const viewport = viewportRef.current;
    const behavior = zoomRef.current;
    if (!viewport || !behavior) return;

    switch (event.key) {
      case "+":
      case "=":
        changeZoom(zoomFactor);
        break;
      case "-":
        changeZoom(1 / zoomFactor);
        break;
      case "Home":
      case "0":
        fitMap();
        break;
      case "ArrowLeft":
      case "ArrowRight":
      case "ArrowUp":
      case "ArrowDown": {
        const step = 60 / zoomTransform(viewport).k;
        const x = event.key === "ArrowLeft" ? step : event.key === "ArrowRight" ? -step : 0;
        const y = event.key === "ArrowUp" ? step : event.key === "ArrowDown" ? -step : 0;
        select(viewport).interrupt().call(behavior.translateBy, x, y);
        break;
      }
      default:
        return;
    }
    event.preventDefault();
  }

  return (
    <div
      aria-describedby={instructionsId}
      aria-label={text.mapLabel}
      className="map-stage"
      onKeyDown={handleKeyDown}
      ref={viewportRef}
      role="application"
      // biome-ignore lint/a11y/noNoninteractiveTabindex: The map supports keyboard panning, zooming, and reset.
      tabIndex={0}
    >
      <p hidden id={instructionsId}>
        {text.mapInstructions}
      </p>
      <div className="map-canvas" ref={canvasRef}>
        {children}
      </div>
      <fieldset aria-label={text.mapLabel} className="map-zoom-controls">
        <button
          aria-label={text.zoomIn}
          disabled={scale >= maxZoom}
          onClick={() => changeZoom(zoomFactor)}
          type="button"
        >
          +
        </button>
        <button
          aria-label={text.zoomOut}
          disabled={scale <= minZoom}
          onClick={() => changeZoom(1 / zoomFactor)}
          type="button"
        >
          -
        </button>
        <button
          aria-label={text.resetMap}
          className="map-fit-control"
          onClick={fitMap}
          type="button"
        >
          {text.fitMap}
        </button>
      </fieldset>
    </div>
  );
}
