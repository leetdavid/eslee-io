"use client";

import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import type { JSONContent } from "@tiptap/react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { cn } from "@/lib/utils";

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
}

export function Editor({
  content,
  onChange,
  placeholder = "Start writing your Japanese text here...",
  editable = true,
  editorClassName,
  className,
}: EditorProps) {
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
          "tiptap prose prose-sm dark:prose-invert max-w-none focus:outline-none",
      },
    },
  });

  if (!editor) {
    return (
      <div className={cn("rounded-md border border-input bg-background p-4", className)}>
        <div className="h-[300px] animate-pulse rounded bg-muted" />
      </div>
    );
  }

  return (
    <div className={cn("relative rounded-md border border-input bg-background", className)}>
      {editable && <EditorToolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}
