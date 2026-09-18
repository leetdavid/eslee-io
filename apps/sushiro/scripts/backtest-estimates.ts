import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { sushiroQueueSnapshot as snapshots } from "@eslee/db/schema";
import { and, asc, gte, lt, sql } from "drizzle-orm";
import {
  evaluateWaits,
  fitQueueNowModel,
  hongKongDay,
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
import {
  calibratedWaitRange,
  calibrateWaitRanges,
  correctedWait,
  fitUpstreamCorrection,
} from "@/lib/queue-estimation-correction";
import { rollingProxyComparison } from "@/lib/queue-estimation-rolling";

function parseDay(value: string | undefined, flag: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${flag} requires YYYY-MM-DD. Use --help for examples.`);
  }
  const date = new Date(`${value}T00:00:00+08:00`);
  if (!Number.isFinite(date.valueOf()) || hongKongDay(date.valueOf()) !== value) {
    throw new Error(`Invalid ${flag} date.`);
  }
  return date;
}

async function main() {
  const { values } = parseArgs({
    options: {
      from: { type: "string" },
      to: { type: "string" },
      pilot: { type: "string" },
      rolling: { type: "boolean" },
      help: { type: "boolean", short: "h" },
    },
  });
  if (values.help) {
    console.log(`Offline queue-now baseline experiment. Prints JSON; reads the database without writes.

--from YYYY-MM-DD  Inclusive Hong Kong date
--to YYYY-MM-DD    Exclusive Hong Kong date, at most 31 days after --from
--pilot PATH      Optional private JSON array of actual ticket-taking/call observations
--rolling         Retrospective rolling comparison of baseline and corrected models

Examples:
  pnpm -F @eslee/sushiro estimates:backtest --from 2026-09-01 --to 2026-09-18
  pnpm -F @eslee/sushiro estimates:backtest --from 2026-09-01 --to 2026-09-18 --pilot .cache/pilot.json
  pnpm -F @eslee/sushiro estimates:backtest --from 2026-09-01 --to 2026-09-18 --rolling

Dates are split chronologically into training, calibration and test sets.
Synthetic queue-clearance outcomes are proxies, not actual waiting durations.
Pilot timestamps must have a timezone; pilot observations before the test period are excluded.`);
    return;
  }
  const from = parseDay(values.from, "--from");
  const to = parseDay(values.to, "--to");
  if (to <= from || to.valueOf() - from.valueOf() > 31 * 86_400_000) {
    throw new Error("Choose an increasing date range of at most 31 days.");
  }
  if (values.rolling && values.pilot) {
    throw new Error(
      "--rolling compares historical proxies. Use the fixed-split command for pilot evaluation.",
    );
  }
  const pilot = values.pilot
    ? parsePilotObservations(JSON.parse(await readFile(values.pilot, "utf8")) as unknown)
    : [];

  const { db } = await import("@eslee/db/client");
  let observations: QueueObservation[];
  try {
    const rows = await db.transaction(
      async (transaction) => {
        await transaction.execute(sql`set local statement_timeout = '30s'`);
        return transaction
          .select({
            storeId: snapshots.storeId,
            collectedAt: snapshots.collectedAt,
            wait: snapshots.wait,
            table: snapshots.waitingGroupTable,
            counter: snapshots.waitingGroupCounter,
            pair: snapshots.waitingGroupPair,
            tickets: snapshots.storeQueue,
            storeStatus: snapshots.storeStatus,
            ticketStatus: snapshots.netTicketStatus,
          })
          .from(snapshots)
          .where(and(gte(snapshots.collectedAt, from), lt(snapshots.collectedAt, to)))
          .orderBy(asc(snapshots.storeId), asc(snapshots.collectedAt))
          .limit(500_001);
      },
      { accessMode: "read only" },
    );
    if (rows.length > 500_000)
      throw new Error(
        "Over 500,000 snapshots. Reduce the date range; no partial result was evaluated.",
      );
    observations = rows.map((row) => ({
      storeId: row.storeId,
      collectedAt: row.collectedAt.valueOf(),
      // The archive predates capture of waitingGroup. Matching category fields
      // are only a proxy; their equality was checked against a live source sample.
      waitingGroups: row.table === row.counter && row.table === row.pair ? row.table : null,
      upstreamWait: row.wait,
      tickets: row.tickets,
      open: row.storeStatus === "OPEN",
      acceptingTickets: /MANUAL|ONLINE/.test(row.ticketStatus),
    }));
  } finally {
    await db.$client.end({ timeout: 5 });
  }

  const { examples, ...availability } = buildProxyExamples(observations);
  if (values.rolling) {
    console.log(
      JSON.stringify(
        {
          from: values.from,
          toExclusive: values.to,
          snapshotCount: observations.length,
          branches: new Set(observations.map((point) => point.storeId)).size,
          availability: { ...availability, usableProxyOutcomes: examples.length },
          ...rollingProxyComparison(examples),
        },
        null,
        2,
      ),
    );
    return;
  }
  const split = splitProxyExamples(examples);
  const model = fitQueueNowModel(split.training, split.calibration);
  if (!model)
    throw new Error("Insufficient usable training/calibration outcomes to fit the baseline.");
  const predict = (features: WaitExample["features"]) => predictQueueNow(model, features);
  const correctionModel = fitUpstreamCorrection(split.training);
  if (!correctionModel) throw new Error("Unable to fit the upstream correction.");
  const corrected = (features: WaitExample["features"]) => correctedWait(correctionModel, features);
  const upstreamRanges = calibrateWaitRanges(
    split.calibration,
    (features) => features.upstreamWait,
  );
  const correctedRanges = calibrateWaitRanges(split.calibration, corrected);
  if (!upstreamRanges || !correctedRanges) throw new Error("Insufficient range calibration data.");
  const pilotExamples: WaitExample[] = [];
  const pilotExcluded = { outsideTestPeriod: 0, unavailableFeatures: 0 };
  for (const observation of pilot) {
    if (hongKongDay(observation.takenAt) < split.testStart || observation.takenAt >= to.valueOf()) {
      pilotExcluded.outsideTestPeriod++;
      continue;
    }
    const features = queueFeatures(observations, observation.storeId, observation.takenAt);
    if (!features) {
      pilotExcluded.unavailableFeatures++;
      continue;
    }
    pilotExamples.push({
      features,
      waitMinutes: (observation.calledAt - observation.takenAt) / 60_000,
    });
  }
  const compare = (data: readonly WaitExample[]) => ({
    upstreamWaitAssumedMinutes: evaluateWaits(data, (features) => features.upstreamWait),
    unscaledThroughput: evaluateWaits(data, (features) => features.throughputMinutes),
    fittedThroughput: evaluateWaits(data, predict),
    upstreamAdaptive: evaluateWaits(data, (features) =>
      calibratedWaitRange(upstreamRanges, features.upstreamWait, true),
    ),
    correctedAdaptive: evaluateWaits(data, (features) =>
      calibratedWaitRange(correctedRanges, corrected(features), true),
    ),
  });
  console.log(
    JSON.stringify(
      {
        status: "offline-experiment-not-pilot-validated",
        from: values.from,
        toExclusive: values.to,
        snapshotCount: observations.length,
        branches: new Set(observations.map((point) => point.storeId)).size,
        assumptions: [
          "Identical category counts proxy the uncaptured waitingGroup field; they are not summed.",
          "Tickets below 8000 share a sequence; suffixes refer to the same base ticket. Unverified.",
          "Frontier + waiting groups + 1 proxies a newly issued ticket under FIFO without skips.",
          "Upstream wait is compared as minutes; its units still require independent confirmation.",
          "Proxy outcomes are midpoint times between snapshots, censored at gaps, closure or 180 minutes.",
          "Metrics describe the usable positive-queue cohort, not all stores or all conditions.",
          "90% is a target; temporal dependence and proxy labels do not establish real-wait coverage.",
        ],
        availability: { ...availability, usableProxyOutcomes: examples.length },
        split: {
          days: split.days,
          calibrationStart: split.calibrationStart,
          testStart: split.testStart,
          training: split.training.length,
          calibration: split.calibration.length,
          test: split.test.length,
        },
        model,
        correctionModel,
        rangeCalibration: { upstream: upstreamRanges, corrected: correctedRanges },
        proxyHoldout: compare(split.test),
        perBranchProxyHoldout: [...new Set(split.test.map(({ features }) => features.storeId))]
          .sort((a, b) => a - b)
          .map((storeId) => ({
            storeId,
            ...evaluateWaits(
              split.test.filter(({ features }) => features.storeId === storeId),
              predict,
            ),
          })),
        pilot: {
          supplied: pilot.length,
          excluded: pilotExcluded,
          actualWaits: compare(pilotExamples),
        },
      },
      null,
      2,
    ),
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Queue estimation experiment failed.");
  process.exitCode = 1;
});
