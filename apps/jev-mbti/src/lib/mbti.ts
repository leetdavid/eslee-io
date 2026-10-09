export const MBTI_TYPES = [
  "INTJ",
  "INTP",
  "ENTJ",
  "ENTP",
  "INFJ",
  "INFP",
  "ENFJ",
  "ENFP",
  "ISTJ",
  "ISFJ",
  "ESTJ",
  "ESFJ",
  "ISTP",
  "ISFP",
  "ESTP",
  "ESFP",
] as const;

export type MbtiType = (typeof MBTI_TYPES)[number];

export const MBTI_LETTERS = ["E", "I", "S", "N", "T", "F", "J", "P"] as const;
export type MbtiLetter = (typeof MBTI_LETTERS)[number];

export const TYPE_GROUPS = ["nt", "nf", "sj", "sp"] as const;
export type TypeGroup = (typeof TYPE_GROUPS)[number];

export function groupOf(type: MbtiType): TypeGroup {
  if (type[1] === "N") return type[2] === "T" ? "nt" : "nf";
  return type[3] === "J" ? "sj" : "sp";
}

export function lettersOf(type: MbtiType): MbtiLetter[] {
  return type.split("") as MbtiLetter[];
}

export function isMbtiType(value: string): value is MbtiType {
  return (MBTI_TYPES as readonly string[]).includes(value);
}
