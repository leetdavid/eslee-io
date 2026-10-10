// The usual wait at a time of day: what the same weekday recorded around that time over the
// last weeks. It is the app's estimate for a ticket taken then.
export const usualStepMinutes = 5;

// Snapshots this close to a slot count toward it, so each five-minute slot has enough to form a
// range while still following fast changes at peak times.
const windowMinutes = 10;
const minimumValues = 3;
const minimumDays = 2;
const hongKongOffset = 8 * 60 * 60_000;

export type UsualRow = { day: string; minute: number; wait: number };
export type UsualSlot = { high: number; low: number; median: number; minute: number };
export type UsualStore = { slots: UsualSlot[]; storeId: number };
export type UsualResponse = { stores: UsualStore[]; weekday: number };

function quantile(sorted: number[], share: number) {
  const index = share * (sorted.length - 1);
  const lower = Math.floor(index);
  const low = sorted[lower] ?? 0;
  const high = sorted[Math.min(lower + 1, sorted.length - 1)] ?? low;

  return low + (high - low) * (index - lower);
}

// Minutes since midnight and weekday (Monday is 0), both in Hong Kong time.
export function hongKongClock(at: Date) {
  const local = new Date(at.valueOf() + hongKongOffset);

  return {
    minute: local.getUTCHours() * 60 + local.getUTCMinutes(),
    weekday: (local.getUTCDay() + 6) % 7,
  };
}

// One branch's rows for one weekday -> a low, median and high for every five-minute slot. The
// range covers the middle 80% of what was recorded, so one freak day does not set it.
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
    const near = rows.filter((row) => Math.abs(row.minute - minute) <= windowMinutes);

    if (near.length < minimumValues || new Set(near.map((row) => row.day)).size < minimumDays) {
      continue;
    }

    const waits = near.map((row) => row.wait).sort((left, right) => left - right);

    slots.push({
      high: Math.round(quantile(waits, 0.9)),
      low: Math.round(quantile(waits, 0.1)),
      median: Math.round(quantile(waits, 0.5)),
      minute,
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
