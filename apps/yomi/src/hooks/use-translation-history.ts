import { useCallback } from "react";
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
    "yomi-translation-history",
    [],
  );

  const addHistoryItem = useCallback(
    (newItem: Omit<TranslationHistoryItem, "id" | "timestamp">) => {
      setHistory((prev) => {
        const lastItem = prev[0];

        // Update the existing item if it's the exact same, OR if it appears the user is just continuing to type/edit the same thought
        if (lastItem) {
          const isExactMatch =
            lastItem.sourceText === newItem.sourceText &&
            lastItem.targetLanguage === newItem.targetLanguage &&
            lastItem.sourceLanguage === newItem.sourceLanguage;

          const isContinuingToType =
            (newItem.sourceText.startsWith(lastItem.sourceText) ||
              lastItem.sourceText.startsWith(newItem.sourceText)) &&
            lastItem.targetLanguage === newItem.targetLanguage &&
            lastItem.sourceLanguage === newItem.sourceLanguage &&
            Date.now() - lastItem.timestamp < 2 * 60 * 1000; // 2 minutes window

          if (isExactMatch || isContinuingToType) {
            const newHistory = [...prev];
            newHistory[0] = {
              ...lastItem,
              ...newItem,
              timestamp: Date.now(),
            };
            return newHistory;
          }
        }

        const item: TranslationHistoryItem = {
          ...newItem,
          id: crypto.randomUUID(),
          timestamp: Date.now(),
        };

        // Keep only the last 50 items
        return [item, ...prev].slice(0, 50);
      });
    },
    [setHistory],
  );

  const removeHistoryItem = useCallback(
    (id: string) => {
      setHistory((prev) => prev.filter((item) => item.id !== id));
    },
    [setHistory],
  );

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, [setHistory]);

  return {
    history,
    addHistoryItem,
    removeHistoryItem,
    clearHistory,
  };
}
