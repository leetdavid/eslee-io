import { caseFold } from "unicode-case-folding";
import { z } from "zod";
import type { Locale } from "@/lib/i18n";

export const MAX_QUESTION_LENGTH = 120;
export const MAX_AXIS_END_LENGTH = 40;

const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });

export function countCharacters(value: string): number {
  return Array.from(segmenter.segment(value)).length;
}

/** Ignores letter case and all whitespace, so Korean spacing variants match. */
export function textIdentity(value: string): string {
  return caseFold(value).replace(/\s+/gu, "");
}

export function detectLanguage(value: string): Locale {
  return /[\u1100-\u11ff\u3130-\u318f\uac00-\ud7af]/u.test(value) ? "ko" : "en";
}

export const AXIS_MODES = ["auto", "one", "two"] as const;
export type AxisMode = (typeof AXIS_MODES)[number];

export type QuestionIssue =
  | { code: "empty" }
  | { code: "tooLong"; max: number }
  | { code: "axisEndMissing" }
  | { code: "axisEndTooLong"; max: number };

const axisEndsSchema = z.object({ low: z.string(), high: z.string() });

export const askSchema = z.object({
  question: z.string().max(2_000),
  mode: z.enum(AXIS_MODES),
  /** Custom axis ends: one entry for a one-axis chart, two for a two-axis chart. */
  axes: z.array(axisEndsSchema).min(1).max(2).optional(),
});

export type AskInput = z.infer<typeof askSchema>;

export type CleanAsk = {
  question: string;
  mode: AxisMode;
  axes?: { low: string; high: string }[];
};

/** Shared by the composer and the server, so both block the same input. */
export function checkAsk(
  input: AskInput,
): { ok: true; value: CleanAsk } | { ok: false; issue: QuestionIssue } {
  const question = input.question.trim();
  if (!question) return { ok: false, issue: { code: "empty" } };
  if (countCharacters(question) > MAX_QUESTION_LENGTH)
    return { ok: false, issue: { code: "tooLong", max: MAX_QUESTION_LENGTH } };
  if (!input.axes) return { ok: true, value: { question, mode: input.mode } };
  const axes = input.axes.map((axis) => ({ low: axis.low.trim(), high: axis.high.trim() }));
  if (axes.some((axis) => !axis.low || !axis.high))
    return { ok: false, issue: { code: "axisEndMissing" } };
  if (
    axes.some(
      (axis) =>
        countCharacters(axis.low) > MAX_AXIS_END_LENGTH ||
        countCharacters(axis.high) > MAX_AXIS_END_LENGTH,
    )
  )
    return { ok: false, issue: { code: "axisEndTooLong", max: MAX_AXIS_END_LENGTH } };
  return { ok: true, value: { question, mode: axes.length === 2 ? "two" : "one", axes } };
}

/** Same question identity and same axes reuse one saved chart. */
export function reuseIdentity(ask: CleanAsk): string {
  const axes = ask.axes?.map((axis) => [textIdentity(axis.low), textIdentity(axis.high)]) ?? null;
  return JSON.stringify([textIdentity(ask.question), ask.mode, axes]);
}
