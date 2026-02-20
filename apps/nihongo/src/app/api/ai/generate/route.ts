import { getSystemPrompt, models } from "@/lib/ai";
import type { ModelId } from "@/lib/ai";
import { auth } from "@eslee/auth";
import { streamText } from "ai";
import { headers } from "next/headers";

export async function POST(req: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const {
    topic,
    type,
    jlptLevel,
    userLanguage,
    model: modelId,
  } = (await req.json()) as {
    topic: string;
    type: "reading" | "grammar" | "vocabulary" | "quiz";
    jlptLevel?: string;
    userLanguage?: "en" | "ko";
    model?: ModelId;
  };

  const selectedModel = models[modelId ?? "gpt-4o-mini"];
  const langName = userLanguage === "ko" ? "Korean" : "English";
  const levelNote = jlptLevel ? ` Appropriate for JLPT ${jlptLevel} level.` : "";

  const prompts: Record<"reading" | "grammar" | "vocabulary" | "quiz", string> = {
    reading: `Generate a Japanese reading passage about "${topic}".${levelNote}

Include:
- Natural Japanese text with a mix of kanji, hiragana, and katakana
- Furigana readings for all kanji (format: 漢字(かんじ))
- A vocabulary list at the end with ${langName} translations
- Comprehension questions in ${langName}`,

    grammar: `Create a Japanese grammar lesson about "${topic}".${levelNote}

Include:
- Clear explanation of the grammar point in ${langName}
- The pattern/formula
- 5-6 example sentences with furigana and ${langName} translations
- Common mistakes to avoid
- Practice exercises`,

    vocabulary: `Generate a themed Japanese vocabulary list about "${topic}".${levelNote}

Include:
- 15-20 words with kanji, furigana readings, and ${langName} meanings
- Example sentence for each word
- Group by category if applicable
- Mark the JLPT level for each word`,

    quiz: `Create a Japanese quiz about "${topic}".${levelNote}

Include:
- 10 multiple-choice questions
- Mix of vocabulary, grammar, and reading comprehension
- Questions in both Japanese and ${langName}
- Answer key at the end with explanations`,
  };

  const result = streamText({
    model: selectedModel,
    system: getSystemPrompt(userLanguage),
    messages: [
      {
        role: "user",
        content: prompts[type],
      },
    ],
  });

  return result.toTextStreamResponse();
}
