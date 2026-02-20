"use client";

import { cn } from "@/lib/utils";
import type { Editor } from "@tiptap/react";
import {
  Bold,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  ImageIcon,
  Italic,
  Languages,
  List,
  ListOrdered,
  Quote,
  Type,
  Underline,
  Volume2,
} from "lucide-react";

interface ToolbarProps {
  editor: Editor;
}

function ToolbarButton({
  onClick,
  active = false,
  disabled = false,
  children,
  title,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-md text-sm transition-colors",
        "hover:bg-accent hover:text-accent-foreground",
        "disabled:pointer-events-none disabled:opacity-50",
        active && "bg-accent text-accent-foreground",
      )}
    >
      {children}
    </button>
  );
}

function ToolbarSeparator() {
  return <div className="mx-1 h-6 w-px bg-border" />;
}

export function EditorToolbar({ editor }: ToolbarProps) {
  const addFurigana = () => {
    const reading = window.prompt("Enter furigana reading (e.g., かんじ):");
    if (reading) {
      editor.chain().focus().setFurigana(reading).run();
    }
  };

  const addVocabulary = () => {
    const word = window.prompt("Word:");
    if (!word) return;
    const reading = window.prompt("Reading (furigana):");
    const meaning = window.prompt("Meaning:");
    if (!meaning) return;
    const jlptLevel = window.prompt("JLPT Level (N5/N4/N3/N2/N1):");

    editor
      .chain()
      .focus()
      .setVocabularyHighlight({
        word,
        reading: reading ?? undefined,
        meaning,
        jlptLevel: jlptLevel ?? undefined,
      })
      .run();
  };

  const addImage = () => {
    const url = window.prompt("Enter image URL:");
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const addAudio = () => {
    const label = window.prompt("Audio label (text to speak):");
    if (!label) return;
    const src = window.prompt("Audio URL (leave empty for TTS):") ?? "";
    editor.chain().focus().insertAudioAnnotation({ src, label }).run();
  };

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-input p-2">
      {/* Text formatting */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive("bold")}
        title="Bold (Ctrl+B)"
      >
        <Bold className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive("italic")}
        title="Italic (Ctrl+I)"
      >
        <Italic className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        active={editor.isActive("underline")}
        title="Underline (Ctrl+U)"
      >
        <Underline className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarSeparator />

      {/* Headings */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        active={editor.isActive("heading", { level: 1 })}
        title="Heading 1"
      >
        <Heading1 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        active={editor.isActive("heading", { level: 2 })}
        title="Heading 2"
      >
        <Heading2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        active={editor.isActive("heading", { level: 3 })}
        title="Heading 3"
      >
        <Heading3 className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarSeparator />

      {/* Lists */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive("bulletList")}
        title="Bullet list"
      >
        <List className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive("orderedList")}
        title="Ordered list"
      >
        <ListOrdered className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        active={editor.isActive("blockquote")}
        title="Quote"
      >
        <Quote className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarSeparator />

      {/* Japanese-specific */}
      <ToolbarButton onClick={addFurigana} title="Add Furigana (Ctrl+R)">
        <Type className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton onClick={addVocabulary} title="Highlight Vocabulary">
        <Highlighter className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarSeparator />

      {/* Media & Blocks */}
      <ToolbarButton
        onClick={() => editor.chain().focus().insertTranslationBlock().run()}
        title="Insert Translation Block"
      >
        <Languages className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton onClick={addImage} title="Insert Image">
        <ImageIcon className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton onClick={addAudio} title="Insert Audio Annotation">
        <Volume2 className="h-4 w-4" />
      </ToolbarButton>
    </div>
  );
}
