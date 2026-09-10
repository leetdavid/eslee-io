"use client";

import Link from "next/link";
import { copy, type Language } from "@/lib/queue-presentation";

export type AppNavigationProps = {
  activePage: "grid" | "map";
  isRefreshing: boolean;
  language: Language;
  onLanguageChange: (language: Language) => void;
  onRefresh: () => void;
};

export function AppNavigation({
  activePage,
  isRefreshing,
  language,
  onLanguageChange,
  onRefresh,
}: AppNavigationProps) {
  const text = copy[language];

  return (
    <nav aria-label={text.navigation} className="app-navigation">
      <div className="app-navigation-links">
        <Link aria-current={activePage === "grid" ? "page" : undefined} href="/">
          {text.grid}
        </Link>
        <Link aria-current={activePage === "map" ? "page" : undefined} href="/map">
          {text.map}
        </Link>
        <span className="stats-link">
          <button aria-describedby="stats-coming-soon" aria-disabled="true" type="button">
            {text.stats}
          </button>
          <span id="stats-coming-soon" role="tooltip">
            {text.comingSoon}
          </span>
        </span>
      </div>
      <div className="app-navigation-actions">
        <fieldset aria-label={text.language} className="language-toggle">
          <button
            aria-pressed={language === "zh-HK"}
            onClick={() => onLanguageChange("zh-HK")}
            type="button"
          >
            中
          </button>
          <button
            aria-pressed={language === "en"}
            onClick={() => onLanguageChange("en")}
            type="button"
          >
            EN
          </button>
        </fieldset>
        <button
          aria-busy={isRefreshing}
          className="refresh-control"
          disabled={isRefreshing}
          onClick={onRefresh}
          type="button"
        >
          {text.refresh}
        </button>
      </div>
    </nav>
  );
}
