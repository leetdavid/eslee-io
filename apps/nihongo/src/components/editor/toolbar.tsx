"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { JLPT_LEVELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
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
  Loader2,
  Quote,
  Type,
  Underline,
  Volume2,
  WandSparkles,
} from "lucide-react";
import { useRef, useState } from "react";

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
  // Dialog states
  const [isFuriganaOpen, setIsFuriganaOpen] = useState(false);
  const [isVocabOpen, setIsVocabOpen] = useState(false);
  const [isImageOpen, setIsImageOpen] = useState(false);
  const [isAudioOpen, setIsAudioOpen] = useState(false);

  // Form states
  const [furigana, setFurigana] = useState("");
  const [vocabData, setVocabData] = useState({ word: "", reading: "", meaning: "", jlptLevel: "" });
  const [imageUrl, setImageUrl] = useState("");
  const [audioData, setAudioData] = useState({ label: "", src: "" });

  const isFullDocRef = useRef(false);

  const addAutoFurigana = api.ai.addFurigana.useMutation({
    onSuccess: (data) => {
      if (isFullDocRef.current) {
        editor.chain().focus().setContent(data.html).run();
      } else {
        editor.chain().focus().insertContent(data.html).run();
      }
    },
    onError: (error) => {
      alert(`Failed to generate furigana: ${error.message}`);
    },
  });

  const handleAutoFurigana = () => {
    const { from, to } = editor.state.selection;
    const isFullDoc = from === to;
    isFullDocRef.current = isFullDoc;

    let contentToProcess = "";

    if (isFullDoc) {
      contentToProcess = editor.getHTML();
      if (!editor.state.doc.textContent.trim()) {
        alert("The document is empty. Please add some Japanese text first.");
        return;
      }
    } else {
      contentToProcess = editor.state.doc.textBetween(from, to, "\n");
      if (!contentToProcess.trim()) {
        alert("The selected text is empty.");
        return;
      }
    }

    addAutoFurigana.mutate({ text: contentToProcess });
  };

  const handleAddFurigana = (e: React.FormEvent) => {
    e.preventDefault();
    if (furigana) {
      editor.chain().focus().setFurigana(furigana).run();
    }
    setIsFuriganaOpen(false);
    setFurigana("");
  };

  const handleAddVocab = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vocabData.word || !vocabData.meaning) return;
    editor
      .chain()
      .focus()
      .setVocabularyHighlight({
        word: vocabData.word,
        reading: vocabData.reading || undefined,
        meaning: vocabData.meaning,
        jlptLevel: vocabData.jlptLevel || undefined,
      })
      .run();
    setIsVocabOpen(false);
    setVocabData({ word: "", reading: "", meaning: "", jlptLevel: "" });
  };

  const handleAddImage = (e: React.FormEvent) => {
    e.preventDefault();
    if (imageUrl) {
      editor.chain().focus().setImage({ src: imageUrl }).run();
    }
    setIsImageOpen(false);
    setImageUrl("");
  };

  const handleAddAudio = (e: React.FormEvent) => {
    e.preventDefault();
    if (audioData.label) {
      editor
        .chain()
        .focus()
        .insertAudioAnnotation({ src: audioData.src, label: audioData.label })
        .run();
    }
    setIsAudioOpen(false);
    setAudioData({ label: "", src: "" });
  };

  // When opening vocab, prepopulate word with current selection if available
  const openVocabDialog = () => {
    const selection = editor.state.selection;
    const text = editor.state.doc.textBetween(selection.from, selection.to, " ");
    setVocabData({ ...vocabData, word: text });
    setIsVocabOpen(true);
  };

  return (
    <>
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
        <ToolbarButton onClick={() => setIsFuriganaOpen(true)} title="Add Furigana (Ctrl+R)">
          <Type className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={handleAutoFurigana}
          disabled={addAutoFurigana.isPending}
          title="Auto Furigana (AI)"
        >
          {addAutoFurigana.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          ) : (
            <WandSparkles className="h-4 w-4 text-primary" />
          )}
        </ToolbarButton>
        <ToolbarButton onClick={openVocabDialog} title="Highlight Vocabulary">
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
        <ToolbarButton onClick={() => setIsImageOpen(true)} title="Insert Image">
          <ImageIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => setIsAudioOpen(true)} title="Insert Audio Annotation">
          <Volume2 className="h-4 w-4" />
        </ToolbarButton>
      </div>

      {/* Dialogs */}
      <Dialog open={isFuriganaOpen} onOpenChange={setIsFuriganaOpen}>
        <DialogContent>
          <form onSubmit={handleAddFurigana}>
            <DialogHeader>
              <DialogTitle>Add Furigana</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <label htmlFor="furigana" className="text-sm font-medium">
                Reading
              </label>
              <Input
                id="furigana"
                autoFocus
                placeholder="e.g. かんじ"
                value={furigana}
                onChange={(e) => setFurigana(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
              <Button type="submit">Add Furigana</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isVocabOpen} onOpenChange={setIsVocabOpen}>
        <DialogContent>
          <form onSubmit={handleAddVocab}>
            <DialogHeader>
              <DialogTitle>Highlight Vocabulary</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-3">
              <div>
                <label htmlFor="vocab-word" className="text-sm font-medium">
                  Word
                </label>
                <Input
                  id="vocab-word"
                  autoFocus
                  placeholder="e.g. 食べる"
                  value={vocabData.word}
                  onChange={(e) => setVocabData({ ...vocabData, word: e.target.value })}
                  className="mt-1.5"
                />
              </div>
              <div>
                <label htmlFor="vocab-reading" className="text-sm font-medium">
                  Reading (Furigana)
                </label>
                <Input
                  id="vocab-reading"
                  placeholder="e.g. たべる"
                  value={vocabData.reading}
                  onChange={(e) => setVocabData({ ...vocabData, reading: e.target.value })}
                  className="mt-1.5"
                />
              </div>
              <div>
                <label htmlFor="vocab-meaning" className="text-sm font-medium">
                  Meaning
                </label>
                <Input
                  id="vocab-meaning"
                  placeholder="e.g. to eat"
                  value={vocabData.meaning}
                  onChange={(e) => setVocabData({ ...vocabData, meaning: e.target.value })}
                  className="mt-1.5"
                />
              </div>
              <div>
                <label htmlFor="vocab-level" className="text-sm font-medium mb-1.5 block">
                  JLPT Level
                </label>
                <select
                  id="vocab-level"
                  value={vocabData.jlptLevel}
                  onChange={(e) => setVocabData({ ...vocabData, jlptLevel: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">None</option>
                  {JLPT_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
              <Button type="submit" disabled={!vocabData.word || !vocabData.meaning}>
                Highlight
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isImageOpen} onOpenChange={setIsImageOpen}>
        <DialogContent>
          <form onSubmit={handleAddImage}>
            <DialogHeader>
              <DialogTitle>Insert Image</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <label htmlFor="image-url" className="text-sm font-medium">
                Image URL
              </label>
              <Input
                id="image-url"
                autoFocus
                placeholder="https://..."
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
              <Button type="submit">Insert</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isAudioOpen} onOpenChange={setIsAudioOpen}>
        <DialogContent>
          <form onSubmit={handleAddAudio}>
            <DialogHeader>
              <DialogTitle>Insert Audio Annotation</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-3">
              <div>
                <label htmlFor="audio-label" className="text-sm font-medium">
                  Label (Text to speak)
                </label>
                <Input
                  id="audio-label"
                  autoFocus
                  placeholder="e.g. こんにちは"
                  value={audioData.label}
                  onChange={(e) => setAudioData({ ...audioData, label: e.target.value })}
                  className="mt-1.5"
                />
              </div>
              <div>
                <label htmlFor="audio-url" className="text-sm font-medium">
                  Audio URL (Optional, uses TTS if empty)
                </label>
                <Input
                  id="audio-url"
                  placeholder="https://..."
                  value={audioData.src}
                  onChange={(e) => setAudioData({ ...audioData, src: e.target.value })}
                  className="mt-1.5"
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
              <Button type="submit" disabled={!audioData.label}>
                Insert
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
