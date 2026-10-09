import { describe, expect, it } from "vitest";
import {
  checkAsk,
  countCharacters,
  detectLanguage,
  reuseIdentity,
  textIdentity,
} from "@/lib/question";

describe("question rules", () => {
  it("counts visible characters, not code units", () => {
    expect(countCharacters("👩‍🚀")).toBe(1);
    expect(countCharacters("회식 2차")).toBe(5);
  });

  it("ignores case and every kind of whitespace for identity", () => {
    expect(textIdentity("영화 보다가  제일 먼저 우는 MBTI는?")).toBe(
      textIdentity("영화보다가 제일먼저 우는 mbti는?"),
    );
    expect(textIdentity("Who Cries First?")).toBe(textIdentity(" who cries\tfirst? "));
    expect(textIdentity("Who cries first?")).not.toBe(textIdentity("Who cries last?"));
  });

  it("detects Korean questions by Hangul", () => {
    expect(detectLanguage("MBTI별 카톡 답장 스타일")).toBe("ko");
    expect(detectLanguage("Which type cries first?")).toBe("en");
  });

  it("blocks empty and over-long questions", () => {
    expect(checkAsk({ question: "   ", mode: "auto" })).toEqual({
      ok: false,
      issue: { code: "empty" },
    });
    expect(checkAsk({ question: "가".repeat(121), mode: "auto" })).toEqual({
      ok: false,
      issue: { code: "tooLong", max: 120 },
    });
    expect(checkAsk({ question: "가".repeat(120), mode: "auto" }).ok).toBe(true);
  });

  it("derives the chart kind from custom axes and requires both ends", () => {
    const one = checkAsk({
      question: "Who plans the trip?",
      mode: "auto",
      axes: [{ low: " Wings it ", high: "Spreadsheet" }],
    });
    expect(one).toEqual({
      ok: true,
      value: {
        question: "Who plans the trip?",
        mode: "one",
        axes: [{ low: "Wings it", high: "Spreadsheet" }],
      },
    });
    const two = checkAsk({
      question: "Texting style",
      mode: "one",
      axes: [
        { low: "Slow", high: "Instant" },
        { low: "One word", high: "Essays" },
      ],
    });
    expect(two.ok && two.value.mode).toBe("two");
    expect(checkAsk({ question: "Q", mode: "one", axes: [{ low: "", high: "x" }] })).toEqual({
      ok: false,
      issue: { code: "axisEndMissing" },
    });
    expect(
      checkAsk({ question: "Q", mode: "one", axes: [{ low: "a".repeat(41), high: "x" }] }),
    ).toEqual({
      ok: false,
      issue: { code: "axisEndTooLong", max: 40 },
    });
  });

  it("reuses a chart only for the same question identity and the same axes", () => {
    const base = { question: "Who plans the trip?", mode: "auto" as const };
    expect(reuseIdentity(base)).toBe(reuseIdentity({ ...base, question: "who plans  the trip?" }));
    expect(reuseIdentity(base)).not.toBe(reuseIdentity({ ...base, mode: "two" }));
    expect(reuseIdentity({ ...base, mode: "one", axes: [{ low: "A", high: "B" }] })).not.toBe(
      reuseIdentity({ ...base, mode: "one", axes: [{ low: "A", high: "C" }] }),
    );
  });
});
