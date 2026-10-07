import "server-only";

import { initTRPC, TRPCError } from "@trpc/server";
import { judgmentSchema, submissionSchema } from "@/lib/game";
import { judgeMatchup } from "@/server/matchup";

const t = initTRPC.context<{ request: Request }>().create();
const publicProcedure = t.procedure;

export const appRouter = t.router({
  matchup: publicProcedure
    .input(submissionSchema)
    .output(judgmentSchema)
    .mutation(async ({ input, ctx }) => {
      const ip =
        ctx.request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ??
        ctx.request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        "local";
      try {
        return await judgeMatchup(input, ip);
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Matchup could not be checked", {
          name: error instanceof Error ? error.name : "UnknownError",
        });
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Couldn't check this answer. Your chain is safe. Try again.",
        });
      }
    }),
});

export type AppRouter = typeof appRouter;
