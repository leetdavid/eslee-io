"use client";

import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { copy, type Language } from "@/lib/queue-presentation";

type StarToggleProps = {
  isSaved: boolean;
  language: Language;
  onToggle: () => void;
};

// Adds a branch to My branches, or removes it.
export function StarToggle({ isSaved, language, onToggle }: StarToggleProps) {
  const text = copy[language];

  return (
    <Button
      aria-label={isSaved ? text.removeBranch : text.saveBranch}
      aria-pressed={isSaved}
      className="star-button"
      onClick={onToggle}
      size="icon"
      variant="ghost"
    >
      <Star fill={isSaved ? "currentColor" : "none"} size={16} />
    </Button>
  );
}
