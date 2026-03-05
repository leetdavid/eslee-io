import { aiRouter } from "@/server/api/routers/ai";
import { clipRouter } from "@/server/api/routers/clip";
import { studyRouter } from "@/server/api/routers/study";
import { vocabularyRouter } from "@/server/api/routers/vocabulary";
import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";

export const appRouter = createTRPCRouter({
  clip: clipRouter,
  vocabulary: vocabularyRouter,
  study: studyRouter,
  ai: aiRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
