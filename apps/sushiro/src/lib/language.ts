import type { Language } from "@/lib/queue-presentation";

// The language choice is kept in a cookie so the server renders the right language first.
// The same name is used for the older copy in localStorage.
export const languageKey = "sushiro-language";
export const defaultLanguage: Language = "zh-HK";

export function parseLanguage(value: string | null | undefined): Language | null {
  return value === "en" || value === "zh-HK" ? value : null;
}
