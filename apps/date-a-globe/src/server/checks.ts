import "server-only";

import { parseDate, type Region, yearOf } from "@/engine";
import { regionsOf } from "@/lib/countries";
import { type Submission, similarity } from "@/lib/submission";
import { FetchError, fetchPage, pageText, USER_AGENT } from "@/server/safe-fetch";

export type CheckStatus = "pass" | "warn" | "fail";
export interface Check {
  status: CheckStatus;
  label: string;
  detail: string;
  /** The existing event this check is about, if any. */
  eventId?: string;
}
export interface SourceCheck {
  url: string;
  opens: boolean;
  mentions: boolean;
  years: number[];
  found: number[];
  quote: string | null;
  error?: string;
}
export interface Checks {
  duplicate: Check;
  dates: Check;
  pin: Check;
  clash: Check;
  sources: SourceCheck[];
  place: string | null;
}

/** The events a submission is compared with: everything except rejected ones. */
export interface KnownEvent {
  id: string;
  title: string;
  kind: string;
  region: string;
  lat: number;
  lon: number;
  spans: { from: string; until: string | null }[];
  status: string;
}

const kindOf = (change: Submission["change"]) => change;
const yearsOf = (span: Submission["span"]) =>
  [span.from, span.until].filter((d): d is string => !!d).map((d) => yearOf(parseDate(d).month));
const distance = (a: { lat: number; lon: number }, b: { lat: number; lon: number }) =>
  Math.hypot(a.lat - b.lat, (a.lon - b.lon) * Math.cos((a.lat * Math.PI) / 180));

/** Close in name, or the same kind of change in the same place. */
export function nearest(s: Submission, known: KnownEvent[]) {
  let best: { event: KnownEvent; score: number } | null = null;
  for (const e of known) {
    const byName = similarity(`${s.name} ${s.before ?? ""}`, e.title);
    const byPlace = e.kind === kindOf(s.change) && distance(s, e) < 2 ? 0.4 : 0;
    const score = Math.max(byName, byPlace);
    if (!best || score > best.score) best = { event: e, score };
  }
  return best;
}

// A date before 1805 means "already there in 1805", the first month we date.
const boundaryMonths = (spans: KnownEvent["spans"]) =>
  spans.flatMap((sp) =>
    [sp.from, sp.until].filter((d): d is string => !!d).map((d) => Math.max(0, parseDate(d).month)),
  );

/** Duplicate: the same change we already ask. Clash: what looks like the same change with other dates. */
export function compareWithKnown(
  s: Submission,
  known: KnownEvent[],
): { duplicate: Check; clash: Check } {
  const close = nearest(s, known);
  const mine = boundaryMonths([s.span]);
  if (!close || close.score < 0.5) {
    return {
      duplicate: {
        status: "pass",
        label: "Not a duplicate",
        detail:
          close && close.score >= 0.2
            ? `Closest is ${close.event.title}.`
            : "Nothing like it in our list yet.",
      },
      clash: {
        status: "pass",
        label: "No clashes",
        detail: "No event we ask says otherwise about this place.",
      },
    };
  }
  const theirs = boundaryMonths(close.event.spans);
  const sameDates = mine.every((m) => theirs.some((t) => Math.abs(t - m) <= 24));
  if (sameDates)
    return {
      duplicate: {
        status: "fail",
        label: `Duplicate of ${close.event.title}`,
        detail: `We already ask about ${close.event.title}, with the same dates.`,
        eventId: close.event.id,
      },
      clash: { status: "pass", label: "No clashes", detail: "Same dates as the event we have." },
    };
  const theirLabel = close.event.spans
    .map((sp) => `${sp.from.slice(0, 4)}–${sp.until?.slice(0, 4) ?? "today"}`)
    .join(", ");
  return {
    duplicate: {
      status: "warn",
      label: `Close to ${close.event.title}`,
      detail: `It may be the same change as ${close.event.title}.`,
      eventId: close.event.id,
    },
    clash: {
      status: "warn",
      label: `Clashes with ${close.event.title}`,
      detail: `We have ${close.event.title} at ${theirLabel}.`,
      eventId: close.event.id,
    },
  };
}

/** Opens each source and looks for the names and the years in its text. */
export async function checkSource(
  url: string,
  names: string[],
  years: number[],
): Promise<SourceCheck> {
  try {
    const page = await fetchPage(url);
    const text = pageText(page.text);
    const lower = text.toLowerCase();
    const mentions = names.some(
      (n) => n.trim().length > 2 && lower.includes(n.trim().toLowerCase()),
    );
    const found = years.filter((y) => new RegExp(`\\b${y}\\b`).test(text));
    let quote: string | null = null;
    const first = found[0];
    if (first !== undefined) {
      const at = text.search(new RegExp(`\\b${first}\\b`));
      quote = text.slice(Math.max(0, at - 120), at + 120).trim();
    }
    return { url, opens: true, mentions, years, found, quote };
  } catch (err) {
    return {
      url,
      opens: false,
      mentions: false,
      years,
      found: [],
      quote: null,
      error: err instanceof FetchError ? err.message : "The page didn't open",
    };
  }
}

export function datesCheck(sources: SourceCheck[], years: number[]): Check {
  const found = new Set(sources.flatMap((s) => s.found));
  const missing = years.filter((y) => !found.has(y));
  if (!sources.some((s) => s.opens))
    return {
      status: "fail",
      label: "Source didn't open",
      detail: sources[0]?.error ?? "None of the links opened.",
    };
  if (missing.length === 0)
    return {
      status: "pass",
      label: "Dates match",
      detail: `The source names ${years.join(" and ")}.`,
    };
  if (missing.length < years.length)
    return {
      status: "warn",
      label: `Says ${years.filter((y) => found.has(y)).join(", ")}`,
      detail: `The source doesn't mention ${missing.join(" or ")}.`,
    };
  return {
    status: "fail",
    label: "Dates not found",
    detail: `The source doesn't mention ${years.join(" or ")}.`,
  };
}

// Nominatim allows one request a second from an application; queue ours.
let nominatimQueue: Promise<unknown> = Promise.resolve();
async function nominatim<T>(path: string): Promise<T | null> {
  const run = nominatimQueue.then(async () => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/${path}`, {
        headers: { "user-agent": USER_AGENT, "accept-language": "en" },
        signal: AbortSignal.timeout(6_000),
      });
      return res.ok ? ((await res.json()) as T) : null;
    } catch {
      return null;
    } finally {
      await new Promise((r) => setTimeout(r, 1_100));
    }
  });
  nominatimQueue = run;
  return run as Promise<T | null>;
}

interface Reverse {
  name?: string;
  display_name?: string;
  address?: {
    country?: string;
    country_code?: string;
    city?: string;
    town?: string;
    state?: string;
  };
  error?: string;
}

/** What is at a point, named the way OpenStreetMap names it in English. */
export async function placeAt(lat: number, lon: number) {
  const r = await nominatim<Reverse>(
    `reverse?format=jsonv2&lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}&zoom=8`,
  );
  if (!r || r.error || !r.address) return null;
  const near = r.address.city ?? r.address.town ?? r.address.state ?? r.name ?? null;
  return { near, country: r.address.country ?? null, code: r.address.country_code ?? null };
}

/** Finds a place by name for the "where is it" step. */
export async function searchPlace(query: string) {
  const r = await nominatim<{ lat: string; lon: string; display_name: string }[]>(
    `search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`,
  );
  const hit = r?.[0];
  return hit
    ? { lat: Number(hit.lat), lon: Number(hit.lon), name: hit.display_name.split(",")[0] ?? query }
    : null;
}

export function pinCheck(place: Awaited<ReturnType<typeof placeAt>>, s: Submission): Check {
  if (!place?.code) {
    return s.change === "water"
      ? {
          status: "pass",
          label: "Pin on water",
          detail: "The pin isn't inside a country, which fits a lake, canal or coast.",
        }
      : {
          status: "warn",
          label: "Pin not on land",
          detail: "The pin isn't inside any country today.",
        };
  }
  const regions: Region[] = regionsOf(place.code, s.lon);
  if (regions.includes(s.region))
    return {
      status: "pass",
      label: "Pin inside",
      detail: `The pin is in ${place.country}${place.near ? `, near ${place.near}` : ""}.`,
    };
  return {
    status: "warn",
    label: "Pin in another region",
    detail: `The pin is in ${place.country}, which isn't in ${s.region}.`,
  };
}

export async function runChecks(s: Submission, known: KnownEvent[]): Promise<Checks> {
  const years = yearsOf(s.span);
  const names = [s.name, s.before ?? "", s.after ?? ""];
  const [sources, place] = await Promise.all([
    Promise.all(s.sources.map((u) => checkSource(u, names, years))),
    placeAt(s.lat, s.lon),
  ]);
  return {
    ...compareWithKnown(s, known),
    dates: datesCheck(sources, years),
    pin: pinCheck(place, s),
    sources,
    place: place ? [place.near, place.country].filter(Boolean).join(", ") : null,
  };
}
