import { describe, expect, it } from "vitest";
import type { QueueHistory } from "@/lib/queues";
import {
  dailyStats,
  hongKongDate,
  hongKongDayRange,
  hongKongParts,
  patternStats,
  shiftDate,
} from "@/lib/stats";

// Hong Kong time for a point, written as local time on a given date.
function at(date: string, time: string) {
  return new Date(`${date}T${time}:00+08:00`).toISOString();
}

function history(stores: Array<{ id: number; points: Array<[string, number]> }>): QueueHistory {
  return {
    global: [],
    stores: stores.map(({ id, points }) => ({
      latestWait: 0,
      name: `分店${id}`,
      nameEn: `Branch ${id}`,
      points: points.map(([collectedAt, wait]) => ({ collectedAt, wait })),
      storeId: id,
    })),
  };
}

describe("Hong Kong dates", () => {
  it("maps a calendar date to its UTC range and back", () => {
    const range = hongKongDayRange("2026-10-09");

    expect(range?.from.toISOString()).toBe("2026-10-08T16:00:00.000Z");
    expect(range?.to.toISOString()).toBe("2026-10-09T16:00:00.000Z");
    expect(hongKongDate(new Date("2026-10-09T15:59:59Z"))).toBe("2026-10-09");
    expect(hongKongDate(new Date("2026-10-09T16:00:00Z"))).toBe("2026-10-10");
  });

  it("rejects dates that are malformed or do not exist", () => {
    expect(hongKongDayRange("2026-02-30")).toBeNull();
    expect(hongKongDayRange("9 Oct 2026")).toBeNull();
    expect(hongKongDayRange("2026-10-9")).toBeNull();
  });

  it("steps across month ends and reads weekday with Monday first", () => {
    expect(shiftDate("2026-10-01", -1)).toBe("2026-09-30");
    expect(shiftDate("2026-10-31", 1)).toBe("2026-11-01");
    // 9 October 2026 is a Friday.
    expect(hongKongParts(at("2026-10-09", "19:30"))).toEqual({ hour: 19, weekday: 4 });
    expect(hongKongParts(at("2026-10-11", "00:10"))).toEqual({ hour: 0, weekday: 6 });
  });
});

describe("dailyStats", () => {
  const day = "2026-10-09";
  const stats = dailyStats(
    history([
      {
        id: 1,
        points: [
          [at(day, "08:00"), 0],
          [at(day, "12:00"), 20],
          [at(day, "19:00"), 90],
          [at(day, "19:30"), 40],
        ],
      },
      {
        id: 2,
        points: [
          [at(day, "12:00"), 10],
          [at(day, "19:00"), 30],
          [at(day, "19:30"), 20],
        ],
      },
      { id: 3, points: [[at(day, "07:00"), 5]] },
    ]),
  );

  it("ignores buckets before opening and branches with nothing left", () => {
    expect(stats.branches.map(({ storeId }) => storeId)).toEqual([1, 2]);
    expect(stats.average.map(({ collectedAt }) => collectedAt)).toEqual([
      at(day, "12:00"),
      at(day, "19:00"),
      at(day, "19:30"),
    ]);
  });

  it("averages across branches and finds the busiest time", () => {
    expect(stats.average.map(({ wait }) => wait)).toEqual([15, 60, 30]);
    expect(stats.busiest).toEqual({ collectedAt: at(day, "19:00"), wait: 60 });
  });

  it("summarises each branch, longest wait first", () => {
    expect(stats.branches[0]).toMatchObject({
      average: 50,
      hoursOver30: 1,
      peak: 90,
      peakAt: at(day, "19:00"),
      storeId: 1,
    });
    expect(stats.overAnHour).toBe(1);
    expect(stats.quietest?.storeId).toBe(2);
  });

  it("returns empty results for a day with no data", () => {
    const empty = dailyStats(history([]));

    expect(empty.branches).toEqual([]);
    expect(empty.busiest).toBeNull();
    expect(empty.quietest).toBeNull();
  });
});

describe("patternStats", () => {
  const stats = patternStats(
    history([
      {
        id: 1,
        points: [
          [at("2026-10-05", "14:00"), 4], // Monday afternoon
          [at("2026-10-09", "18:00"), 100], // Friday dinner
          [at("2026-10-10", "18:00"), 80], // Saturday dinner
          [at("2026-10-10", "20:00"), 40],
          [at("2026-10-10", "02:00"), 999], // outside service hours
        ],
      },
      {
        id: 2,
        points: [
          [at("2026-10-09", "18:00"), 120],
          [at("2026-10-11", "19:00"), 20], // Sunday, inside the 18:00 slot
        ],
      },
    ]),
  );

  it("averages each weekday and two-hour slot, leaving gaps empty", () => {
    expect(stats.grid[4]?.[4]).toBe(110); // Friday 18:00
    expect(stats.grid[0]?.[2]).toBe(4); // Monday 14:00
    expect(stats.grid[1]?.[0]).toBeNull();
  });

  it("finds the busiest slot, the quietest meal-time slot and the calmest day", () => {
    expect(stats.busiest).toEqual({ hour: 18, wait: 110, weekday: 4 });
    expect(stats.quietest).toEqual({ hour: 14, wait: 4, weekday: 0 });
    expect(stats.calmestDay).toEqual({ wait: 4, weekday: 0 });
  });

  it("ranks branches by weekend dinner wait and reports the recorded range", () => {
    expect(stats.branches.map(({ storeId, wait }) => [storeId, wait])).toEqual([
      [1, 60],
      [2, 20],
    ]);
    expect(stats.from).toBe(at("2026-10-05", "14:00"));
    expect(stats.to).toBe(at("2026-10-11", "19:00"));
  });
});
