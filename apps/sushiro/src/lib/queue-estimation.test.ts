import { describe, expect, it } from "vitest";
import {
  candidateFrontier,
  evaluateWaits,
  fitQueueNowModel,
  predictQueueNow,
  type QueueObservation,
  queueFeatures,
  type WaitExample,
} from "@/lib/queue-estimation";
import {
  buildProxyExamples,
  parsePilotObservations,
  splitProxyExamples,
} from "@/lib/queue-estimation-backtest";

const minute = 60_000;
const start = Date.parse("2026-09-01T18:00:00+08:00");

function observation(offset: number, overrides: Partial<QueueObservation> = {}): QueueObservation {
  return {
    storeId: 1,
    collectedAt: start + offset * minute,
    waitingGroups: 9,
    upstreamWait: 15,
    tickets: [String(100 + offset)],
    open: true,
    acceptingTickets: true,
    ...overrides,
  };
}

const history = Array.from({ length: 13 }, (_, index) => observation(index * 5));

function example(waitMinutes: number): WaitExample {
  const features = queueFeatures(history, 1, start + 30 * minute);
  if (!features) throw new Error("Invalid test history");
  return { features, waitMinutes };
}

describe("experimental queue-now features", () => {
  it("keeps four-digit ordinary tickets and ignores the candidate 8xxx sequence and suffix repeats", () => {
    expect(candidateFrontier(["998", "1000", "1001-1", "8402", "8402-2"])).toBe(1001);
    expect(candidateFrontier(["8402", "unknown", "0"])).toBeNull();
  });

  it("uses only the requested branch and observations available at prediction time", () => {
    const features = queueFeatures(history, 1, start + 30 * minute);
    expect(features).toMatchObject({ callsPerMinute: 1, frontier: 130, throughputMinutes: 10 });
    expect(
      queueFeatures(
        [
          ...history,
          observation(30, { storeId: 2, tickets: ["600"], waitingGroups: 200 }),
          observation(31, { tickets: ["700"], waitingGroups: 300 }),
        ],
        1,
        start + 30 * minute,
      ),
    ).toEqual(features);
  });

  it("does not interpret a recalled older ticket as negative progress", () => {
    const points = [0, 5, 10, 15, 20, 25, 30].map((offset) => observation(offset));
    points[6] = observation(30, { tickets: ["119-1"] });
    expect(queueFeatures(points, 1, start + 30 * minute)?.frontier).toBe(125);
  });

  it("withholds features for stale, inactive, unidentifiable or stalled queues", () => {
    const points = history.slice(0, 7);
    expect(queueFeatures(points, 1, start + 38 * minute)).toBeNull();
    for (const change of [
      { open: false },
      { acceptingTickets: false },
      { waitingGroups: null },
      { tickets: ["8402"] },
    ]) {
      expect(
        queueFeatures([...points.slice(0, -1), observation(30, change)], 1, start + 30 * minute),
      ).toBeNull();
    }
    expect(
      queueFeatures(
        points.map((point) => ({ ...point, tickets: ["100"] })),
        1,
        start + 30 * minute,
      ),
    ).toBeNull();
  });

  it("does not bridge missing captures or a Hong Kong date boundary", () => {
    const gapped = [0, 5, 10, 15, 30].map((offset) => observation(offset));
    expect(queueFeatures(gapped, 1, start + 30 * minute)).toBeNull();
    const late = Date.parse("2026-09-01T23:45:00+08:00");
    const overnight = [0, 5, 10, 15, 20, 25].map((offset) =>
      observation(offset, { collectedAt: late + offset * minute }),
    );
    expect(queueFeatures(overnight, 1, late + 25 * minute)).toBeNull();
  });
});

describe("proxy outcomes and chronological evaluation", () => {
  it("preserves the observation interval instead of treating the first sighting as an exact call time", () => {
    const { examples } = buildProxyExamples(history);
    const outcome = examples.find(({ features }) => features.predictedAt === start + 30 * minute);
    expect(outcome).toMatchObject({ lowerWaitMinutes: 5, upperWaitMinutes: 10, waitMinutes: 7.5 });
  });

  it("counts unresolved outcomes as censored instead of assigning zero wait", () => {
    const result = buildProxyExamples(history.map((point) => ({ ...point, waitingGroups: 200 })));
    expect(result.examples).toEqual([]);
    expect(result.censored).toBeGreaterThan(0);
    expect(result.candidates).toBe(result.missingProgression + result.censored);
  });

  it("keeps entire dates separate and purges labels crossing a split boundary", () => {
    const rows = Array.from({ length: 10 }, (_, day) => ({
      ...example(10),
      features: { ...example(10).features, predictedAt: start + day * 86_400_000 },
      outcomeAt: start + day * 86_400_000 + 10 * minute,
      lowerWaitMinutes: 5,
      upperWaitMinutes: 15,
    }));
    const first = rows[0];
    if (!first) throw new Error("Missing test row");
    rows[0] = { ...first, outcomeAt: start + 6 * 86_400_000 };
    const split = splitProxyExamples(rows);
    expect(split.calibrationStart).toBe("2026-09-07");
    expect(split.testStart).toBe("2026-09-09");
    expect(split.training).toHaveLength(5);
    expect(split.calibration).toHaveLength(2);
    expect(split.test).toHaveLength(2);
  });
});

describe("fitted baseline and uncertainty", () => {
  it("learns the scale only from training and rounds calibrated intervals outward", () => {
    const model = fitQueueNowModel(
      [example(20)],
      Array.from({ length: 9 }, (_, index) => example(21 + index)),
    );
    expect(model).toMatchObject({
      scale: 2,
      radiusMinutes: 9,
      labelSource: "queue-clearance-proxy",
    });
    if (!model) throw new Error("Missing fitted model");
    expect(predictQueueNow(model, example(20).features)).toEqual({
      minutes: 20,
      lowerMinutes: 10,
      upperMinutes: 30,
    });
    const metrics = evaluateWaits([example(25), example(45)], (features) =>
      predictQueueNow(model, features),
    );
    expect(metrics).toMatchObject({
      meanAbsoluteErrorMinutes: 15,
      intervalCoverage: 0.5,
      medianIntervalWidthMinutes: 20,
    });
  });

  it("does not fabricate calibration from an empty or too-small sample", () => {
    expect(fitQueueNowModel([], [example(20)])).toBeNull();
    expect(fitQueueNowModel([example(20)], [example(20)])).toBeNull();
    expect(evaluateWaits([], () => 0)).toBeNull();
  });
});

describe("private pilot observations", () => {
  const row = {
    storeId: 1,
    ticket: "123",
    takenAt: "2026-09-18T18:00:00+08:00",
    calledAt: "2026-09-18T18:23:00+08:00",
  };

  it("measures actual event times and rejects duplicate observations", () => {
    const parsed = parsePilotObservations([row]);
    expect(parsed[0] && (parsed[0].calledAt - parsed[0].takenAt) / minute).toBe(23);
    expect(() => parsePilotObservations([row, row])).toThrow("Duplicate");
  });

  it("rejects missing timezones and calls before ticket issuance", () => {
    expect(() => parsePilotObservations([{ ...row, takenAt: "2026-09-18T18:00:00" }])).toThrow(
      "timezone",
    );
    expect(() =>
      parsePilotObservations([{ ...row, calledAt: "2026-09-18T17:00:00+08:00" }]),
    ).toThrow("Invalid pilot");
  });
});
