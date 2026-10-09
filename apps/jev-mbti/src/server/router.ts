import "server-only";

import { initTRPC, TRPCError } from "@trpc/server";
import { z } from "zod";
import { askSchema } from "@/lib/question";
import { RefusedQuestionError } from "@/server/axes";
import { RateLimitedError } from "@/server/budget";
import { DraftError, InvalidQuestionError } from "@/server/charts";
import { charts } from "@/server/service";

export type FailureReason =
  | { reason: "refused" }
  | { reason: "rateLimited"; retryAfterMinutes: number }
  | { reason: "invalid" }
  | { reason: "expired" }
  | { reason: "failed" };

class ReasonedError extends TRPCError {
  constructor(
    code: TRPCError["code"],
    readonly failure: FailureReason,
  ) {
    super({ code, message: failure.reason });
  }
}

const t = initTRPC.context<{ ip: string }>().create({
  errorFormatter({ shape, error }) {
    const failure = error instanceof ReasonedError ? error.failure : { reason: "failed" as const };
    return { ...shape, data: { ...shape.data, failure } };
  },
});

function translate(error: unknown): never {
  if (error instanceof ReasonedError) throw error;
  if (error instanceof RefusedQuestionError)
    throw new ReasonedError("BAD_REQUEST", { reason: "refused" });
  if (error instanceof RateLimitedError)
    throw new ReasonedError("TOO_MANY_REQUESTS", {
      reason: "rateLimited",
      retryAfterMinutes: error.retryAfterMinutes,
    });
  if (error instanceof InvalidQuestionError)
    throw new ReasonedError("BAD_REQUEST", { reason: "invalid" });
  if (error instanceof DraftError) throw new ReasonedError("BAD_REQUEST", { reason: error.reason });
  console.error("Jev MBTI request failed", {
    name: error instanceof Error ? error.name : "UnknownError",
    message: error instanceof Error ? error.message : String(error),
  });
  throw new ReasonedError("INTERNAL_SERVER_ERROR", { reason: "failed" });
}

const chartId = z.object({ id: z.string().max(16) });

export const appRouter = t.router({
  suggest: t.procedure
    .input(askSchema)
    .mutation(({ input, ctx }) => charts.suggest(input, ctx.ip).catch(translate)),
  place: t.procedure
    .input(z.object({ draft: z.string().max(40_000) }))
    .mutation(({ input }) => charts.place(input.draft).catch(translate)),
  chart: t.procedure.input(chartId).query(({ input }) => charts.load(input.id).catch(translate)),
  review: t.procedure.input(chartId).mutation(async ({ input, ctx }) => ({
    status: await charts.review(input.id, ctx.ip).catch(translate),
  })),
});

export type AppRouter = typeof appRouter;
