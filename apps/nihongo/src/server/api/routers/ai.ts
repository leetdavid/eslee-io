import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { defaultModel, models } from "@/lib/ai";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { aiGenerations } from "@/server/db/schema";
import { generateText } from "ai";

export const aiRouter = createTRPCRouter({
  getHistory: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(50).default(20),
          type: z.enum(["reading", "grammar", "vocabulary", "quiz"]).optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const items = await ctx.db.query.aiGenerations.findMany({
        where: and(
          eq(aiGenerations.userId, ctx.session.user.id),
          input?.type ? eq(aiGenerations.type, input.type) : undefined,
        ),
        orderBy: [desc(aiGenerations.createdAt)],
        limit: input?.limit ?? 20,
      });

      return items;
    }),

  getGeneration: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const item = await ctx.db.query.aiGenerations.findFirst({
        where: and(eq(aiGenerations.id, input.id), eq(aiGenerations.userId, ctx.session.user.id)),
      });

      if (!item) {
        throw new TRPCError({ code: "NOT_FOUND", message: "AI generation not found" });
      }

      return item;
    }),

  saveGeneration: protectedProcedure
    .input(
      z.object({
        prompt: z.string(),
        response: z.string(),
        model: z.string(),
        type: z.enum(["reading", "grammar", "vocabulary", "quiz"]),
        clipId: z.string().uuid().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [item] = await ctx.db
        .insert(aiGenerations)
        .values({
          userId: ctx.session.user.id,
          prompt: input.prompt,
          response: input.response,
          model: input.model,
          type: input.type,
          clipId: input.clipId,
        })
        .returning();

      return item;
    }),

  deleteGeneration: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(aiGenerations)
        .where(and(eq(aiGenerations.id, input.id), eq(aiGenerations.userId, ctx.session.user.id)));

      return { success: true };
    }),

  addFurigana: protectedProcedure
    .input(z.object({ text: z.string().min(1).max(30000) }))
    .mutation(async ({ input }) => {
      try {
        const { text } = await generateText({
          model: models[defaultModel].model,
          system: `You are an expert Japanese linguist. Your task is to take the provided Japanese text (which may contain HTML tags) and add furigana readings to all kanji words using standard HTML <ruby> tags.
Format: <ruby>漢字<rt>かんじ</rt></ruby> (DO NOT output <rp> tags).
Only add furigana to kanji. Do not add furigana to hiragana or katakana.
Do not modify the meaning, spacing, or wording of the text.
CRITICAL INSTRUCTION: If the input contains HTML tags (e.g. <p>, <strong>, <em>, <img>, etc.), you MUST preserve them exactly as they are. Do not remove or alter any existing HTML structure or attributes.
Keep all original line breaks intact. 
Output ONLY the raw HTML, nothing else. Do not use markdown formatting. Do not wrap in \`\`\`html blocks.`,
          prompt: input.text,
        });

        // Clean up markdown code blocks if the AI still included them
        let html = text
          .replace(/^```html\n?/, "")
          .replace(/\n?```$/, "")
          .trim();

        // Safety fallback: if there are no block-level tags but there are newlines, convert them to <br> to avoid HTML flattening them.
        if (
          !html.includes("<p>") &&
          !html.includes("<br>") &&
          !html.includes("<br/>") &&
          html.includes("\n")
        ) {
          html = html.replace(/\n/g, "<br>");
        }

        // Convert <ruby>漢字<rt>かんじ</rt></ruby> to <ruby data-reading="かんじ">漢字</ruby>
        // to prevent ProseMirror from incorrectly extracting the reading text into the main document.
        html = html.replace(
          /<ruby>\s*(.*?)\s*<rt>(.*?)<\/rt>\s*<\/ruby>/gi,
          '<ruby data-reading="$2">$1</ruby>',
        );

        // Handle cases where AI might have ignored instructions and included <rp> tags anyway
        html = html.replace(
          /<ruby>\s*(.*?)\s*<rp>.*?<\/rp>\s*<rt>(.*?)<\/rt>\s*<rp>.*?<\/rp>\s*<\/ruby>/gi,
          '<ruby data-reading="$2">$1</ruby>',
        );

        return { html };
      } catch (error) {
        console.error("Furigana generation error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate furigana",
        });
      }
    }),

  translate: protectedProcedure
    .input(
      z.object({
        text: z.string().min(1).max(5000),
        targetLanguage: z.enum(["en", "ko"]).default("en"),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const langName = input.targetLanguage === "ko" ? "Korean" : "English";
        const { text } = await generateText({
          model: models[defaultModel].model,
          system: `You are an expert Japanese translator. Translate the given Japanese text to ${langName}. 
Provide ONLY the translation. Do not include any explanations, romanization, or original text.`,
          prompt: input.text,
        });

        return { translation: text.trim() };
      } catch (error) {
        console.error("Translation generation error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate translation",
        });
      }
    }),
});
