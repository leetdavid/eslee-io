"use client";

import { ChartColumn, LayoutGrid, Map as MapIcon, RefreshCw, Ticket } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { copy, type Language } from "@/lib/queue-presentation";

export type AppNavigationProps = {
  activePage: "grid" | "map" | "stats" | "tickets";
  isRefreshing: boolean;
  language: Language;
  onLanguageChange: (language: Language) => void;
  onRefresh: () => void;
};

const destinations = [
  { href: "/", icon: LayoutGrid, page: "grid" },
  { href: "/map", icon: MapIcon, page: "map" },
  { href: "/tickets", icon: Ticket, page: "tickets" },
  { href: "/stats", icon: ChartColumn, page: "stats" },
] as const;

type DestinationsProps = Pick<AppNavigationProps, "activePage" | "language"> & {
  iconSize: number;
};

function Destinations({ activePage, iconSize, language }: DestinationsProps) {
  const text = copy[language];

  return (
    <>
      {destinations.map(({ href, icon: Icon, page }) => (
        <Link aria-current={activePage === page ? "page" : undefined} href={href} key={page}>
          <span>
            <Icon size={iconSize} strokeWidth={1.75} />
          </span>
          <span>{text[page]}</span>
        </Link>
      ))}
    </>
  );
}

export function AppNavigation({
  activePage,
  isRefreshing,
  language,
  onLanguageChange,
  onRefresh,
}: AppNavigationProps) {
  const text = copy[language];

  return (
    <header className="topbar">
      <div className="topbar-left">
        <span className="topbar-title">{text.mapLabel}</span>
        <nav aria-label={text.navigation} className="nav-tabs">
          <Destinations activePage={activePage} iconSize={16} language={language} />
        </nav>
      </div>
      <div className="topbar-actions">
        <fieldset aria-label={text.language} className="segmented">
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
        <ThemeToggle darkLabel={text.darkMode} lightLabel={text.lightMode} />
        <Button
          className="only-wide"
          leadingIcon={RefreshCw}
          loading={isRefreshing}
          onClick={onRefresh}
          size="compact"
          variant="secondary"
        >
          {text.refresh}
        </Button>
        <Button
          aria-label={text.refresh}
          className="only-narrow"
          loading={isRefreshing}
          onClick={onRefresh}
          size="icon"
          variant="ghost"
        >
          <RefreshCw size={16} />
        </Button>
      </div>
    </header>
  );
}

export function BottomNavigation({
  activePage,
  language,
}: Pick<AppNavigationProps, "activePage" | "language">) {
  return (
    <nav aria-label={copy[language].navigation} className="bottom-nav">
      <Destinations activePage={activePage} iconSize={20} language={language} />
    </nav>
  );
}
