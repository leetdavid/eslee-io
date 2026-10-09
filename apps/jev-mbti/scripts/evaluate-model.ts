import assert from "node:assert/strict";
import { axesOf, correctedTypes, gradeOf, type Plot, pointsFor, ranksOf } from "@/lib/chart";
import { MBTI_TYPES, type MbtiType } from "@/lib/mbti";
import type { CleanAsk } from "@/lib/question";
import { chooseAxes, RefusedQuestionError } from "@/server/axes";
import { placeTypes } from "@/server/jev";
import { LLM_MODEL, LLM_PROVIDER } from "@/server/models";
import { writeReview } from "@/server/review";

// Opt-in live evaluation of Jev (question checks, placements) and the configured
// LLM (suggested axes, review). Nothing is saved. Expectations follow the Korean
// stereotypes in the lore. Every case runs even when an earlier one fails.
const average = (plot: Plot, types: MbtiType[], axis: "x" | "y" = "x") =>
  types.reduce((sum, type) => sum + (plot.placements[type][axis]?.position ?? 0), 0) / types.length;
const withLetter = (letter: string) => MBTI_TYPES.filter((type) => type.includes(letter));

const failures: string[] = [];
async function check(name: string, run: () => Promise<void>) {
  const started = Date.now();
  try {
    await run();
    console.log(`PASS ${name} (${Date.now() - started} ms)`);
  } catch (error) {
    failures.push(name);
    const reason = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    console.log(`FAIL ${name} (${Date.now() - started} ms): ${reason.slice(0, 300)}`);
  }
}

async function chart(ask: CleanAsk) {
  const started = Date.now();
  const plan = await chooseAxes(ask);
  const axesMs = Date.now() - started;
  const jev = await placeTypes(plan.questionText?.en ?? ask.question, plan.axes, plan.loreTopics);
  const plot: Plot = { version: 1, ...plan, placements: jev.placements, jevMs: jev.ms };
  const ranks = ranksOf(pointsFor(plot, null));
  console.log(
    JSON.stringify({
      question: ask.question,
      axes: plan.axes.map(
        (axis) =>
          `${axis.kind}: ${axis.low.en} ↔ ${axis.high.en} | ${axis.low.ko} ↔ ${axis.high.ko}`,
      ),
      topics: plan.loreTopics,
      // Jev's question checks, plus the LLM when it designs the axes.
      axesMs,
      jevMs: jev.ms,
      spread: plan.axes.map((_, index) => {
        const key = index === 0 ? "x" : "y";
        const values = MBTI_TYPES.map((type) => plot.placements[type][key]?.position ?? 0);
        return {
          atTheEnds: values.filter((v) => v > 0.95 || v < 0.05).length,
          distinctTenths: new Set(values.map((v) => Math.round(v * 10))).size,
        };
      }),
      ranking: [...MBTI_TYPES]
        .sort((a, b) => ranks[a] - ranks[b])
        .map((type) => `${type}:${plot.placements[type].x.position.toFixed(2)}`)
        .join(" "),
    }),
  );
  return { plot, axesMs };
}

async function review(question: string, plot: Plot) {
  let progressUpdates = 0;
  let wordingMs: number | null = null;
  let typesBeforeWording = 0;
  const started = Date.now();
  const result = await writeReview(question, plot, async (partial) => {
    progressUpdates += 1;
    if (partial.wording && wordingMs === null) {
      wordingMs = Date.now() - started;
      typesBeforeWording = Object.keys(partial.types).length;
    }
  });
  console.log(
    JSON.stringify({
      reviewedBy: result.model,
      reviewMs: Date.now() - started,
      wordingMs,
      progressUpdates,
      grade: gradeOf(result.review),
      wording: result.review.wording
        ? {
            question: result.review.wording.question,
            axes: axesOf(plot, result.review).map((axis) => ({
              name: axis.name,
              ends: `${axis.low.ko} ↔ ${axis.high.ko} | ${axis.low.en} ↔ ${axis.high.en}`,
              levels: axis.levels.map((level) => level.label.ko).join(" / "),
            })),
          }
        : null,
      corrections: correctedTypes(plot, result.review).map((type) => ({
        type,
        from: plot.placements[type].x.position.toFixed(2),
        to: result.review.types[type]?.correction?.x,
        note: result.review.types[type]?.correction?.note.en,
      })),
      summary: result.review.summary,
    }),
  );
  assert.ok(progressUpdates > 0, "The review should stream progress");
  return { ...result, wordingMs, typesBeforeWording };
}

console.log(`Evaluating ${LLM_PROVIDER} ${LLM_MODEL}`);
// Asserted so later reads aren't narrowed to null; the cases assign them.
let cry = null as Plot | null;
let breakup = null as Plot | null;

await check("Korean ranking question gets a Jev-first fit axis, F above T", async () => {
  ({ plot: cry } = await chart({ question: "영화 보다가 제일 먼저 우는 MBTI는?", mode: "auto" }));
  assert.equal(cry.axes.length, 1, "A ranking question should get one axis");
  assert.equal(cry.axes[0]?.kind, "fit", "A ranking question shouldn't wait for the LLM");
  assert.ok(
    average(cry, withLetter("F")) > average(cry, withLetter("T")) + 0.1,
    "F types should cry more",
  );
});

await check("English ranking question puts J above P", async () => {
  const { plot: trip } = await chart({ question: "Who plans the trip?", mode: "auto" });
  assert.equal(trip.axes[0]?.kind, "fit", "A ranking question shouldn't wait for the LLM");
  assert.ok(
    average(trip, withLetter("J")) > average(trip, withLetter("P")) + 0.1,
    "J types should plan more",
  );
});

await check("Style question gets two suggested axes", async () => {
  ({ plot: breakup } = await chart({ question: "MBTI별 이별 후 반응", mode: "auto" }));
  assert.equal(breakup.axes.length, 2, "A style question should get two axes");
  assert.equal(breakup.axes[0]?.kind, "suggested", "The LLM designs a style question's axes");
});

await check("Forced two-axis chart gets two axes", async () => {
  const { plot: texting } = await chart({ question: "MBTI별 카톡 답장 스타일", mode: "two" });
  assert.equal(texting.axes.length, 2, "A forced two-axis chart needs two axes");
});

await check("Custom ends are placed without the LLM, J above P for survival", async () => {
  const { plot: custom } = await chart({
    question: "Who survives a zombie outbreak?",
    mode: "one",
    axes: [{ low: "Bitten first", high: "Last one standing" }],
  });
  assert.equal(custom.axes[0]?.kind, "custom");
  assert.equal(custom.axes[0]?.low.en, "Bitten first", "Custom ends must be kept verbatim");
  assert.ok(
    average(custom, withLetter("J")) > average(custom, withLetter("P")) + 0.1,
    "J types should survive longer",
  );
});

await check("Question about a named coworker is refused", async () => {
  await assert.rejects(
    chooseAxes({ question: "우리 팀 지수가 얼마나 짜증나는지 MBTI로 순위 매겨줘", mode: "auto" }),
    RefusedQuestionError,
  );
});

await check("Question personality can't answer is refused", async () => {
  await assert.rejects(
    chooseAxes({ question: "What's the capital of France?", mode: "auto" }),
    RefusedQuestionError,
  );
});

await check("Review words a Jev-first chart before explaining it", async () => {
  const plot = cry;
  if (!plot) throw new Error("Skipped: the first chart failed");
  const result = await review("영화 보다가 제일 먼저 우는 MBTI는?", plot);
  assert.ok(result.review.wording, "A Jev-first chart needs wording");
  assert.ok(result.wordingMs !== null, "The wording should stream before the review finishes");
  assert.ok(result.typesBeforeWording <= 1, "The wording should come before the explanations");
});

await check("Review of suggested axes writes no wording", async () => {
  const plot = breakup;
  if (!plot) throw new Error("Skipped: the style chart failed");
  const result = await review("MBTI별 이별 후 반응", plot);
  assert.equal(result.review.wording, undefined, "Suggested axes are already worded");
});

console.log(
  failures.length
    ? `${failures.length} case(s) failed: ${failures.join("; ")}`
    : "Live evaluation passed.",
);
process.exit(failures.length ? 1 : 0);
