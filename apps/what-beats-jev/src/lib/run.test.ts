import { describe, expect, it } from "vitest";
import { applyJudgment, createRun, restoreRun } from "@/lib/run";

describe("run recovery", () => {
  it("resumes a winning chain with its original verdict confidence", () => {
    const result = {
      beats: true,
      confidence: 0.6,
      model: "jev-1.13.0",
      source: "jev" as const,
      isNewMatchup: true,
    };
    const run = applyJudgment(createRun(), "Paper", result);
    expect(restoreRun(JSON.stringify(run))).toMatchObject({
      chain: ["rock", "Paper"],
      ended: false,
      lastJudgment: { confidence: 0.6 },
    });
  });

  it("does not add a losing answer or revive a completed run after refresh", () => {
    const run = applyJudgment(createRun(), "a cheerful sandwich", {
      beats: false,
      confidence: 0.84,
      model: "jev-1.13.0",
      source: "cache",
      isNewMatchup: false,
    });
    expect(run.chain).toEqual(["rock"]);
    expect(restoreRun(JSON.stringify(run))).toMatchObject({
      ended: true,
      lastJudgment: { answer: "a cheerful sandwich", confidence: 0.84 },
    });
    expect(() =>
      applyJudgment(run, "paper", {
        beats: true,
        confidence: 0.6,
        model: "jev-1.13.0",
        source: "cache",
        isNewMatchup: false,
      }),
    ).toThrow("ended");
  });

  it("rejects corrupt storage and duplicate-phrase chains", () => {
    expect(restoreRun("not JSON")).toBeNull();
    expect(
      restoreRun(JSON.stringify({ ...createRun(), chain: ["rock", "paper", "ROCK"] })),
    ).toBeNull();
  });

  it("does not restore an ended run without a rejecting verdict", () => {
    expect(restoreRun(JSON.stringify({ ...createRun(), ended: true }))).toBeNull();
  });

  it("blocks numeric answers without changing the run", () => {
    const run = { ...createRun(), draft: "a rock crusher model 2" };
    expect(() =>
      applyJudgment(run, run.draft, {
        beats: true,
        confidence: 1,
        model: "jev-1.13.0",
        source: "cache",
        isNewMatchup: false,
      }),
    ).toThrow("im bad at math");
    expect(run.chain).toEqual(["rock"]);
    expect(run.draft).toBe("a rock crusher model 2");
    expect(run.ended).toBe(false);
  });

  it.each([true, false])("restores pre-ban numeric verdicts with beats=%s", (beats) => {
    const run = {
      ...createRun(),
      chain: beats ? ["rock", "a rock crusher model 2"] : ["rock"],
      ended: !beats,
      lastJudgment: {
        beats,
        confidence: 0.8,
        model: "jev-1.13.0",
        source: "cache",
        isNewMatchup: false,
        challenge: "rock",
        answer: "a rock crusher model 2",
      },
    };
    expect(restoreRun(JSON.stringify(run))).toEqual(run);
  });

  it.each([
    "   ",
    "a".repeat(241),
    " ROCK ",
  ])("still rejects invalid stored losing answers: %s", (answer) => {
    const run = {
      ...createRun(),
      ended: true,
      lastJudgment: {
        beats: false,
        confidence: 0.8,
        model: "jev-1.13.0",
        source: "cache",
        isNewMatchup: false,
        challenge: "rock",
        answer,
      },
    };
    expect(restoreRun(JSON.stringify(run))).toBeNull();
  });

  it("never accepts a discovery notice on a rejected or cached verdict", () => {
    expect(() =>
      applyJudgment(createRun(), "paper", {
        beats: true,
        confidence: 0.5,
        model: "jev-1.13.0",
        source: "cache",
        isNewMatchup: true,
      }),
    ).toThrow();
    expect(() =>
      applyJudgment(createRun(), "sandwich", {
        beats: false,
        confidence: 0.5,
        model: "jev-1.13.0",
        source: "jev",
        isNewMatchup: true,
      }),
    ).toThrow();
  });
});
