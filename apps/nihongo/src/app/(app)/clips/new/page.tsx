"use client";

import { Editor } from "@/components/editor/editor";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import type { JSONContent } from "@tiptap/react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NewClipPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState<JSONContent | undefined>();
  const [sourceLanguage, setSourceLanguage] = useState<"ja" | "en" | "ko">("ja");
  const [targetLanguage, setTargetLanguage] = useState<"ja" | "en" | "ko" | "">("en");
  const [jlptLevel, setJlptLevel] = useState<string>("");

  const createClip = api.clip.create.useMutation({
    onSuccess: (clip) => {
      router.push(`/clips/${clip?.id}`);
    },
  });

  const handleSave = () => {
    if (!title || !content) return;

    createClip.mutate({
      title,
      content,
      sourceLanguage,
      targetLanguage: targetLanguage || undefined,
      jlptLevel: (jlptLevel as "N5" | "N4" | "N3" | "N2" | "N1" | undefined) || undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/clips"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-input bg-background transition-colors hover:bg-accent"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Clip</h1>
          <p className="text-sm text-muted-foreground">Create a new Japanese text clip</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Title */}
        <div className="space-y-2">
          <label htmlFor="title" className="text-sm font-medium">
            Title
          </label>
          <input
            id="title"
            type="text"
            placeholder="Enter clip title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={cn(
              "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
              "placeholder:text-muted-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
          />
        </div>

        {/* Language & Level */}
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <label htmlFor="source-lang" className="text-sm font-medium">
              Source Language
            </label>
            <select
              id="source-lang"
              value={sourceLanguage}
              onChange={(e) => setSourceLanguage(e.target.value as "ja" | "en" | "ko")}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="ja">Japanese</option>
              <option value="en">English</option>
              <option value="ko">Korean</option>
            </select>
          </div>
          <div className="space-y-2">
            <label htmlFor="target-lang" className="text-sm font-medium">
              Target Language
            </label>
            <select
              id="target-lang"
              value={targetLanguage}
              onChange={(e) => setTargetLanguage(e.target.value as "ja" | "en" | "ko" | "")}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">None</option>
              <option value="ja">Japanese</option>
              <option value="en">English</option>
              <option value="ko">Korean</option>
            </select>
          </div>
          <div className="space-y-2">
            <label htmlFor="jlpt" className="text-sm font-medium">
              JLPT Level
            </label>
            <select
              id="jlpt"
              value={jlptLevel}
              onChange={(e) => setJlptLevel(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">None</option>
              <option value="N5">N5</option>
              <option value="N4">N4</option>
              <option value="N3">N3</option>
              <option value="N2">N2</option>
              <option value="N1">N1</option>
            </select>
          </div>
        </div>

        {/* Editor */}
        <div className="space-y-2">
          <span className="text-sm font-medium">Content</span>
          <Editor content={content} onChange={setContent} />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Link
            href="/clips"
            className="inline-flex h-10 items-center rounded-md border border-input bg-background px-4 text-sm font-medium hover:bg-accent"
          >
            Cancel
          </Link>
          <button
            type="button"
            onClick={handleSave}
            disabled={!title || !content || createClip.isPending}
            className={cn(
              "inline-flex h-10 items-center rounded-md bg-primary px-4",
              "text-sm font-medium text-primary-foreground",
              "hover:bg-primary/90 transition-colors",
              "disabled:pointer-events-none disabled:opacity-50",
            )}
          >
            {createClip.isPending ? "Saving..." : "Save Clip"}
          </button>
        </div>
      </div>
    </div>
  );
}
