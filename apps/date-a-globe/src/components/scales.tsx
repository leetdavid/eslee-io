import { type Month, type Window, yearOf } from "@/engine";

const W = 342;
const f1 = (v: number) => Math.round(v * 10) / 10;
export const yearsLabel = (w: Window) => {
  const a = yearOf(w.from);
  const b = yearOf(w.to);
  return a === b ? String(a) : `${a}–${b}`;
};

function ticks(from: number, to: number, x: (y: number) => number) {
  const span = to - from;
  const minor = span > 120 ? 10 : span > 50 ? 5 : span > 16 ? 2 : 1;
  const major = span > 120 ? 50 : span > 50 ? 20 : span > 16 ? 10 : 5;
  const marks: { x: number; label?: number; big: boolean }[] = [];
  for (let y = Math.ceil(from / minor) * minor; y <= to; y += minor) {
    const big = y % major === 0;
    marks.push({ x: x(y), big, label: big ? y : undefined });
  }
  return marks;
}

/**
 * The plain scale on a question card: what a yes keeps in green, what a no keeps in pink, and the red cut
 * between them. When the two overlap, each gets its own row so both stay readable.
 */
export function AnswerScale({
  current,
  ifYes,
  ifNo,
}: {
  current: Window;
  ifYes: Window;
  ifNo: Window;
}) {
  const from = yearOf(current.from);
  const to = yearOf(current.to) + 1;
  const x = (y: number) => Math.max(0, Math.min(W, ((y - from) / Math.max(1, to - from)) * W));
  const xm = (m: Month) => x(1805 + m / 12);
  const yes = { a: xm(ifYes.from), b: xm(ifYes.to + 1) };
  const no = { a: xm(ifNo.from), b: xm(ifNo.to + 1) };
  const apart = ifYes.to < ifNo.from || ifNo.to < ifYes.from;
  // Where the two answers part: the start of the later window.
  const cut = apart ? Math.max(ifYes.from, ifNo.from) : null;
  const marks = ticks(from, to, x);
  const label = (a: number, b: number, y: number, text: string, alignRight: boolean) => {
    const inside = b - a >= text.length * 6 + 16;
    const right = alignRight || (!inside && a > W / 2);
    const tx = inside ? (right ? b - 8 : a + 8) : right ? a - 6 : b + 6;
    return (
      <text
        x={f1(tx)}
        y={y}
        textAnchor={right ? "end" : "start"}
        fontSize="10.5"
        fontWeight="600"
        fill="#161513"
      >
        {text}
      </text>
    );
  };
  const yesText = `Yes · ${yearsLabel(ifYes)}`;
  const noText = `No · ${yearsLabel(ifNo)}`;
  return (
    <svg
      viewBox={`0 0 ${W} 66`}
      width="100%"
      style={{ display: "block", overflow: "visible" }}
      aria-hidden="true"
    >
      <defs>
        <clipPath id="scale-clip">
          <rect x="0" y="20" width={W} height="26" rx="8" />
        </clipPath>
      </defs>
      <g clipPath="url(#scale-clip)">
        <rect x="0" y="20" width={W} height="26" fill="#EFEEE9" />
        {apart ? (
          <>
            <rect
              x={f1(no.a)}
              y="20"
              width={f1(Math.max(2, no.b - no.a))}
              height="26"
              fill="#F6CBD2"
            />
            <rect
              x={f1(yes.a)}
              y="20"
              width={f1(Math.max(2, yes.b - yes.a))}
              height="26"
              fill="#CDE8C2"
            />
          </>
        ) : (
          <>
            <rect
              x={f1(yes.a)}
              y="20"
              width={f1(Math.max(2, yes.b - yes.a))}
              height="12.5"
              fill="#CDE8C2"
            />
            <rect
              x={f1(no.a)}
              y="33.5"
              width={f1(Math.max(2, no.b - no.a))}
              height="12.5"
              fill="#F6CBD2"
            />
          </>
        )}
      </g>
      {apart ? (
        <>
          {label(yes.a, yes.b, 37, yesText, yes.a > no.a)}
          {label(no.a, no.b, 37, noText, no.a > yes.a)}
        </>
      ) : (
        <g fontSize="9.5">
          {label(yes.a, yes.b, 30, yesText, false)}
          {label(no.a, no.b, 43.5, noText, false)}
        </g>
      )}
      <path
        d={marks.map((t) => `M${f1(t.x)} 50v${t.big ? 6 : 3}`).join("")}
        stroke="#161513"
        strokeOpacity=".4"
      />
      <g fontSize="10" fill="#8A857B">
        {marks
          .filter((t) => t.label !== undefined && t.x > 12 && t.x < W - 12)
          .map((t) => (
            <text key={t.label} x={f1(t.x)} y="64" textAnchor="middle">
              {t.label}
            </text>
          ))}
      </g>
      {cut !== null && (
        <g>
          <path d={`M${f1(xm(cut))} 14V50`} stroke="#D7382F" strokeWidth="2.4" />
          <rect
            x={f1(Math.min(W - 38, Math.max(0, xm(cut) - 19)))}
            y="0"
            width="38"
            height="16"
            rx="8"
            fill="#D7382F"
          />
          <text
            x={f1(Math.min(W - 19, Math.max(19, xm(cut))))}
            y="11.6"
            textAnchor="middle"
            fontSize="10.5"
            fontWeight="600"
            fill="#fff"
          >
            {yearOf(cut)}
          </text>
        </g>
      )}
    </svg>
  );
}

/** After a clash: both explanations as windows, with the hatched unlikely years between. */
export function TwoFitsScale({ a, b }: { a: Window; b: Window }) {
  const [first, second] = a.from <= b.from ? [a, b] : [b, a];
  const from = yearOf(first.from) - 3;
  const to = yearOf(second.to) + 4;
  const x = (y: number) => ((y - from) / Math.max(1, to - from)) * W;
  const xm = (m: Month) => x(1805 + m / 12);
  const box = (w: Window, fill: string, text: string) => (
    <g>
      <rect
        x={f1(xm(w.from))}
        y="20"
        width={f1(Math.max(4, xm(w.to + 1) - xm(w.from)))}
        height="26"
        rx="6"
        fill={fill}
      />
      <text
        x={f1((xm(w.from) + xm(w.to + 1)) / 2)}
        y="37"
        textAnchor="middle"
        fontSize="10.5"
        fontWeight="600"
        fill="#161513"
      >
        {text}
      </text>
    </g>
  );
  return (
    <svg
      viewBox={`0 0 ${W} 66`}
      width="100%"
      style={{ display: "block", overflow: "visible" }}
      aria-hidden="true"
    >
      <defs>
        <pattern
          id="two-hatch"
          width="5"
          height="5"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <rect width="5" height="5" fill="#F1EFEA" />
          <path d="M0 0v5" stroke="#161513" strokeOpacity=".12" strokeWidth="1.4" />
        </pattern>
      </defs>
      <rect x="0" y="20" width={W} height="26" rx="8" fill="url(#two-hatch)" />
      {box(first, "#F6CBD2", yearsLabel(first))}
      {box(second, "#CDE8C2", yearsLabel(second))}
      <text
        x={f1((xm(first.to + 1) + xm(second.from)) / 2)}
        y="37"
        textAnchor="middle"
        fontSize="9.5"
        fill="#8A857B"
      >
        unlikely
      </text>
      <g fontSize="10" fill="#8A857B">
        {ticks(from, to, x)
          .filter((t) => t.label !== undefined && t.x > 12 && t.x < W - 12)
          .map((t) => (
            <text key={t.label} x={f1(t.x)} y="64" textAnchor="middle">
              {t.label}
            </text>
          ))}
      </g>
    </svg>
  );
}

export interface TrailRow {
  n: number;
  title: string;
  answer: "yes" | "no" | "cant";
  window: Window | null;
  setAside?: boolean;
  last?: boolean;
}

/** The last few answers, each with the range it left, on one shared 1805-to-now axis. */
export function Trail({ rows, months }: { rows: TrailRow[]; months: number }) {
  const width = 358;
  const c0 = 176;
  const cw = width - c0;
  const X = (m: number) => c0 + (m / months) * cw;
  const rh = 17;
  return (
    <svg viewBox={`0 0 ${width} ${rows.length * rh + 2}`} width="100%" aria-hidden="true">
      {rows.map((r, i) => {
        const y = i * rh + 8.5;
        const tag = { yes: ["yes", "#CDE8C2"], no: ["no", "#F6CBD2"], cant: ["can't", "#E4E1D9"] }[
          r.answer
        ];
        return (
          <g key={r.n}>
            <circle
              cx="8"
              cy={y}
              r="7.5"
              fill={r.last ? "#D7382F" : r.answer === "cant" ? "#A8A398" : "#161513"}
            />
            <text x="8" y={y + 3.5} textAnchor="middle" fontSize="9.5" fontWeight="600" fill="#fff">
              {r.n}
            </text>
            <text
              x="21"
              y={y + 4}
              fontSize="12"
              fontWeight="500"
              fill={r.answer === "cant" ? "#8A857B" : "#161513"}
            >
              {r.title.length > 17 ? `${r.title.slice(0, 16).trimEnd()}…` : r.title}
            </text>
            <rect x={c0 - 40} y={y - 7} width="32" height="14" rx="5" fill={tag[1]} />
            <text
              x={c0 - 24}
              y={y + 3.6}
              textAnchor="middle"
              fontSize="9.5"
              fontWeight="600"
              fill="#161513"
              textDecoration={r.setAside ? "line-through" : undefined}
            >
              {tag[0]}
            </text>
            <rect x={c0} y={y - 0.75} width={cw} height="1.5" fill="#161513" fillOpacity=".12" />
            {r.window && (
              <rect
                x={f1(X(r.window.from))}
                y={y - 4}
                width={f1(Math.max(3, X(r.window.to + 1) - X(r.window.from)))}
                height="8"
                rx="3"
                fill={r.last ? "#D7382F" : "#161513"}
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}
