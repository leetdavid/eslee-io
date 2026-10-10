import { describe, expect, it } from "vitest";
import { parseSavedBranches, toggleSavedBranch } from "@/lib/my-branches";

describe("My branches", () => {
  it("reads a stored list and drops what is not a branch number", () => {
    expect(parseSavedBranches('[16, 25, 16, -1, 2.5, "12", null]')).toEqual([16, 25]);
  });

  it("treats missing or broken storage as an empty list", () => {
    expect(parseSavedBranches(null)).toEqual([]);
    expect(parseSavedBranches("not json")).toEqual([]);
    expect(parseSavedBranches('{"16":true}')).toEqual([]);
  });

  it("adds a branch at the end and removes it on the second toggle", () => {
    expect(toggleSavedBranch([16], 25)).toEqual([16, 25]);
    expect(toggleSavedBranch([16, 25], 16)).toEqual([25]);
  });
});
