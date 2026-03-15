"use client";

import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import type { JSONContent } from "@tiptap/react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "../ui/scroll-area";
import { AudioAnnotation } from "./extensions/audio-annotation";
import { Furigana } from "./extensions/furigana";
import { TranslationBlock } from "./extensions/translation-block";
import { VocabularyHighlight } from "./extensions/vocabulary-highlight";
import { EditorToolbar } from "./toolbar";

interface EditorProps {
  content?: JSONContent;
  onChange?: (content: JSONContent) => void;
  placeholder?: string;
  editable?: boolean;
  editorClassName?: string;
  className?: string;
  textScale?: number;
  onTextScaleChange?: (scale: number | ((prev: number) => number)) => void;
}

export function Editor({
  content,
  onChange,
  placeholder = "Start writing your Japanese text here...",
  editable = true,
  editorClassName,
  className,
  textScale: externalTextScale,
  onTextScaleChange: externalOnTextScaleChange,
}: EditorProps) {
  const [internalTextScale, setInternalTextScale] = useState(1);
  const textScale = externalTextScale ?? internalTextScale;
  const setTextScale = externalOnTextScaleChange ?? setInternalTextScale;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Image,
      Placeholder.configure({ placeholder }),
      Furigana,
      VocabularyHighlight,
      TranslationBlock,
      AudioAnnotation,
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getJSON());
    },
    editorProps: {
      attributes: {
        class:
          editorClassName ||
          "tiptap prose dark:prose-invert max-w-none focus:outline-none prose-p:my-2 prose-headings:mb-2 prose-headings:mt-4 prose-li:my-0 leading-normal text-[length:var(--editor-font-size)]",
      },
    },
  });

  if (!editor) {
    return (
      <div className={cn("rounded-md border border-input bg-background p-4", className)}>
        <div className="h-75 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative flex h-full flex-col rounded-md border border-input bg-background",
        className,
      )}
      style={
        {
          "--editor-font-size": `${1 * textScale}rem`,
        } as React.CSSProperties
      }
    >
      {editable && (
        <div className="shrink-0 border-border border-b">
          <EditorToolbar editor={editor} textScale={textScale} onTextScaleChange={setTextScale} />
        </div>
      )}
      <ScrollArea className="min-h-0 flex-1 overflow-y-auto">
        <EditorContent editor={editor} />
      </ScrollArea>
    </div>
  );
}
