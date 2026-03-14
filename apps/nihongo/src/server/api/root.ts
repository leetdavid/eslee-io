import { aiRouter } from "@/server/api/routers/ai";
import { clipRouter } from "@/server/api/routers/clip";
import { userRouter } from "@/server/api/routers/user";
import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";

export const appRouter = createTRPCRouter({
  clip: clipRouter,
  ai: aiRouter,
  user: userRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
