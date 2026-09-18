import {
  candidateFrontier,
  hongKongDay,
  maximumGapMinutes,
  type QueueObservation,
  queueFeatures,
  type WaitExample,
} from "@/lib/queue-estimation";

const minute = 60_000;
const maximumOutcomeMinutes = 180;

export type ProxyWaitExample = WaitExample & {
  outcomeAt: number;
  lowerWaitMinutes: number;
  upperWaitMinutes: number;
};

/** Reconstructed queue clearance, not observed ticket issuance-to-call durations. */
export function buildProxyExamples(observations: readonly QueueObservation[]) {
  const sessions = new Map<string, QueueObservation[]>();
  for (const point of observations) {
    const key = `${point.storeId}:${hongKongDay(point.collectedAt)}`;
    const session = sessions.get(key) ?? [];
    session.push(point);
    sessions.set(key, session);
  }

  const examples: ProxyWaitExample[] = [];
  let candidates = 0;
  let missingProgression = 0;
  let censored = 0;
  for (const session of sessions.values()) {
    session.sort((left, right) => left.collectedAt - right.collectedAt);
    let previousBucket = -1;
    for (const [index, point] of session.entries()) {
      if (
        !point.open ||
        !point.acceptingTickets ||
        point.waitingGroups === null ||
        point.waitingGroups <= 0
      )
        continue;
      // Avoid turning higher capture frequency into proportionally more labels.
      const bucket = Math.floor(point.collectedAt / (5 * minute));
      if (bucket === previousBucket) continue;
      previousBucket = bucket;
      candidates++;
      const features = queueFeatures(session, point.storeId, point.collectedAt);
      if (!features) {
        missingProgression++;
        continue;
      }

      const target = features.frontier + features.waitingGroups + 1;
      let previousAt = point.collectedAt;
      let outcome: ProxyWaitExample | null = null;
      for (let nextIndex = index + 1; nextIndex < session.length; nextIndex++) {
        const next = session[nextIndex];
        if (
          !next?.open ||
          next.collectedAt - point.collectedAt > maximumOutcomeMinutes * minute ||
          next.collectedAt - previousAt > maximumGapMinutes * minute
        ) {
          break;
        }
        const frontier = candidateFrontier(next.tickets);
        if (frontier === null) break;
        if (frontier >= target) {
          const lowerWaitMinutes = (previousAt - point.collectedAt) / minute;
          const upperWaitMinutes = (next.collectedAt - point.collectedAt) / minute;
          outcome = {
            features,
            outcomeAt: next.collectedAt,
            lowerWaitMinutes,
            upperWaitMinutes,
            waitMinutes: (lowerWaitMinutes + upperWaitMinutes) / 2,
          };
          break;
        }
        previousAt = next.collectedAt;
      }
      if (outcome) examples.push(outcome);
      else censored++;
    }
  }
  return { examples, candidates, missingProgression, censored };
}

export function splitProxyExamples(examples: readonly ProxyWaitExample[]) {
  const days = [
    ...new Set(examples.map(({ features }) => hongKongDay(features.predictedAt))),
  ].sort();
  if (days.length < 5)
    throw new Error("At least five days with usable proxy outcomes are required.");
  const calibrationStart = days[Math.floor(days.length * 0.6)];
  const testStart = days[Math.floor(days.length * 0.8)];
  if (!calibrationStart || !testStart) throw new Error("Unable to split the history by day.");

  const training = examples.filter(
    ({ features, outcomeAt }) =>
      hongKongDay(features.predictedAt) < calibrationStart &&
      hongKongDay(outcomeAt) < calibrationStart,
  );
  const calibration = examples.filter(({ features, outcomeAt }) => {
    const day = hongKongDay(features.predictedAt);
    return day >= calibrationStart && day < testStart && hongKongDay(outcomeAt) < testStart;
  });
  const test = examples.filter(({ features }) => hongKongDay(features.predictedAt) >= testStart);
  return { days, calibrationStart, testStart, training, calibration, test };
}

export type PilotObservation = {
  storeId: number;
  ticket: string;
  takenAt: number;
  calledAt: number;
};

export function parsePilotObservations(value: unknown): PilotObservation[] {
  if (!Array.isArray(value)) throw new Error("Pilot input must be a JSON array.");
  const seen = new Set<string>();
  return value.map((row: unknown, index) => {
    const error = new Error(
      `Invalid pilot row ${index + 1}: supply storeId, ticket, takenAt and calledAt; timestamps must include a timezone.`,
    );
    if (typeof row !== "object" || row === null) throw error;
    const record = row as Record<string, unknown>;
    const { storeId, ticket, takenAt, calledAt } = record;
    if (
      typeof storeId !== "number" ||
      !Number.isSafeInteger(storeId) ||
      storeId <= 0 ||
      typeof ticket !== "string" ||
      !ticket.trim() ||
      typeof takenAt !== "string" ||
      !/(Z|[+-]\d{2}:\d{2})$/.test(takenAt) ||
      typeof calledAt !== "string" ||
      !/(Z|[+-]\d{2}:\d{2})$/.test(calledAt)
    )
      throw error;
    const start = Date.parse(takenAt);
    const end = Date.parse(calledAt);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) throw error;
    const key = `${storeId}:${ticket.trim()}:${start}`;
    if (seen.has(key)) throw new Error(`Duplicate pilot ticket in row ${index + 1}.`);
    seen.add(key);
    return { storeId, ticket: ticket.trim(), takenAt: start, calledAt: end };
  });
}
