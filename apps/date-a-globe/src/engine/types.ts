import type { Month } from "./months";

export const REGIONS = [
  "Europe",
  "Middle East",
  "Africa",
  "Asia",
  "North America",
  "South America",
  "Oceania",
  "Antarctica",
] as const;
export type Region = (typeof REGIONS)[number];
export type Size = "easy" | "medium" | "hard";
export type Kind = "country" | "border" | "rename" | "water" | "city" | "discovery";

export interface Span {
  /** "YYYY" or "YYYY-MM". A year before 1805 means "already there in 1805". */
  from: string;
  until: string | null;
}

/** What the engine needs to know about an event. */
export interface EngineEvent {
  id: string;
  kind: Kind;
  spans: Span[];
  size: Size;
  region: Region;
  /** Shows only on regional maps of its area, never on globes or world maps. */
  regional: boolean;
  /** Trial events are asked so their answers can be compared, but never count toward the result. */
  trial: boolean;
}

export type Answer = "yes" | "no" | "cant";
export interface Turn {
  eventId: string;
  answer: Answer;
  /** Why the engine asked it, as returned by `next`. */
  reason?: "narrow" | "settle" | "hinge" | "trial";
}

export interface Setup {
  kind: "globe" | "world" | "part";
  /** The regions the map shows. Only used when the map shows part of the world. */
  regions: Region[];
}

/** A stretch of months, both ends included. */
export interface Window {
  from: Month;
  to: Month;
}

export type Era = "engraved" | "imperial" | "interwar" | "mid" | "web";

export type Next =
  | { type: "ask"; eventId: string; reason: "narrow" | "hinge" | "trial" }
  /** Two answers disagree: `turns` are their positions, and this question settles which one to set aside. */
  | { type: "ask"; eventId: string; reason: "settle"; turns: [number, number] }
  | { type: "done" };

export interface Bound {
  /** Position of the answer that sets this end. */
  turn: number;
  eventId: string;
  /** The event date that answer pins the end to, as written on the event. */
  date: string;
}

export interface Result {
  window: Window;
  /** Each end as shown: a month where the answers can tell months apart, otherwise a year. */
  from: { month: Month; precise: boolean };
  to: { month: Month; precise: boolean };
  label: string;
  /** Percent of the likelihood inside the range as shown. */
  sure: number;
  mostLikely: Month;
  era: Era;
  notBefore: Bound | null;
  notAfter: Bound | null;
  /** The answer that would move the range most if it were a misread, and where the range would go. */
  hinge: { turn: number; eventId: string; label: string } | null;
  /** Answers the others outweigh, kept on the result but struck through. */
  setAside: number[];
  /** Likelihood per year from 1805, for drawing the scale. */
  years: number[];
}
