import {
  type EvaluatedPrediction,
  evaluatePredictions,
  fitQueueNowModel,
  hongKongDay,
  predictQueueNow,
  type QueueFeatures,
  type WaitPrediction,
} from "@/lib/queue-estimation";
import type { ProxyWaitExample } from "@/lib/queue-estimation-backtest";
import {
  calibratedWaitRange,
  calibrateWaitRanges,
  correctedWait,
  correctionSettings,
  fitUpstreamCorrection,
} from "@/lib/queue-estimation-correction";

const modelNames = [
  "upstreamPooled",
  "throughputV1",
  "correctedPooled",
  "upstreamAdaptive",
  "correctedAdaptive",
] as const;
type ModelName = (typeof modelNames)[number];

export function rollingProxyComparison(examples: readonly ProxyWaitExample[]) {
  const days = [
    ...new Set(examples.map(({ features }) => hongKongDay(features.predictedAt))),
  ].sort();
  if (days.length < 8) throw new Error("Rolling comparison requires at least eight usable days.");
  const accumulated: Record<ModelName, EvaluatedPrediction[]> = {
    upstreamPooled: [],
    throughputV1: [],
    correctedPooled: [],
    upstreamAdaptive: [],
    correctedAdaptive: [],
  };
  const folds = [];
  const skippedDays: string[] = [];
  for (let dayIndex = 7; dayIndex < days.length; dayIndex++) {
    const testDay = days[dayIndex];
    const calibrationStart = days[dayIndex - 2];
    if (!testDay || !calibrationStart) continue;
    const training = examples.filter(
      ({ features, outcomeAt }) =>
        hongKongDay(features.predictedAt) < calibrationStart &&
        hongKongDay(outcomeAt) < calibrationStart,
    );
    const calibration = examples.filter(({ features, outcomeAt }) => {
      const day = hongKongDay(features.predictedAt);
      return day >= calibrationStart && day < testDay && hongKongDay(outcomeAt) < testDay;
    });
    const test = examples.filter(({ features }) => hongKongDay(features.predictedAt) === testDay);
    const throughputModel = fitQueueNowModel(training, calibration);
    const correction = fitUpstreamCorrection(training);
    if (!throughputModel || !correction) {
      skippedDays.push(testDay);
      continue;
    }
    const upstream = (features: QueueFeatures) => features.upstreamWait;
    const corrected = (features: QueueFeatures) => correctedWait(correction, features);
    const upstreamRanges = calibrateWaitRanges(calibration, upstream);
    const correctedRanges = calibrateWaitRanges(calibration, corrected);
    if (!upstreamRanges || !correctedRanges) {
      skippedDays.push(testDay);
      continue;
    }
    const predictors: Record<ModelName, (features: QueueFeatures) => WaitPrediction> = {
      upstreamPooled: (features) => calibratedWaitRange(upstreamRanges, upstream(features), false),
      throughputV1: (features) => predictQueueNow(throughputModel, features),
      correctedPooled: (features) =>
        calibratedWaitRange(correctedRanges, corrected(features), false),
      upstreamAdaptive: (features) => calibratedWaitRange(upstreamRanges, upstream(features), true),
      correctedAdaptive: (features) =>
        calibratedWaitRange(correctedRanges, corrected(features), true),
    };
    const metrics = modelNames.map((name) => {
      const rows = test.map(({ features, waitMinutes }) => ({
        actual: waitMinutes,
        prediction: predictors[name](features),
      }));
      accumulated[name].push(...rows);
      return { model: name, ...evaluatePredictions(rows) };
    });
    folds.push({
      testDay,
      calibrationStart,
      trainingCount: training.length,
      calibrationCount: calibration.length,
      testCount: test.length,
      correction,
      metrics,
    });
  }
  if (!folds.length) throw new Error("No rolling folds had enough training and calibration data.");
  return {
    status: "retrospective-rolling-proxy-comparison",
    settings: correctionSettings,
    protocol: {
      minimumTrainingDays: 5,
      calibrationDays: 2,
      testDaysPerFold: 1,
      labelSource: "queue-clearance-proxy",
      upstreamUnits: "assumed-minutes-unconfirmed",
      finalHoldout: false,
      intervalBandsMinutes: [15, 30, 60, "over-60"],
      minimumBandCalibrationExamples: 200,
      sourceSemanticsAndActualWaitAccuracyRequirePilot: true,
    },
    skippedDays,
    aggregate: modelNames.map((name) => ({
      model: name,
      ...evaluatePredictions(accumulated[name]),
    })),
    folds,
  };
}
