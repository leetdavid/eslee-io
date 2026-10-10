import { dayType } from "@/lib/holidays";
import type { QueueHistory, QueueHistoryPoint } from "@/lib/queues";

const hour = 60 * 60_000;
const hongKongOffset = 8 * hour;

// Branches open in the late morning, so nothing earlier is counted.
export const serviceStartHour = 10;

// A time counts toward the all-branch average only when at least this share of the day's
// branches were issuing tickets. It keeps one late branch from standing in for Hong Kong.
const minimumBranchShare = 0.25;

export type TimedWait = { collectedAt: string; wait: number };

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

// One branch's waits on one day, from the times it was issuing tickets.
export function summariseDay(allPoints: QueueHistoryPoint[], bucketHours = 0.5) {
  const points = allPoints.filter(
    (point) => hongKongParts(point.collectedAt).hour >= serviceStartHour,
  );
  const peak = highest<QueueHistoryPoint>(points);
  const over30 = points.filter((point) => point.wait > 30);

  return {
    average: mean(points.map((point) => point.wait)),
    hoursOver30: over30.length * bucketHours,
    // First and last buckets over 30 minutes. The day may dip under in between.
    over30From: over30[0]?.collectedAt ?? null,
    over30To: over30.at(-1)?.collectedAt ?? null,
    peak: peak?.wait ?? 0,
    peakAt: peak?.collectedAt ?? null,
    points,
  };
}

// One Hong Kong day of bucketed history, summarised for the Daily history view. The history
// holds only the times each branch was issuing tickets.
export function dailyStats(history: QueueHistory, bucketHours = 0.5) {
  const branches = history.stores
    .map((store) => ({
      ...summariseDay(store.points, bucketHours),
      name: store.name,
      nameEn: store.nameEn,
      storeId: store.storeId,
    }))
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

// A day needs this many half-hour buckets before it counts toward a branch's usual range, so a
// day the recorder mostly missed does not set the range.
const minimumBucketsForUsual = 12;

// One branch across several weeks of half-hour history: the chosen day, how the same weekday
// usually runs, and each recorded day for the list.
export function branchDailyStats(points: QueueHistoryPoint[], date: string, bucketHours = 0.5) {
  const pointsByDate = new Map<string, QueueHistoryPoint[]>();

  for (const point of points) {
    const pointDate = hongKongDate(new Date(point.collectedAt));
    pointsByDate.set(pointDate, [...(pointsByDate.get(pointDate) ?? []), point]);
  }

  const days = [...pointsByDate]
    .map(([dayDate, dayPoints]) => ({ date: dayDate, ...summariseDay(dayPoints, bucketHours) }))
    .filter((day) => day.points.length > 0)
    .sort((left, right) => right.date.localeCompare(left.date));
  const range = hongKongDayRange(date);
  // A public holiday is compared with Sundays, whatever weekday it falls on.
  const weekday = dayType(date);
  const sameWeekday = days.filter(
    (day) =>
      day.date !== date &&
      day.points.length >= minimumBucketsForUsual &&
      dayType(day.date) === weekday,
  );
  const dayStart = range?.from.valueOf() ?? 0;
  // Minutes into the day -> the waits seen at that time on the other same weekdays.
  const waitsByMinute = new Map<number, number[]>();

  for (const day of sameWeekday) {
    const start = hongKongDayRange(day.date)?.from.valueOf() ?? 0;

    for (const point of day.points) {
      const minute = Math.round((Date.parse(point.collectedAt) - start) / 60_000);
      waitsByMinute.set(minute, [...(waitsByMinute.get(minute) ?? []), point.wait]);
    }
  }

  return {
    day: days.find((day) => day.date === date) ?? null,
    days,
    // The same weekday's low and high at each time, placed on the chosen date for charting.
    usual: [...waitsByMinute]
      .sort(([left], [right]) => left - right)
      .map(([minute, waits]) => ({
        collectedAt: new Date(dayStart + minute * 60_000).toISOString(),
        high: Math.max(...waits),
        low: Math.min(...waits),
      })),
    usualPeak:
      sameWeekday.length > 0
        ? {
            high: Math.max(...sameWeekday.map((day) => day.peak)),
            low: Math.min(...sameWeekday.map((day) => day.peak)),
          }
        : null,
    weekday,
  };
}
