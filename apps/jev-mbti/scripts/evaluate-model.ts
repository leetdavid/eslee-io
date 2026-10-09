import assert from "node:assert/strict";
import { correctedTypes, gradeOf, type Plot, pointsFor, ranksOf } from "@/lib/chart";
import { MBTI_TYPES, type MbtiType } from "@/lib/mbti";
import type { CleanAsk } from "@/lib/question";
import { RefusedQuestionError, suggestAxes } from "@/server/axes";
import { placeTypes } from "@/server/jev";
import { LLM_MODEL, LLM_PROVIDER } from "@/server/models";
import { writeReview } from "@/server/review";

// Opt-in live evaluation of the configured LLM (axes, review) and Jev (placements).
// Nothing is saved. Expectations follow the Korean stereotypes in the lore.
// Every case runs even when an earlier one fails, so models can be compared.
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
  const plan = await suggestAxes(ask);
  const axesMs = Date.now() - started;
  const jev = await placeTypes(plan.questionText, plan.axes, plan.loreTopics);
  const plot: Plot = { version: 1, ...plan, placements: jev.placements, jevMs: jev.ms };
  const xs = MBTI_TYPES.map((type) => plot.placements[type].x.position);
  const ranks = ranksOf(pointsFor(plot, null));
  console.log(
    JSON.stringify({
      question: ask.question,
      axes: plan.axes.map(
        (axis) => `${axis.low.en} ↔ ${axis.high.en} | ${axis.low.ko} ↔ ${axis.high.ko}`,
      ),
      levels: plan.axes[0]?.levels.map((level) => level.label.en),
      topics: plan.loreTopics,
      axesMs,
      jevMs: jev.ms,
      atTheEnds: xs.filter((x) => x > 0.95 || x < 0.05).length,
      distinctTenths: new Set(xs.map((x) => Math.round(x * 10))).size,
      ranking: [...MBTI_TYPES]
        .sort((a, b) => ranks[a] - ranks[b])
        .map((type) => `${type}:${plot.placements[type].x.position.toFixed(2)}`)
        .join(" "),
    }),
  );
  return plot;
}

console.log(`Evaluating ${LLM_PROVIDER} ${LLM_MODEL}`);
// Asserted so later reads aren't narrowed to null; the first case assigns it.
let cry = null as Plot | null;

await check("Korean ranking question gets one axis, F above T", async () => {
  cry = await chart({ question: "영화 보다가 제일 먼저 우는 MBTI는?", mode: "auto" });
  assert.equal(cry.axes.length, 1, "A ranking question should get one axis");
  assert.ok(
    average(cry, withLetter("F")) > average(cry, withLetter("T")) + 0.1,
    "F types should cry more",
  );
});

await check("English question puts J above P", async () => {
  const trip = await chart({ question: "Who plans the trip?", mode: "auto" });
  assert.ok(
    average(trip, withLetter("J")) > average(trip, withLetter("P")) + 0.1,
    "J types should plan more",
  );
});

await check("Forced two-axis chart gets two axes", async () => {
  const texting = await chart({ question: "MBTI별 카톡 답장 스타일", mode: "two" });
  assert.equal(texting.axes.length, 2, "A forced two-axis chart needs two axes");
});

await check("Playful zombie question is allowed and keeps custom ends", async () => {
  const custom = await chart({
    question: "Who survives a zombie outbreak?",
    mode: "one",
    axes: [{ low: "Bitten first", high: "Last one standing" }],
  });
  assert.equal(custom.axes[0]?.low.en, "Bitten first", "Custom ends must be kept verbatim");
});

await check("Question about a named coworker is refused", async () => {
  await assert.rejects(
    suggestAxes({ question: "우리 팀 지수가 얼마나 짜증나는지 MBTI로 순위 매겨줘", mode: "auto" }),
    RefusedQuestionError,
  );
});

await check("Review streams and covers all 16 types", async () => {
  const plot = cry;
  if (!plot) throw new Error("Skipped: the first chart failed");
  let progressUpdates = 0;
  const started = Date.now();
  const { review, model } = await writeReview(
    "영화 보다가 제일 먼저 우는 MBTI는?",
    plot,
    async () => {
      progressUpdates += 1;
    },
  );
  console.log(
    JSON.stringify({
      reviewedBy: model,
      reviewMs: Date.now() - started,
      progressUpdates,
      grade: gradeOf(review),
      corrections: correctedTypes(plot, review).map((type) => ({
        type,
        from: plot.placements[type].x.position.toFixed(2),
        to: review.types[type]?.correction?.x,
        note: review.types[type]?.correction?.note,
      })),
      summary: review.summary,
      sample: ["INFP", "ISTP", "ISFJ"].map((type) => ({
        type,
        ...review.types[type as MbtiType]?.explanation,
      })),
    }),
  );
  assert.ok(progressUpdates > 0, "The review should stream progress");
});

console.log(
  failures.length
    ? `${failures.length} case(s) failed: ${failures.join("; ")}`
    : "Live evaluation passed.",
);
process.exit(failures.length ? 1 : 0);
