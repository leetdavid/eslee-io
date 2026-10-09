import type { Locale } from "@/lib/i18n";

export const LORE_TOPICS = [
  "social",
  "texting",
  "dating",
  "conflict",
  "planning",
  "work",
  "money",
  "emotions",
  "stress",
  "food",
  "travel",
  "hobbies",
  "humor",
  "friendship",
  "media",
  "crisis",
  "drinking",
] as const;

export type LoreTopic = (typeof LORE_TOPICS)[number];

/** One paraphrased observation from Korean social media, in both languages. */
export type LoreLine = { ko: string; en: string };

export type TypeLore = {
  /** The nickname Korean communities use for the type, e.g. ENFP "댕댕이". */
  nickname: LoreLine;
  /** Two or three lines describing the type's overall community image. */
  summary: [LoreLine, LoreLine, ...LoreLine[]];
  topics: Record<LoreTopic, [LoreLine, ...LoreLine[]]>;
};

/** Lore about a single letter, such as the T-versus-F "너 T야?" meme. */
export type LetterLore = { general: [LoreLine, ...LoreLine[]] } & Partial<
  Record<LoreTopic, LoreLine[]>
>;

export const TOPIC_INFO: Record<LoreTopic, { label: Record<Locale, string>; covers: string }> = {
  social: {
    label: { ko: "사교·에너지", en: "Social energy" },
    covers: "Gaining or spending energy around people, parties, meetups, and alone time.",
  },
  texting: {
    label: { ko: "카톡·연락", en: "Texting" },
    covers: "Reply speed, message length, emoji, read receipts (읽씹/안읽씹), and calls.",
  },
  dating: {
    label: { ko: "연애", en: "Dating" },
    covers: "Crushes, confessions, dating style, affection, jealousy, and breakups.",
  },
  conflict: {
    label: { ko: "갈등·싸움", en: "Conflict" },
    covers: "Arguments, criticism, apologies, and holding grudges.",
  },
  planning: {
    label: { ko: "계획·즉흥", en: "Plans" },
    covers: "Schedules, punctuality, spontaneity, and last-minute changes.",
  },
  work: {
    label: { ko: "일·공부", en: "Work & study" },
    covers: "Deadlines, teamwork, group projects (조별과제), studying, and careers.",
  },
  money: {
    label: { ko: "돈·소비", en: "Money" },
    covers: "Saving, impulse buys, budgeting, and splitting bills (더치페이).",
  },
  emotions: {
    label: { ko: "감정 표현", en: "Emotions" },
    covers: "Showing feelings, crying, and empathy versus solutions (T vs F memes).",
  },
  stress: {
    label: { ko: "스트레스", en: "Stress" },
    covers: "Coping with stress and burnout, being alone versus venting.",
  },
  food: {
    label: { ko: "음식·맛집", en: "Food" },
    covers: "Restaurant picks, trying new food, ordering, and 맛집 hunting.",
  },
  travel: {
    label: { ko: "여행", en: "Travel" },
    covers: "Trip planning, itineraries, packing, and travel style.",
  },
  hobbies: {
    label: { ko: "취미·여가", en: "Free time" },
    covers: "Weekends, hobbies, staying home (집순이/집돌이), and games.",
  },
  humor: {
    label: { ko: "유머·드립", en: "Humor" },
    covers: "Jokes, wordplay (드립), memes, and being the funny one.",
  },
  friendship: {
    label: { ko: "우정", en: "Friendship" },
    covers: "Friend groups, loyalty, giving advice, and keeping in touch.",
  },
  media: {
    label: { ko: "영화·드라마", en: "Movies & shows" },
    covers: "Watching movies and dramas, binge habits, spoilers, and crying at scenes.",
  },
  crisis: {
    label: { ko: "위기·생존", en: "Crisis" },
    covers: "Emergencies, survival scenarios such as zombie-outbreak memes, and staying calm.",
  },
  drinking: {
    label: { ko: "술자리·회식", en: "Drinking & team dinners" },
    covers: "Drinking culture, 회식, the second round (2차), karaoke (노래방), and leaving last.",
  },
};
