"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { setTheme, theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-3 w-3 rounded-full bg-gray-200" />;
  }

  const cycleTheme = () => {
    if (resolvedTheme === "light") setTheme("dark");
    else setTheme("light");
  };

  return (
    <button
      type="button"
      onClick={cycleTheme}
      className={`h-3 w-3 rounded-full transition-colors duration-300 ${
        theme === "dark" ? "bg-white" : theme === "light" ? "bg-black" : "bg-gray-400"
      }`}
      aria-label="Toggle theme"
      title={`Current theme: ${theme}`}
    />
  );
}
