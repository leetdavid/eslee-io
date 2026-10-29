import { CANT_SEE, pYes, shownCurve } from "./model";
import { currentMonth, type Month, monthLabel, monthName, parseDate, yearOf } from "./months";
import type { Bound, EngineEvent, Era, Next, Region, Result, Setup, Turn, Window } from "./types";

const MAX_QUESTIONS = 15;
/** Keep asking while the best question is expected to narrow the range by this many months. */
const MIN_NARROWING = 3;
const MASS = 0.9;
// With a 10% misread rate no answer is ever less likely than 0.1, so these sit just above it.
/** An answer this unlikely given the earlier ones starts a tie-breaker. */
const CLASH = 0.2;
/** An answer this unlikely given all the others is set aside on the result. */
const SET_ASIDE = 0.2;
const MAX_HINGE_CHECKS = 2;

type Posterior = Float64Array;

// Typed-array reads inside bounds; the shared tsconfig types every index read as possibly undefined.
const at = (a: ArrayLike<number>, i: number) => a[i] ?? 0;

const entropy = (p: number) =>
  p <= 0 || p >= 1 ? 0 : -(p * Math.log2(p) + (1 - p) * Math.log2(1 - p));

export type Engine = ReturnType<typeof createEngine>;

export function createEngine(events: EngineEvent[], opts: { now: Date }) {
  const N = currentMonth(opts.now) + 1;
  const byId = new Map(events.map((e) => [e.id, e]));
  // Per event and month: P(yes), and the entropy of that answer, worked out once.
  const curves = new Map<string, { yes: Float32Array; h: Float32Array }>();
  const curve = (id: string) => {
    let c = curves.get(id);
    if (!c) {
      const event = byId.get(id);
      if (!event) throw new Error(`Unknown event ${id}`);
      const yes = shownCurve(event, N).map((p) => pYes(p));
      c = { yes, h: yes.map(entropy) };
      curves.set(id, c);
    }
    return c;
  };

  /** Turns that count toward the result: answered yes or no, about a live event. */
  const counts = (t: Turn) => t.answer !== "cant" && byId.get(t.eventId)?.trial === false;

  function apply(P: Posterior, eventId: string, yes: boolean) {
    const c = curve(eventId).yes;
    let total = 0;
    for (let m = 0; m < N; m++) {
      const p = at(c, m);
      const v = at(P, m) * (yes ? p : 1 - p);
      P[m] = v;
      total += v;
    }
    for (let m = 0; m < N; m++) P[m] = at(P, m) / total;
    return P;
  }

  /** Likelihood over months given the counted turns, leaving out `skip` and flipping `flip`. */
  function posterior(
    turns: Turn[],
    { skip, flip }: { skip?: number; flip?: number } = {},
  ): Posterior {
    const P = new Float64Array(N).fill(1 / N);
    turns.forEach((t, i) => {
      if (i === skip || !counts(t)) return;
      apply(P, t.eventId, (t.answer === "yes") !== (i === flip));
    });
    return P;
  }

  function windowOf(P: Posterior): Window {
    let best = { from: 0, to: N - 1 };
    let mass = 0;
    let a = 0;
    for (let b = 0; b < N; b++) {
      mass += at(P, b);
      while (mass - at(P, a) >= MASS) mass -= at(P, a++);
      if (mass >= MASS && b - a < best.to - best.from) best = { from: a, to: b };
    }
    return best;
  }

  /** P(yes) for an event under a posterior. */
  function chanceYes(P: Posterior, eventId: string) {
    const c = curve(eventId).yes;
    let py = 0;
    for (let m = 0; m < N; m++) py += at(P, m) * at(c, m);
    return py;
  }

  function visibility(e: EngineEvent, setup: Setup, cantRegions: Set<Region>) {
    if (e.regional && (setup.kind !== "part" || !setup.regions.includes(e.region))) return 0;
    let v = 1 - CANT_SEE[e.size];
    // On part of the world, a can't see suggests that area is off the map, so stop asking about it.
    if (setup.kind === "part")
      v *= cantRegions.has(e.region) ? 0.05 : setup.regions.includes(e.region) ? 0.9 : 0.2;
    return v;
  }

  function candidates(setup: Setup, turns: Turn[], trial: boolean) {
    const asked = new Set(turns.map((t) => t.eventId));
    const cantRegions = new Set<Region>();
    for (const t of turns) {
      const e = byId.get(t.eventId);
      if (e && t.answer === "cant") cantRegions.add(e.region);
    }
    return events
      .filter((e) => e.trial === trial && !asked.has(e.id))
      .map((e) => ({ event: e, visible: visibility(e, setup, cantRegions) }))
      .filter((c) => c.visible > 0);
  }

  /** Expected information from asking, weighted by the chance the player can see it. */
  function score(P: Posterior, active: number[], eventId: string, visible: number) {
    const { yes, h } = curve(eventId);
    let py = 0;
    let hc = 0;
    for (const m of active) {
      const p = at(P, m);
      py += p * at(yes, m);
      hc += p * at(h, m);
    }
    return visible * (entropy(py) - hc);
  }

  /**
   * The spread of the likelihood in months: 2^entropy, which is W for an even spread over W months.
   * The 90% range itself barely moves after any one answer, because a misread keeps 10% on the other side,
   * so narrowing is measured on this instead: a question worth b bits is expected to shrink it by a factor 2^-b.
   */
  function spread(P: Posterior) {
    let h = 0;
    for (let m = 0; m < N; m++) {
      const p = at(P, m);
      if (p > 0) h -= p * Math.log2(p);
    }
    return 2 ** h;
  }

  /** The most plausible single misread that would move the range somewhere else entirely. */
  function findHinge(turns: Turn[], P: Posterior) {
    const current = windowOf(P);
    let best: { turn: number; alt: Posterior; plausibility: number } | null = null;
    turns.forEach((t, i) => {
      if (!counts(t)) return;
      const without = posterior(turns, { skip: i });
      const pOther =
        t.answer === "yes" ? 1 - chanceYes(without, t.eventId) : chanceYes(without, t.eventId);
      const alt = posterior(turns, { flip: i });
      const w = windowOf(alt);
      if (w.to >= current.from && w.from <= current.to) return;
      if (!best || pOther > best.plausibility) best = { turn: i, alt, plausibility: pOther };
    });
    return best as { turn: number; alt: Posterior; plausibility: number } | null;
  }

  /** The question that best tells two explanations apart. */
  function separator(setup: Setup, turns: Turn[], A: Posterior, B: Posterior) {
    let best: { id: string; sep: number } | null = null;
    for (const { event, visible } of candidates(setup, turns, false)) {
      const sep = visible * Math.abs(chanceYes(A, event.id) - chanceYes(B, event.id));
      if (!best || sep > best.sep) best = { id: event.id, sep };
    }
    return best;
  }

  function next(setup: Setup, turns: Turn[]): Next {
    if (turns.length >= MAX_QUESTIONS) return { type: "done" };

    // A clash: the last counted answer is unlikely given the earlier ones, and nothing has settled it yet.
    const lastIndex = turns.length - 1;
    const last = turns[lastIndex];
    if (last && counts(last) && last.reason !== "settle") {
      const before = posterior(turns.slice(0, lastIndex));
      const p = chanceYes(before, last.eventId);
      if ((last.answer === "yes" ? p : 1 - p) < CLASH) {
        // Its partner is the earlier answer whose removal makes the last one most believable.
        let partner = -1;
        let bestP = -1;
        turns.slice(0, lastIndex).forEach((t, i) => {
          if (!counts(t)) return;
          const without = posterior(turns.slice(0, lastIndex), { skip: i });
          const q = chanceYes(without, last.eventId);
          const fit = last.answer === "yes" ? q : 1 - q;
          if (fit > bestP) {
            bestP = fit;
            partner = i;
          }
        });
        if (partner >= 0) {
          const s = separator(
            setup,
            turns,
            posterior(turns, { skip: partner }),
            posterior(turns, { skip: lastIndex }),
          );
          if (s && s.sep >= 0.3)
            return { type: "ask", eventId: s.id, reason: "settle", turns: [partner, lastIndex] };
        }
      }
    }

    const P = posterior(turns);
    const peak = P.reduce((a, b) => Math.max(a, b), 0);
    const active: number[] = [];
    for (let m = 0; m < N; m++) if (at(P, m) > peak * 1e-6) active.push(m);

    let best: { id: string; bits: number } | null = null;
    for (const c of candidates(setup, turns, false)) {
      const bits = score(P, active, c.event.id, c.visible);
      if (!best || bits > best.bits) best = { id: c.event.id, bits };
    }
    if (best && spread(P) * (1 - 2 ** -best.bits) >= MIN_NARROWING)
      return { type: "ask", eventId: best.id, reason: "narrow" };

    // Before stopping, check the answer the result hinges on, up to twice.
    if (turns.filter((t) => t.reason === "hinge").length < MAX_HINGE_CHECKS) {
      const hinge = findHinge(turns, P);
      if (hinge && hinge.plausibility > 0.02) {
        const s = separator(setup, turns, P, hinge.alt);
        if (s && s.sep >= 0.5) return { type: "ask", eventId: s.id, reason: "hinge" };
      }
    }

    // One trial question per game, the trial event the current answers are least sure about.
    if (!turns.some((t) => t.reason === "trial")) {
      let pick: { id: string; h: number } | null = null;
      for (const { event, visible } of candidates(setup, turns, true)) {
        if (visible < 0.5) continue;
        const h = entropy(chanceYes(P, event.id));
        if (h > 0.6 && (!pick || h > pick.h)) pick = { id: event.id, h };
      }
      if (pick) return { type: "ask", eventId: pick.id, reason: "trial" };
    }
    return { type: "done" };
  }

  /** The range now, and where it would go after each answer to `eventId`, for the question's scale. */
  function preview(turns: Turn[], eventId: string) {
    const P = posterior(turns);
    return {
      current: windowOf(P),
      ifYes: windowOf(apply(P.slice(), eventId, true)),
      ifNo: windowOf(apply(P.slice(), eventId, false)),
    };
  }

  function result(turns: Turn[]): Result {
    const P = posterior(turns);
    const window = windowOf(P);

    const setAside: number[] = [];
    turns.forEach((t, i) => {
      if (!counts(t)) return;
      const p = chanceYes(posterior(turns, { skip: i }), t.eventId);
      if ((t.answer === "yes" ? p : 1 - p) < SET_ASIDE) setAside.push(i);
    });

    const notBefore = bound(turns, setAside, window.from, "before");
    const notAfter = bound(turns, setAside, window.to, "after");
    const today = window.to >= N - 3;
    // An end shows its month only when a dated-to-the-month answer sets it and the end sits right at that date.
    const precise = (b: Bound | null, end: Month) => {
      if (!b) return false;
      const d = parseDate(b.date);
      return d.precise && Math.abs(end - d.month) <= 12;
    };
    const fromPrecise = precise(notBefore, window.from);
    const toPrecise = today || precise(notAfter, window.to);
    const from = fromPrecise ? window.from : window.from - (window.from % 12);
    const to = toPrecise ? window.to : Math.min(N - 1, window.to - (window.to % 12) + 11);
    let sure = 0;
    for (let m = from; m <= to; m++) sure += at(P, m);

    let mostLikely = 0;
    for (let m = 1; m < N; m++) if (at(P, m) > at(P, mostLikely)) mostLikely = m;

    const years: number[] = [];
    for (let m = 0; m < N; m++) {
      const y = Math.floor(m / 12);
      years[y] = (years[y] ?? 0) + at(P, m);
    }

    const hinge = findHinge(turns, P);
    return {
      window,
      from: { month: window.from, precise: fromPrecise },
      to: { month: window.to, precise: toPrecise },
      label: rangeLabel(window.from, fromPrecise, window.to, toPrecise, today),
      sure: Math.min(99, Math.floor(sure * 100)),
      mostLikely,
      era: eraOf(yearOf(Math.round((window.from + window.to) / 2))),
      notBefore,
      notAfter,
      hinge: hinge
        ? {
            turn: hinge.turn,
            eventId: turns[hinge.turn]?.eventId ?? "",
            label: rangeLabel(
              windowOf(hinge.alt).from,
              false,
              windowOf(hinge.alt).to,
              false,
              false,
            ),
          }
        : null,
      setAside,
      years,
    };
  }

  /**
   * The answer that most cuts off the months beyond one end of the range,
   * and the event date it rests on: the latest date on or before that end.
   */
  function bound(
    turns: Turn[],
    setAside: number[],
    end: Month,
    side: "before" | "after",
  ): Bound | null {
    let best: { turn: number; ratio: number } | null = null;
    turns.forEach((t, i) => {
      if (!counts(t) || setAside.includes(i)) return;
      const c = curve(t.eventId).yes;
      const agree = (m: number) => {
        const p = at(c, Math.max(0, Math.min(N - 1, m)));
        return t.answer === "yes" ? p : 1 - p;
      };
      let outside = 0;
      let inside = 0;
      for (let k = 1; k <= 24; k++) {
        outside += agree(side === "before" ? end - k : end + k);
        inside += agree(side === "before" ? end + k - 1 : end - k + 1);
      }
      const ratio = outside / inside;
      if (ratio < 0.9 && (!best || ratio < best.ratio)) best = { turn: i, ratio };
    });
    const found = best as { turn: number; ratio: number } | null;
    if (!found) return null;
    const event = byId.get(turns[found.turn]?.eventId ?? "");
    if (!event) return null;
    const dates = event.spans
      .flatMap((s) => (s.until ? [s.from, s.until] : [s.from]))
      .filter((d) => parseDate(d).month >= 0 && parseDate(d).month <= end + 1)
      .sort((a, b) => parseDate(b).month - parseDate(a).month);
    return dates[0] ? { turn: found.turn, eventId: event.id, date: dates[0] } : null;
  }

  return { months: N, next, preview, result, windowOf, posterior };
}

export function eraOf(year: number): Era {
  if (year < 1870) return "engraved";
  if (year < 1919) return "imperial";
  if (year < 1946) return "interwar";
  if (year < 1992) return "mid";
  return "web";
}

/** "Nov 1860 – 1862", "1962 – 1963", "Mar – Nov 1935", "1963", "Jul 2011 – today". */
export function rangeLabel(
  from: Month,
  fromPrecise: boolean,
  to: Month,
  toPrecise: boolean,
  today: boolean,
) {
  const end = today ? "today" : toPrecise ? monthLabel(to) : String(yearOf(to));
  if (!today && yearOf(from) === yearOf(to)) {
    if (fromPrecise && toPrecise)
      return from === to ? monthLabel(from) : `${monthName(from)} – ${monthLabel(to)}`;
    if (!fromPrecise && !toPrecise) return String(yearOf(from));
  }
  return `${fromPrecise ? monthLabel(from) : yearOf(from)} – ${end}`;
}

export const width = (w: Window) => w.to - w.from + 1;
