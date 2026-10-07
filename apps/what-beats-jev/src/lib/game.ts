import { caseFold } from "unicode-case-folding";
import { z } from "zod";

export const MAX_ANSWER_LENGTH = 240;
export const STARTER = "rock";

const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });

export function countCharacters(value: string): number {
  return Array.from(segmenter.segment(value)).length;
}

export function phraseIdentity(value: string): string {
  return caseFold(value.trim());
}

const phraseSchema = z
  .string()
  .refine(
    (value) => value.trim().length > 0,
    "Enter something that could beat the current challenge.",
  )
  .refine(
    (value) => countCharacters(value) <= MAX_ANSWER_LENGTH,
    "Keep your answer within 240 characters.",
  )
  .transform((value) => value.trim());

export const submissionSchema = z
  .object({ challenge: phraseSchema, answer: phraseSchema })
  .refine((value) => phraseIdentity(value.challenge) !== phraseIdentity(value.answer), {
    path: ["answer"],
    message: "Already in this chain. Try a different answer.",
  });

export const judgmentSchema = z
  .object({
    beats: z.boolean(),
    confidence: z.number().min(0).max(1),
    model: z.string().min(1),
    source: z.enum(["jev", "cache"]),
    isNewMatchup: z.boolean(),
  })
  .refine((value) => !value.isNewMatchup || (value.beats && value.source === "jev"));

export type Submission = z.infer<typeof submissionSchema>;
export type Judgment = z.infer<typeof judgmentSchema>;

export function parseSubmission(value: unknown): Submission {
  return submissionSchema.parse(value);
}

export function answerError(answer: string, chain: string[]): string | null {
  const parsed = phraseSchema.safeParse(answer);
  if (!parsed.success) return parsed.error.issues[0]?.message ?? "Enter a valid answer.";
  if (chain.some((phrase) => phraseIdentity(phrase) === phraseIdentity(answer))) {
    return "Already in this chain. Try a different answer.";
  }
  return null;
}
