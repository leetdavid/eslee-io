const minute = 60_000;
export const rateWindowMinutes = 30;
export const maximumGapMinutes = 7.5;
export const targetCoverage = 0.9;

export type QueueObservation = {
  storeId: number;
  collectedAt: number;
  waitingGroups: number | null;
  upstreamWait: number;
  tickets: readonly (number | string)[];
  open: boolean;
  acceptingTickets: boolean;
};

export type QueueFeatures = {
  storeId: number;
  predictedAt: number;
  snapshotAt: number;
  waitingGroups: number;
  frontier: number;
  callsPerMinute: number;
  throughputMinutes: number;
  upstreamWait: number;
};

export type WaitExample = {
  features: QueueFeatures;
  waitMinutes: number;
};

export type WaitPrediction = {
  minutes: number;
  lowerMinutes: number;
  upperMinutes: number;
};

export type QueueNowModel = {
  version: 1;
  labelSource: "queue-clearance-proxy";
  targetCoverage: number;
  scale: number;
  radiusMinutes: number;
  trainingCount: number;
  calibrationCount: number;
};

export function hongKongDay(timestamp: number) {
  return new Date(timestamp + 8 * 60 * minute).toISOString().slice(0, 10);
}

/**
 * Experimental sequence hypothesis: ordinary tickets are below 8000; suffixes
 * refer to the same base ticket. Neither assumption is an upstream guarantee.
 * Observed ordinary-looking tickets exceed 999, so digit length is not a separator.
 */
export function candidateFrontier(tickets: QueueObservation["tickets"]) {
  const numbers = tickets.flatMap((ticket) => {
    const match = /^(\d+)(?:-\d+)?$/.exec(String(ticket));
    const number = match ? Number(match[1]) : Number.NaN;
    return Number.isSafeInteger(number) && number > 0 && number < 8000 ? [number] : [];
  });
  return numbers.length ? Math.max(...numbers) : null;
}

/** Only observations available at predictedAt contribute to the features. */
export function queueFeatures(
  history: readonly QueueObservation[],
  storeId: number,
  predictedAt: number,
): QueueFeatures | null {
  const points = history
    .filter(
      (point) =>
        point.storeId === storeId &&
        point.collectedAt <= predictedAt &&
        point.collectedAt >= predictedAt - rateWindowMinutes * minute &&
        hongKongDay(point.collectedAt) === hongKongDay(predictedAt),
    )
    .sort((left, right) => left.collectedAt - right.collectedAt);
  const latest = points.at(-1);
  if (
    !latest?.open ||
    !latest.acceptingTickets ||
    latest.waitingGroups === null ||
    !Number.isSafeInteger(latest.waitingGroups) ||
    latest.waitingGroups < 0 ||
    predictedAt - latest.collectedAt > maximumGapMinutes * minute
  ) {
    return null;
  }

  const first = points[0];
  if (!first || points.length < 3 || latest.collectedAt - first.collectedAt < 15 * minute) {
    return null;
  }

  let initialFrontier: number | null = null;
  let frontier = 0;
  let previousAt = first.collectedAt;
  for (const point of points) {
    const next = candidateFrontier(point.tickets);
    if (
      !point.open ||
      next === null ||
      point.collectedAt - previousAt > maximumGapMinutes * minute
    ) {
      return null;
    }
    initialFrontier ??= next;
    // Older tickets may be called again. They must not create negative progress.
    frontier = Math.max(frontier, next);
    previousAt = point.collectedAt;
  }

  const elapsedMinutes = (latest.collectedAt - first.collectedAt) / minute;
  const callsPerMinute = (frontier - (initialFrontier ?? frontier)) / elapsedMinutes;
  if (callsPerMinute <= 0) return null;

  return {
    storeId,
    predictedAt,
    snapshotAt: latest.collectedAt,
    waitingGroups: latest.waitingGroups,
    frontier,
    callsPerMinute,
    throughputMinutes: (latest.waitingGroups + 1) / callsPerMinute,
    upstreamWait: latest.upstreamWait,
  };
}

export function quantile(values: readonly number[], probability: number) {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const position = (sorted.length - 1) * probability;
  const lower = sorted[Math.floor(position)];
  const upper = sorted[Math.ceil(position)];
  if (lower === undefined || upper === undefined) return null;
  return lower + (upper - lower) * (position - Math.floor(position));
}

export function calibrationRadius(errors: readonly number[]) {
  const sorted = [...errors].sort((left, right) => left - right);
  // Finite-sample rank; dependent proxy labels still require independent validation.
  const radius = sorted[Math.ceil((sorted.length + 1) * targetCoverage) - 1];
  return radius !== undefined && Number.isFinite(radius) ? radius : null;
}

/** Fit on earlier days, then calibrate on separate days. Never fit on test outcomes. */
export function fitQueueNowModel(
  training: readonly WaitExample[],
  calibration: readonly WaitExample[],
): QueueNowModel | null {
  const scale = quantile(
    training.map(({ features, waitMinutes }) => waitMinutes / features.throughputMinutes),
    0.5,
  );
  if (scale === null || !Number.isFinite(scale) || scale <= 0) return null;
  const errors = calibration.map(({ features, waitMinutes }) =>
    Math.abs(waitMinutes - features.throughputMinutes * scale),
  );
  // Finite-sample split-conformal rank. Correlated proxy labels do not establish
  // 90% coverage of real waits; that needs independent pilot validation.
  const radiusMinutes = calibrationRadius(errors);
  if (radiusMinutes === null) return null;
  return {
    version: 1,
    labelSource: "queue-clearance-proxy",
    targetCoverage,
    scale,
    radiusMinutes,
    trainingCount: training.length,
    calibrationCount: calibration.length,
  };
}

export function predictQueueNow(model: QueueNowModel, features: QueueFeatures): WaitPrediction {
  return roundedWaitRange(features.throughputMinutes * model.scale, model.radiusMinutes);
}

export function roundedWaitRange(minutes: number, radius: number): WaitPrediction {
  return {
    minutes,
    lowerMinutes: Math.floor(Math.max(0, minutes - radius) / 5) * 5,
    upperMinutes: Math.ceil((minutes + radius) / 5) * 5,
  };
}

export function evaluateWaits(
  examples: readonly WaitExample[],
  predict: (features: QueueFeatures) => number | WaitPrediction,
) {
  return evaluatePredictions(
    examples.map(({ features, waitMinutes }) => ({
      actual: waitMinutes,
      prediction: predict(features),
    })),
  );
}

export type EvaluatedPrediction = { actual: number; prediction: number | WaitPrediction };

export function evaluatePredictions(rows: readonly EvaluatedPrediction[]) {
  if (!rows.length) return null;
  const errors: number[] = [];
  const widths: number[] = [];
  const intervalScores: number[] = [];
  let covered = 0;
  for (const { actual: waitMinutes, prediction } of rows) {
    const minutes = typeof prediction === "number" ? prediction : prediction.minutes;
    errors.push(Math.abs(waitMinutes - minutes));
    if (typeof prediction !== "number") {
      const width = prediction.upperMinutes - prediction.lowerMinutes;
      widths.push(width);
      const outside = Math.max(
        prediction.lowerMinutes - waitMinutes,
        waitMinutes - prediction.upperMinutes,
        0,
      );
      intervalScores.push(width + (2 * outside) / (1 - targetCoverage));
      if (waitMinutes >= prediction.lowerMinutes && waitMinutes <= prediction.upperMinutes) {
        covered++;
      }
    }
  }
  return {
    count: rows.length,
    meanAbsoluteErrorMinutes: errors.reduce((sum, error) => sum + error, 0) / errors.length,
    medianAbsoluteErrorMinutes: quantile(errors, 0.5),
    p90AbsoluteErrorMinutes: quantile(errors, 0.9),
    withinFiveMinutes: errors.filter((error) => error <= 5).length / errors.length,
    withinTenMinutes: errors.filter((error) => error <= 10).length / errors.length,
    intervalCoverage: widths.length ? covered / widths.length : null,
    medianIntervalWidthMinutes: quantile(widths, 0.5),
    meanIntervalScore: intervalScores.length
      ? intervalScores.reduce((sum, score) => sum + score, 0) / intervalScores.length
      : null,
  };
}
