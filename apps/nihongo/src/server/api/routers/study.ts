import { and, eq, lte, sql } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { studyProgress } from "@/server/db/schema";

export const studyRouter = createTRPCRouter({
  getDueCards: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(50).default(20),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const now = new Date();
      const limit = input?.limit ?? 20;

      const items = await ctx.db.query.studyProgress.findMany({
        where: and(
          eq(studyProgress.userId, ctx.session.user.id),
          lte(studyProgress.nextReview, now),
        ),
        with: {
          vocabulary: true,
        },
        orderBy: [studyProgress.nextReview],
        limit,
      });

      return items;
    }),

  submitReview: protectedProcedure
    .input(
      z.object({
        vocabularyId: z.string().uuid(),
        quality: z.number().min(0).max(5), // SM-2 quality grade
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.studyProgress.findFirst({
        where: and(
          eq(studyProgress.userId, ctx.session.user.id),
          eq(studyProgress.vocabularyId, input.vocabularyId),
        ),
      });

      const now = new Date();
      const { quality } = input;

      if (!existing) {
        // First review - create progress entry
        const interval = quality >= 3 ? 1 : 0;
        const nextReview = new Date(now);
        nextReview.setDate(nextReview.getDate() + interval);

        const [item] = await ctx.db
          .insert(studyProgress)
          .values({
            userId: ctx.session.user.id,
            vocabularyId: input.vocabularyId,
            correctCount: quality >= 3 ? 1 : 0,
            incorrectCount: quality < 3 ? 1 : 0,
            lastStudied: now,
            nextReview,
            ease: Math.max(1.3, 2.5 + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))),
            interval,
          })
          .returning();

        return item;
      }

      // SM-2 algorithm
      let { ease, interval: currentInterval } = existing;

      if (quality < 3) {
        // Failed - reset interval
        currentInterval = 0;
      } else {
        if (currentInterval === 0) {
          currentInterval = 1;
        } else if (currentInterval === 1) {
          currentInterval = 6;
        } else {
          currentInterval = Math.round(currentInterval * ease);
        }
      }

      // Update ease factor
      ease = Math.max(1.3, ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));

      const nextReview = new Date(now);
      nextReview.setDate(nextReview.getDate() + currentInterval);

      const [item] = await ctx.db
        .update(studyProgress)
        .set({
          correctCount:
            quality >= 3 ? sql`${studyProgress.correctCount} + 1` : existing.correctCount,
          incorrectCount:
            quality < 3 ? sql`${studyProgress.incorrectCount} + 1` : existing.incorrectCount,
          lastStudied: now,
          nextReview,
          ease,
          interval: currentInterval,
        })
        .where(eq(studyProgress.id, existing.id))
        .returning();

      return item;
    }),

  getStats: protectedProcedure.query(async ({ ctx }) => {
    const now = new Date();

    const allProgress = await ctx.db.query.studyProgress.findMany({
      where: eq(studyProgress.userId, ctx.session.user.id),
    });

    const dueCount = allProgress.filter((p) => p.nextReview && p.nextReview <= now).length;

    const totalReviews = allProgress.reduce((sum, p) => sum + p.correctCount + p.incorrectCount, 0);
    const totalCorrect = allProgress.reduce((sum, p) => sum + p.correctCount, 0);

    return {
      totalCards: allProgress.length,
      dueCount,
      totalReviews,
      accuracy: totalReviews > 0 ? (totalCorrect / totalReviews) * 100 : 0,
    };
  }),

  initializeFromVocabulary: protectedProcedure
    .input(z.object({ vocabularyIds: z.array(z.string().uuid()) }))
    .mutation(async ({ ctx, input }) => {
      const now = new Date();

      const existing = await ctx.db.query.studyProgress.findMany({
        where: eq(studyProgress.userId, ctx.session.user.id),
        columns: { vocabularyId: true },
      });

      const existingIds = new Set(existing.map((e) => e.vocabularyId));
      const newIds = input.vocabularyIds.filter((id) => !existingIds.has(id));

      if (newIds.length === 0) return { added: 0 };

      await ctx.db.insert(studyProgress).values(
        newIds.map((vocabId) => ({
          userId: ctx.session.user.id,
          vocabularyId: vocabId,
          nextReview: now,
        })),
      );

      return { added: newIds.length };
    }),
});
