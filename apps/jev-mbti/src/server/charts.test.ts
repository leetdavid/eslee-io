import { JevMbtiChart } from "@eslee/db/jev-mbti";
import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { Review } from "@/lib/chart";
import { MBTI_TYPES } from "@/lib/mbti";
import { cryAxis, cryPlot, fitCryPlot, fitCryWording } from "@/lib/test-fixtures";
import { RateLimitedError } from "@/server/budget";
import { type ChartDeps, chartService, DraftError } from "@/server/charts";
import { type Database, openPglite } from "@/server/database";

process.env.RATE_LIMIT_SECRET = "test-secret";

const explanation = { ko: "이유", en: "Reason" };

function completeReview(): Review {
  return {
    types: Object.fromEntries(
      MBTI_TYPES.map((type) => [
        type,
        type === "ISFJ"
          ? { explanation, correction: { x: 0.82, note: { ko: "메모", en: "Note" } } }
          : { explanation },
      ]),
    ),
    summary: { ko: "총평", en: "Overall" },
  };
}

let db: Database;
let clock = Date.UTC(2026, 9, 9, 3);

function service(overrides: Partial<ChartDeps> = {}) {
  return chartService({
    db: async () => db,
    chooseAxes: vi.fn(async () => ({
      questionText: cryPlot.questionText,
      axes: [cryAxis],
      loreTopics: cryPlot.loreTopics,
    })),
    placeTypes: vi.fn(async () => ({
      placements: cryPlot.placements,
      model: "jev-1.13.0",
      ms: 900,
    })),
    writeReview: vi.fn(async (_question, _plot, onProgress) => {
      await onProgress({ types: { INFP: { explanation } } });
      return { review: completeReview(), model: "Routed Model" };
    }),
    reviewModel: "Test LLM",
    secret: () => "test-secret",
    now: () => clock,
    ...overrides,
  });
}

beforeAll(async () => {
  db = await openPglite();
});

async function createChart(charts: ReturnType<typeof service>, question: string) {
  const suggested = await charts.suggest({ question, mode: "auto" }, `ip-${question}`);
  if (suggested.kind !== "draft") throw new Error("Expected a draft");
  return charts.place(suggested.draft);
}

describe("chart service", () => {
  it("saves a chart and reuses it for the same question identity", async () => {
    const charts = service();
    const { id } = await createChart(charts, "Which type cries first at a movie?");
    const chart = await charts.load(id);
    expect(chart?.plot.axes).toHaveLength(1);
    expect(chart?.reviewStatus).toBe("pending");
    expect(chart?.questionLanguage).toBe("en");
    const again = await charts.suggest(
      { question: "which type cries  first at a movie?", mode: "auto" },
      "other",
    );
    expect(again).toEqual({ kind: "existing", id });
  });

  it("places a Jev-first chart from the original question and waits for the review's wording", async () => {
    const placeTypes = vi.fn<ChartDeps["placeTypes"]>(async () => ({
      placements: fitCryPlot.placements,
      model: "jev-1.13.0",
      ms: 400,
    }));
    let worded = false;
    const charts = service({
      chooseAxes: vi.fn(async () => ({ axes: fitCryPlot.axes, loreTopics: fitCryPlot.loreTopics })),
      placeTypes,
      writeReview: async () => ({
        review: { ...completeReview(), ...(worded ? { wording: fitCryWording } : {}) },
        model: "Routed Model",
      }),
    });
    const question = "영화 보다가 제일 먼저 우는 MBTI는?";
    const { id } = await createChart(charts, question);
    expect(placeTypes.mock.calls[0]?.[0]).toBe(question);
    const chart = await charts.load(id);
    expect(chart?.plot.questionText).toBeUndefined();
    expect(chart?.plot.axes[0]?.kind).toBe("fit");
    await expect(charts.review(id, "a")).rejects.toThrow("unworded");
    worded = true;
    expect(await charts.review(id, "b")).toBe("complete");
    await db.update(JevMbtiChart).set({ isExample: true }).where(eq(JevMbtiChart.id, id));
    const example = (await charts.examples()).find((entry) => entry.id === id);
    expect(example?.questionText).toEqual({
      ko: question,
      en: "Which type cries first at a movie?",
    });
  });

  it("rejects tampered and expired drafts", async () => {
    const charts = service();
    const suggested = await charts.suggest(
      { question: "Who plans the trip?", mode: "auto" },
      "drafts",
    );
    if (suggested.kind !== "draft") throw new Error("Expected a draft");
    const [payload, signature] = suggested.draft.split(".");
    const forged = `${Buffer.from(JSON.stringify({ hacked: true })).toString("base64url")}.${signature}`;
    await expect(charts.place(forged)).rejects.toEqual(new DraftError("invalid"));
    clock += 11 * 60_000;
    await expect(charts.place(`${payload}.${signature}`)).rejects.toEqual(
      new DraftError("expired"),
    );
  });

  it("runs the review once, even when viewers ask concurrently", async () => {
    const writeReview = vi.fn<ChartDeps["writeReview"]>(async (_question, _plot, onProgress) => {
      await onProgress({ types: { INFP: { explanation } } });
      return { review: completeReview(), model: "Routed Model" };
    });
    const charts = service({ writeReview });
    const { id } = await createChart(charts, "Which type texts back fastest?");
    const results = await Promise.all([
      charts.review(id, "a"),
      charts.review(id, "b"),
      charts.review(id, "c"),
    ]);
    expect(writeReview).toHaveBeenCalledTimes(1);
    expect(results).toContain("complete");
    const chart = await charts.load(id);
    expect(chart?.reviewStatus).toBe("complete");
    // The answering model replaces the in-progress label.
    expect(chart?.reviewModel).toBe("Routed Model");
    expect(chart?.review?.types.ISFJ?.correction?.x).toBe(0.82);
    expect(await charts.review(id, "a")).toBe("complete");
    expect(writeReview).toHaveBeenCalledTimes(1);
  });

  it("marks a failed review so any viewer can retry, keeping Jev's placements", async () => {
    let attempt = 0;
    const charts = service({
      writeReview: async () => {
        attempt += 1;
        if (attempt === 1) throw new Error("connection lost");
        return { review: completeReview(), model: "Routed Model" };
      },
    });
    const { id } = await createChart(charts, "Who stays for the second round?");
    await expect(charts.review(id, "a")).rejects.toThrow("connection lost");
    const failed = await charts.load(id);
    expect(failed?.reviewStatus).toBe("failed");
    expect(failed?.review).toBeNull();
    expect(failed?.plot.placements.INFP.x.position).toBe(cryPlot.placements.INFP.x.position);
    expect(await charts.review(id, "b")).toBe("complete");
  });

  it("reclaims a review that has been running too long", async () => {
    const charts = service();
    const { id } = await createChart(charts, "Who survives a zombie outbreak?");
    await db
      .update(JevMbtiChart)
      .set({ reviewStatus: "running", reviewStartedAt: new Date(clock - 10_000) })
      .where(eq(JevMbtiChart.id, id));
    expect(await charts.review(id, "a")).toBe("running");
    clock += 200_000;
    expect(await charts.review(id, "a")).toBe("complete");
  });

  it("rate-limits new questions per visitor without charging reused charts", async () => {
    const charts = service();
    for (let i = 0; i < 12; i++)
      await charts.suggest({ question: `Budget question ${i}?`, mode: "one" }, "busy");
    await expect(
      charts.suggest({ question: "One too many?", mode: "one" }, "busy"),
    ).rejects.toBeInstanceOf(RateLimitedError);
    const { id } = await createChart(charts, "Reused question?");
    await expect(
      charts.suggest({ question: "Reused question?", mode: "auto" }, "busy"),
    ).resolves.toEqual({ kind: "existing", id });
  });

  it("lists only reviewed example charts with their grade", async () => {
    const charts = service();
    const { id } = await createChart(charts, "Example question?");
    await charts.review(id, "examples");
    await db.update(JevMbtiChart).set({ isExample: true }).where(eq(JevMbtiChart.id, id));
    const examples = await charts.examples();
    expect(examples.map((example) => example.id)).toContain(id);
    expect(examples.find((example) => example.id === id)?.grade).toBe(15);
  });

  it("returns nothing for malformed or unknown ids", async () => {
    const charts = service();
    expect(await charts.load("../../etc")).toBeNull();
    expect(await charts.load("abcdefgh")).toBeNull();
  });
});
