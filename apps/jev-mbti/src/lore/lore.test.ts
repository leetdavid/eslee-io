import { describe, expect, it } from "vitest";
import { MBTI_LETTERS, MBTI_TYPES } from "@/lib/mbti";
import { countCharacters } from "@/lib/question";
import { LETTER_LORE } from "@/lore/letter-lore";
import { LORE_TOPICS, type LoreLine, TOPIC_INFO } from "@/lore/schema";
import { TYPE_LORE } from "@/lore/type-lore";

function checkLine(line: LoreLine, where: string) {
  expect(line.ko.trim(), where).not.toBe("");
  expect(line.en.trim(), where).not.toBe("");
  expect(countCharacters(line.ko), `${where} ko`).toBeLessThanOrEqual(70);
  expect(countCharacters(line.en), `${where} en`).toBeLessThanOrEqual(140);
}

describe("lore library", () => {
  it("covers every type and every topic in both languages", () => {
    for (const type of MBTI_TYPES) {
      const lore = TYPE_LORE[type];
      expect(lore, type).toBeDefined();
      expect(countCharacters(lore.nickname.ko)).toBeLessThanOrEqual(20);
      expect(lore.nickname.en).toMatch(/\(.+\)/u);
      expect(lore.summary.length).toBeGreaterThanOrEqual(2);
      for (const [index, line] of lore.summary.entries())
        checkLine(line, `${type} summary ${index}`);
      for (const topic of LORE_TOPICS) {
        const lines = lore.topics[topic];
        expect(lines?.length, `${type} ${topic}`).toBeGreaterThanOrEqual(1);
        for (const [index, line] of lines.entries()) checkLine(line, `${type} ${topic} ${index}`);
      }
    }
  });

  it("gives every letter general lore and only known topics", () => {
    for (const letter of MBTI_LETTERS) {
      const lore = LETTER_LORE[letter];
      expect(lore.general.length, letter).toBeGreaterThanOrEqual(2);
      for (const [topic, lines] of Object.entries(lore)) {
        expect(topic === "general" || topic in TOPIC_INFO, `${letter} ${topic}`).toBe(true);
        for (const [index, line] of (lines ?? []).entries())
          checkLine(line, `${letter} ${topic} ${index}`);
      }
    }
  });

  it("anchors the T/F and J/P memes the site depends on", () => {
    expect(LETTER_LORE.T.general.some((line) => line.ko.includes("빵"))).toBe(true);
    expect(LETTER_LORE.F.general.some((line) => line.ko.includes("빵"))).toBe(true);
    expect(LETTER_LORE.J.travel?.length).toBeGreaterThan(0);
    expect(LETTER_LORE.P.travel?.length).toBeGreaterThan(0);
  });
});
