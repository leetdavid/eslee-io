import type { QueueHistory, QueueHistoryPoint } from "@/lib/queues";

const hour = 60 * 60_000;
const hongKongOffset = 8 * hour;

// Branches open in the late morning, so nothing earlier is counted.
export const serviceStartHour = 10;
export const patternSlots = [10, 12, 14, 16, 18, 20, 22];

// A time counts toward the all-branch average only when at least this share of the day's
// branches were issuing tickets. It keeps one late branch from standing in for Hong Kong.
const minimumBranchShare = 0.25;

export type TimedWait = { collectedAt: string; wait: number };
export type SlotWait = { hour: number; wait: number; weekday: number };

export function hongKongDate(at: Date) {
  return new Date(at.valueOf() + hongKongOffset).toISOString().slice(0, 10);
}

// The UTC range covering one Hong Kong calendar date, or null when the date is not valid.
export function hongKongDayRange(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return null;
  }

  const from = new Date(`${date}T00:00:00+08:00`);

  if (Number.isNaN(from.valueOf()) || hongKongDate(from) !== date) {
    return null;
  }

  return { from, to: new Date(from.valueOf() + 24 * hour) };
}

export function shiftDate(date: string, days: number) {
  const range = hongKongDayRange(date);
  return range ? hongKongDate(new Date(range.from.valueOf() + days * 24 * hour)) : date;
}

// Hong Kong hour of day, and weekday with Monday as 0.
export function hongKongParts(collectedAt: string) {
  const local = new Date(Date.parse(collectedAt) + hongKongOffset);
  return { hour: local.getUTCHours(), weekday: (local.getUTCDay() + 6) % 7 };
}

function mean(values: number[]) {
  return values.reduce((total, value) => total + value, 0) / Math.max(1, values.length);
}

function highest<T extends { wait: number }>(items: T[]) {
  return items.reduce<T | null>((top, item) => (!top || item.wait > top.wait ? item : top), null);
}

function lowest<T extends { wait: number }>(items: T[]) {
  return items.reduce<T | null>((low, item) => (!low || item.wait < low.wait ? item : low), null);
}

// One Hong Kong day of bucketed history, summarised for the Daily history view. The history
// holds only the times each branch was issuing tickets.
export function dailyStats(history: QueueHistory, bucketHours = 0.5) {
  const branches = history.stores
    .map((store) => {
      const points = store.points.filter(
        (point) => hongKongParts(point.collectedAt).hour >= serviceStartHour,
      );
      const peak = highest<QueueHistoryPoint>(points);

      return {
        average: mean(points.map((point) => point.wait)),
        hoursOver30: points.filter((point) => point.wait > 30).length * bucketHours,
        name: store.name,
        nameEn: store.nameEn,
        peak: peak?.wait ?? 0,
        peakAt: peak?.collectedAt ?? null,
        points,
        storeId: store.storeId,
      };
    })
    .filter((branch) => branch.points.length > 0)
    .sort((left, right) => right.peak - left.peak || left.storeId - right.storeId);

  const waitsByTime = new Map<string, number[]>();

  for (const branch of branches) {
    for (const point of branch.points) {
      waitsByTime.set(point.collectedAt, [
        ...(waitsByTime.get(point.collectedAt) ?? []),
        point.wait,
      ]);
    }
  }

  const minimumBranches = Math.max(1, Math.ceil(branches.length * minimumBranchShare));
  const average: TimedWait[] = [...waitsByTime]
    .filter(([, waits]) => waits.length >= minimumBranches)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([collectedAt, waits]) => ({ collectedAt, wait: mean(waits) }));

  return {
    average,
    branches,
    busiest: highest(average),
    overAnHour: branches.filter((branch) => branch.peak >= 60).length,
    quietest: lowest(branches.map((branch) => ({ ...branch, wait: branch.average }))),
  };
}

// Weeks of two-hour buckets, summarised by weekday and time for the Patterns view.
export function patternStats(history: QueueHistory) {
  const waitsBySlot = new Map<string, number[]>();
  const dinnerWaits = new Map<number, number[]>();
  // Empty until the first point is seen.
  let from = "";
  let to = "";

  for (const store of history.stores) {
    for (const point of store.points) {
      const { hour: pointHour, weekday } = hongKongParts(point.collectedAt);
      const slot = Math.floor(pointHour / 2) * 2;

      if (!patternSlots.includes(slot)) {
        continue;
      }

      from = from === "" || point.collectedAt < from ? point.collectedAt : from;
      to = point.collectedAt > to ? point.collectedAt : to;

      const key = `${weekday}-${slot}`;
      waitsBySlot.set(key, [...(waitsBySlot.get(key) ?? []), point.wait]);

      // Weekend dinner: Saturday and Sunday, from 18:00 until tickets stop.
      if (weekday >= 5 && (slot === 18 || slot === 20)) {
        dinnerWaits.set(store.storeId, [...(dinnerWaits.get(store.storeId) ?? []), point.wait]);
      }
    }
  }

  // Only the slots in which some branch was issuing tickets become columns.
  const slotsWithData = patternSlots.filter((slot) =>
    Array.from({ length: 7 }, (_, weekday) => waitsBySlot.has(`${weekday}-${slot}`)).some(Boolean),
  );
  const grid = Array.from({ length: 7 }, (_, weekday) =>
    slotsWithData.map((slot) => {
      const waits = waitsBySlot.get(`${weekday}-${slot}`);
      return waits ? mean(waits) : null;
    }),
  );
  const slots: SlotWait[] = grid.flatMap((row, weekday) =>
    row.flatMap((wait, index) =>
      wait === null ? [] : [{ hour: slotsWithData[index] ?? 0, wait, weekday }],
    ),
  );
  const days = grid.flatMap((row, weekday) => {
    const waits = row.filter((wait): wait is number => wait !== null);
    return waits.length > 0 ? [{ wait: mean(waits), weekday }] : [];
  });

  return {
    branches: history.stores
      .flatMap((store) => {
        const waits = dinnerWaits.get(store.storeId);
        return waits
          ? [{ name: store.name, nameEn: store.nameEn, storeId: store.storeId, wait: mean(waits) }]
          : [];
      })
      .sort((left, right) => right.wait - left.wait || left.storeId - right.storeId)
      .slice(0, 10),
    busiest: highest(slots),
    calmestDay: lowest(days),
    from: from || null,
    grid,
    // Lunch through dinner only.
    quietest: lowest(slots.filter((slot) => slot.hour >= 12 && slot.hour <= 20)),
    slots: slotsWithData,
    to: to || null,
  };
}
