"use client";

import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import { languageKey, parseLanguage } from "@/lib/language";
import type { Language } from "@/lib/queue-presentation";

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function saveLanguage(language: Language) {
  // biome-ignore lint/suspicious/noDocumentCookie: the Cookie Store API is not in every browser this site supports.
  document.cookie = `${languageKey}=${language}; path=/; max-age=31536000; samesite=lax`;

  try {
    window.localStorage.setItem(languageKey, language);
  } catch {
    // The cookie alone is enough when storage is blocked.
  }
}

export function LanguageProvider({
  children,
  initialLanguage,
}: {
  children: ReactNode;
  initialLanguage: Language;
}) {
  const [language, setCurrentLanguage] = useState(initialLanguage);

  useEffect(() => {
    // A visitor from before the cookie existed keeps the choice saved in this browser.
    const hasCookie = document.cookie
      .split("; ")
      .some((item) => item.startsWith(`${languageKey}=`));

    if (hasCookie) {
      return;
    }

    try {
      const stored = parseLanguage(window.localStorage.getItem(languageKey));

      if (stored) {
        saveLanguage(stored);
        setCurrentLanguage(stored);
      }
    } catch {
      // Without storage there is no earlier choice to restore.
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  function setLanguage(nextLanguage: Language) {
    saveLanguage(nextLanguage);
    setCurrentLanguage(nextLanguage);
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const value = useContext(LanguageContext);

  if (!value) {
    throw new Error("useLanguage must be used inside LanguageProvider");
  }

  return value;
}
