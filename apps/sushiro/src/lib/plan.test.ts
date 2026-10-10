import { describe, expect, it } from "vitest";
import {
  clockLabel,
  openingMinute,
  parseClock,
  planAnswer,
  planDomain,
  rankBranches,
  shorterNearby,
} from "@/lib/plan";
import type { UsualSlot } from "@/lib/usual";

// Slots every 15 minutes from 16:30, with these medians. The range is the median plus or minus 8.
function slotsFrom(start: number, medians: number[]): UsualSlot[] {
  return medians.map((median, index) => ({
    high: median + 8,
    low: Math.max(0, median - 8),
    median,
    minute: start + index * 15,
  }));
}

const luk = slotsFrom(990, [15, 20, 20, 28, 45, 70, 95]);

describe("clock helpers", () => {
  it("formats and reads times on a five-minute step", () => {
    expect(clockLabel(1050)).toBe("17:30");
    expect(clockLabel(1450)).toBe("00:10");
    expect(parseClock("17:30")).toBe(1050);
    expect(parseClock("17:32")).toBeNull();
    expect(parseClock("25:00")).toBeNull();
    expect(parseClock("5pm")).toBeNull();
    expect(parseClock(null)).toBeNull();
  });
});

describe("planAnswer", () => {
  it("rounds the usual range outward and the median to five minutes", () => {
    expect(planAnswer(luk, 1050)).toEqual({ high: 55, low: 35, median: 45 });
  });

  it("is null when nothing usual is recorded for the time", () => {
    expect(planAnswer(luk, 600)).toBeNull();
  });
});

describe("shorterNearby", () => {
  it("offers the shortest time within an hour when it is clearly shorter", () => {
    // 17:30 is usually 45. 16:30 is 15, the shortest within the hour before.
    expect(shorterNearby(luk, 1050)).toBe(990);
  });

  it("does not offer a time that has already passed today", () => {
    // 17:00 and 16:45 are equally short. The nearer one is offered.
    expect(shorterNearby(luk, 1050, 1005)).toBe(1020);
    expect(shorterNearby(luk, 1050, 1040)).toBeNull();
  });

  it("offers nothing when no nearby time is clearly shorter", () => {
    expect(shorterNearby(luk, 1005)).toBeNull();
    expect(shorterNearby(luk, 600)).toBeNull();
  });
});

describe("rankBranches and planDomain", () => {
  const stores = [
    { slots: slotsFrom(990, [60, 70, 80]), storeId: 12 },
    { slots: luk, storeId: 25 },
    { slots: [], storeId: 99 },
  ];

  it("ranks branches by usual wait and leaves out those with none", () => {
    expect(rankBranches(stores, 1005).map(({ storeId }) => storeId)).toEqual([25, 12]);
    expect(rankBranches(stores, 600)).toEqual([]);
  });

  it("covers the first to the last slot, widened to half hours", () => {
    expect(planDomain(stores)).toEqual({ end: 1080, start: 990 });
    expect(planDomain([])).toEqual({ end: 1260, start: 660 });
  });
});

describe("openingMinute", () => {
  const domain = { end: 1260, start: 630 };

  it("opens on the next five minutes while tickets are being issued", () => {
    expect(openingMinute(1003, domain)).toBe(1005);
    expect(openingMinute(1005, domain)).toBe(1010);
  });

  it("opens on dinner time outside those hours or on another day", () => {
    expect(openingMinute(1400, domain)).toBe(1080);
    expect(openingMinute(null, domain)).toBe(1080);
    expect(openingMinute(null, { end: 1020, start: 630 })).toBe(1020);
  });
});
