import { describe, expect, it } from "vitest";
import { longLevel, type PatternRow, patternView, summarisePatterns } from "@/lib/patterns";

function row(storeId: number, dayType: number, minute: number, wait: number): PatternRow {
  return { dayType, minute, name: `分店${storeId}`, nameEn: `Branch ${storeId}`, storeId, wait };
}

const rows = [
  row(1, 5, 1140, 100), // Friday 19:00
  row(2, 5, 1140, 140),
  row(1, 1, 900, 4), // Monday 15:00
  row(1, 1, 630, 0), // Monday 10:30
  row(1, 6, 1080, 80), // Saturday 18:00
  row(1, 7, 1110, 40), // Sunday or public holiday 18:30
  row(2, 6, 1080, 20),
  row(2, 6, 1020, 500), // Saturday 17:00 is before dinner
];

describe("summarisePatterns", () => {
  it("averages branches equally in each cell", () => {
    const { grid } = summarisePatterns(rows);

    expect(grid.find((cell) => cell.weekday === 4 && cell.minute === 1140)?.wait).toBe(120);
    expect(grid.find((cell) => cell.weekday === 0 && cell.minute === 900)?.wait).toBe(4);
  });

  it("keeps one branch's grid when asked, and still ranks every branch", () => {
    const { dinner, grid } = summarisePatterns(rows, 2);

    expect(grid.find((cell) => cell.weekday === 4 && cell.minute === 1140)?.wait).toBe(140);
    expect(grid.some((cell) => cell.weekday === 0)).toBe(false);
    expect(dinner.map(({ storeId, wait }) => [storeId, wait])).toEqual([
      [1, 60],
      [2, 20],
    ]);
  });
});

describe("patternView", () => {
  const view = patternView(summarisePatterns(rows).grid);

  it("lays the grid out by weekday and recorded half hour", () => {
    expect(view.slots).toEqual([630, 900, 1020, 1080, 1110, 1140]);
    expect(view.rows[4]).toEqual([null, null, null, null, null, 120]);
    expect(view.rows[1]).toEqual([null, null, null, null, null, null]);
  });

  it("reads the busiest half hour, the quietest after noon and the calmest day", () => {
    expect(view.busiest).toMatchObject({ minute: 1020, wait: 500, weekday: 5 });
    expect(view.quietest).toMatchObject({ minute: 900, wait: 4, weekday: 0 });
    expect(view.calmestDay).toEqual({ wait: 2, weekday: 0 });
  });

  it("gives each weekday the stretch that averages an hour or more", () => {
    expect(view.overAnHour[4]).toEqual({ from: 1140, to: 1170 });
    expect(view.overAnHour[5]).toEqual({ from: 1020, to: 1050 });
    expect(view.overAnHour[0]).toBeNull();
  });
});

describe("longLevel", () => {
  it("steps at one and two hours", () => {
    expect([35, 59, 60, 119, 120, 300].map(longLevel)).toEqual([undefined, undefined, 2, 2, 3, 3]);
  });
});
