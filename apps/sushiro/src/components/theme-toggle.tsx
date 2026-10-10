"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type ThemeToggleProps = {
  darkLabel: string;
  lightLabel: string;
};

// The layout script sets the first theme; this control flips it and remembers the choice.
export function ThemeToggle({ darkLabel, lightLabel }: ThemeToggleProps) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggleTheme() {
    const nextIsDark = !isDark;

    document.documentElement.classList.toggle("dark", nextIsDark);
    window.localStorage.setItem("sushiro-theme", nextIsDark ? "dark" : "light");
    setIsDark(nextIsDark);
  }

  const label = isDark ? lightLabel : darkLabel;
  const icon = isDark ? <Moon size={16} /> : <Sun size={16} />;

  return (
    <>
      <Button
        aria-label={label}
        className="only-wide"
        onClick={toggleTheme}
        size="icon-compact"
        variant="secondary"
      >
        {icon}
      </Button>
      <Button
        aria-label={label}
        className="only-narrow"
        onClick={toggleTheme}
        size="icon"
        variant="ghost"
      >
        {icon}
      </Button>
    </>
  );
}
