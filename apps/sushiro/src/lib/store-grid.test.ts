import { describe, expect, it } from "vitest";
import { storeGrid, storeGridBands, storeGridNames, territoryBandOf } from "@/lib/store-grid";

describe("store grid", () => {
  it("keeps eight rows of six columns", () => {
    expect(storeGrid).toHaveLength(8);
    expect(storeGrid.every((row) => row.length === 6)).toBe(true);
  });

  it("places every store once, including the two newest branches", () => {
    expect(new Set(storeGridNames).size).toBe(storeGridNames.length);
    expect(storeGridNames).toContain("Dragon Centre");
    expect(storeGridNames).toContain("Wan Chai Emperor Group Centre");
  });

  it("splits the rows into three territory bands, north to south", () => {
    expect(storeGridBands.map(({ band, cells }) => [band, cells.length / 6])).toEqual([
      ["newTerritories", 3],
      ["kowloon", 4],
      ["hongKongIsland", 1],
    ]);
    expect(storeGridBands.flatMap(({ cells }) => cells)).toHaveLength(48);
  });
});

describe("territoryBandOf", () => {
  it("finds a branch's territory from its English name, ignoring case and spacing", () => {
    expect(territoryBandOf("Tsuen Wan Plaza")).toBe("newTerritories");
    expect(territoryBandOf("  tko   plaza ")).toBe("kowloon");
    expect(territoryBandOf("Quarry Bay")).toBe("hongKongIsland");
  });

  it("returns null for a branch that is not on the grid", () => {
    expect(territoryBandOf("A branch that opened yesterday")).toBeNull();
  });
});
