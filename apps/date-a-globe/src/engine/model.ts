import { type Month, parseDate } from "./months";
import type { EngineEvent } from "./types";

// Publisher lag: how many years after a change a newly printed globe shows it.
// Ordinary changes: P(0..5 years). Discovery events took far longer, so their lag falls off over 20 years.
const LAG_YEARS = [0.35, 0.3, 0.17, 0.1, 0.05, 0.03];
const DISCOVERY_LAG_YEARS = (() => {
  const raw = Array.from({ length: 21 }, (_, k) => 21 - k);
  const total = raw.reduce((a, b) => a + b, 0);
  return raw.map((v) => v / total);
})();

/** The chance an answer disagrees with the globe. Trial events are never counted, so they have no rate here. */
export const MISREAD = 0.1;

/** The chance a feature of this size can't be found or read on a globe. */
export const CANT_SEE = { easy: 0.02, medium: 0.08, hard: 0.3 } as const;

/**
 * P(the globe shows the event's feature | printed in month m), for m in [0, months).
 * A year-only date is spread evenly over its year, so it can't separate months within that year.
 */
export function shownCurve(
  event: Pick<EngineEvent, "spans" | "kind">,
  months: number,
): Float32Array {
  const lag = event.kind === "discovery" ? DISCOVERY_LAG_YEARS : LAG_YEARS;
  const pad = lag.length * 12;
  // on[t + pad] = P(the feature exists in month t), for t in [-pad, months).
  const on = new Float64Array(months + pad);
  for (const span of event.spans) {
    const start = parseDate(span.from);
    const end = span.until ? parseDate(span.until) : null;
    for (let t = -pad; t < months; t++) {
      on[t + pad] = Math.min(1, (on[t + pad] ?? 0) + edge(start, t) * (end ? 1 - edge(end, t) : 1));
    }
  }
  // Prefix sums turn each lag year into one subtraction.
  const sum = new Float64Array(on.length + 1);
  for (let i = 0; i < on.length; i++) sum[i + 1] = (sum[i] ?? 0) + (on[i] ?? 0);
  const upTo = (i: number) => sum[Math.max(0, Math.min(on.length, i))] ?? 0;
  const between = (a: number, b: number) => upTo(b) - upTo(a);
  const curve = new Float32Array(months);
  for (let m = 0; m < months; m++) {
    let p = 0;
    // Lag year k covers lags of 12k..12k+11 months, so data months m-12k-11..m-12k.
    lag.forEach((share, k) => {
      p += (share / 12) * between(m - 12 * k - 11 + pad, m - 12 * k + 1 + pad);
    });
    curve[m] = p;
  }
  return curve;
}

// How far month t is past a date: 0 before it, 1 after it, and a ramp across the year when only the year is known.
function edge(date: { month: Month; precise: boolean }, t: Month) {
  if (date.precise) return t >= date.month ? 1 : 0;
  const k = t - date.month;
  if (k < 0) return 0;
  if (k >= 12) return 1;
  return (k + 0.5) / 12;
}

/** P(the player answers yes | printed in a month where the feature shows with probability shown). */
export const pYes = (shown: number, misread = MISREAD) =>
  (1 - misread) * shown + misread * (1 - shown);
