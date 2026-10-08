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

  it.each(Array.from("0123456789"))("rejects digit %s in client and server validation", (digit) => {
    const answer = `a rock crusher model ${digit}`;
    expect(answerError(answer, ["rock"])).toBe("im bad at math");
    expect(() => parseSubmission({ challenge: "rock", answer })).toThrow("im bad at math");
  });

  it.each([
    "1 rock crusher",
    "a9b",
    "1️⃣",
    `${"a".repeat(240)}0`,
  ])("uses the math error for an answer containing digits: %s", (answer) => {
    expect(answerError(answer, ["rock"])).toBe("im bad at math");
    expect(() => parseSubmission({ challenge: "rock", answer })).toThrow("im bad at math");
  });

  it("allows numbers written as words", () => {
    const answer = "one hundred rock crushers";
    expect(answerError(answer, ["rock"])).toBeNull();
    expect(parseSubmission({ challenge: "rock", answer }).answer).toBe(answer);
  });

  it("allows a digit-free answer against a challenge accepted before the digit ban", () => {
    expect(parseSubmission({ challenge: "a rock crusher model 2", answer: "rust" })).toEqual({
      challenge: "a rock crusher model 2",
      answer: "rust",
    });
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

  it("treats Unicode capitalization variants as the same phrase", () => {
    expect(answerError("STRASSE", ["rock", "Straße"])).toBe(
      "Already in this chain. Try a different answer.",
    );
    expect(answerError("ΟΣ", ["rock", "ος"])).toBe(
      "Already in this chain. Try a different answer.",
    );
  });
});
