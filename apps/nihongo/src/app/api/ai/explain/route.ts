import { getSystemPrompt, models } from "@/lib/ai";
import { auth } from "@eslee/auth";
import { streamText } from "ai";
import { headers } from "next/headers";
import { z } from "zod";

const explainInputSchema = z.object({
  text: z.string().min(1).max(5000),
  context: z.string().max(1000).optional(),
  userLanguage: z.enum(["en", "ko"]).default("en"),
  model: z.enum(["gpt-4o-mini", "gpt-4o", "claude-sonnet-4-5"] as const).default("gpt-4o-mini"),
});

export async function POST(req: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const parsed = explainInputSchema.safeParse(await req.json());
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: parsed.error.flatten() }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { text, context, userLanguage, model: modelId } = parsed.data;

  const selectedModel = models[modelId];

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
