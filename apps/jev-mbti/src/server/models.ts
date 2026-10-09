import "server-only";

import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import type { JSONValue, LanguageModel } from "ai";

/** Pinned so placements stay comparable; move to a new version deliberately. */
export const JEV_MODEL = "jev-1.13.0";

const OPENROUTER_PREFIX = "openrouter:";
const configured = process.env.JEV_MBTI_LLM_MODEL ?? "google/gemini-2.5-flash";

/**
 * The LLM that writes axes and the review. A plain id such as
 * `google/gemini-2.5-flash` goes through Vercel AI Gateway, whose free tier
 * blocks Gemini 3.x. An id prefixed with `openrouter:`, such as
 * `openrouter:google/gemini-3.8-flash`, goes through OpenRouter with
 * `OPENROUTER_API_KEY`.
 */
export const LLM_PROVIDER = configured.startsWith(OPENROUTER_PREFIX) ? "openrouter" : "gateway";
export const LLM_MODEL =
  LLM_PROVIDER === "openrouter" ? configured.slice(OPENROUTER_PREFIX.length) : configured;

let openrouter: ReturnType<typeof createOpenRouter> | undefined;

export function llm(): LanguageModel {
  if (LLM_PROVIDER === "gateway") return LLM_MODEL;
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OpenRouter is not configured");
  openrouter ??= createOpenRouter({ apiKey, headers: { "X-Title": "Jev MBTI" } });
  return openrouter.chat(LLM_MODEL);
}

/** "google/gemini-3.8-flash" → "Gemini 3.8 Flash", shown wherever the review is credited. */
export function modelLabel(model: string): string {
  if (model === "openrouter/free") return "OpenRouter Free";
  const name = (model.split("/").pop() ?? model).replace(/:free$/, "").replace(/-it$/, "");
  return name
    .split("-")
    .map((part) => {
      if (/^gpt$/i.test(part)) return "GPT";
      // Parameter counts such as 31b or a12b.
      if (/^[a-z]?\d+(\.\d+)?[bkm]$/i.test(part)) return part.toUpperCase();
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(" ")
    .replace(/^GPT (\d)/, "GPT-$1");
}

export const LLM_LABEL = modelLabel(LLM_MODEL);

/**
 * Free OpenRouter models queue behind shared capacity, so they get longer
 * limits. The review stays under the API route's 120-second maximum.
 */
export const LLM_TIMEOUT_MS =
  LLM_PROVIDER === "openrouter"
    ? { axes: 75_000, review: 110_000 }
    : { axes: 30_000, review: 90_000 };

/**
 * Per-call provider settings. Axis design benefits from a little reasoning;
 * the streamed review mostly needs to start fast.
 */
export function llmOptions(task: "axes" | "review"): Record<string, Record<string, JSONValue>> {
  if (LLM_PROVIDER === "openrouter") {
    return {
      openrouter: { reasoning: { effort: task === "axes" ? "low" : "minimal", exclude: true } },
    };
  }
  const gateway = { tags: [`feature:jev-mbti-${task}`] };
  if (!LLM_MODEL.startsWith("google/")) return { gateway };
  const legacy = /gemini-2\./.test(LLM_MODEL);
  const thinkingConfig =
    task === "axes"
      ? legacy
        ? { thinkingBudget: 1_024 }
        : { thinkingLevel: "low" }
      : legacy
        ? { thinkingBudget: 0 }
        : { thinkingLevel: "minimal" };
  return { gateway, google: { thinkingConfig } };
}
