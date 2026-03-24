import { db } from "@eslee/db/client";
import { user } from "@eslee/db/schema";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

export const userRouter = createTRPCRouter({
  getSettings: protectedProcedure.query(async ({ ctx }) => {
    const userSettings = await db
      .select({ targetLanguage: user.targetLanguage })
      .from(user)
      .where(eq(user.id, ctx.session.user.id))
      .limit(1);

    if (!userSettings[0]) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    }

    return userSettings[0];
  }),

  updateSettings: protectedProcedure
    .input(z.object({ targetLanguage: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await db
        .update(user)
        .set({ targetLanguage: input.targetLanguage })
        .where(eq(user.id, ctx.session.user.id));

      return { success: true };
    }),
});
