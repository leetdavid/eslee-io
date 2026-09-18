import { describe, expect, it } from "vitest";
import { evaluatePredictions, type QueueFeatures, type WaitExample } from "@/lib/queue-estimation";
import type { ProxyWaitExample } from "@/lib/queue-estimation-backtest";
import {
  calibratedWaitRange,
  calibrateWaitRanges,
  correctedWait,
  fitUpstreamCorrection,
} from "@/lib/queue-estimation-correction";
import { rollingProxyComparison } from "@/lib/queue-estimation-rolling";

function features(upstreamWait: number, throughputMinutes = upstreamWait): QueueFeatures {
  return {
    storeId: 1,
    predictedAt: 0,
    snapshotAt: 0,
    waitingGroups: 10,
    frontier: 100,
    callsPerMinute: 1,
    throughputMinutes,
    upstreamWait,
  };
}

function fitModel(training: WaitExample[]) {
  const model = fitUpstreamCorrection(training);
  if (!model) throw new Error("Expected a fitted correction");
  return model;
}

describe("regularized upstream correction", () => {
  it("leaves an already correct upstream estimate unchanged", () => {
    const training = Array.from({ length: 50 }, (_, index) => ({
      features: features(index + 10, (index + 10) * 1.5),
      waitMinutes: index + 10,
    }));
    const model = fitModel(training);
    expect(correctedWait(model, features(35, 60))).toBeCloseTo(35);
    expect(model.intercept).toBe(0);
    expect(model.slopes).toEqual([0, 0]);
  });

  it("learns a shared bias without per-branch parameters and keeps waits nonnegative", () => {
    const model = fitModel(
      Array.from({ length: 50 }, (_, index) => ({
        features: { ...features(index + 10), storeId: (index % 5) + 1 },
        waitMinutes: index + 5,
      })),
    );
    expect(correctedWait(model, { ...features(30), storeId: 99 })).toBeCloseTo(25);
    expect(correctedWait(model, features(0))).toBe(0);
  });

  it("limits the influence of a few extreme proxy outcomes", () => {
    const training = Array.from({ length: 100 }, (_, index) => ({
      features: features(20),
      waitMinutes: index < 3 ? 520 : 15,
    }));
    const prediction = correctedWait(fitModel(training), features(20));
    expect(prediction).toBeGreaterThan(14);
    expect(prediction).toBeLessThan(17);
  });

  it("shrinks feature corrections and handles constant features without a singular fit", () => {
    const training = Array.from({ length: 50 }, (_, index) => {
      const source = Math.exp(index / 10);
      return { features: features(source), waitMinutes: source + 5 * Math.log1p(source) };
    });
    const model = fitModel(training);
    expect(model.slopes[0]).toBeGreaterThan(0);
    expect(model.slopes[0]).toBeLessThan(5 * model.scales[0]);
    expect(model.slopes[1]).toBe(0);
    expect(fitUpstreamCorrection([])).toBeNull();
  });

  it("keeps the ridge penalty fixed when Huber weights downweight outliers", () => {
    const training = Array.from({ length: 80 }, (_, index) => {
      const source = 20 + index;
      return {
        features: features(source, (source * ((index % 5) + 1)) / 3),
        waitMinutes: source - 7 + (index % 10) * 0.8 + (index < 4 ? 300 : 0),
      };
    });
    const model = fitModel(training);
    const derivatives = [0, 0];
    for (const row of training) {
      const residual = row.waitMinutes - correctedWait(model, row.features);
      const huberDerivative = Math.max(-10, Math.min(10, residual));
      const sourceLog = Math.log1p(row.features.upstreamWait);
      const x = [sourceLog, Math.log1p(row.features.throughputMinutes) - sourceLog];
      for (const column of [0, 1] as const) {
        derivatives[column] =
          (derivatives[column] ?? 0) +
          (huberDerivative * ((x[column] ?? 0) - model.means[column])) /
            model.scales[column] /
            training.length;
      }
    }
    // At the optimum of mean Huber loss + 1/2 * ||slopes||², these agree.
    expect(derivatives[0]).toBeCloseTo(model.slopes[0], 4);
    expect(derivatives[1]).toBeCloseTo(model.slopes[1], 4);
  });
});

describe("condition-dependent calibration", () => {
  it("uses narrower errors for short waits and falls back to pooled errors for sparse bands", () => {
    const calibration = [
      ...Array.from({ length: 250 }, () => ({ features: features(10), waitMinutes: 12 })),
      ...Array.from({ length: 250 }, () => ({ features: features(70), waitMinutes: 100 })),
      ...Array.from({ length: 9 }, () => ({ features: features(40), waitMinutes: 140 })),
    ];
    const ranges = calibrateWaitRanges(calibration, (point) => point.upstreamWait);
    if (!ranges) throw new Error("Expected calibration");
    expect(ranges.pooledRadius).toBe(30);
    expect(calibratedWaitRange(ranges, 10, true)).toMatchObject({
      lowerMinutes: 5,
      upperMinutes: 15,
    });
    expect(calibratedWaitRange(ranges, 70, true)).toMatchObject({
      lowerMinutes: 40,
      upperMinutes: 100,
    });
    expect(calibratedWaitRange(ranges, 40, true)).toMatchObject({
      lowerMinutes: 10,
      upperMinutes: 70,
    });
    expect(calibratedWaitRange(ranges, 10, false)).toMatchObject({
      lowerMinutes: 0,
      upperMinutes: 40,
    });
    expect(calibrateWaitRanges([], (point) => point.upstreamWait)).toBeNull();
  });

  it("penalizes misses and unnecessarily wide intervals", () => {
    const narrow = evaluatePredictions([
      { actual: 45, prediction: { minutes: 45, lowerMinutes: 40, upperMinutes: 50 } },
    ]);
    const wide = evaluatePredictions([
      { actual: 45, prediction: { minutes: 45, lowerMinutes: 0, upperMinutes: 90 } },
    ]);
    const missed = evaluatePredictions([
      { actual: 45, prediction: { minutes: 20, lowerMinutes: 10, upperMinutes: 30 } },
    ]);
    expect(narrow?.meanIntervalScore).toBeCloseTo(10);
    expect(wide?.meanIntervalScore).toBeCloseTo(90);
    expect(missed?.meanIntervalScore).toBeCloseTo(320);
  });
});

function rollingExamples(): ProxyWaitExample[] {
  const start = Date.parse("2026-09-01T18:00:00+08:00");
  return Array.from({ length: 10 }, (_, day) =>
    Array.from({ length: 12 }, (_, index) => {
      const predictedAt = start + day * 86_400_000 + index * 300_000;
      const source = 10 + index;
      return {
        features: { ...features(source, source * 1.2), predictedAt, snapshotAt: predictedAt },
        waitMinutes: source - 2,
        outcomeAt: predictedAt + source * 60_000,
        lowerWaitMinutes: source - 4,
        upperWaitMinutes: source,
      };
    }),
  ).flat();
}

describe("rolling chronological comparison", () => {
  it("keeps each test day's labels and inputs out of fitting and calibration", () => {
    const examples = rollingExamples();
    const before = rollingProxyComparison(examples);
    const changed = examples.map((row) =>
      row.features.predictedAt >= Date.parse("2026-09-10T00:00:00+08:00")
        ? { ...row, waitMinutes: 500, features: { ...row.features, upstreamWait: 1000 } }
        : row,
    );
    const after = rollingProxyComparison(changed);
    expect(before.folds).toHaveLength(3);
    expect(after.folds.map((fold) => fold.correction)).toEqual(
      before.folds.map((fold) => fold.correction),
    );
    expect(after.folds.slice(0, 2)).toEqual(before.folds.slice(0, 2));
    expect(after.folds[2]?.metrics).not.toEqual(before.folds[2]?.metrics);
  });

  it("purges outcomes crossing into calibration and uses every test case once per model", () => {
    const examples = rollingExamples();
    const first = examples[0];
    if (!first) throw new Error("Missing fixture");
    examples[0] = { ...first, outcomeAt: Date.parse("2026-09-06T18:00:00+08:00") };
    const result = rollingProxyComparison(examples);
    expect(result.folds[0]).toMatchObject({
      testDay: "2026-09-08",
      trainingCount: 59,
      calibrationCount: 24,
      testCount: 12,
    });
    expect(result.aggregate.every((model) => model.count === 36)).toBe(true);
    expect(() => rollingProxyComparison(examples.slice(0, 12))).toThrow("eight usable days");
  });
});
