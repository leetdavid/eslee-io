import { useLocalStorage } from "usehooks-ts";

export type TranslationHistoryItem = {
  id: string;
  sourceText: string;
  targetText: string;
  sourceFuriganaHtml?: string;
  targetFuriganaHtml?: string;
  sourceLanguage: string;
  targetLanguage: string;
  model: string;
  timestamp: number;
};

export function useTranslationHistory() {
  const [history, setHistory] = useLocalStorage<TranslationHistoryItem[]>(
    "nihongo-translation-history",
    [],
  );

  const addHistoryItem = (newItem: Omit<TranslationHistoryItem, "id" | "timestamp">) => {
    setHistory((prev) => {
      // Don't add if it's the exact same as the most recent item
      if (
        prev.length > 0 &&
        prev[0]?.sourceText === newItem.sourceText &&
        prev[0]?.targetLanguage === newItem.targetLanguage &&
        prev[0]?.sourceLanguage === newItem.sourceLanguage
      ) {
        // Update the existing item with new target text / furigana if it changed
        const newHistory = [...prev];
        if (newHistory[0]) {
          newHistory[0] = {
            ...newHistory[0],
            ...newItem,
            timestamp: Date.now(),
          };
        }
        return newHistory;
      }

      const item: TranslationHistoryItem = {
        ...newItem,
        id: crypto.randomUUID(),
        timestamp: Date.now(),
      };

      // Keep only the last 50 items
      return [item, ...prev].slice(0, 50);
    });
  };

  const removeHistoryItem = (id: string) => {
    setHistory((prev) => prev.filter((item) => item.id !== id));
  };

  const clearHistory = () => {
    setHistory([]);
  };

  return {
    history,
    addHistoryItem,
    removeHistoryItem,
    clearHistory,
  };
}
