import { and, desc, eq, ilike } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { vocabulary } from "@/server/db/schema";

export const vocabularyRouter = createTRPCRouter({
  getAll: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(100).default(50),
          search: z.string().optional(),
          language: z.enum(["ja", "en", "ko"]).optional(),
          jlptLevel: z.enum(["N5", "N4", "N3", "N2", "N1"]).optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const items = await ctx.db.query.vocabulary.findMany({
        where: and(
          eq(vocabulary.userId, ctx.session.user.id),
          input?.language ? eq(vocabulary.language, input.language) : undefined,
          input?.jlptLevel ? eq(vocabulary.jlptLevel, input.jlptLevel) : undefined,
          input?.search ? ilike(vocabulary.word, `%${input.search}%`) : undefined,
        ),
        orderBy: [desc(vocabulary.createdAt)],
        limit: input?.limit ?? 50,
      });

      return items;
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const item = await ctx.db.query.vocabulary.findFirst({
        where: and(eq(vocabulary.id, input.id), eq(vocabulary.userId, ctx.session.user.id)),
      });

      if (!item) {
        throw new Error("Vocabulary item not found");
      }

      return item;
    }),

  create: protectedProcedure
    .input(
      z.object({
        word: z.string().min(1).max(255),
        reading: z.string().max(255).optional(),
        meaning: z.string().min(1),
        language: z.enum(["ja", "en", "ko"]).default("ja"),
        jlptLevel: z.enum(["N5", "N4", "N3", "N2", "N1"]).optional(),
        tags: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [item] = await ctx.db
        .insert(vocabulary)
        .values({
          userId: ctx.session.user.id,
          word: input.word,
          reading: input.reading,
          meaning: input.meaning,
          language: input.language,
          jlptLevel: input.jlptLevel,
          tags: input.tags,
        })
        .returning();

      return item;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        word: z.string().min(1).max(255).optional(),
        reading: z.string().max(255).nullish(),
        meaning: z.string().min(1).optional(),
        language: z.enum(["ja", "en", "ko"]).optional(),
        jlptLevel: z.enum(["N5", "N4", "N3", "N2", "N1"]).nullish(),
        tags: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const [item] = await ctx.db
        .update(vocabulary)
        .set(data)
        .where(and(eq(vocabulary.id, id), eq(vocabulary.userId, ctx.session.user.id)))
        .returning();

      return item;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(vocabulary)
        .where(and(eq(vocabulary.id, input.id), eq(vocabulary.userId, ctx.session.user.id)));

      return { success: true };
    }),

  getStats: protectedProcedure.query(async ({ ctx }) => {
    const items = await ctx.db.query.vocabulary.findMany({
      where: eq(vocabulary.userId, ctx.session.user.id),
      columns: { jlptLevel: true },
    });

    const stats = { total: items.length, N5: 0, N4: 0, N3: 0, N2: 0, N1: 0, unclassified: 0 };
    for (const item of items) {
      if (item.jlptLevel) {
        stats[item.jlptLevel]++;
      } else {
        stats.unclassified++;
      }
    }

    return stats;
  }),
});
