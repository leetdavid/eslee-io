import { ImageResponse } from "next/og";
import {
  type ChartData,
  correctedTypes,
  gradeOf,
  isReviewComplete,
  pointsFor,
  questionIn,
} from "@/lib/chart";
import { isLocale, type Locale, MESSAGES } from "@/lib/i18n";
import {
  type ChartLayout,
  COMPACT_SIZES,
  DESKTOP_SIZES,
  estimateTextWidth,
  layoutHorizontal,
  layoutPlane,
  MOBILE_SIZES,
  type Sizes,
} from "@/lib/layout";
import { groupOf, MBTI_TYPES, type MbtiType } from "@/lib/mbti";
import { charts } from "@/server/service";

export const runtime = "nodejs";

const WIDTH = 1200;
const HEIGHT = 630;
const PADDING = { top: 36, side: 48, bottom: 28 };
const CONTENT_WIDTH = WIDTH - 2 * PADDING.side;
const CONTENT_HEIGHT = HEIGHT - PADDING.top - PADDING.bottom;
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

/** Estimated wrapped line count. Bold glyphs run wider than the layout estimate, hence the margin. */
function lineCount(text: string, fontSize: number, width: number, widthFactor = 1.1) {
  return Math.max(1, Math.ceil((estimateTextWidth(text, fontSize) * widthFactor) / width));
}

/**
 * The largest font size that wraps within the first line limit it can meet,
 * trying the stricter limits first, or the smallest size at the loosest limit.
 */
function fitText(text: string, width: number, sizes: number[], limits: number[]) {
  for (const limit of limits) {
    const size = sizes.find((candidate) => lineCount(text, candidate, width) <= limit);
    if (size) return { size, lines: lineCount(text, size, width) };
  }
  return { size: sizes[sizes.length - 1] ?? 24, lines: limits[limits.length - 1] ?? 3 };
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
  const stickerFont = Math.round(sizes.sticker.h / 2);
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
            borderRadius: Math.round(sizes.spot.h * 0.3),
            color: "#6b7285",
            fontSize: Math.max(10, Math.round(sizes.spot.h * 0.46)),
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
            border: `${sizes.sticker.h >= 32 ? 3 : 2}px solid #ffffff`,
            borderRadius: Math.round(sizes.sticker.h * 0.28),
            boxShadow: "0 0 0 1px rgba(29,37,80,0.18), 0 3px 6px rgba(29,37,80,0.18)",
            fontFamily: "Bagel",
            fontSize: stickerFont,
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

// Vertical space in the one-axis layout, in pixels.
const Q_MARK = 38;
const AXIS_LABELS = 18;
const SUMMARY_LINE = 33;
const FOOTER = 40;
const BREATHING_ROOM = 10;

function render(chart: ChartData, lang: Locale) {
  const t = MESSAGES[lang];
  const question = questionIn(chart, lang);
  // Satori breaks Hangul anywhere by default; keep words whole, as the page does.
  const words = lang === "ko" ? ({ wordBreak: "keep-all" } as const) : {};
  const review = chart.review && isReviewComplete(chart.review) ? chart.review : null;
  const kept = review ? gradeOf(review) : null;
  const summary = review?.summary ? `${t.overall} · ${review.summary[lang]}` : "";
  const points = pointsFor(chart.plot, review);
  const jev = pointsFor(chart.plot, null);
  const order = correctedTypes(chart.plot, review);
  const [x, y] = chart.plot.axes;
  if (!x) throw new Error("Chart has no axes");

  // Translations and long questions wrap, so text is sized first and the chart gets the rest.
  const questionWidth = y ? 520 : kept !== null ? 880 : CONTENT_WIDTH;
  const fitted = y
    ? fitText(question, questionWidth, [40, 36, 32, 28, 24], [3, 4, 5])
    : fitText(question, questionWidth, [44, 40, 36, 32, 28, 24], [2, 3, 4]);
  const questionSize = fitted.size;
  let questionLines = fitted.lines;
  const questionHeight = () => Q_MARK + questionLines * questionSize * 1.18;

  let chartNode: React.ReactNode;
  let summaryLines = 0;
  if (!y) {
    summaryLines = summary ? Math.min(2, lineCount(summary, 30, CONTENT_WIDTH, 1)) : 0;
    const budget = () =>
      CONTENT_HEIGHT -
      Math.max(questionHeight(), kept !== null ? 100 : 0) -
      8 -
      AXIS_LABELS -
      (summaryLines ? 6 + summaryLines * SUMMARY_LINE : 0) -
      FOOTER -
      BREATHING_ROOM;
    const input = {
      points: Object.fromEntries(MBTI_TYPES.map((type) => [type, points[type].x])) as Record<
        MbtiType,
        number
      >,
      spots: Object.fromEntries(order.map((type) => [type, jev[type].x])),
      order,
    };
    // The largest stickers whose stacks fit; crowded charts drop to smaller ones.
    let sizes = DESKTOP_SIZES;
    let layout = layoutHorizontal(input, CONTENT_WIDTH, sizes, { topPad: 12 });
    for (const candidate of [MOBILE_SIZES, COMPACT_SIZES]) {
      if (layout.height - 30 <= budget()) break;
      sizes = candidate;
      layout = layoutHorizontal(input, CONTENT_WIDTH, sizes, { topPad: 12 });
    }
    // Still too tall: the summary gives up a line, then the question, so nothing overlaps.
    while (layout.height - 30 > budget()) {
      if (summaryLines > 1) summaryLines -= 1;
      else if (questionLines > 2) questionLines -= 1;
      else break;
    }
    // One tall stack can overflow even so. Then the summary goes, unless the breathing room covers it.
    if (layout.height - 30 > budget() + BREATHING_ROOM) summaryLines = 0;
    const axisY = layout.axisY;
    chartNode = (
      <div style={{ display: "flex", flexDirection: "column" }}>
        <Chart
          layout={layout}
          sizes={sizes}
          width={CONTENT_WIDTH}
          height={layout.height - 30}
          axis={
            <g>
              <line
                x1={18}
                y1={axisY}
                x2={CONTENT_WIDTH - 18}
                y2={axisY}
                stroke={INK}
                strokeWidth={2.6}
              />
              <path
                d={`M30 ${axisY - 9} L18 ${axisY} L30 ${axisY + 9}`}
                fill="none"
                stroke={INK}
                strokeWidth={2.4}
              />
              <path
                d={`M${CONTENT_WIDTH - 30} ${axisY - 9} L${CONTENT_WIDTH - 18} ${axisY} L${CONTENT_WIDTH - 30} ${axisY + 9}`}
                fill="none"
                stroke={INK}
                strokeWidth={2.4}
              />
            </g>
          }
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
    const chartWidth = 560;
    const height = 400;
    const sizes = DESKTOP_SIZES;
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
    // The left column holds the question, grade, and summary; the footer runs full width below.
    const left =
      CONTENT_HEIGHT - FOOTER - questionHeight() - (kept !== null ? 62 : 0) - 12 - BREATHING_ROOM;
    summaryLines = summary
      ? Math.max(1, Math.min(lineCount(summary, 30, 520, 1), Math.floor(left / SUMMARY_LINE)))
      : 0;
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

  const questionNode = (
    <span
      style={{
        ...words,
        display: "block",
        lineClamp: questionLines,
        fontFamily: "Noto",
        fontSize: questionSize,
        fontWeight: 800,
        color: INK,
        lineHeight: 1.18,
      }}
    >
      {question}
    </span>
  );
  const summaryNode =
    summary && summaryLines ? (
      <span
        style={{
          ...words,
          display: "block",
          lineClamp: summaryLines,
          fontFamily: "Pen",
          fontSize: 30,
          color: RED,
          marginTop: y ? 12 : 6,
          lineHeight: 1.1,
        }}
      >
        {summary}
      </span>
    ) : null;
  const header = (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 24,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", width: questionWidth }}>
        <span style={{ fontFamily: "Pen", fontSize: 34, color: "#4a5274", lineHeight: 1 }}>Q.</span>
        {questionNode}
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
          flexShrink: 0,
          whiteSpace: "nowrap",
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
      <span style={{ ...words, fontFamily: "Noto", fontSize: 16, color: "#4a5274" }}>
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
        padding: `${PADDING.top}px ${PADDING.side}px ${PADDING.bottom}px`,
        ...words,
        backgroundColor: "#fafbfe",
        backgroundImage: grid,
        backgroundSize: "100px 100px, 100px 100px, 20px 20px, 20px 20px",
      }}
    >
      {y ? (
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ display: "flex", gap: 32 }}>
            <div style={{ display: "flex", flexDirection: "column", width: 520 }}>
              {header}
              {kept !== null ? (
                <span style={{ fontFamily: "Pen", fontSize: 44, color: RED, marginTop: 18 }}>
                  {kept}/16 {t.gradeLabel}
                </span>
              ) : null}
              {summaryNode}
            </div>
            {chartNode}
          </div>
          {footer}
        </div>
      ) : (
        // Satori lays fragments out as rows, so the column is explicit.
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          {header}
          <div style={{ display: "flex", marginTop: 8 }}>{chartNode}</div>
          {summaryNode}
          {footer}
        </div>
      )}
    </div>
  );
  const text = [
    question,
    summary,
    t.gradeLabel,
    t.footerPlaced(chart.reviewModel ?? "LLM"),
    x.low[lang],
    x.high[lang],
    y?.low[lang] ?? "",
    y?.high[lang] ?? "",
    "Q.0123456789/ ←→↑↓·…",
    MBTI_TYPES.join(""),
    "Jev MBTI",
  ].join("");
  return { page, text };
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const chart = await charts.load(id);
  if (!chart) return new Response("Not found", { status: 404 });
  // Link previews use the question's language; Save image passes the viewer's.
  const requested = new URL(request.url).searchParams.get("lang");
  const { page, text } = render(chart, isLocale(requested) ? requested : chart.questionLanguage);
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
