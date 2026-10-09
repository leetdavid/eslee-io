import { ImageResponse } from "next/og";
import { type ChartData, correctedTypes, gradeOf, isReviewComplete, pointsFor } from "@/lib/chart";
import { MESSAGES } from "@/lib/i18n";
import {
  type ChartLayout,
  DESKTOP_SIZES,
  layoutHorizontal,
  layoutPlane,
  type Sizes,
} from "@/lib/layout";
import { groupOf, MBTI_TYPES, type MbtiType } from "@/lib/mbti";
import { charts } from "@/server/service";

export const runtime = "nodejs";

const WIDTH = 1200;
const HEIGHT = 630;
const COLORS = { nt: "#cbbdf6", nf: "#b6e5c4", sj: "#b9d9f5", sp: "#f8de84" } as const;
const INK = "#1d2550";
const RED = "#c8282e";
const ROTATION = [-3, 2, -1.5, 3, -2.5, 1.5, 2.5, -1, 1, -2, 3, -3, 2, -1.5, 1.5, -2.5];

/** A TrueType subset from Google Fonts containing only the characters drawn. */
async function font(family: string, text: string) {
  const css = await (
    await fetch(
      `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}&text=${encodeURIComponent(text)}`,
      {
        next: { revalidate: 86_400 },
      },
    )
  ).text();
  const url = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
  if (!url) throw new Error(`No font file for ${family}`);
  return (await fetch(url, { next: { revalidate: 86_400 } })).arrayBuffer();
}

/** Satori draws no SVG markers, so arrowheads are explicit strokes along the curve's end tangent. */
function arrowHead(d: string) {
  const numbers = d.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
  const [, , cx = 0, cy = 0, x = 0, y = 0] = numbers;
  const angle = Math.atan2(y - cy, x - cx);
  const wing = (offset: number) =>
    `${x - 10 * Math.cos(angle + offset)} ${y - 10 * Math.sin(angle + offset)}`;
  return `M${wing(0.45)} L${x} ${y} L${wing(-0.45)}`;
}

function Chart({
  layout,
  sizes,
  width,
  height,
  axis,
}: {
  layout: ChartLayout;
  sizes: Sizes;
  width: number;
  height: number;
  axis: React.ReactNode;
}) {
  return (
    <div style={{ position: "relative", display: "flex", width, height }}>
      <svg
        width={width}
        height={height}
        style={{ position: "absolute", left: 0, top: 0 }}
        aria-hidden="true"
      >
        {axis}
        {layout.arrows.map((arrow) => (
          <g key={arrow.type}>
            <path d={arrow.d} fill="none" stroke={RED} strokeWidth={2.6} strokeLinecap="round" />
            <path
              d={arrowHead(arrow.d)}
              fill="none"
              stroke={RED}
              strokeWidth={2.4}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        ))}
        {layout.rings.map((ring) => (
          <ellipse
            key={ring.type}
            cx={ring.cx}
            cy={ring.cy}
            rx={ring.rx}
            ry={ring.ry}
            fill="none"
            stroke={RED}
            strokeWidth={2.3}
          />
        ))}
      </svg>
      {layout.spots.map((spot) => (
        <div
          key={`s-${spot.type}`}
          style={{
            position: "absolute",
            left: spot.cx - sizes.spot.w / 2,
            top: spot.cy - sizes.spot.h / 2,
            width: sizes.spot.w,
            height: sizes.spot.h,
            border: "2px dashed #6b7285",
            borderRadius: 8,
            color: "#6b7285",
            fontSize: 12,
            fontFamily: "Noto",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#fafbfe",
          }}
        >
          {spot.type}
        </div>
      ))}
      {layout.stickers.map((sticker) => (
        <div
          key={sticker.type}
          style={{
            position: "absolute",
            left: sticker.cx - sizes.sticker.w / 2,
            top: sticker.cy - sizes.sticker.h / 2,
            width: sizes.sticker.w,
            height: sizes.sticker.h,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: COLORS[groupOf(sticker.type)],
            border: "3px solid #ffffff",
            borderRadius: 10,
            boxShadow: "0 0 0 1px rgba(29,37,80,0.18), 0 3px 6px rgba(29,37,80,0.18)",
            fontFamily: "Bagel",
            fontSize: 18,
            color: INK,
            transform: `rotate(${ROTATION[MBTI_TYPES.indexOf(sticker.type)] ?? 0}deg)`,
          }}
        >
          {sticker.type}
        </div>
      ))}
    </div>
  );
}

function render(chart: ChartData) {
  const lang = chart.questionLanguage;
  const t = MESSAGES[lang];
  const review = chart.review && isReviewComplete(chart.review) ? chart.review : null;
  const points = pointsFor(chart.plot, review);
  const jev = pointsFor(chart.plot, null);
  const order = correctedTypes(chart.plot, review);
  const sizes = DESKTOP_SIZES;
  const [x, y] = chart.plot.axes;
  if (!x) throw new Error("Chart has no axes");
  let chartNode: React.ReactNode;
  let chartWidth: number;
  if (!y) {
    chartWidth = 1104;
    const layout = layoutHorizontal(
      {
        points: Object.fromEntries(MBTI_TYPES.map((type) => [type, points[type].x])) as Record<
          MbtiType,
          number
        >,
        spots: Object.fromEntries(order.map((type) => [type, jev[type].x])),
        order,
      },
      chartWidth,
      sizes,
      { topPad: 16 },
    );
    const axisNode = (
      <g>
        <line
          x1={18}
          y1={layout.axisY}
          x2={chartWidth - 18}
          y2={layout.axisY}
          stroke={INK}
          strokeWidth={2.6}
        />
        <path
          d={`M30 ${layout.axisY - 9} L18 ${layout.axisY} L30 ${layout.axisY + 9}`}
          fill="none"
          stroke={INK}
          strokeWidth={2.4}
        />
        <path
          d={`M${chartWidth - 30} ${layout.axisY - 9} L${chartWidth - 18} ${layout.axisY} L${chartWidth - 30} ${layout.axisY + 9}`}
          fill="none"
          stroke={INK}
          strokeWidth={2.4}
        />
      </g>
    );
    chartNode = (
      <div style={{ display: "flex", flexDirection: "column" }}>
        <Chart
          layout={layout}
          sizes={sizes}
          width={chartWidth}
          height={layout.height - 30}
          axis={axisNode}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontFamily: "Noto",
            fontSize: 17,
            color: INK,
            marginTop: -6,
            padding: "0 18px",
          }}
        >
          <span>← {x.low[lang]}</span>
          <span>{x.high[lang]} →</span>
        </div>
      </div>
    );
  } else {
    chartWidth = 560;
    const height = 400;
    const layout = layoutPlane(
      {
        points: Object.fromEntries(
          MBTI_TYPES.map((type) => [type, { x: points[type].x, y: points[type].y ?? 0.5 }]),
        ) as Record<MbtiType, { x: number; y: number }>,
        spots: Object.fromEntries(
          order.map((type) => [type, { x: jev[type].x, y: jev[type].y ?? 0.5 }]),
        ),
        order,
        obstacles: [],
      },
      chartWidth,
      height,
      48,
      sizes,
    );
    chartNode = (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <span style={{ fontFamily: "Noto", fontSize: 15, color: INK }}>↑ {y.high[lang]}</span>
        <Chart
          layout={layout}
          sizes={sizes}
          width={chartWidth}
          height={height}
          axis={
            <g>
              <line
                x1={10}
                y1={height / 2}
                x2={chartWidth - 10}
                y2={height / 2}
                stroke={INK}
                strokeWidth={2.4}
              />
              <line
                x1={chartWidth / 2}
                y1={10}
                x2={chartWidth / 2}
                y2={height - 10}
                stroke={INK}
                strokeWidth={2.4}
              />
            </g>
          }
        />
        <div
          style={{
            display: "flex",
            width: chartWidth,
            justifyContent: "space-between",
            fontFamily: "Noto",
            fontSize: 15,
            color: INK,
          }}
        >
          <span>← {x.low[lang]}</span>
          <span>↓ {y.low[lang]}</span>
          <span>{x.high[lang]} →</span>
        </div>
      </div>
    );
  }
  const kept = review ? gradeOf(review) : null;
  const summary = review?.summary ? `${t.overall} · ${review.summary[lang]}` : "";
  const header = (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 24,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", maxWidth: y ? 520 : 880 }}>
        <span style={{ fontFamily: "Pen", fontSize: 34, color: "#4a5274" }}>Q.</span>
        <span
          style={{
            fontFamily: "Noto",
            fontSize: y ? 40 : 44,
            fontWeight: 800,
            color: INK,
            lineHeight: 1.18,
          }}
        >
          {chart.question}
        </span>
      </div>
      {kept !== null && !y ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            border: `2.5px solid ${RED}`,
            borderRadius: 999,
            padding: "8px 26px",
            transform: "rotate(-4deg)",
          }}
        >
          <span style={{ fontFamily: "Pen", fontSize: 52, color: RED, lineHeight: 1 }}>
            {kept}/16
          </span>
          <span style={{ fontFamily: "Pen", fontSize: 22, color: RED }}>{t.gradeLabel}</span>
        </div>
      ) : null}
    </div>
  );
  const footer = (
    <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: "auto" }}>
      <span
        style={{
          fontFamily: "Bagel",
          fontSize: 18,
          color: INK,
          background: "#fff",
          border: `2px solid ${INK}`,
          borderRadius: 9,
          padding: "6px 10px",
          boxShadow: `2px 2px 0 ${INK}`,
        }}
      >
        Jev MBTI
      </span>
      <span style={{ fontFamily: "Noto", fontSize: 16, color: "#4a5274" }}>
        {t.footerPlaced(chart.reviewModel ?? "LLM")}
      </span>
    </div>
  );
  const grid =
    "linear-gradient(#c9d8ef 1px, transparent 1px), linear-gradient(90deg, #c9d8ef 1px, transparent 1px), linear-gradient(#dfe8f6 1px, transparent 1px), linear-gradient(90deg, #dfe8f6 1px, transparent 1px)";
  const page = (
    <div
      style={{
        width: WIDTH,
        height: HEIGHT,
        display: "flex",
        flexDirection: "column",
        padding: "36px 48px 28px",
        backgroundColor: "#fafbfe",
        backgroundImage: grid,
        backgroundSize: "100px 100px, 100px 100px, 20px 20px, 20px 20px",
      }}
    >
      {y ? (
        <div style={{ display: "flex", gap: 32, flex: 1 }}>
          <div style={{ display: "flex", flexDirection: "column", width: 520 }}>
            {header}
            {kept !== null ? (
              <span style={{ fontFamily: "Pen", fontSize: 44, color: RED, marginTop: 18 }}>
                {kept}/16 {t.gradeLabel}
              </span>
            ) : null}
            {summary ? (
              <span
                style={{
                  fontFamily: "Pen",
                  fontSize: 30,
                  color: RED,
                  marginTop: 12,
                  lineHeight: 1.1,
                }}
              >
                {summary}
              </span>
            ) : null}
            {footer}
          </div>
          {chartNode}
        </div>
      ) : (
        // Satori lays fragments out as rows, so the column is explicit.
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          {header}
          <div style={{ display: "flex", marginTop: 8 }}>{chartNode}</div>
          {summary ? (
            <span style={{ fontFamily: "Pen", fontSize: 30, color: RED, marginTop: 6 }}>
              {summary}
            </span>
          ) : null}
          {footer}
        </div>
      )}
    </div>
  );
  const text = [
    chart.question,
    summary,
    t.gradeLabel,
    t.footerPlaced(chart.reviewModel ?? "LLM"),
    x.low[lang],
    x.high[lang],
    y?.low[lang] ?? "",
    y?.high[lang] ?? "",
    "Q.0123456789/ ←→↑↓·",
    MBTI_TYPES.join(""),
    "Jev MBTI",
  ].join("");
  return { page, text };
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const chart = await charts.load(id);
  if (!chart) return new Response("Not found", { status: 404 });
  const { page, text } = render(chart);
  const [noto, pen, bagel] = await Promise.all([
    font("Noto Sans KR:wght@800", text),
    font("Nanum Pen Script", text),
    font("Bagel Fat One", text),
  ]);
  const finished = chart.reviewStatus === "complete";
  const image = new ImageResponse(page, {
    width: WIDTH,
    height: HEIGHT,
    fonts: [
      { name: "Noto", data: noto, weight: 800, style: "normal" },
      { name: "Pen", data: pen, weight: 400, style: "normal" },
      { name: "Bagel", data: bagel, weight: 400, style: "normal" },
    ],
    headers: {
      "Cache-Control": finished ? "public, max-age=86400, immutable" : "public, max-age=60",
      ...(new URL(request.url).searchParams.has("download")
        ? { "Content-Disposition": `attachment; filename="jev-mbti-${chart.id}.png"` }
        : {}),
    },
  });
  return image;
}
