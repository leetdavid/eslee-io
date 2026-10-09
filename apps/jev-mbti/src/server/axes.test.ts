import { describe, expect, it } from "vitest";
import { axisSchema, LEVEL_COUNT } from "@/lib/chart";
import { axisRoute, customAxes, fitAxis } from "@/server/axes";
import type { QuestionReading } from "@/server/jev";

const reading = (kind: QuestionReading["kind"]): QuestionReading => ({
  refused: false,
  kind,
  topics: ["emotions"],
});

describe("axis routes", () => {
  it("lets Jev go first for rankings and the visitor's own ends", () => {
    expect(axisRoute({ question: "Who cries first?", mode: "auto" }, reading("rank"))).toEqual({
      kind: "fit",
    });
    expect(axisRoute({ question: "Who cries first?", mode: "one" }, reading("rank"))).toEqual({
      kind: "fit",
    });
    const ends = [{ low: "읽씹", high: "칼답" }];
    expect(
      axisRoute({ question: "MBTI별 카톡 답장", mode: "one", axes: ends }, reading("style")),
    ).toEqual({ kind: "custom", ends });
  });

  it("waits for the LLM only for style questions and two-axis charts", () => {
    expect(axisRoute({ question: "MBTI별 카톡 답장", mode: "auto" }, reading("style"))).toEqual({
      kind: "suggested",
      count: 2,
    });
    expect(axisRoute({ question: "MBTI별 카톡 답장", mode: "one" }, reading("style"))).toEqual({
      kind: "suggested",
      count: 1,
    });
    expect(axisRoute({ question: "Who cries first?", mode: "two" }, reading("rank"))).toEqual({
      kind: "suggested",
      count: 2,
    });
  });

  it("builds complete placeholder axes whose custom levels name both ends", () => {
    expect(axisSchema.parse(fitAxis()).levels).toHaveLength(LEVEL_COUNT);
    const [x, y] = customAxes([
      { low: "읽씹", high: "읽자마자 칼답" },
      { low: "단답", high: "장문 폭격" },
    ]);
    expect(axisSchema.parse(x).low).toEqual({ ko: "읽씹", en: "읽씹" });
    expect(y?.name.en).toBe("Vertical axis");
    for (const level of x?.levels ?? []) {
      expect(level.criterion).toContain('"읽씹"');
      expect(level.criterion).toContain('"읽자마자 칼답"');
    }
  });
});
