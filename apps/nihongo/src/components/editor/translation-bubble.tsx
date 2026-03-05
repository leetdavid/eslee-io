"use client";

import { api } from "@/trpc/react";
import { BubbleMenu } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import { Languages, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

interface TranslationBubbleProps {
  editor: Editor;
}

export function TranslationBubble({ editor }: TranslationBubbleProps) {
  const [selectedText, setSelectedText] = useState("");
  const [translation, setTranslation] = useState<string | null>(null);

  const translateMutation = api.ai.translate.useMutation({
    onSuccess: (data) => {
      setTranslation(data.translation);
    },
  });

  // Reset translation when selection changes
  useEffect(() => {
    const handleSelectionUpdate = () => {
      const { from, to } = editor.state.selection;
      if (from === to) {
        setSelectedText("");
        setTranslation(null);
        translateMutation.reset();
        return;
      }

      const text = editor.state.doc.textBetween(from, to, " ");
      if (text !== selectedText) {
        setSelectedText(text);
        setTranslation(null);
        translateMutation.reset();
      }
    };

    editor.on("selectionUpdate", handleSelectionUpdate);
    return () => {
      editor.off("selectionUpdate", handleSelectionUpdate);
    };
  }, [editor, selectedText, translateMutation]);

  // Debounce the translation request
  useEffect(() => {
    if (!selectedText.trim()) return;

    const timeout = setTimeout(() => {
      if (!translation && !translateMutation.isPending) {
        translateMutation.mutate({ text: selectedText, targetLanguage: "en" });
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timeout);
  }, [selectedText, translation, translateMutation]);

  return (
    <BubbleMenu
      editor={editor}
      tippyOptions={{ duration: 100, placement: "bottom", maxWidth: 400 }}
      shouldShow={({ state }) => {
        const { from, to } = state.selection;
        if (from === to) return false;

        const text = state.doc.textBetween(from, to, " ");
        // Only show if there's actual text selected
        return text.trim().length > 0;
      }}
      className="flex flex-col gap-2 rounded-lg border bg-popover p-3 text-popover-foreground shadow-md w-[300px]"
    >
      <div className="flex items-center gap-2 border-b pb-2 text-xs font-medium text-muted-foreground">
        <Languages className="h-3 w-3" />
        Translation
      </div>
      <div className="text-sm">
        {translateMutation.isPending && !translation ? (
          <div className="flex items-center gap-2 text-muted-foreground py-1">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Translating...</span>
          </div>
        ) : translation ? (
          <p className="leading-relaxed">{translation}</p>
        ) : translateMutation.isError ? (
          <p className="text-destructive">Failed to translate.</p>
        ) : null}
      </div>
    </BubbleMenu>
  );
}
