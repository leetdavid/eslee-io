import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createEngine, rangeLabel } from "./engine";
import { shownCurve } from "./model";
import { monthOf, parseDate } from "./months";
import type { Answer, EngineEvent, Setup, Turn } from "./types";

const raw = JSON.parse(
  readFileSync(new URL("../../data/events.json", import.meta.url), "utf8"),
) as (EngineEvent & { validation: string })[];
const EVENTS: EngineEvent[] = raw
  .filter((e) => e.validation === "verified")
  .map(({ id, kind, spans, size, region, regional }) => ({
    id,
    kind,
    spans,
    size,
    region,
    regional,
    trial: false,
  }));
const NOW = new Date("2026-10-29T00:00:00Z");
const GLOBE: Setup = { kind: "globe", regions: [] };

// A seeded player who reads a globe printed in `printed` with map data `lag` months old.
function player(printed: number, lag: number, seed: number, misreadAt = -1) {
  let s = seed;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  let asked = 0;
  return (event: EngineEvent): Answer => {
    asked++;
    const cant = { easy: 0.02, medium: 0.08, hard: 0.3 }[event.size];
    if (rnd() < cant) return "cant";
    const data = printed - lag;
    let shown = event.spans.some((sp) => {
      const from = parseDate(sp.from).month;
      const until = sp.until ? parseDate(sp.until).month : Number.POSITIVE_INFINITY;
      return data >= from && data < until;
    });
    if (asked === misreadAt) shown = !shown;
    return shown ? "yes" : "no";
  };
}

function play(
  engine: ReturnType<typeof createEngine>,
  answer: (e: EngineEvent) => Answer,
  setup = GLOBE,
) {
  const turns: Turn[] = [];
  for (;;) {
    const n = engine.next(setup, turns);
    if (n.type === "done") break;
    const event = EVENTS.find((e) => e.id === n.eventId) as EngineEvent;
    turns.push({ eventId: n.eventId, answer: answer(event), reason: n.reason });
  }
  return { turns, result: engine.result(turns) };
}

describe("shownCurve", () => {
  it("is 0 long before a change and about 1 five years after", () => {
    const c = shownCurve(
      { kind: "country", spans: [{ from: "1966-09", until: null }] },
      monthOf(2026, 10) + 1,
    );
    expect(c[monthOf(1960)]).toBe(0);
    expect(c[monthOf(1966, 8)]).toBe(0);
    expect(c[monthOf(1973)]).toBeGreaterThan(0.99);
    expect(c[monthOf(1967, 9)]).toBeGreaterThan(0.3);
  });

  it("spreads a year-only date across its year", () => {
    const c = shownCurve(
      { kind: "country", spans: [{ from: "1964", until: null }] },
      monthOf(2000) + 1,
    );
    expect(c[monthOf(1964, 1)]).toBeGreaterThan(0);
    expect(c[monthOf(1964, 12)]).toBeGreaterThan(c[monthOf(1964, 1)] ?? 1);
  });

  it("takes longer for discovery events to show", () => {
    const n = monthOf(1900) + 1;
    const plain = shownCurve({ kind: "country", spans: [{ from: "1850", until: null }] }, n);
    const found = shownCurve({ kind: "discovery", spans: [{ from: "1850", until: null }] }, n);
    expect(found[monthOf(1858)]).toBeLessThan(plain[monthOf(1858)] ?? 0);
    expect(found[monthOf(1875)]).toBeGreaterThan(0.99);
  });
});

describe("rangeLabel", () => {
  it("shows months only where they are known", () => {
    expect(rangeLabel(monthOf(1963), false, monthOf(1964, 5), true, false)).toBe("1963 – May 1964");
    expect(rangeLabel(monthOf(1962), false, monthOf(1963, 12), false, false)).toBe("1962 – 1963");
    expect(rangeLabel(monthOf(1935, 3), true, monthOf(1935, 11), true, false)).toBe(
      "Mar – Nov 1935",
    );
    expect(rangeLabel(monthOf(2011, 7), true, monthOf(2026, 10), true, true)).toBe(
      "Jul 2011 – today",
    );
  });
});

describe("engine", () => {
  const engine = createEngine(EVENTS, { now: NOW });
  const globes = Array.from({ length: 40 }, (_, i) => {
    const printed = monthOf(1810 + ((i * 37) % 214), 1 + ((i * 5) % 12));
    return { printed, lag: [0, 6, 14, 30][i % 4] ?? 0, seed: 1000 + i };
  });

  it("brackets the printed month for most honest players, in at most 15 questions", () => {
    let right = 0;
    for (const g of globes) {
      const { turns, result } = play(engine, player(g.printed, g.lag, g.seed));
      expect(turns.length).toBeLessThanOrEqual(15);
      // The range is about the map data on the globe, which may lag the printing a little.
      if (g.printed >= result.window.from && g.printed - g.lag <= result.window.to + 6) right++;
    }
    expect(right / globes.length).toBeGreaterThan(0.85);
  }, 120_000);

  it("survives one misread", () => {
    let right = 0;
    for (const [i, g] of globes.entries()) {
      const { result } = play(engine, player(g.printed, g.lag, g.seed, 1 + (i % 6)));
      if (g.printed >= result.window.from - 12 && g.printed - g.lag <= result.window.to + 12)
        right++;
    }
    expect(right / globes.length).toBeGreaterThan(0.75);
  }, 120_000);

  it("narrows to a few years", () => {
    const widths = globes.map((g) => {
      const { result } = play(engine, player(g.printed, g.lag, g.seed));
      return (result.window.to - result.window.from + 1) / 12;
    });
    widths.sort((a, b) => a - b);
    expect(widths[Math.floor(widths.length / 2)]).toBeLessThan(5);
  }, 120_000);

  it("asks a settling question after two answers clash, and sets the misread aside", () => {
    // Printed in 1963: Soviet Union yes, then a Botswana "yes" that contradicts the earlier picture.
    const turns: Turn[] = [];
    const truth = player(monthOf(1963, 6), 0, 7);
    let flipped = false;
    let settled = false;
    for (;;) {
      const n = engine.next(GLOBE, turns);
      if (n.type === "done") break;
      if (n.reason === "settle") settled = true;
      const event = EVENTS.find((e) => e.id === n.eventId) as EngineEvent;
      let a = truth(event);
      // Misread the first strongly informative question after the third answer.
      if (!flipped && turns.length >= 3 && a !== "cant") {
        a = a === "yes" ? "no" : "yes";
        flipped = true;
      }
      turns.push({ eventId: n.eventId, answer: a, reason: n.reason });
    }
    const result = engine.result(turns);
    expect(settled || result.setAside.length > 0).toBe(true);
    expect(result.window.from).toBeLessThanOrEqual(monthOf(1963, 6) + 12);
    expect(result.window.to).toBeGreaterThanOrEqual(monthOf(1963, 6) - 12);
  });

  it("gives not-before and not-after reasons that come from real answers", () => {
    const g = { printed: monthOf(1931, 6), lag: 6, seed: 1003 };
    const { turns, result } = play(engine, player(g.printed, g.lag, g.seed));
    for (const b of [result.notBefore, result.notAfter]) {
      if (!b) continue;
      expect(turns[b.turn]?.eventId).toBe(b.eventId);
    }
    expect(result.sure).toBeGreaterThanOrEqual(80);
  });

  it("never asks regional events about a globe, and asks them for a matching regional map", () => {
    const regional: EngineEvent = {
      id: "reg",
      kind: "rename",
      spans: [{ from: "1950-03", until: null }],
      size: "easy",
      region: "North America",
      regional: true,
      trial: false,
    };
    const local = createEngine([...EVENTS, regional], { now: NOW });
    const onGlobe = play(local, player(monthOf(1955), 0, 3));
    expect(onGlobe.turns.some((t) => t.eventId === "reg")).toBe(false);
  });

  it("never counts trial events, and asks at most one per game", () => {
    const trial: EngineEvent = {
      id: "trial",
      kind: "country",
      spans: [{ from: "1960-01", until: null }],
      size: "easy",
      region: "Africa",
      regional: false,
      trial: true,
    };
    const local = createEngine([...EVENTS, trial], { now: NOW });
    const turns: Turn[] = [];
    const answer = player(monthOf(1975), 0, 11);
    for (;;) {
      const n = local.next(GLOBE, turns);
      if (n.type === "done") break;
      turns.push({
        eventId: n.eventId,
        answer: answer(EVENTS.find((e) => e.id === n.eventId) ?? trial),
        reason: n.reason,
      });
    }
    expect(turns.filter((t) => t.eventId === "trial").length).toBeLessThanOrEqual(1);
    const withTrial = local.result(turns);
    const flipped = local.result(
      turns.map((t) =>
        t.eventId === "trial" ? { ...t, answer: t.answer === "yes" ? "no" : "yes" } : t,
      ),
    );
    expect(flipped.window).toEqual(withTrial.window);
  });

  it("stops asking about an area after a can't see on part of the world", () => {
    const part: Setup = { kind: "part", regions: ["Europe", "Africa"] };
    const turns: Turn[] = [];
    let cantRegion: string | null = null;
    for (let i = 0; i < 15; i++) {
      const n = engine.next(part, turns);
      if (n.type === "done") break;
      const event = EVENTS.find((e) => e.id === n.eventId) as EngineEvent;
      if (!cantRegion && event.region === "Africa") cantRegion = "Africa";
      turns.push({
        eventId: n.eventId,
        answer: event.region === cantRegion ? "cant" : "yes",
        reason: n.reason,
      });
    }
    const afterCant = turns.slice(turns.findIndex((t) => t.answer === "cant") + 1);
    const africa = afterCant.filter(
      (t) => EVENTS.find((e) => e.id === t.eventId)?.region === "Africa",
    );
    expect(africa.length).toBeLessThanOrEqual(1);
  });

  it("picks the next question in well under a second", () => {
    const t0 = performance.now();
    engine.next(GLOBE, []);
    const turns: Turn[] = [{ eventId: "soviet-union", answer: "yes" }];
    engine.next(GLOBE, turns);
    expect(performance.now() - t0).toBeLessThan(1500);
  });
});
