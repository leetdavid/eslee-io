import { user } from "@eslee/db/schema";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

export const userRouter = createTRPCRouter({
  getSettings: protectedProcedure.query(async ({ ctx }) => {
    const userSettings = await ctx.db.query.user.findFirst({
      where: eq(user.id, ctx.session.user.id),
      columns: {
        targetLanguage: true,
      },
    });

    if (!userSettings) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    }

    return userSettings;
  }),

  updateSettings: protectedProcedure
    .input(z.object({ targetLanguage: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(user)
        .set({ targetLanguage: input.targetLanguage })
        .where(eq(user.id, ctx.session.user.id));

      return { success: true };
    }),
});
