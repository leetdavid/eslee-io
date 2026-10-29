import "server-only";

import { initTRPC, TRPCError } from "@trpc/server";
import { z } from "zod";
import { submissionSchema } from "@/lib/submission";
import { checkSource, compareWithKnown, placeAt, searchPlace } from "@/server/checks";
import { getDatabase } from "@/server/database";
import { currentEvents, forgetEvents } from "@/server/events";
import { charge, RateLimitedError } from "@/server/limits";
import { currentReviewer } from "@/server/maintainers";
import { confirmPrinted, savePlay, setupSchema, turnsSchema } from "@/server/plays";
import {
  approve,
  edit,
  editSchema,
  goLive,
  merge,
  pause,
  ReviewError,
  reject,
} from "@/server/review";
import { coverage, knownEvents, myEvents, submit } from "@/server/submissions";

export type FailureReason =
  | { reason: "rateLimited"; retryAfterMinutes: number }
  | { reason: "invalid"; message?: string }
  | { reason: "forbidden" }
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
  if (error instanceof RateLimitedError)
    throw new ReasonedError("TOO_MANY_REQUESTS", {
      reason: "rateLimited",
      retryAfterMinutes: error.retryAfterMinutes,
    });
  if (error instanceof ReviewError)
    throw new ReasonedError("BAD_REQUEST", { reason: "invalid", message: error.message });
  console.error("Date a Globe request failed", {
    name: error instanceof Error ? error.name : "UnknownError",
    message: error instanceof Error ? error.message : String(error),
  });
  throw new ReasonedError("INTERNAL_SERVER_ERROR", { reason: "failed" });
}

const guarded = <T>(work: () => Promise<T>) => work().catch(translate);

/** Review procedures run only for a signed-in maintainer, and record who acted. */
const maintainer = t.procedure.use(async ({ next }) => {
  const reviewer = await currentReviewer().catch(() => null);
  if (!reviewer?.isMaintainer) throw new ReasonedError("UNAUTHORIZED", { reason: "forbidden" });
  return next({ ctx: { reviewer } });
});

const eventId = z.object({ id: z.string().max(80) });

export const appRouter = t.router({
  savePlay: t.procedure
    .input(z.object({ setup: setupSchema, turns: turnsSchema }))
    .mutation(({ input, ctx }) =>
      guarded(async () => {
        const db = await getDatabase();
        await charge(db, "play", ctx.ip);
        const { engine, events } = await currentEvents();
        const play = await savePlay(db, engine, events, input.setup, input.turns);
        return { id: play.id };
      }),
    ),
  confirmPrinted: t.procedure
    .input(z.object({ id: z.string().max(12), year: z.number().int().min(1700).max(2100) }))
    .mutation(({ input }) =>
      guarded(async () => ({
        saved: await confirmPrinted(await getDatabase(), input.id, input.year),
      })),
    ),

  place: t.procedure
    .input(z.object({ lat: z.number().min(-90).max(90), lon: z.number().min(-180).max(180) }))
    .query(({ input, ctx }) =>
      guarded(async () => {
        await charge(await getDatabase(), "place", ctx.ip);
        return placeAt(input.lat, input.lon);
      }),
    ),
  search: t.procedure
    .input(z.object({ q: z.string().trim().min(2).max(100) }))
    .query(({ input, ctx }) =>
      guarded(async () => {
        await charge(await getDatabase(), "place", ctx.ip);
        return searchPlace(input.q);
      }),
    ),
  checkName: t.procedure
    .input(
      submissionSchema
        .pick({ change: true, name: true, before: true, lat: true, lon: true, span: true })
        .partial({ lat: true, lon: true, span: true }),
    )
    .query(({ input }) =>
      guarded(async () => {
        const known = await knownEvents(await getDatabase());
        const s = { lat: 0, lon: 0, span: { from: "1805", until: null }, ...input } as Parameters<
          typeof compareWithKnown
        >[0];
        return compareWithKnown(s, known).duplicate;
      }),
    ),
  checkSource: t.procedure
    .input(
      z.object({
        url: z.url().max(500),
        names: z.array(z.string().max(80)).max(3),
        years: z.array(z.number().int()).max(2),
      }),
    )
    .mutation(({ input, ctx }) =>
      guarded(async () => {
        await charge(await getDatabase(), "source", ctx.ip);
        return checkSource(input.url, input.names, input.years);
      }),
    ),
  submit: t.procedure
    .input(submissionSchema)
    .mutation(({ input, ctx }) => guarded(async () => submit(await getDatabase(), input, ctx.ip))),
  myEvents: t.procedure
    .input(z.object({ ids: z.array(z.string().max(80)).max(50) }))
    .query(({ input }) => guarded(async () => myEvents(await getDatabase(), input.ids))),
  coverage: t.procedure.query(() => guarded(async () => coverage(await getDatabase()))),

  approve: maintainer.input(eventId).mutation(({ input, ctx }) =>
    guarded(async () => {
      await approve(await getDatabase(), input.id, ctx.reviewer.login);
      forgetEvents();
    }),
  ),
  goLive: maintainer.input(eventId).mutation(({ input, ctx }) =>
    guarded(async () => {
      await goLive(await getDatabase(), input.id, ctx.reviewer.login);
      forgetEvents();
    }),
  ),
  pause: maintainer.input(eventId).mutation(({ input, ctx }) =>
    guarded(async () => {
      await pause(await getDatabase(), input.id, ctx.reviewer.login);
      forgetEvents();
    }),
  ),
  reject: maintainer
    .input(eventId.extend({ note: z.string().trim().max(300) }))
    .mutation(({ input, ctx }) =>
      guarded(async () => {
        await reject(await getDatabase(), input.id, input.note, ctx.reviewer.login);
        forgetEvents();
      }),
    ),
  merge: maintainer.input(eventId.extend({ into: z.string().max(80) })).mutation(({ input, ctx }) =>
    guarded(async () => {
      await merge(await getDatabase(), input.id, input.into, ctx.reviewer.login);
      forgetEvents();
    }),
  ),
  edit: maintainer.input(eventId.extend({ patch: editSchema })).mutation(({ input, ctx }) =>
    guarded(async () => {
      await edit(await getDatabase(), input.id, input.patch, ctx.reviewer.login);
      forgetEvents();
    }),
  ),
});

export type AppRouter = typeof appRouter;
