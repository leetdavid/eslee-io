import type { Axis, Judgment, Plot } from "@/lib/chart";
import { MBTI_TYPES, type MbtiType } from "@/lib/mbti";

const level = (en: string, ko: string, criterion: string) => ({ criterion, label: { en, ko } });

export const cryAxis: Axis = {
  name: { ko: "눈물", en: "Tears" },
  low: { ko: "눈물 한 방울 없음", en: "Stays dry-eyed" },
  high: { ko: "시작 10분 만에 오열", en: "Sobbing ten minutes in" },
  levels: [
    level("Stays dry-eyed", "눈물 없음", "Stays completely dry-eyed through the whole movie"),
    level(
      "Feels a lump",
      "목이 메임",
      "Feels a lump in the throat at the saddest scene but never tears up",
    ),
    level("Eyes get wet", "살짝 찡", "Eyes get a little wet at the saddest scene"),
    level("Tears at the big scene", "큰 장면에서 눈물", "Cries quietly at the big emotional scene"),
    level("Cries several times", "여러 번 울컥", "Cries through several scenes"),
    level(
      "Needs tissues",
      "휴지 필수",
      "Cries openly through most of the second half and needs tissues",
    ),
    level(
      "Sobbing ten minutes in",
      "10분 만에 오열",
      "Starts sobbing within the first ten minutes",
    ),
  ],
};

export function judgment(position: number, confidence = 0.6): Judgment {
  return { position, confidence, probabilities: [0.05, 0.1, 0.15, 0.4, 0.15, 0.1, 0.05] };
}

export const cryPositions: Record<MbtiType, number> = {
  INFP: 0.93,
  ENFP: 0.84,
  INFJ: 0.79,
  ISFP: 0.74,
  ESFJ: 0.71,
  ENFJ: 0.68,
  ISFJ: 0.6,
  ESFP: 0.57,
  ENTP: 0.36,
  INTP: 0.31,
  ESTP: 0.29,
  ISTJ: 0.25,
  ESTJ: 0.21,
  ENTJ: 0.18,
  INTJ: 0.16,
  ISTP: 0.1,
};

export const cryPlot: Plot = {
  version: 1,
  questionText: {
    ko: "영화 보다가 제일 먼저 우는 MBTI는?",
    en: "Which type cries first at a movie?",
  },
  axes: [cryAxis],
  loreTopics: ["emotions", "media"],
  placements: Object.fromEntries(
    MBTI_TYPES.map((type) => [type, { x: judgment(cryPositions[type]) }]),
  ) as Plot["placements"],
  jevMs: 1200,
};
