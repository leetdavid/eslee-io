import { TRPCError } from "@trpc/server";
import { and, desc, eq, ilike, inArray, lt, sql } from "drizzle-orm";
import { z } from "zod";

import type { JLPTLevel } from "@/lib/constants";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import type { db } from "@/server/db";
import { clipVocabulary, clips, vocabulary } from "@/server/db/schema";

/** Minimal validation for Tiptap JSON — must be an object with a content array. */
const tiptapContentSchema = z.record(z.string(), z.unknown());

/** Safely extracts raw text from a Tiptap JSON node recursively */
function extractTextFromContent(node: unknown): string {
  if (!node) return "";
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(extractTextFromContent).join(" ");
  if (typeof node === "object") {
    if ("text" in node) return node.text as string;
    if ("content" in node) return extractTextFromContent(node.content);
  }
  return "";
}

/** Extract a title from Tiptap JSON content by taking the first ~50 chars of text. */
function extractTitleFromContent(content: unknown): string | undefined {
  const text = extractTextFromContent(content).replace(/\s+/g, " ").trim();
  if (!text) return undefined;
  return text.length > 50 ? `${text.slice(0, 50)}...` : text;
}

interface ExtractedVocab {
  word: string;
  reading?: string;
  meaning: string;
  jlptLevel?: string;
}

/** Recursively finds all vocabularyHighlight marks in the Tiptap document */
// biome-ignore lint/suspicious/noExplicitAny: flexible json
function extractVocabularyFromContent(content: any): ExtractedVocab[] {
  const vocab: ExtractedVocab[] = [];

  // biome-ignore lint/suspicious/noExplicitAny: flexible json node
  function traverse(node: any) {
    if (!node || typeof node !== "object") return;

    if (node.marks && Array.isArray(node.marks)) {
      for (const mark of node.marks) {
        if (mark.type === "vocabularyHighlight" && mark.attrs) {
          if (mark.attrs.word && mark.attrs.meaning) {
            vocab.push({
              word: mark.attrs.word as string,
              reading: (mark.attrs.reading as string) || undefined,
              meaning: mark.attrs.meaning as string,
              jlptLevel: (mark.attrs.jlptLevel as string) || undefined,
            });
          }
        }
      }
    }

    if (node.content && Array.isArray(node.content)) {
      for (const child of node.content) {
        traverse(child);
      }
    }
  }

  traverse(content);
  return vocab;
}

/** Synchronizes extracted vocabulary into the DB and creates junction records */
async function syncClipVocabulary(
  ctxDb: typeof db,
  userId: string,
  clipId: string,
  content: unknown,
  language: string,
) {
  const extracted = extractVocabularyFromContent(content);

  // Always clear existing junction entries for this clip
  await ctxDb.delete(clipVocabulary).where(eq(clipVocabulary.clipId, clipId));

  if (extracted.length === 0) return;

  // Deduplicate extracted vocab by word
  const uniqueExtracted = Array.from(new Map(extracted.map((v) => [v.word, v])).values());
  const words = uniqueExtracted.map((v) => v.word);

  // Find existing vocabulary for this user
  const existingVocab = await ctxDb.query.vocabulary.findMany({
    where: and(eq(vocabulary.userId, userId), inArray(vocabulary.word, words)),
  });

  const existingWords = new Set(existingVocab.map((v: { word: string }) => v.word));

  // Insert missing vocabulary
  const missingVocab = uniqueExtracted.filter((v) => !existingWords.has(v.word));
  let newVocabRecords: { id: string; word: string }[] = [];

  if (missingVocab.length > 0) {
    newVocabRecords = await ctxDb
      .insert(vocabulary)
      .values(
        missingVocab.map((v) => ({
          userId,
          word: v.word,
          reading: v.reading,
          meaning: v.meaning,
          jlptLevel: (v.jlptLevel as JLPTLevel) || undefined,
          language: (language as "ja" | "en" | "ko") || "ja",
        })),
      )
      .returning({ id: vocabulary.id, word: vocabulary.word });
  }

  // Combine all to get IDs
  const allVocabMap = new Map<string, string>(); // word -> id
  for (const v of existingVocab) allVocabMap.set(v.word, v.id);
  for (const v of newVocabRecords) allVocabMap.set(v.word, v.id);

  // Create new junction entries
  const junctionEntries = uniqueExtracted
    .map((v, index) => {
      const vid = allVocabMap.get(v.word);
      if (!vid) return null;
      return {
        clipId,
        vocabularyId: vid,
        position: index,
      };
    })
    .filter((e) => e !== null);

  if (junctionEntries.length > 0) {
    await ctxDb.insert(clipVocabulary).values(junctionEntries);
  }
}

export const clipRouter = createTRPCRouter({
  getAll: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(100).default(20),
          cursor: z.string().uuid().optional(),
          search: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 20;

      const conditions = [eq(clips.userId, ctx.session.user.id)];

      if (input?.search) {
        conditions.push(ilike(clips.title, `%${input.search}%`));
      }

      if (input?.cursor) {
        // Fetch the cursor clip's createdAt for keyset pagination
        const cursorClip = await ctx.db.query.clips.findFirst({
          where: eq(clips.id, input.cursor),
          columns: { createdAt: true },
        });
        if (cursorClip) {
          conditions.push(lt(clips.createdAt, cursorClip.createdAt));
        }
      }

      const items = await ctx.db.query.clips.findMany({
        where: and(...conditions),
        orderBy: [desc(clips.createdAt)],
        limit: limit + 1,
      });

      let nextCursor: string | undefined;
      if (items.length > limit) {
        const nextItem = items.pop();
        nextCursor = nextItem?.id;
      }

      return { items, nextCursor };
    }),

  count: protectedProcedure.query(async ({ ctx }) => {
    const [result] = await ctx.db
      .select({ count: sql<number>`count(*)::int` })
      .from(clips)
      .where(eq(clips.userId, ctx.session.user.id));

    return result?.count ?? 0;
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const clip = await ctx.db.query.clips.findFirst({
        where: and(eq(clips.id, input.id), eq(clips.userId, ctx.session.user.id)),
      });

      if (!clip) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Clip not found" });
      }

      return clip;
    }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().max(256).optional(),
        content: tiptapContentSchema,
        sourceLanguage: z.enum(["ja", "en", "ko"]).default("ja"),
        targetLanguage: z.enum(["ja", "en", "ko"]).optional(),
        tags: z.array(z.string()).optional(),
        jlptLevel: z.enum(["N5", "N4", "N3", "N2", "N1"]).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const title = input.title || extractTitleFromContent(input.content);

      const [clip] = await ctx.db
        .insert(clips)
        .values({
          userId: ctx.session.user.id,
          title,
          content: input.content,
          sourceLanguage: input.sourceLanguage,
          targetLanguage: input.targetLanguage,
          tags: input.tags,
          jlptLevel: input.jlptLevel,
        })
        .returning();

      if (clip) {
        // Sync vocabulary marks
        await syncClipVocabulary(
          ctx.db,
          ctx.session.user.id,
          clip.id,
          input.content,
          input.sourceLanguage,
        );
      }

      return clip;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        title: z.string().max(256).nullish(),
        content: tiptapContentSchema.optional(),
        sourceLanguage: z.enum(["ja", "en", "ko"]).optional(),
        targetLanguage: z.enum(["ja", "en", "ko"]).nullish(),
        tags: z.array(z.string()).optional(),
        jlptLevel: z.enum(["N5", "N4", "N3", "N2", "N1"]).nullish(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const clipToUpdate = await ctx.db.query.clips.findFirst({
        where: and(eq(clips.id, id), eq(clips.userId, ctx.session.user.id)),
      });

      if (!clipToUpdate) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Clip not found" });
      }

      // If content is changing but title is not provided in update, update title automatically
      let updatedTitle = data.title;
      if (data.title === undefined && data.content) {
        updatedTitle = extractTitleFromContent(data.content);
      }

      const [clip] = await ctx.db
        .update(clips)
        .set({ ...data, title: updatedTitle })
        .where(and(eq(clips.id, id), eq(clips.userId, ctx.session.user.id)))
        .returning();

      if (clip && data.content) {
        // Sync vocabulary marks if content changed
        await syncClipVocabulary(
          ctx.db,
          ctx.session.user.id,
          clip.id,
          data.content,
          data.sourceLanguage || clipToUpdate.sourceLanguage,
        );
      }

      return clip;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(clips)
        .where(and(eq(clips.id, input.id), eq(clips.userId, ctx.session.user.id)));

      return { success: true };
    }),
});
