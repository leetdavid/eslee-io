import { z } from "zod";
import {
  answerError,
  countCharacters,
  type Judgment,
  judgmentSchema,
  MAX_ANSWER_LENGTH,
  phraseIdentity,
  STARTER,
} from "@/lib/game";

export const RUN_STORAGE_KEY = "what-beats-jev:run:v1";

// Saved verdicts keep their original wording when submission rules change.
const savedPhraseSchema = z
  .string()
  .refine((value) => value.trim().length > 0 && countCharacters(value) <= MAX_ANSWER_LENGTH);

const runSchema = z
  .object({
    version: z.literal(1),
    chain: z.array(savedPhraseSchema).min(1),
    draft: z.string(),
    ended: z.boolean(),
    lastJudgment: judgmentSchema
      .extend({ challenge: savedPhraseSchema, answer: savedPhraseSchema })
      .nullable(),
  })
  .refine(
    (value) =>
      value.chain[0] === STARTER &&
      new Set(value.chain.map(phraseIdentity)).size === value.chain.length,
  )
  .refine((value) => {
    const last = value.lastJudgment;
    if (!last) return !value.ended && value.chain.length === 1;
    const current = value.chain.at(-1);
    if (value.ended) {
      return (
        !last.beats &&
        last.challenge === current &&
        !value.chain.some((phrase) => phraseIdentity(phrase) === phraseIdentity(last.answer))
      );
    }
    return last.beats && last.answer === current && last.challenge === value.chain.at(-2);
  });

export type GameRun = z.infer<typeof runSchema>;

export function createRun(): GameRun {
  return { version: 1, chain: [STARTER], draft: "", ended: false, lastJudgment: null };
}

export function applyJudgment(run: GameRun, answer: string, judgment: Judgment): GameRun {
  if (run.ended) throw new Error("This run has ended.");
  const error = answerError(answer, run.chain);
  if (error) throw new Error(error);
  const challenge = run.chain.at(-1) ?? STARTER;
  const accepted = judgmentSchema.parse(judgment);
  return {
    ...run,
    draft: "",
    chain: accepted.beats ? [...run.chain, answer.trim()] : run.chain,
    ended: !accepted.beats,
    lastJudgment: { ...accepted, challenge, answer: answer.trim() },
  };
}

export function restoreRun(serialized: string | null): GameRun | null {
  if (!serialized) return null;
  try {
    const result = runSchema.safeParse(JSON.parse(serialized));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}
