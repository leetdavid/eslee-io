import "server-only";

import { createHash, createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { JevMbtiChart } from "@eslee/db/jev-mbti";
import { and, desc, eq, inArray, lt, or } from "drizzle-orm";
import { z } from "zod";
import {
  type Axis,
  axisSchema,
  type Bilingual,
  bilingualSchema,
  type ChartData,
  gradeOf,
  isReviewComplete,
  needsWording,
  type Plot,
  plotSchema,
  pointsFor,
  questionIn,
  type Review,
  type ReviewStatus,
  reviewSchema,
  STALE_REVIEW_MS,
} from "@/lib/chart";
import type { Locale } from "@/lib/i18n";
import type { MbtiType } from "@/lib/mbti";
import {
  type AskInput,
  AXIS_MODES,
  type CleanAsk,
  checkAsk,
  detectLanguage,
  reuseIdentity,
  textIdentity,
} from "@/lib/question";
import { LORE_TOPICS, type LoreTopic } from "@/lore/schema";
import type { AxisPlan } from "@/server/axes";
import { reserveBudget } from "@/server/budget";
import type { Database } from "@/server/database";

export class InvalidQuestionError extends Error {
  constructor(readonly issue: ReturnType<typeof checkAsk> & { ok: false }) {
    super("Invalid question");
  }
}

export class DraftError extends Error {
  constructor(readonly reason: "expired" | "invalid") {
    super(`Draft ${reason}`);
  }
}

export type ChartDeps = {
  db: () => Promise<Database>;
  /** Jev reads the question; the LLM designs axes only for style questions and two-axis charts. */
  chooseAxes: (ask: CleanAsk) => Promise<AxisPlan>;
  placeTypes: (
    question: string,
    axes: Axis[],
    topics: LoreTopic[],
  ) => Promise<{ placements: Plot["placements"]; model: string; ms: number }>;
  /** Resolves with the review and the label of the model that actually wrote it. */
  writeReview: (
    question: string,
    plot: Plot,
    onProgress: (review: Review) => Promise<void>,
  ) => Promise<{ review: Review; model: string }>;
  /** Shown while a review is running, before the answering model is known. */
  reviewModel: string;
  secret: () => string;
  now: () => number;
};

const DRAFT_TTL_MS = 10 * 60_000;
const ID_ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";
const ID_PATTERN = /^[2-9a-hj-km-np-z]{8}$/;

const draftSchema = z.object({
  v: z.literal(1),
  ask: z.object({
    question: z.string(),
    mode: z.enum(AXIS_MODES),
    axes: z.array(z.object({ low: z.string(), high: z.string() })).optional(),
  }),
  plan: z.object({
    questionText: bilingualSchema.optional(),
    axes: z.array(axisSchema).min(1).max(2),
    loreTopics: z.array(z.enum(LORE_TOPICS)).min(1).max(3),
  }),
  expires: z.number(),
});

export type SuggestResult =
  | { kind: "existing"; id: string }
  | { kind: "draft"; draft: string; axes: { low: Bilingual; high: Bilingual }[] };

export type ExampleChart = {
  id: string;
  question: string;
  questionText: Bilingual;
  axisCount: number;
  grade: number | null;
  points: Record<MbtiType, { x: number; y?: number }>;
};

function newId() {
  return Array.from({ length: 8 }, () => ID_ALPHABET[randomInt(ID_ALPHABET.length)]).join("");
}

function reuseKey(ask: CleanAsk) {
  return createHash("sha256").update(reuseIdentity(ask)).digest("hex");
}

export function chartService(deps: ChartDeps) {
  const sign = (payload: string) =>
    createHmac("sha256", deps.secret()).update(`draft:${payload}`).digest("base64url");

  async function existingId(db: Database, key: string) {
    const [row] = await db
      .select({ id: JevMbtiChart.id })
      .from(JevMbtiChart)
      .where(eq(JevMbtiChart.reuseKey, key))
      .limit(1);
    return row?.id ?? null;
  }

  /** Step one: reuse a saved chart, or choose axes for the question and return them as a signed draft. */
  async function suggest(input: AskInput, ip: string): Promise<SuggestResult> {
    const checked = checkAsk(input);
    if (!checked.ok) throw new InvalidQuestionError(checked);
    const ask = checked.value;
    const db = await deps.db();
    const existing = await existingId(db, reuseKey(ask));
    if (existing) return { kind: "existing", id: existing };
    await reserveBudget(db, "ask", ip, deps.now());
    const plan = await deps.chooseAxes(ask);
    const payload = Buffer.from(
      JSON.stringify({ v: 1, ask, plan, expires: deps.now() + DRAFT_TTL_MS }),
    ).toString("base64url");
    return {
      kind: "draft",
      draft: `${payload}.${sign(payload)}`,
      axes: plan.axes.map((axis) => ({ low: axis.low, high: axis.high })),
    };
  }

  function openDraft(draft: string) {
    const [payload, signature] = draft.split(".");
    if (!payload || !signature) throw new DraftError("invalid");
    const expected = Buffer.from(sign(payload));
    const actual = Buffer.from(signature);
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual))
      throw new DraftError("invalid");
    const parsed = draftSchema.safeParse(
      JSON.parse(Buffer.from(payload, "base64url").toString("utf8")),
    );
    if (!parsed.success) throw new DraftError("invalid");
    if (parsed.data.expires < deps.now()) throw new DraftError("expired");
    return parsed.data;
  }

  /** Step two: Jev places all 16 types on the drafted axes, and the chart is saved. */
  async function place(draft: string): Promise<{ id: string }> {
    const { ask, plan } = openDraft(draft);
    const db = await deps.db();
    const key = reuseKey(ask);
    const existing = await existingId(db, key);
    if (existing) return { id: existing };
    // Jev reads English best, so it gets the LLM's English wording when there is one.
    const jev = await deps.placeTypes(
      plan.questionText?.en ?? ask.question,
      plan.axes,
      plan.loreTopics,
    );
    const plot: Plot = plotSchema.parse({
      version: 1,
      questionText: plan.questionText,
      axes: plan.axes,
      loreTopics: plan.loreTopics,
      placements: jev.placements,
      jevMs: jev.ms,
    });
    const [inserted] = await db
      .insert(JevMbtiChart)
      .values({
        id: newId(),
        reuseKey: key,
        question: ask.question,
        questionIdentity: textIdentity(ask.question),
        questionLanguage: detectLanguage(ask.question),
        requestedMode: ask.mode,
        plot,
        jevModel: jev.model,
      })
      .onConflictDoNothing({ target: JevMbtiChart.reuseKey })
      .returning({ id: JevMbtiChart.id });
    if (inserted) return { id: inserted.id };
    const winner = await existingId(db, key);
    if (!winner) throw new Error("Chart insert lost a race without a winner");
    return { id: winner };
  }

  async function load(id: string): Promise<ChartData | null> {
    if (!ID_PATTERN.test(id)) return null;
    const db = await deps.db();
    const [row] = await db.select().from(JevMbtiChart).where(eq(JevMbtiChart.id, id)).limit(1);
    if (!row) return null;
    return {
      id: row.id,
      question: row.question,
      questionLanguage: row.questionLanguage as Locale,
      createdAt: row.createdAt.toISOString(),
      plot: plotSchema.parse(row.plot),
      jevModel: row.jevModel,
      review: row.review ? reviewSchema.parse(row.review) : null,
      reviewStatus: row.reviewStatus as ReviewStatus,
      reviewModel: row.reviewModel,
    };
  }

  const claimable = (now: number) =>
    or(
      inArray(JevMbtiChart.reviewStatus, ["pending", "failed"]),
      and(
        eq(JevMbtiChart.reviewStatus, "running"),
        lt(JevMbtiChart.reviewStartedAt, new Date(now - STALE_REVIEW_MS)),
      ),
    );

  /**
   * Runs the review once. Only a pending, failed, or stale chart can be
   * claimed, so concurrent viewers never review the same chart twice.
   */
  async function review(id: string, ip: string): Promise<ReviewStatus | null> {
    const chart = await load(id);
    if (!chart) return null;
    const db = await deps.db();
    const now = deps.now();
    const [row] = await db
      .select({ startedAt: JevMbtiChart.reviewStartedAt })
      .from(JevMbtiChart)
      .where(eq(JevMbtiChart.id, id));
    const stale = !row?.startedAt || row.startedAt.getTime() < now - STALE_REVIEW_MS;
    if (chart.reviewStatus === "complete" || (chart.reviewStatus === "running" && !stale))
      return chart.reviewStatus;
    // Charged before claiming, so a rate limit leaves the chart as it was.
    await reserveBudget(db, "review", ip, now);
    const startedAt = new Date(now);
    const claimed = await db
      .update(JevMbtiChart)
      .set({
        reviewStatus: "running",
        reviewStartedAt: startedAt,
        review: null,
        reviewModel: deps.reviewModel,
      })
      .where(and(eq(JevMbtiChart.id, id), claimable(now)))
      .returning({ id: JevMbtiChart.id });
    if (!claimed.length) return (await load(id))?.reviewStatus ?? null;
    const owned = and(
      eq(JevMbtiChart.id, id),
      eq(JevMbtiChart.reviewStatus, "running"),
      eq(JevMbtiChart.reviewStartedAt, startedAt),
    );
    try {
      const { review, model } = await deps.writeReview(
        chart.question,
        chart.plot,
        async (partial) => {
          await db.update(JevMbtiChart).set({ review: partial }).where(owned);
        },
      );
      if (!isReviewComplete(review)) throw new Error("The review is incomplete");
      if (needsWording(chart.plot) && !review.wording)
        throw new Error("The review left the chart unworded");
      await db
        .update(JevMbtiChart)
        .set({
          review,
          reviewModel: model,
          reviewStatus: "complete",
          reviewCompletedAt: new Date(deps.now()),
        })
        .where(owned);
      return "complete";
    } catch (error) {
      await db.update(JevMbtiChart).set({ reviewStatus: "failed", review: null }).where(owned);
      throw error;
    }
  }

  async function examples(): Promise<ExampleChart[]> {
    const db = await deps.db();
    const rows = await db
      .select()
      .from(JevMbtiChart)
      .where(and(eq(JevMbtiChart.isExample, true), eq(JevMbtiChart.reviewStatus, "complete")))
      .orderBy(desc(JevMbtiChart.createdAt))
      .limit(6);
    return rows.flatMap((row) => {
      const plot = plotSchema.safeParse(row.plot);
      const parsed = reviewSchema.safeParse(row.review);
      if (!plot.success || !parsed.success) return [];
      const chart = {
        question: row.question,
        questionLanguage: row.questionLanguage as Locale,
        plot: plot.data,
        review: parsed.data,
      };
      return [
        {
          id: row.id,
          question: row.question,
          questionText: { ko: questionIn(chart, "ko"), en: questionIn(chart, "en") },
          axisCount: plot.data.axes.length,
          grade: isReviewComplete(parsed.data) ? gradeOf(parsed.data) : null,
          points: pointsFor(plot.data, parsed.data),
        },
      ];
    });
  }

  return { suggest, place, load, review, examples };
}
