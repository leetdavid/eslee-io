import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { aiGenerations } from "@/server/db/schema";

export const aiRouter = createTRPCRouter({
  getHistory: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(50).default(20),
          type: z.enum(["explanation", "document", "grammar", "quiz"]).optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const items = await ctx.db.query.aiGenerations.findMany({
        where: eq(aiGenerations.userId, ctx.session.user.id),
        orderBy: [desc(aiGenerations.createdAt)],
        limit: input?.limit ?? 20,
      });

      return items;
    }),

  getGeneration: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const item = await ctx.db.query.aiGenerations.findFirst({
        where: eq(aiGenerations.id, input.id),
      });

      return item;
    }),

  saveGeneration: protectedProcedure
    .input(
      z.object({
        prompt: z.string(),
        response: z.string(),
        model: z.string(),
        type: z.enum(["explanation", "document", "grammar", "quiz"]),
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
      await ctx.db.delete(aiGenerations).where(eq(aiGenerations.id, input.id));

      return { success: true };
    }),
});
