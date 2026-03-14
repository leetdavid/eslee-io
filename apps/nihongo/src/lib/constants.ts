export const JLPT_LEVELS = ["N1", "N2", "N3", "N4", "N5"] as const;
export type JLPTLevel = (typeof JLPT_LEVELS)[number];

export const JLPT_COLORS: Record<string, string> = {
  N5: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  N4: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  N3: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  N2: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  N1: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
};

export const JLPT_SOLID_COLORS: Record<string, string> = {
  N5: "bg-emerald-500",
  N4: "bg-sky-500",
  N3: "bg-amber-500",
  N2: "bg-orange-500",
  N1: "bg-rose-500",
};

export const LANGUAGES = [
  { value: "ja", label: "Japanese" },
  { value: "en", label: "English" },
  { value: "ko", label: "Korean" },
] as const;
