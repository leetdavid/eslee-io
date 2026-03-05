import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";

export const models = {
  "gemini-3.1-pro-preview": {
    name: "Gemini 3.1 Pro Preview",
    model: google("gemini-3.1-pro-preview"),
  },
  "gemini-3-flash-preview": {
    name: "Gemini 3 Flash Preview",
    model: google("gemini-3-flash-preview"),
  },
  "gpt-5.2": {
    name: "GPT 5.2",
    model: openai("gpt-5.2"),
  },
  "claude-sonnet-4.5": {
    name: "Claude Sonnet 4.5",
    model: anthropic("claude-4-5-sonnet-latest"),
  },
  "claude-haiku-4.5": {
    name: "Claude Haiku 4.5",
    model: anthropic("claude-4-5-haiku-latest"),
  },
} as const;

export type ModelId = keyof typeof models;

export const defaultModel: ModelId = "gemini-3-flash-preview";

export function getSystemPrompt(userLanguage: "en" | "ko" = "en") {
  const langName = userLanguage === "ko" ? "Korean" : "English";
  return `You are an expert Japanese language teacher. You help students learn Japanese by explaining grammar, vocabulary, kanji, and cultural context.

Your responses should be:
- Clear and educational
- Include furigana readings for kanji (format: 漢字(かんじ))
- Provide ${langName} translations
- Mention JLPT level when relevant (N5 easiest to N1 hardest)
- Use examples from everyday Japanese

When explaining grammar:
- Break down the sentence structure
- Identify particles and their functions
- Explain verb conjugations
- Note any cultural nuances

When explaining vocabulary:
- Give the reading in hiragana
- Provide the meaning in ${langName}
- Show example sentences
- Mention common collocations`;
}
