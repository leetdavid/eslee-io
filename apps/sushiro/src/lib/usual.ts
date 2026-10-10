import { dayType } from "@/lib/holidays";

// The usual wait at a time of day: what the same weekday recorded around that time over the
// last weeks. It is the app's estimate for a ticket taken then.
export const usualStepMinutes = 5;

// Snapshots this close to a slot count toward it, so a day's figure for a five-minute slot is
// steady while still following fast changes at peak times.
const windowMinutes = 10;
const minimumDays = 2;
const hongKongOffset = 8 * 60 * 60_000;

export type UsualRow = { day: string; minute: number; wait: number };
// `low` to `high` is the usual range. `least` to `most` reaches the quiet and busy days.
export type UsualSlot = {
  high: number;
  least: number;
  low: number;
  median: number;
  minute: number;
  most: number;
};
export type UsualStore = { slots: UsualSlot[]; storeId: number };
export type UsualResponse = { stores: UsualStore[]; weekday: number };

function quantile(sorted: number[], share: number) {
  const index = share * (sorted.length - 1);
  const lower = Math.floor(index);
  const low = sorted[lower] ?? 0;
  const high = sorted[Math.min(lower + 1, sorted.length - 1)] ?? low;

  return low + (high - low) * (index - lower);
}

// The Hong Kong time of day in minutes since midnight, the weekday with Monday as 0, and the
// kind of day for usual waits, where a public holiday counts as a Sunday.
export function hongKongClock(at: Date) {
  const local = new Date(at.valueOf() + hongKongOffset);

  return {
    dayType: dayType(local.toISOString().slice(0, 10)),
    minute: local.getUTCHours() * 60 + local.getUTCMinutes(),
    weekday: (local.getUTCDay() + 6) % 7,
  };
}

// One branch's rows for one weekday -> a usual wait for every five-minute slot. Each day counts
// once, as its middle wait around the slot, so one day cannot set the range however many
// snapshots it has. The usual range is the middle half of days, and `least` to `most` covers
// all but the extreme tenth at each end.
export function usualSlots(rows: UsualRow[]): UsualSlot[] {
  if (rows.length === 0) {
    return [];
  }

  const minutes = rows.map((row) => row.minute);
  const slots: UsualSlot[] = [];

  for (
    let minute = Math.min(...minutes);
    minute <= Math.max(...minutes);
    minute += usualStepMinutes
  ) {
    const waitsByDay = new Map<string, number[]>();

    for (const row of rows) {
      if (Math.abs(row.minute - minute) <= windowMinutes) {
        waitsByDay.set(row.day, [...(waitsByDay.get(row.day) ?? []), row.wait]);
      }
    }

    if (waitsByDay.size < minimumDays) {
      continue;
    }

    const days = [...waitsByDay.values()]
      .map((waits) =>
        quantile(
          waits.sort((left, right) => left - right),
          0.5,
        ),
      )
      .sort((left, right) => left - right);

    slots.push({
      high: Math.round(quantile(days, 0.75)),
      least: Math.round(quantile(days, 0.1)),
      low: Math.round(quantile(days, 0.25)),
      median: Math.round(quantile(days, 0.5)),
      minute,
      most: Math.round(quantile(days, 0.9)),
    });
  }

  return slots;
}

// The slot for a time of day, or null when nothing usual is known for it.
export function usualAt(slots: UsualSlot[], minute: number) {
  const slotMinute = Math.round(minute / usualStepMinutes) * usualStepMinutes;
  return slots.find((slot) => slot.minute === slotMinute) ?? null;
}

// Sushiro quotes waits in five-minute steps, so the shown range is rounded outward to them.
export function usualRange(slot: UsualSlot) {
  return { high: Math.ceil(slot.high / 5) * 5, low: Math.floor(slot.low / 5) * 5 };
}
