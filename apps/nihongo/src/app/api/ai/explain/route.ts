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
    text,
    context,
    userLanguage,
    model: modelId,
  } = (await req.json()) as {
    text: string;
    context?: string;
    userLanguage?: "en" | "ko";
    model?: ModelId;
  };

  const selectedModel = models[modelId ?? "gpt-4o-mini"];

  const result = streamText({
    model: selectedModel,
    system: getSystemPrompt(userLanguage),
    messages: [
      {
        role: "user",
        content: `Please explain the following Japanese text:\n\n"${text}"${context ? `\n\nContext: ${context}` : ""}\n\nProvide a detailed breakdown including:\n1. Overall meaning\n2. Vocabulary with readings and meanings\n3. Grammar points\n4. Cultural notes (if applicable)`,
      },
    ],
  });

  return result.toTextStreamResponse();
}
