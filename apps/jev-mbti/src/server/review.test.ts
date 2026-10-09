import { describe, expect, it } from "vitest";
import { fitCryPlot, fitCryWording } from "@/lib/test-fixtures";
import { customAxes } from "@/server/axes";
import { toWording } from "@/server/review";

const [cryWording] = fitCryWording.axes;
if (!cryWording) throw new Error("The fixture has no axis wording");

describe("review wording", () => {
  it("keeps the visitor's question and custom ends verbatim", () => {
    const plot = {
      ...fitCryPlot,
      axes: customAxes([{ low: "Bitten first", high: "Last one standing" }]),
    };
    const wording = toWording("좀비 사태에서  끝까지 살아남는 MBTI는?", plot, {
      question: {
        ko: "좀비 사태에서 끝까지 살아남는 MBTI는?",
        en: "Who survives a zombie outbreak?",
      },
      axes: [
        {
          ...cryWording,
          low: { ko: "제일 먼저 물림", en: "Gets bitten first" },
          high: { ko: "최후의 생존자", en: "Sole survivor" },
        },
      ],
    });
    expect(wording?.question).toEqual({
      ko: "좀비 사태에서  끝까지 살아남는 MBTI는?",
      en: "Who survives a zombie outbreak?",
    });
    expect(wording?.axes[0]?.low).toEqual({ ko: "제일 먼저 물림", en: "Bitten first" });
    expect(wording?.axes[0]?.high).toEqual({ ko: "최후의 생존자", en: "Last one standing" });
  });

  it("rejects wording that skips a level, an axis, or a translation", () => {
    const question = "영화 보다가 제일 먼저 우는 MBTI는?";
    expect(toWording(question, fitCryPlot, fitCryWording)).toEqual(fitCryWording);
    const shortScale = { ...cryWording, levels: cryWording.levels.slice(1) };
    expect(toWording(question, fitCryPlot, { ...fitCryWording, axes: [shortScale] })).toBeNull();
    expect(toWording(question, fitCryPlot, { ...fitCryWording, axes: [] })).toBeNull();
    const untranslated = { ...cryWording, high: { ko: "시작부터 오열", en: "" } };
    expect(toWording(question, fitCryPlot, { ...fitCryWording, axes: [untranslated] })).toBeNull();
  });
});
