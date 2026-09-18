import {
  calibrationRadius,
  type QueueFeatures,
  roundedWaitRange,
  type WaitExample,
} from "@/lib/queue-estimation";

export const correctionSettings = { ridgePenalty: 1, huberMinutes: 10, iterations: 10 } as const;
export const waitBandUpperBounds = [15, 30, 60, Number.POSITIVE_INFINITY] as const;
const minimumBandExamples = 200;

type Pair = [number, number];

export type UpstreamCorrection = {
  labelSource: "queue-clearance-proxy";
  means: Pair;
  scales: Pair;
  intercept: number;
  slopes: Pair;
  trainingCount: number;
};

export type RangeCalibration = {
  pooledRadius: number;
  bands: { count: number; radius: number | null }[];
};

function inputs(features: QueueFeatures): Pair {
  const upstream = Math.log1p(features.upstreamWait);
  return [upstream, Math.log1p(features.throughputMinutes) - upstream];
}

/** Three shared coefficients, with fixed shrinkage toward the upstream estimate. */
export function fitUpstreamCorrection(training: readonly WaitExample[]): UpstreamCorrection | null {
  if (!training.length) return null;
  const raw = training.map(({ features, waitMinutes }) => ({
    x: inputs(features),
    y: waitMinutes - features.upstreamWait,
  }));
  const means: Pair = [0, 0];
  const scales: Pair = [1, 1];
  for (const column of [0, 1] as const) {
    means[column] = raw.reduce((sum, row) => sum + row.x[column], 0) / raw.length;
    const variance =
      raw.reduce((sum, row) => sum + (row.x[column] - means[column]) ** 2, 0) / raw.length;
    scales[column] = Math.sqrt(variance) || 1;
  }
  const data = raw.map(({ x, y }) => ({
    x: (x[0] - means[0]) / scales[0],
    z: (x[1] - means[1]) / scales[1],
    y,
  }));
  let intercept = 0;
  let firstSlope = 0;
  let secondSlope = 0;
  for (let iteration = 0; iteration < correctionSettings.iterations; iteration++) {
    const weighted = data.map((row) => {
      const residual = row.y - intercept - firstSlope * row.x - secondSlope * row.z;
      const weight = Math.min(
        1,
        correctionSettings.huberMinutes / Math.max(Math.abs(residual), 1e-9),
      );
      return { ...row, weight };
    });
    const weightSum = weighted.reduce((sum, row) => sum + row.weight, 0);
    const mx = weighted.reduce((sum, row) => sum + row.weight * row.x, 0) / weightSum;
    const mz = weighted.reduce((sum, row) => sum + row.weight * row.z, 0) / weightSum;
    const my = weighted.reduce((sum, row) => sum + row.weight * row.y, 0) / weightSum;
    let xx = 0;
    let zz = 0;
    let xz = 0;
    let xy = 0;
    let zy = 0;
    for (const { x, z, y, weight } of weighted) {
      xx += weight * (x - mx) ** 2;
      zz += weight * (z - mz) ** 2;
      xz += weight * (x - mx) * (z - mz);
      xy += weight * (x - mx) * (y - my);
      zy += weight * (z - mz) * (y - my);
    }
    // Normalize by the fixed sample count so robust weights do not change
    // the declared regularization strength between iterations.
    xx = xx / data.length + correctionSettings.ridgePenalty;
    zz = zz / data.length + correctionSettings.ridgePenalty;
    xz /= data.length;
    xy /= data.length;
    zy /= data.length;
    const determinant = xx * zz - xz * xz;
    firstSlope = (xy * zz - zy * xz) / determinant;
    secondSlope = (zy * xx - xy * xz) / determinant;
    intercept = my - firstSlope * mx - secondSlope * mz;
  }
  if (![intercept, firstSlope, secondSlope, ...means, ...scales].every(Number.isFinite))
    return null;
  return {
    labelSource: "queue-clearance-proxy",
    means,
    scales,
    intercept,
    slopes: [firstSlope, secondSlope],
    trainingCount: training.length,
  };
}

export function correctedWait(model: UpstreamCorrection, features: QueueFeatures) {
  const x = inputs(features);
  return Math.max(
    0,
    features.upstreamWait +
      model.intercept +
      (model.slopes[0] * (x[0] - model.means[0])) / model.scales[0] +
      (model.slopes[1] * (x[1] - model.means[1])) / model.scales[1],
  );
}

function waitBand(minutes: number) {
  return waitBandUpperBounds.findIndex((upper) => minutes <= upper);
}

export function calibrateWaitRanges(
  calibration: readonly WaitExample[],
  predict: (features: QueueFeatures) => number,
): RangeCalibration | null {
  const errors = calibration.map(({ features, waitMinutes }) => {
    const minutes = predict(features);
    return { band: waitBand(minutes), error: Math.abs(waitMinutes - minutes) };
  });
  const pooledRadius = calibrationRadius(errors.map(({ error }) => error));
  if (pooledRadius === null) return null;
  return {
    pooledRadius,
    bands: waitBandUpperBounds.map((_, index) => {
      const bandErrors = errors.filter(({ band }) => band === index).map(({ error }) => error);
      return {
        count: bandErrors.length,
        radius: bandErrors.length >= minimumBandExamples ? calibrationRadius(bandErrors) : null,
      };
    }),
  };
}

export function calibratedWaitRange(
  calibration: RangeCalibration,
  minutes: number,
  adaptive: boolean,
) {
  const radius = adaptive
    ? (calibration.bands[waitBand(minutes)]?.radius ?? calibration.pooledRadius)
    : calibration.pooledRadius;
  return roundedWaitRange(minutes, radius);
}
