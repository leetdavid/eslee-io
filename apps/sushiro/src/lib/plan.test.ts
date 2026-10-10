import { describe, expect, it } from "vitest";
import {
  clockLabel,
  eatPlan,
  openingMinute,
  parseClock,
  planAnswer,
  planDomain,
  rankBranches,
  rankForEating,
  shorterNearby,
} from "@/lib/plan";
import type { UsualSlot } from "@/lib/usual";

// Slots every 15 minutes from 16:30, with these medians. The range is the median plus or minus 8.
function slotsFrom(start: number, medians: number[]): UsualSlot[] {
  return medians.map((median, index) => ({
    high: median + 8,
    least: Math.max(0, median - 20),
    low: Math.max(0, median - 8),
    median,
    minute: start + index * 15,
    most: median + 20,
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

describe("eatPlan and rankForEating", () => {
  // 17:00 to 18:15, every 15 minutes. A ticket at 17:30 is called at 18:30, one at 17:45 at 19:15.
  const rising = slotsFrom(1020, [20, 40, 60, 90, 120, 120]);

  it("finds the latest ticket that is usually called by the eating time", () => {
    expect(eatPlan(rising, 1110)).toEqual({ kind: "ticket", minute: 1050 });
    expect(eatPlan(rising, 1155)).toEqual({ kind: "ticket", minute: 1065 });
  });

  it("says when even the first ticket is called too late", () => {
    expect(eatPlan(rising, 1030)).toEqual({ kind: "early" });
    expect(eatPlan([], 1110)).toBeNull();
  });

  it("offers the next ticket from now once the ticket time has passed", () => {
    // At 18:00 the 17:30 ticket is gone, so the next one is 18:00.
    expect(eatPlan(rising, 1110, 1080)).toEqual({ kind: "late", minute: 1080 });
    // At 17:33 the 17:30 ticket still counts as now.
    expect(eatPlan(rising, 1110, 1053)).toEqual({ kind: "ticket", minute: 1050 });
    // After the last ticket of the day there is nothing left to offer.
    expect(eatPlan(rising, 1110, 1200)).toBeNull();
  });

  it("ranks the branches that can still make it, shortest wait first", () => {
    const stores = [
      { slots: rising, storeId: 16 },
      { slots: slotsFrom(1020, [10, 10, 15, 15, 20, 20]), storeId: 12 },
      { slots: [], storeId: 99 },
    ];

    expect(rankForEating(stores, 1110).map(({ storeId, ticket }) => ({ storeId, ticket }))).toEqual(
      [
        { storeId: 12, ticket: 1080 },
        { storeId: 16, ticket: 1050 },
      ],
    );
    // At 18:03 only the branch whose ticket time is 18:00 can still make it.
    expect(rankForEating(stores, 1110, 1083).map(({ storeId }) => storeId)).toEqual([12]);
  });
});
