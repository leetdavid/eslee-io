import { describe, expect, it } from "vitest";
import { dayType, hongKongHolidays, isPublicHoliday } from "@/lib/holidays";

describe("Hong Kong public holidays", () => {
  it("lists seventeen general holidays for each year, as real dates in order", () => {
    for (const year of ["2026", "2027"]) {
      expect(hongKongHolidays.filter((date) => date.startsWith(year))).toHaveLength(17);
    }

    expect([...hongKongHolidays]).toEqual([...hongKongHolidays].sort());
    expect(hongKongHolidays.every((date) => !Number.isNaN(Date.parse(`${date}T00:00:00Z`)))).toBe(
      true,
    );
  });

  it("knows National Day and an ordinary day", () => {
    expect(isPublicHoliday("2026-10-01")).toBe(true);
    expect(isPublicHoliday("2026-10-02")).toBe(false);
  });
});

describe("dayType", () => {
  it("is the weekday with Monday first", () => {
    expect(dayType("2026-10-05")).toBe(0);
    expect(dayType("2026-10-10")).toBe(5);
    expect(dayType("2026-10-11")).toBe(6);
  });

  it("counts a public holiday as a Sunday", () => {
    // 1 October 2026 is a Thursday.
    expect(dayType("2026-10-01")).toBe(6);
  });
});
