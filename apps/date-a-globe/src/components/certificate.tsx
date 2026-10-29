import "./certificate.css";
import { geoDistance, geoOrthographic } from "d3-geo";
import type { CSSProperties, ReactNode } from "react";
import type { Era, Result, Setup } from "@/engine";
import { yearOf } from "@/engine";

export const ERA_NAMES: Record<Era, { name: string; years: string }> = {
  engraved: { name: "Engraver's plate", years: "1805–69" },
  imperial: { name: "Imperial atlas", years: "1870–1918" },
  interwar: { name: "Interwar", years: "1919–45" },
  mid: { name: "Cold War classroom", years: "1946–91" },
  web: { name: "Web map", years: "1992–today" },
};

// Each era globe was drawn once, turned to suit its era; pins use the same projection.
const GLOBES: Record<Era, { size: number; r: number; rotate: [number, number, number] }> = {
  engraved: { size: 240, r: 110, rotate: [-62, -36, 0] },
  imperial: { size: 240, r: 110, rotate: [-70, -26, 0] },
  interwar: { size: 240, r: 110, rotate: [-52, -36, 0] },
  mid: { size: 260, r: 120, rotate: [-50, -18, 0] },
  web: { size: 240, r: 110, rotate: [-30, -22, 0] },
};

export interface Pin {
  n: number;
  lat: number;
  lon: number;
  setAside?: boolean;
  last?: boolean;
}

const ROMAN = [
  "I",
  "II",
  "III",
  "IV",
  "V",
  "VI",
  "VII",
  "VIII",
  "IX",
  "X",
  "XI",
  "XII",
  "XIII",
  "XIV",
  "XV",
];
const f1 = (v: number) => Math.round(v * 10) / 10;

/** Pins on the near side of the era's globe, nudged apart where they would overlap. */
function placePins(era: Era, pins: Pin[], minGap: number) {
  const g = GLOBES[era];
  const projection = geoOrthographic()
    .scale(g.r)
    .translate([g.size / 2, g.size / 2])
    .rotate(g.rotate)
    .clipAngle(90);
  const centre: [number, number] = [-g.rotate[0], -g.rotate[1]];
  const visible = pins
    .filter((p) => geoDistance([p.lon, p.lat], centre) < (85 * Math.PI) / 180)
    .map((p) => ({ pin: p, at: projection([p.lon, p.lat]) ?? [0, 0] }));
  const moved = visible.map((v) => [...v.at] as [number, number]);
  for (let it = 0; it < 120; it++)
    for (let i = 0; i < moved.length; i++)
      for (let j = i + 1; j < moved.length; j++) {
        const a = moved[i] as [number, number];
        const b = moved[j] as [number, number];
        const dx = b[0] - a[0];
        const dy = b[1] - a[1];
        const d = Math.hypot(dx, dy) || 0.01;
        if (d >= minGap) continue;
        const push = (minGap - d) / 2;
        a[0] -= (dx / d) * push;
        a[1] -= (dy / d) * push;
        b[0] += (dx / d) * push;
        b[1] += (dy / d) * push;
      }
  return {
    size: g.size,
    list: visible.map((v, i) => ({ ...v.pin, anchor: v.at, at: moved[i] as [number, number] })),
  };
}

function Leaders({ list, color }: { list: ReturnType<typeof placePins>["list"]; color: string }) {
  return (
    <>
      {list.map((p) =>
        Math.hypot(p.at[0] - p.anchor[0], p.at[1] - p.anchor[1]) < 4 ? null : (
          <g key={`l${p.n}`}>
            <path
              d={`M${f1(p.anchor[0])} ${f1(p.anchor[1])}L${f1(p.at[0])} ${f1(p.at[1])}`}
              stroke={color}
              strokeWidth="1.1"
            />
            <circle cx={f1(p.anchor[0])} cy={f1(p.anchor[1])} r="2.2" fill={color} />
          </g>
        ),
      )}
    </>
  );
}

const years = (s: { from: number; to: number }) =>
  Array.from({ length: s.to - s.from }, (_, k) => s.from + k);
const fives = (s: { from: number; to: number }) => years(s).filter((y) => (y - s.from) % 5 === 0);

/** A scale of years around the range, in years that suit its width. */
function scaleSpan(result: Result) {
  const a = yearOf(result.window.from);
  const b = yearOf(result.window.to);
  const width = Math.max(25, Math.ceil((b - a + 12) / 5) * 5);
  const from = Math.max(1805, Math.floor((a + b) / 2 / 5) * 5 - Math.floor(width / 10) * 5);
  const to = Math.min(yearOf(result.window.to) + width, from + width);
  return { from, to, lo: 1805 + result.window.from / 12, hi: 1805 + (result.window.to + 1) / 12 };
}

const kindLabel = (setup: Setup, era: Era) => {
  if (setup.kind === "part") return setup.regions.join(" · ") || "Part of the world";
  if (setup.kind === "world")
    return era === "engraved" ? "A Map of the World" : "World Map · Political";
  return era === "engraved" ? "A Globe of the World" : "The World · Political";
};

interface Props {
  result: Result;
  setup: Setup;
  pins: Pin[];
}

export function Certificate({ result, setup, pins }: Props) {
  const era = result.era;
  const draw = {
    engraved: Engraved,
    imperial: Imperial,
    interwar: Interwar,
    mid: ColdWar,
    web: WebMap,
  }[era];
  return draw({ result, setup, pins });
}

function Frame({
  era,
  result,
  setup,
  range,
  children,
}: {
  era: Era;
  result: Result;
  setup: Setup;
  range: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      className={`cert ${era}`}
      aria-label={`Most likely printed ${result.label}, ${result.sure}% sure`}
    >
      <div className="lab">
        {ERA_NAMES[era].name} · {ERA_NAMES[era].years}
      </div>
      <div className="what">{kindLabel(setup, era)}</div>
      <div className="ml">{era === "engraved" ? "most likely" : "Most likely"}</div>
      {/* Long ranges like "Nov 1961 – 1964" shrink to stay on one line. */}
      <div
        className="y"
        style={{ "--fit": Math.min(1, 11.5 / result.label.length).toFixed(3) } as CSSProperties}
      >
        {range}
      </div>
      <p>is when your globe was printed.</p>
      {children}
    </section>
  );
}

const splitRange = (label: string) => label.split(" – ");

function Engraved({ result, setup, pins }: Props) {
  const ink = "#2B241D";
  const red = "#B8432F";
  const paper = "#F7F2E6";
  const w = 318;
  const s = scaleSpan(result);
  const x = (y: number) => Math.max(0, Math.min(w, ((y - s.from) / (s.to - s.from)) * w));
  const [a, b] = splitRange(result.label);
  const placed = placePins("engraved", pins, 25);
  return (
    <Frame
      era="engraved"
      result={result}
      setup={setup}
      range={
        b ? (
          <>
            {a} <i>to</i> {b}
          </>
        ) : (
          a
        )
      }
    >
      <svg className="scale" viewBox={`0 0 ${w} 54`} aria-hidden="true">
        <defs>
          <pattern
            id="eng-hatch"
            width="4"
            height="4"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <rect width="4" height="4" fill={paper} />
            <path d="M0 0v4" stroke={red} strokeWidth="1.6" />
          </pattern>
        </defs>
        <text
          x={w / 2}
          y="9"
          textAnchor="middle"
          style={{ fontFamily: "var(--font-bodoni)" }}
          fontSize="9"
          fontWeight="600"
          letterSpacing="2.6"
          fill={ink}
        >
          SCALE OF YEARS
        </text>
        <rect
          x={f1(x(s.lo))}
          y="15"
          width={f1(Math.max(3, x(s.hi) - x(s.lo)))}
          height="14"
          fill="url(#eng-hatch)"
          stroke={red}
          strokeWidth="1.2"
        />
        <rect x=".5" y="31" width={w - 1} height="5" fill={paper} stroke={ink} strokeWidth=".9" />
        {fives(s).map((y) => (
          <rect
            key={y}
            x={f1(x(y))}
            y={((y - s.from) / 5) % 2 ? 33.5 : 31}
            width={f1(x(y + 5) - x(y))}
            height="2.5"
            fill={ink}
          />
        ))}
        {Array.from({ length: Math.floor((s.to - s.from) / 5) + 1 }, (_, k) => s.from + k * 5).map(
          (y, k, all) => (
            <text
              key={y}
              x={f1(x(y))}
              y="49"
              textAnchor={k === 0 ? "start" : k === all.length - 1 ? "end" : "middle"}
              style={{ fontFamily: "var(--font-cormorant)" }}
              fontSize="11.5"
              fontWeight="500"
              fill={ink}
            >
              {y}
            </text>
          ),
        )}
      </svg>
      <div className="g">
        {/* biome-ignore lint/performance/noImgElement: a fixed vector globe */}
        <img src="/eras/engraved.svg" alt="" />
        <svg viewBox={`0 0 ${placed.size} ${placed.size}`} aria-hidden="true">
          <Leaders list={placed.list} color={ink} />
          {placed.list.map((p) => (
            <g key={p.n} transform={`translate(${f1(p.at[0])} ${f1(p.at[1])})`}>
              <circle
                r="9"
                fill={p.last ? red : paper}
                stroke={p.last ? paper : ink}
                strokeWidth="1.1"
                strokeDasharray={p.setAside ? "2.5 1.5" : undefined}
              />
              <text
                y="3.4"
                textAnchor="middle"
                style={{ fontFamily: "var(--font-bodoni)" }}
                fontSize={(ROMAN[p.n - 1] ?? "").length > 2 ? 7 : 9}
                fontWeight="700"
                fill={p.last ? paper : ink}
              >
                {ROMAN[p.n - 1]}
              </text>
            </g>
          ))}
        </svg>
      </div>
      <div className="stamp">
        <svg width="112" height="66" viewBox="0 0 112 66" aria-hidden="true">
          <ellipse cx="56" cy="33" rx="53" ry="30" fill={paper} stroke={red} strokeWidth="1.6" />
          <ellipse cx="56" cy="33" rx="48" ry="25.5" fill="none" stroke={red} strokeWidth=".7" />
          <text
            x="56"
            y="34"
            textAnchor="middle"
            style={{ fontFamily: "var(--font-bodoni)" }}
            fontSize="21"
            fontWeight="600"
            fill={red}
          >
            {result.sure} in 100
          </text>
          <text
            x="56"
            y="47"
            textAnchor="middle"
            style={{ fontFamily: "var(--font-cormorant)" }}
            fontStyle="italic"
            fontSize="12"
            fill={red}
          >
            certain
          </text>
        </svg>
      </div>
    </Frame>
  );
}

function Imperial({ result, setup, pins }: Props) {
  const ink = "#2A2A2A";
  const pink = "#EFA9B6";
  const paper = "#F4EBD6";
  const w = 318;
  const s = scaleSpan(result);
  const x = (y: number) => Math.max(0, Math.min(w, ((y - s.from) / (s.to - s.from)) * w));
  const placed = placePins("imperial", pins, 25);
  return (
    <Frame era="imperial" result={result} setup={setup} range={result.label}>
      <svg className="scale" viewBox={`0 0 ${w} 56`} aria-hidden="true">
        <text
          x="0"
          y="9"
          style={{ fontFamily: "var(--font-old-standard)" }}
          fontSize="9.5"
          fontWeight="700"
          letterSpacing="2"
          fill={ink}
        >
          SCALE OF YEARS
        </text>
        <rect
          x={f1(x(s.lo))}
          y="14"
          width={f1(Math.max(3, x(s.hi) - x(s.lo)))}
          height="16"
          fill={pink}
          stroke={ink}
          strokeWidth="1.4"
        />
        <rect
          x=".7"
          y="32"
          width={w - 1.4}
          height="8"
          fill={paper}
          stroke={ink}
          strokeWidth="1.2"
        />
        {years(s).map((y) => (
          <rect
            key={y}
            x={f1(x(y))}
            y={(y - s.from) % 2 ? 36 : 32}
            width={f1(x(y + 1) - x(y))}
            height="4"
            fill={ink}
          />
        ))}
        {Array.from({ length: Math.floor((s.to - s.from) / 5) + 1 }, (_, k) => s.from + k * 5).map(
          (y, k, all) => (
            <text
              key={y}
              x={f1(x(y))}
              y="53"
              textAnchor={k === 0 ? "start" : k === all.length - 1 ? "end" : "middle"}
              style={{ fontFamily: "var(--font-old-standard)" }}
              fontSize="10.5"
              fill={ink}
            >
              {y}
            </text>
          ),
        )}
      </svg>
      <div className="g">
        {/* biome-ignore lint/performance/noImgElement: a fixed vector globe */}
        <img src="/eras/imperial.svg" alt="" />
        <svg viewBox={`0 0 ${placed.size} ${placed.size}`} aria-hidden="true">
          <Leaders list={placed.list} color={ink} />
          {placed.list.map((p) => (
            <g key={p.n} transform={`translate(${f1(p.at[0])} ${f1(p.at[1])})`}>
              <circle
                r="9"
                fill={p.last ? "#C8323A" : p.setAside ? paper : ink}
                stroke={p.setAside ? "#C8323A" : paper}
                strokeWidth="1.6"
                strokeDasharray={p.setAside ? "2.5 1.5" : undefined}
              />
              <text
                y="3.8"
                textAnchor="middle"
                style={{ fontFamily: "var(--font-old-standard)" }}
                fontSize="10.5"
                fontWeight="700"
                fill={p.setAside ? "#C8323A" : paper}
              >
                {p.n}
              </text>
            </g>
          ))}
        </svg>
      </div>
      <div className="stamp">
        <svg width="106" height="58" viewBox="0 0 106 58" aria-hidden="true">
          <rect x="1" y="1" width="104" height="56" fill={pink} stroke={ink} strokeWidth="1.6" />
          <rect x="5" y="5" width="96" height="48" fill="none" stroke={ink} strokeWidth=".7" />
          <text
            x="53"
            y="31"
            textAnchor="middle"
            style={{ fontFamily: "var(--font-old-standard)" }}
            fontSize="22"
            fontWeight="700"
            fill={ink}
          >
            {result.sure}%
          </text>
          <text
            x="53"
            y="45"
            textAnchor="middle"
            style={{ fontFamily: "var(--font-old-standard)" }}
            fontSize="8.5"
            fontWeight="700"
            letterSpacing="2.4"
            fill={ink}
          >
            CERTAIN
          </text>
        </svg>
      </div>
    </Frame>
  );
}

function Interwar({ result, setup, pins }: Props) {
  const ink = "#1C2B2C";
  const teal = "#3B6E72";
  const ochre = "#D7A768";
  const ivory = "#F1E8D0";
  const w = 318;
  const s = scaleSpan(result);
  const x = (y: number) => Math.max(0, Math.min(w, ((y - s.from) / (s.to - s.from)) * w));
  const placed = placePins("interwar", pins, 26);
  const rays = Array.from({ length: 24 }, (_, i) => {
    const a = (i * Math.PI) / 12;
    return `M${f1(40 + Math.cos(a) * 30)} ${f1(40 + Math.sin(a) * 30)}L${f1(40 + Math.cos(a) * 38)} ${f1(40 + Math.sin(a) * 38)}`;
  }).join("");
  return (
    <Frame era="interwar" result={result} setup={setup} range={result.label}>
      <svg className="scale" viewBox={`0 0 ${w} 56`} aria-hidden="true">
        <text
          x={w / 2}
          y="9"
          textAnchor="middle"
          style={{ fontFamily: "var(--font-josefin)" }}
          fontSize="9.5"
          fontWeight="700"
          letterSpacing="3"
          fill={teal}
        >
          SCALE OF YEARS
        </text>
        <rect
          x={f1(x(s.lo))}
          y="15"
          width={f1(Math.max(8, x(s.hi) - x(s.lo)))}
          height="16"
          rx="8"
          fill={ochre}
          stroke={ink}
          strokeWidth="1.4"
        />
        <path d={`M2 37H${w - 2}`} stroke={ink} strokeWidth="2.4" strokeDasharray="7 4" />
        {Array.from({ length: Math.floor((s.to - s.from) / 5) + 1 }, (_, k) => s.from + k * 5).map(
          (y, k, all) => (
            <g key={y}>
              <path d={`M${f1(x(y))} 33v8`} stroke={ink} strokeWidth="1.4" />
              <text
                x={f1(x(y))}
                y="54"
                textAnchor={k === 0 ? "start" : k === all.length - 1 ? "end" : "middle"}
                style={{ fontFamily: "var(--font-josefin)" }}
                fontSize="10.5"
                fontWeight="600"
                fill={ink}
              >
                {y}
              </text>
            </g>
          ),
        )}
      </svg>
      <div className="g">
        {/* biome-ignore lint/performance/noImgElement: a fixed vector globe */}
        <img src="/eras/interwar.svg" alt="" />
        <svg viewBox={`0 0 ${placed.size} ${placed.size}`} aria-hidden="true">
          <Leaders list={placed.list} color={ivory} />
          {placed.list.map((p) => (
            <g key={p.n} transform={`translate(${f1(p.at[0])} ${f1(p.at[1])})`}>
              <rect
                x="-7.5"
                y="-7.5"
                width="15"
                height="15"
                transform="rotate(45)"
                fill={p.last ? "#C2412F" : p.setAside ? ivory : ink}
                stroke={p.setAside ? "#C2412F" : ivory}
                strokeWidth="1.4"
                strokeDasharray={p.setAside ? "2.5 1.5" : undefined}
              />
              <text
                y="3.6"
                textAnchor="middle"
                style={{ fontFamily: "var(--font-josefin)" }}
                fontSize="10"
                fontWeight="700"
                fill={p.setAside ? "#C2412F" : ivory}
              >
                {p.n}
              </text>
            </g>
          ))}
        </svg>
      </div>
      <div className="stamp">
        <svg width="80" height="80" viewBox="0 0 80 80" aria-hidden="true">
          <path d={rays} stroke={ochre} strokeWidth="2.2" />
          <circle cx="40" cy="40" r="27" fill={teal} stroke={ink} strokeWidth="1.4" />
          <circle cx="40" cy="40" r="23" fill="none" stroke={ochre} strokeWidth=".9" />
          <text
            x="40"
            y="44"
            textAnchor="middle"
            style={{ fontFamily: "var(--font-josefin)" }}
            fontSize="17"
            fontWeight="700"
            fill={ivory}
          >
            {result.sure}%
          </text>
          <text
            x="40"
            y="55"
            textAnchor="middle"
            style={{ fontFamily: "var(--font-josefin)" }}
            fontSize="6.5"
            fontWeight="700"
            letterSpacing="1.8"
            fill={ochre}
          >
            SURE
          </text>
        </svg>
      </div>
    </Frame>
  );
}

function ColdWar({ result, setup, pins }: Props) {
  const red = "#D7382F";
  const ink = "#1D1D1B";
  const paper = "#F7F5EE";
  const w = 318;
  const s = scaleSpan(result);
  const x = (y: number) => Math.max(0.8, Math.min(w - 0.8, ((y - s.from) / (s.to - s.from)) * w));
  const placed = placePins("mid", pins, 24);
  return (
    <Frame era="mid" result={result} setup={setup} range={result.label}>
      <svg className="scale" viewBox={`0 0 ${w} 58`} aria-hidden="true">
        <text
          x="0"
          y="9"
          style={{ fontFamily: "var(--font-jost)" }}
          fontSize="9.5"
          fontWeight="600"
          letterSpacing="1.9"
          fill={ink}
        >
          SCALE OF YEARS
        </text>
        <rect
          x={f1(x(s.lo) + 3)}
          y="17"
          width={f1(Math.max(4, x(s.hi) - x(s.lo)))}
          height="18"
          fill={red}
        />
        <rect
          x={f1(x(s.lo))}
          y="14"
          width={f1(Math.max(4, x(s.hi) - x(s.lo)))}
          height="18"
          fill="none"
          stroke={ink}
          strokeWidth="1.6"
        />
        <rect
          x=".8"
          y="36"
          width={w - 1.6}
          height="7"
          fill={paper}
          stroke={ink}
          strokeWidth="1.2"
        />
        {Array.from({ length: Math.ceil((s.to - s.from) / 5) }, (_, k) => s.from + k * 5)
          .filter((_, k) => k % 2 === 0)
          .map((y) => (
            <rect key={y} x={f1(x(y))} y="36" width={f1(x(y + 5) - x(y))} height="7" fill={ink} />
          ))}
        {Array.from({ length: Math.floor((s.to - s.from) / 5) + 1 }, (_, k) => s.from + k * 5).map(
          (y, k, all) => (
            <text
              key={y}
              x={f1(x(y))}
              y="56"
              textAnchor={k === 0 ? "start" : k === all.length - 1 ? "end" : "middle"}
              style={{ fontFamily: "var(--font-jost)" }}
              fontSize="9.5"
              fontWeight="500"
              fill="#4F4C45"
            >
              {y}
            </text>
          ),
        )}
      </svg>
      <div className="g">
        {/* biome-ignore lint/performance/noImgElement: a fixed vector globe */}
        <img src="/eras/mid.svg" alt="" />
        <svg viewBox={`0 0 ${placed.size} ${placed.size}`} aria-hidden="true">
          <Leaders list={placed.list} color={ink} />
          {placed.list.map((p) => (
            <g key={p.n} transform={`translate(${f1(p.at[0])} ${f1(p.at[1])})`}>
              <rect
                x="-8"
                y="-8"
                width="16"
                height="16"
                fill={p.last ? red : p.setAside ? paper : ink}
                stroke={p.setAside ? red : paper}
                strokeWidth="1.5"
                strokeDasharray={p.setAside ? "2.5 1.5" : undefined}
              />
              <text
                y="3.8"
                textAnchor="middle"
                style={{ fontFamily: "var(--font-jost)" }}
                fontSize="10.5"
                fontWeight="700"
                fill={p.setAside ? red : paper}
              >
                {p.n}
              </text>
            </g>
          ))}
        </svg>
      </div>
      <div className="stamp">
        <svg width="100" height="58" viewBox="0 0 100 58" aria-hidden="true">
          <defs>
            <filter id="ink-stamp">
              <feTurbulence
                type="fractalNoise"
                baseFrequency="1.1"
                numOctaves="2"
                seed="9"
                result="n"
              />
              <feColorMatrix
                in="n"
                type="matrix"
                values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.2 1.4"
                result="m"
              />
              <feComposite in="SourceGraphic" in2="m" operator="in" />
            </filter>
          </defs>
          <g filter="url(#ink-stamp)">
            <rect
              x="2"
              y="2"
              width="96"
              height="54"
              rx="5"
              fill="none"
              stroke={red}
              strokeWidth="2.6"
            />
            <text
              x="50"
              y="30"
              textAnchor="middle"
              style={{ fontFamily: "var(--font-jost)" }}
              fontSize="15"
              fontWeight="800"
              letterSpacing="2.5"
              fill={red}
            >
              {result.sure}%
            </text>
            <text
              x="50"
              y="49"
              textAnchor="middle"
              style={{ fontFamily: "var(--font-jost)" }}
              fontSize="7.5"
              fontWeight="700"
              letterSpacing="1.5"
              fill={red}
            >
              SURE
            </text>
          </g>
        </svg>
      </div>
    </Frame>
  );
}

function WebMap({ result, setup, pins }: Props) {
  const blue = "#1A73E8";
  const w = 318;
  const s = scaleSpan(result);
  const x = (y: number) => Math.max(0, Math.min(w, ((y - s.from) / (s.to - s.from)) * w));
  const a = x(s.lo);
  const b = x(s.hi);
  const placed = placePins("web", pins, 22);
  return (
    <Frame era="web" result={result} setup={setup} range={result.label}>
      <svg className="scale" viewBox={`0 0 ${w} 50`} aria-hidden="true">
        <text
          x="0"
          y="9"
          style={{ fontFamily: "var(--font-roboto)" }}
          fontSize="11"
          fontWeight="500"
          fill="#5F6368"
        >
          Years
        </text>
        <rect x="0" y="23" width={w} height="4" rx="2" fill="#DADCE0" />
        <rect x={f1(a)} y="22" width={f1(Math.max(4, b - a))} height="6" rx="3" fill={blue} />
        <circle cx={f1(a)} cy="25" r="8" fill="#fff" stroke={blue} strokeWidth="2.4" />
        <circle cx={f1(b)} cy="25" r="8" fill="#fff" stroke={blue} strokeWidth="2.4" />
        {Array.from({ length: Math.floor((s.to - s.from) / 5) + 1 }, (_, k) => s.from + k * 5).map(
          (y, k) => (
            <text
              key={y}
              x={f1(x(y))}
              y="46"
              textAnchor={k === 0 ? "start" : "middle"}
              style={{ fontFamily: "var(--font-roboto)" }}
              fontSize="10.5"
              fill="#5F6368"
            >
              {y}
            </text>
          ),
        )}
      </svg>
      <div className="g">
        {/* biome-ignore lint/performance/noImgElement: a fixed vector globe */}
        <img src="/eras/web.svg" alt="" />
        <svg viewBox={`0 0 ${placed.size} ${placed.size}`} aria-hidden="true">
          <Leaders list={placed.list} color={blue} />
          {placed.list.map((p) => (
            <g
              key={p.n}
              transform={`translate(${f1(p.at[0])} ${f1(p.at[1] - 13)})`}
              opacity={p.setAside ? 0.5 : 1}
            >
              <path
                d="M0 13C-5 7-9 3.5-9 -1a9 9 0 0118 0c0 4.5-4 8-9 14z"
                fill={p.last ? "#D93025" : blue}
                stroke="#fff"
                strokeWidth="1.4"
              />
              <text
                y="2.8"
                textAnchor="middle"
                style={{ fontFamily: "var(--font-roboto)" }}
                fontSize="9.5"
                fontWeight="700"
                fill="#fff"
              >
                {p.n}
              </text>
            </g>
          ))}
        </svg>
      </div>
      <div className="stamp">
        <span className="sure">
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <circle cx="8" cy="8" r="8" fill="#188038" />
            <path
              d="M4.5 8.3l2.2 2.2 4.6-4.8"
              stroke="#fff"
              strokeWidth="1.8"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {result.sure}% sure
        </span>
      </div>
    </Frame>
  );
}
