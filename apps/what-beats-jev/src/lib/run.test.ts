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
