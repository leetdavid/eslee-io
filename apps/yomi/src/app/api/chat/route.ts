import { google } from "@ai-sdk/google";
import { streamText, tool } from "ai";
import { type NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@eslee/auth";
import { db } from "@/server/db";
import { clips } from "@/server/db/schema";

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { messages, systemPrompt } = (await req.json()) as {
    messages: { role: "user" | "assistant"; content: string }[];
    systemPrompt?: string;
  };

  const result = streamText({
    model: google("gemini-3-flash-preview"),
    system: systemPrompt,
    messages,
    maxSteps: 3,
    tools: {
      add_clip: tool({
        description:
          "Save a Japanese word, phrase, or sentence as a study clip for the user to review later in Yomi.",
        parameters: z.object({
          text: z.string().describe("The Japanese text to save (word, phrase, or sentence)"),
          title: z.string().optional().describe("Brief descriptive title for the clip"),
          jlpt_level: z
            .enum(["N5", "N4", "N3", "N2", "N1"])
            .optional()
            .describe("JLPT difficulty level"),
        }),
        execute: async ({ text, title, jlpt_level }) => {
          const [clip] = await db
            .insert(clips)
            .values({
              userId: session.user.id,
              title: title ?? text.slice(0, 60),
              content: {
                type: "doc",
                content: [{ type: "paragraph", content: [{ type: "text", text }] }],
              },
              sourceLanguage: "ja",
              jlptLevel: jlpt_level,
            })
            .returning({ id: clips.id });

          return clip ? { success: true, clipId: clip.id } : { success: false };
        },
      }),
    },
  });

  return result.toTextStreamResponse();
}
