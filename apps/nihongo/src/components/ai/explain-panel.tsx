"use client";

import { cn } from "@/lib/utils";
import { useCompletion } from "@ai-sdk/react";
import { Sparkles, X } from "lucide-react";
import { useState } from "react";

interface ExplainPanelProps {
  selectedText: string;
  onClose: () => void;
}

export function ExplainPanel({ selectedText, onClose }: ExplainPanelProps) {
  const [userLanguage, setUserLanguage] = useState<"en" | "ko">("en");

  const { completion, isLoading, complete } = useCompletion({
    api: "/api/ai/explain",
  });

  const handleExplain = async () => {
    await complete("", {
      body: {
        text: selectedText,
        userLanguage,
      },
    });
  };

  return (
    <div className="rounded-lg border bg-card shadow-lg">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-medium">AI Explanation</h3>
        </div>
        <button type="button" onClick={onClose} className="rounded-md p-1 hover:bg-accent">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="p-4 space-y-3">
        <div className="rounded-md bg-muted p-3">
          <p className="text-sm font-medium">Selected text:</p>
          <p className="mt-1 text-lg">{selectedText}</p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={userLanguage}
            onChange={(e) => setUserLanguage(e.target.value as "en" | "ko")}
            className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
          >
            <option value="en">English</option>
            <option value="ko">Korean</option>
          </select>
          <button
            type="button"
            onClick={handleExplain}
            disabled={isLoading}
            className={cn(
              "inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3",
              "text-sm font-medium text-primary-foreground",
              "hover:bg-primary/90",
              "disabled:opacity-50",
            )}
          >
            {isLoading ? "Explaining..." : "Explain"}
          </button>
        </div>

        {completion && (
          <div className="rounded-md border p-3 prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm">
            {completion}
          </div>
        )}
      </div>
    </div>
  );
}
