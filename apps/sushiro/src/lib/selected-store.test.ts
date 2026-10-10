import { describe, expect, it } from "vitest";
import { parseLanguage } from "@/lib/language";
import { storeIdFromSearch } from "@/lib/selected-store";

describe("storeIdFromSearch", () => {
  it("reads the open branch from the address", () => {
    expect(storeIdFromSearch("?store=16")).toBe(16);
    expect(storeIdFromSearch("?view=patterns&store=3")).toBe(3);
  });

  it("ignores a missing or malformed branch", () => {
    expect(storeIdFromSearch("")).toBeNull();
    expect(storeIdFromSearch("?store=")).toBeNull();
    expect(storeIdFromSearch("?store=abc")).toBeNull();
    expect(storeIdFromSearch("?store=-4")).toBeNull();
    expect(storeIdFromSearch("?store=1.5")).toBeNull();
  });
});

describe("parseLanguage", () => {
  it("accepts only the two interface languages", () => {
    expect(parseLanguage("en")).toBe("en");
    expect(parseLanguage("zh-HK")).toBe("zh-HK");
    expect(parseLanguage("fr")).toBeNull();
    expect(parseLanguage(undefined)).toBeNull();
  });
});
