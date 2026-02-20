import { and, desc, eq, ilike } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { clips } from "@/server/db/schema";

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
      const items = await ctx.db.query.clips.findMany({
        where: and(
          eq(clips.userId, ctx.session.user.id),
          input?.search ? ilike(clips.title, `%${input.search}%`) : undefined,
        ),
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

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const clip = await ctx.db.query.clips.findFirst({
        where: and(eq(clips.id, input.id), eq(clips.userId, ctx.session.user.id)),
      });

      if (!clip) {
        throw new Error("Clip not found");
      }

      return clip;
    }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(256),
        content: z.any(), // Tiptap JSON
        sourceLanguage: z.enum(["ja", "en", "ko"]).default("ja"),
        targetLanguage: z.enum(["ja", "en", "ko"]).optional(),
        tags: z.array(z.string()).optional(),
        jlptLevel: z.enum(["N5", "N4", "N3", "N2", "N1"]).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [clip] = await ctx.db
        .insert(clips)
        .values({
          userId: ctx.session.user.id,
          title: input.title,
          content: input.content,
          sourceLanguage: input.sourceLanguage,
          targetLanguage: input.targetLanguage,
          tags: input.tags,
          jlptLevel: input.jlptLevel,
        })
        .returning();

      return clip;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        title: z.string().min(1).max(256).optional(),
        content: z.any().optional(),
        sourceLanguage: z.enum(["ja", "en", "ko"]).optional(),
        targetLanguage: z.enum(["ja", "en", "ko"]).nullish(),
        tags: z.array(z.string()).optional(),
        jlptLevel: z.enum(["N5", "N4", "N3", "N2", "N1"]).nullish(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const [clip] = await ctx.db
        .update(clips)
        .set(data)
        .where(and(eq(clips.id, id), eq(clips.userId, ctx.session.user.id)))
        .returning();

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
