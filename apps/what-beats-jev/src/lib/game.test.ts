import { describe, expect, it } from "vitest";
import { answerError, countCharacters, parseSubmission } from "@/lib/game";

describe("answer submission", () => {
  it("accepts free-form counters and preserves the player's capitalization", () => {
    expect(parseSubmission({ challenge: "rock", answer: "A very persuasive pigeon" })).toEqual({
      challenge: "rock",
      answer: "A very persuasive pigeon",
    });
  });

  it("rejects an answer over the 240-character limit", () => {
    expect(() => parseSubmission({ challenge: "rock", answer: "a".repeat(241) })).toThrow("240");
  });

  it("rejects empty answers and repeating the current challenge", () => {
    expect(() => parseSubmission({ challenge: "rock", answer: "   " })).toThrow();
    expect(() => parseSubmission({ challenge: "rock", answer: "  RoCK  " })).toThrow();
  });

  it("allows 240 visible emoji characters rather than counting UTF-16 code units", () => {
    const answer = "👩‍🚀".repeat(240);
    expect(countCharacters(answer)).toBe(240);
    expect(parseSubmission({ challenge: "rock", answer }).answer).toBe(answer);
    expect(() => parseSubmission({ challenge: "rock", answer: `${answer}a` })).toThrow("240");
  });

  it("blocks phrases from anywhere in the current chain without merging synonyms", () => {
    expect(answerError("  PAPER  ", ["rock", "paper", "scissors"])).toBe(
      "Already in this chain. Try a different answer.",
    );
    expect(answerError("a sheet of paper", ["rock", "paper", "scissors"])).toBeNull();
  });
});
