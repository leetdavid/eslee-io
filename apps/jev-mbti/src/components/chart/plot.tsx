"use client";

import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from "lucide-react";
import { type RefCallback, useCallback, useEffect, useRef, useState } from "react";
import type { Axis } from "@/lib/chart";
import { type Locale, MESSAGES } from "@/lib/i18n";
import {
  type ChartLayout,
  COMPACT_SIZES,
  DESKTOP_SIZES,
  estimateTextWidth,
  layoutHorizontal,
  layoutPlane,
  layoutVertical,
  MOBILE_SIZES,
  type Rect,
  type Sizes,
} from "@/lib/layout";
import { groupOf, MBTI_TYPES, type MbtiType } from "@/lib/mbti";
import { cn } from "@/lib/utils";

const ROTATION = [-3, 2, -1.5, 3, -2.5, 1.5, 2.5, -1, 1, -2, 3, -3, 2, -1.5, 1.5, -2.5];
const rotationOf = (type: MbtiType) => ROTATION[MBTI_TYPES.indexOf(type)] ?? 0;

function useWidth(): [RefCallback<HTMLElement>, number] {
  const [width, setWidth] = useState(0);
  const observer = useRef<ResizeObserver | null>(null);
  const ref = useCallback((element: HTMLElement | null) => {
    observer.current?.disconnect();
    observer.current = null;
    if (!element) return;
    const update = () => setWidth(Math.round(element.getBoundingClientRect().width));
    update();
    observer.current = new ResizeObserver(update);
    observer.current.observe(element);
  }, []);
  return [ref, width];
}

export type PlotProps = {
  axes: Axis[];
  locale: Locale;
  points: Record<MbtiType, { x: number; y?: number }>;
  /** Jev's original points for corrected types; empty in Jev-only view. */
  spots: Partial<Record<MbtiType, { x: number; y?: number }>>;
  order: MbtiType[];
  selected: MbtiType | null;
  describe: (type: MbtiType) => string;
  onSelect: (type: MbtiType) => void;
  animateIn: boolean;
  label: string;
};

const FONT: Record<string, number> = { 78: 18, 66: 16, 54: 13 };

function Defs() {
  return (
    <defs>
      <marker
        id="pen-head"
        viewBox="0 0 10 10"
        refX="7"
        refY="5"
        markerWidth="8"
        markerHeight="8"
        orient="auto"
      >
        <path
          d="M1.5 1.5 L8 5 L1.5 8.5"
          fill="none"
          stroke="var(--red-pen)"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </marker>
      <marker
        id="axis-head"
        viewBox="0 0 10 10"
        refX="8"
        refY="5"
        markerWidth="9"
        markerHeight="9"
        orient="auto-start-reverse"
      >
        <path
          d="M1 1 L9 5 L1 9"
          fill="none"
          stroke="var(--ink)"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </marker>
    </defs>
  );
}

function Ink({ layout }: { layout: ChartLayout }) {
  return (
    <g className="ink">
      {layout.arrows.map((arrow) => (
        <path
          key={`a-${arrow.type}`}
          d={arrow.d}
          pathLength={1}
          fill="none"
          stroke="var(--red-pen)"
          strokeWidth="2.4"
          strokeLinecap="round"
          markerEnd="url(#pen-head)"
        />
      ))}
      {layout.rings.map((ring) => (
        <ellipse
          key={`r-${ring.type}`}
          cx={ring.cx}
          cy={ring.cy}
          rx={ring.rx}
          ry={ring.ry}
          pathLength={1}
          fill="none"
          stroke="var(--red-pen)"
          strokeWidth="2.2"
          transform={`rotate(-5 ${ring.cx} ${ring.cy})`}
        />
      ))}
    </g>
  );
}

function Pieces({ layout, sizes, props }: { layout: ChartLayout; sizes: Sizes; props: PlotProps }) {
  const fontSize = FONT[sizes.sticker.w] ?? 16;
  return (
    <>
      {layout.spots.map((spot) => (
        <div
          key={`s-${spot.type}`}
          className="spot"
          aria-hidden="true"
          style={{
            left: spot.cx - sizes.spot.w / 2,
            top: spot.cy - sizes.spot.h / 2,
            width: sizes.spot.w,
            height: sizes.spot.h,
            fontSize: Math.max(10.5, fontSize - 6),
          }}
        >
          {spot.type}
        </div>
      ))}
      {layout.stickers.map((sticker, index) => (
        <button
          key={sticker.type}
          type="button"
          className={cn("sticker", groupOf(sticker.type), props.animateIn && "dropping")}
          aria-pressed={props.selected === sticker.type}
          aria-label={props.describe(sticker.type)}
          onClick={() => props.onSelect(sticker.type)}
          style={{
            left: sticker.cx - sizes.sticker.w / 2,
            top: sticker.cy - sizes.sticker.h / 2,
            width: sizes.sticker.w,
            height: sizes.sticker.h,
            fontSize,
            borderWidth: sizes.sticker.w < 60 ? 2 : 3,
            borderRadius: sizes.sticker.w < 60 ? 7 : 10,
            transform: `rotate(${rotationOf(sticker.type)}deg)`,
            animationDelay: props.animateIn ? `${index * 35}ms` : undefined,
          }}
        >
          {sticker.type}
        </button>
      ))}
      {layout.marks.map((mark) => (
        <div
          key={`m-${mark.type}`}
          className="mark"
          aria-hidden="true"
          style={{
            left: mark.x,
            top: mark.y,
            width: sizes.mark,
            height: sizes.mark,
            fontSize: sizes.mark - 3,
          }}
        >
          {mark.n}
        </div>
      ))}
    </>
  );
}

function Legend({ locale }: { locale: Locale }) {
  const t = MESSAGES[locale];
  return (
    <div className="legend" aria-hidden="true">
      <span>
        <i />
        {t.legendSpot}
      </span>
      <span>
        <svg
          width="22"
          height="11"
          style={{ verticalAlign: -1, marginRight: 6 }}
          aria-hidden="true"
        >
          <path
            d="M2 9 Q 11 1 19 6"
            fill="none"
            stroke="var(--red-pen)"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="M14.5 3 L19.5 6 L14.5 9"
            fill="none"
            stroke="var(--red-pen)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {t.legendPen}
      </span>
    </div>
  );
}

export function Plot(incoming: PlotProps) {
  const [ref, width] = useWidth();
  // Stickers drop in once per visit; later renders never replay it.
  const [dropping, setDropping] = useState(incoming.animateIn);
  useEffect(() => {
    if (!dropping) return;
    const url = new URL(window.location.href);
    if (url.searchParams.has("new")) {
      url.searchParams.delete("new");
      window.history.replaceState(window.history.state, "", url);
    }
    const timer = setTimeout(() => setDropping(false), 1_400);
    return () => clearTimeout(timer);
  }, [dropping]);
  const props = { ...incoming, animateIn: dropping };
  const { axes, locale } = props;
  const x = axes[0];
  if (!x) return null;
  const hasSpots = Object.keys(props.spots).length > 0;

  let body = null;
  let height = 420;
  if (width > 0 && axes.length === 1) {
    const input = {
      points: Object.fromEntries(MBTI_TYPES.map((type) => [type, props.points[type].x])) as Record<
        MbtiType,
        number
      >,
      spots: Object.fromEntries(
        Object.entries(props.spots).map(([type, point]) => [type, point.x]),
      ),
      order: props.order,
    };
    if (width >= 560) {
      const sizes = DESKTOP_SIZES;
      const layout = layoutHorizontal(input, width, sizes, { topPad: hasSpots ? 58 : 30 });
      height = layout.height;
      const tick = (v: number) => layout.pad + v * (width - 2 * layout.pad);
      body = (
        <>
          <svg width={width} height={height} aria-hidden="true">
            <Defs />
            <line
              x1={18}
              y1={layout.axisY}
              x2={width - 18}
              y2={layout.axisY}
              stroke="var(--ink)"
              strokeWidth="2.4"
              markerStart="url(#axis-head)"
              markerEnd="url(#axis-head)"
            />
            {[0, 0.25, 0.5, 0.75, 1].map((v) => (
              <line
                key={v}
                x1={tick(v)}
                y1={layout.axisY - 6}
                x2={tick(v)}
                y2={layout.axisY + 6}
                stroke="var(--ink)"
                strokeWidth="2"
              />
            ))}
            <Ink layout={layout} />
          </svg>
          <Pieces layout={layout} sizes={sizes} props={props} />
          <span className="axis-label" style={{ left: 16, top: layout.axisY + 12, fontSize: 15 }}>
            <ArrowLeft size={15} aria-hidden="true" />
            {x.low[locale]}
          </span>
          <span className="axis-label" style={{ right: 16, top: layout.axisY + 12, fontSize: 15 }}>
            {x.high[locale]}
            <ArrowRight size={15} aria-hidden="true" />
          </span>
        </>
      );
    } else {
      const sizes = MOBILE_SIZES;
      const layout = layoutVertical(input, width, 600, sizes);
      height = layout.height;
      const yOf = (v: number) => layout.top + (1 - v) * layout.usable;
      body = (
        <>
          <svg width={width} height={height} aria-hidden="true">
            <Defs />
            <line
              x1={layout.ax}
              y1={height - 30}
              x2={layout.ax}
              y2={30}
              stroke="var(--ink)"
              strokeWidth="2.4"
              markerStart="url(#axis-head)"
              markerEnd="url(#axis-head)"
            />
            {[0, 0.25, 0.5, 0.75, 1].map((v) => (
              <line
                key={v}
                x1={layout.ax - 6}
                y1={yOf(v)}
                x2={layout.ax + 6}
                y2={yOf(v)}
                stroke="var(--ink)"
                strokeWidth="2"
              />
            ))}
            <Ink layout={layout} />
          </svg>
          <Pieces layout={layout} sizes={sizes} props={props} />
          <span
            className="axis-label"
            style={{ left: "50%", transform: "translateX(-50%)", top: 4, fontSize: 14 }}
          >
            <ArrowUp size={14} aria-hidden="true" />
            {x.high[locale]}
          </span>
          <span
            className="axis-label"
            style={{ left: "50%", transform: "translateX(-50%)", bottom: 4, fontSize: 14 }}
          >
            <ArrowDown size={14} aria-hidden="true" />
            {x.low[locale]}
          </span>
        </>
      );
    }
  } else if (width > 0) {
    const y = axes[1] ?? x;
    const wide = width >= 640;
    const sizes = wide ? DESKTOP_SIZES : COMPACT_SIZES;
    height = Math.round(wide ? Math.min(640, width * 0.8) : width * 1.12);
    const font = wide ? 15 : 12;
    const pad = wide ? 60 : 34;
    const ax = width / 2;
    const ay = height / 2;
    const label = (text: string) => estimateTextWidth(text, font) + font + 14;
    const labels: (Rect & { text: string; icon: "left" | "right" | "up" | "down" })[] = [
      {
        text: x.low[locale],
        icon: "left",
        x: 8,
        y: ay + 7,
        w: label(x.low[locale]),
        h: font * 1.5,
      },
      {
        text: x.high[locale],
        icon: "right",
        x: width - 8 - label(x.high[locale]),
        y: ay + 7,
        w: label(x.high[locale]),
        h: font * 1.5,
      },
      {
        text: y.high[locale],
        icon: "up",
        x: ax + 8,
        y: 8,
        w: label(y.high[locale]),
        h: font * 1.5,
      },
      {
        text: y.low[locale],
        icon: "down",
        x: ax + 8,
        y: height - 8 - font * 1.5,
        w: label(y.low[locale]),
        h: font * 1.5,
      },
    ];
    const legendRect: Rect = { x: 8, y: 8, w: hasSpots ? 200 : 0, h: hasSpots ? 26 : 0 };
    const layout = layoutPlane(
      {
        points: Object.fromEntries(
          MBTI_TYPES.map((type) => [
            type,
            { x: props.points[type].x, y: props.points[type].y ?? 0.5 },
          ]),
        ) as Record<MbtiType, { x: number; y: number }>,
        spots: Object.fromEntries(
          Object.entries(props.spots).map(([type, point]) => [
            type,
            { x: point.x, y: point.y ?? 0.5 },
          ]),
        ),
        order: props.order,
        obstacles: [...labels, ...(hasSpots ? [legendRect] : [])],
      },
      width,
      height,
      pad,
      sizes,
    );
    const Icon = { left: ArrowLeft, right: ArrowRight, up: ArrowUp, down: ArrowDown };
    body = (
      <>
        <svg width={width} height={height} aria-hidden="true">
          <Defs />
          <line
            x1={12}
            y1={ay}
            x2={width - 12}
            y2={ay}
            stroke="var(--ink)"
            strokeWidth="2.2"
            markerStart="url(#axis-head)"
            markerEnd="url(#axis-head)"
          />
          <line
            x1={ax}
            y1={height - 12}
            x2={ax}
            y2={12}
            stroke="var(--ink)"
            strokeWidth="2.2"
            markerStart="url(#axis-head)"
            markerEnd="url(#axis-head)"
          />
          <Ink layout={layout} />
        </svg>
        <Pieces layout={layout} sizes={sizes} props={props} />
        {labels.map((item) => {
          const Glyph = Icon[item.icon];
          return (
            <span
              key={item.icon}
              className="axis-label"
              style={{ left: item.x, top: item.y, fontSize: font }}
            >
              {item.icon !== "right" ? <Glyph size={font - 1} aria-hidden="true" /> : null}
              {item.text}
              {item.icon === "right" ? <Glyph size={font - 1} aria-hidden="true" /> : null}
            </span>
          );
        })}
      </>
    );
  }

  return (
    <figure ref={ref} className="plot gridbg" aria-label={props.label} style={{ height }}>
      {body}
      {hasSpots && width > 0 ? <Legend locale={locale} /> : null}
    </figure>
  );
}
