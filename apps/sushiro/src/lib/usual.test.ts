import { describe, expect, it } from "vitest";
import { hongKongClock, usualAt, usualRange, usualSlots } from "@/lib/usual";

describe("hongKongClock", () => {
  it("reads the Hong Kong time of day and weekday, Monday first", () => {
    // Saturday 10 October 2026, 17:30 in Hong Kong.
    expect(hongKongClock(new Date("2026-10-10T09:30:00Z"))).toEqual({
      dayType: 5,
      minute: 1050,
      weekday: 5,
    });
    // 23:30 UTC on Sunday is already Monday morning in Hong Kong.
    expect(hongKongClock(new Date("2026-10-11T23:30:00Z"))).toMatchObject({
      minute: 450,
      weekday: 0,
    });
    // National Day 2026 is a Thursday that queues like a Sunday.
    expect(hongKongClock(new Date("2026-10-01T04:00:00Z"))).toMatchObject({
      dayType: 6,
      weekday: 3,
    });
  });
});

describe("usualSlots", () => {
  const rows = [
    ...[10, 15, 20, 60, 100].map((wait, index) => ({
      day: "2026-09-26",
      minute: 1020 + index * 5,
      wait,
    })),
    ...[20, 25, 30, 90, 140].map((wait, index) => ({
      day: "2026-10-03",
      minute: 1020 + index * 5,
      wait,
    })),
  ];
  const slots = usualSlots(rows);

  it("gives every five-minute slot a range across days", () => {
    expect(slots.map((slot) => slot.minute)).toEqual([1020, 1025, 1030, 1035, 1040]);
    // 17:00 draws on 17:00 to 17:10. The first day's middle wait is 15 and the second's is 25.
    expect(slots[0]).toEqual({ high: 23, least: 16, low: 18, median: 20, minute: 1020, most: 24 });
  });

  it("follows a fast rise instead of flattening it", () => {
    expect(slots[4]?.median).toBeGreaterThan((slots[0]?.median ?? 0) * 3);
  });

  it("needs two days before calling anything usual", () => {
    expect(usualSlots(rows.filter((row) => row.day === "2026-09-26"))).toEqual([]);
    expect(usualSlots([])).toEqual([]);
  });

  it("keeps one unusual day out of the usual range", () => {
    // No queue at 17:20 on four days, and 140 minutes on a public holiday.
    const quiet = ["2026-09-20", "2026-09-26", "2026-09-27", "2026-10-04"].flatMap((day) =>
      [1030, 1035, 1040, 1045, 1050].map((minute) => ({ day, minute, wait: 0 })),
    );
    const holiday = [85, 125, 140, 160, 165].map((wait, index) => ({
      day: "2026-10-01",
      minute: 1030 + index * 5,
      wait,
    }));

    expect(usualSlots([...quiet, ...holiday]).find((slot) => slot.minute === 1040)).toEqual({
      high: 0,
      least: 0,
      low: 0,
      median: 0,
      minute: 1040,
      most: 84,
    });
  });

  it("counts a day once however many snapshots it has", () => {
    const sparse = [{ day: "2026-09-27", minute: 1040, wait: 30 }];
    const dense = [1030, 1035, 1040, 1045, 1050].map((minute) => ({
      day: "2026-10-04",
      minute,
      wait: 90,
    }));

    expect(usualSlots([...sparse, ...dense]).find((slot) => slot.minute === 1040)?.median).toBe(60);
  });
});

describe("usualAt and usualRange", () => {
  const slots = [{ high: 62, least: 5, low: 13, median: 30, minute: 1050, most: 90 }];

  it("finds the slot nearest a time of day", () => {
    expect(usualAt(slots, 1052)?.minute).toBe(1050);
    expect(usualAt(slots, 1058)).toBeNull();
  });

  it("rounds the shown range outward to five minutes", () => {
    expect(usualRange(slots[0] as (typeof slots)[number])).toEqual({ high: 65, low: 10 });
  });
});
