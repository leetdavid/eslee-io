import Link from "next/link";
import { Brand } from "@/components/brand";
import { ArrowIcon } from "@/components/icons";

const ERAS = [
  {
    name: "Engraved",
    years: "1805–69",
    font: "var(--font-bodoni)",
    style: "italic",
    weight: 500,
    x: "12%",
    y: 0,
  },
  {
    name: "Imperial",
    years: "1870–1918",
    font: "var(--font-old-standard)",
    style: "normal",
    weight: 700,
    x: "30%",
    y: 22,
  },
  {
    name: "INTERWAR",
    years: "1919–45",
    font: "var(--font-josefin)",
    style: "normal",
    weight: 700,
    x: "49%",
    y: 0,
  },
  {
    name: "COLD WAR",
    years: "1946–91",
    font: "var(--font-jost)",
    style: "normal",
    weight: 700,
    x: "69%",
    y: 22,
  },
  {
    name: "Web map",
    years: "1992–now",
    font: "var(--font-roboto)",
    style: "normal",
    weight: 500,
    x: "87%",
    y: 0,
  },
] as const;

// The five reveal looks along the years, ending at today.
const BAND = [
  { from: 1805, to: 1870, fill: "repeating-linear-gradient(45deg,#f1e6cc 0 3px,#e2d3ae 3px 4px)" },
  { from: 1870, to: 1919, fill: "#efa9b6" },
  { from: 1919, to: 1946, fill: "#3b6e72" },
  { from: 1946, to: 1992, fill: "#f6dc7a" },
  { from: 1992, to: 2026, fill: "#aad3df" },
];
const pct = (y: number) => `${((y - 1805) / (2026 - 1805)) * 100}%`;

export default function StartPage() {
  return (
    <main className="app">
      <header className="flex h-[74px] items-center justify-between pt-3">
        <Brand />
        <a href="#how" className="text-[13px] text-muted underline underline-offset-[3px]">
          How it works
        </a>
      </header>

      <h1 className="mt-3 leading-[0.98] tracking-[-0.03em]">
        <span className="block text-[54px]">
          <span style={{ fontFamily: "var(--font-bodoni)", fontStyle: "italic", fontWeight: 500 }}>
            How
          </span>{" "}
          <span style={{ fontFamily: "var(--font-old-standard)", fontWeight: 700 }}>old is</span>
        </span>
        <span className="block font-semibold text-[54px]">
          <span style={{ fontFamily: "var(--font-jost)", fontWeight: 700 }}>that</span> globe?
        </span>
      </h1>
      <p className="mt-3 text-[16px] text-muted leading-[1.42]">
        Answer <b className="text-ink">yes</b>, <b className="text-ink">no</b> or{" "}
        <b className="text-ink">can&apos;t tell</b>. When the years run out, your answer arrives in
        the style of your globe&apos;s own era.
      </p>

      {/* biome-ignore lint/performance/noImgElement: a fixed vector illustration */}
      <img
        src="/brand/hero.svg"
        alt="One globe drawn in five slices, from an 1800s engraving to a web map"
        className="mx-auto mt-3 block w-[min(320px,86%)]"
      />
      <div className="relative h-[52px]" aria-hidden="true">
        {ERAS.map((e) => (
          <div
            key={e.name}
            className="absolute -translate-x-1/2 text-center"
            style={{ left: e.x, top: e.y }}
          >
            <div
              style={{
                fontFamily: e.font,
                fontStyle: e.style,
                fontWeight: e.weight,
                fontSize: 13,
                letterSpacing: e.name === e.name.toUpperCase() ? "0.12em" : 0,
              }}
            >
              {e.name}
            </div>
            <div className="mono text-[9.5px] text-faint">{e.years}</div>
          </div>
        ))}
      </div>

      <div className="mt-3" aria-hidden="true">
        <div className="mono flex justify-between text-[9.5px] text-muted tracking-[0.1em]">
          <span>SCALE OF YEARS · FIVE REVEAL STYLES</span>
          <span className="text-red">TODAY</span>
        </div>
        <div className="relative mt-1 flex h-[16px] overflow-hidden rounded-[2px] shadow-[0_0_0_1.2px_#161513]">
          {BAND.map((b) => (
            <div
              key={b.from}
              style={{ width: `calc(${pct(b.to)} - ${pct(b.from)})`, background: b.fill }}
            />
          ))}
        </div>
        <div className="mono relative mt-1 h-3 text-[9.5px] text-muted">
          {[1805, 1870, 1919, 1946, 1992].map((y) => (
            <span
              key={y}
              className="absolute -translate-x-1/2"
              style={{ left: y === 1805 ? "3%" : pct(y) }}
            >
              {y}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-auto pt-6">
        <Link href="/play" className="cta">
          <span>Start dating</span>
          <i>
            <ArrowIcon />
          </i>
        </Link>
      </div>

      <section id="how" className="mt-10 flex flex-col gap-3 pb-6">
        <h2 className="font-semibold text-[22px] tracking-[-0.02em]">How it works</h2>
        {[
          [
            "Look",
            "Each question asks about one thing that changed on maps: a new country, a new name, a moved border or a new lake.",
          ],
          [
            "Answer",
            "Yes if your globe shows it, no if it isn't there, can't tell if that part is cut off or too small to read. A misread or two is fine; the questions check each other.",
          ],
          [
            "Narrow",
            "Every answer rules out years. After about a dozen questions you get the most likely range, to the month where the answers can tell.",
          ],
        ].map(([title, text], i) => (
          <div key={title} className="tile flex gap-3">
            <span className="badge" style={{ background: "#161513" }}>
              {i + 1}
            </span>
            <p className="text-[14px] text-muted leading-[1.42]">
              <b className="block font-semibold text-[15px] text-ink">{title}</b>
              {text}
            </p>
          </div>
        ))}
        <Link href="/add" className="secondary mt-2">
          Know a change we don&apos;t ask about? Add it
        </Link>
      </section>
    </main>
  );
}
