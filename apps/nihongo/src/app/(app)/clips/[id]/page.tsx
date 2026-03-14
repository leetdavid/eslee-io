"use client";

import type { JSONContent } from "@tiptap/react";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Editor } from "@/components/editor/editor";
import { JLPT_LEVELS, type JLPTLevel } from "@/lib/constants";
import { api } from "@/trpc/react";

export default function ClipDetailPage() {
  const params = useParams();
  // const router = useRouter();
  const clipId = params.id as string;

  const [editedContent, setEditedContent] = useState<JSONContent | undefined>();
  const [editedTitle, setEditedTitle] = useState("");
  const [sourceLanguage, setSourceLanguage] = useState<"ja" | "en" | "ko">("ja");
  const [targetLanguage, setTargetLanguage] = useState<"ja" | "en" | "ko" | "">("");
  const [jlptLevel, setJlptLevel] = useState<string>("");

  const [isDirty, setIsDirty] = useState(false);

  const utils = api.useUtils();

  const { data: clip, isLoading } = api.clip.getById.useQuery({ id: clipId });

  // When clip data loads for the first time, populate state.
  useEffect(() => {
    if (clip && editedContent === undefined && !isDirty) {
      setEditedTitle(clip.title ?? "");
      setEditedContent(clip.content as JSONContent);
      setSourceLanguage((clip.sourceLanguage as "ja" | "en" | "ko") || "ja");
      setTargetLanguage((clip.targetLanguage as "ja" | "en" | "ko" | "") ?? "");
      setJlptLevel(clip.jlptLevel ?? "");
    }
  }, [clip, editedContent, isDirty]);

  const updateClip = api.clip.update.useMutation({
    onSuccess: () => {
      setIsDirty(false);
      void utils.clip.getById.invalidate({ id: clipId });
      void utils.clip.getAll.invalidate();
    },
  });

  const handleSave = useCallback(() => {
    if (!editedContent) return;

    updateClip.mutate({
      id: clipId,
      title: editedTitle || undefined,
      content: editedContent,
      sourceLanguage,
      targetLanguage: targetLanguage || null,
      jlptLevel: (jlptLevel as JLPTLevel) || null,
    });
  }, [clipId, editedTitle, editedContent, sourceLanguage, targetLanguage, jlptLevel, updateClip]);

  // Auto-save on debounce
  useEffect(() => {
    if (!isDirty || !editedContent) return;

    const timeout = setTimeout(() => {
      handleSave();
    }, 1500);

    return () => clearTimeout(timeout);
  }, [isDirty, editedContent, handleSave]);

  const markDirty = () => {
    setIsDirty(true);
  };

  if (isLoading || editedContent === undefined) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded-lg border bg-muted" />
      </div>
    );
  }

  if (!clip) {
    return (
      <div className="flex flex-col items-center py-16">
        <p className="text-muted-foreground">Clip not found</p>
        <Link href="/clips" className="mt-4 text-primary text-sm underline">
          Back to clips
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-4">
          <Link
            href="/clips"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-input bg-background transition-colors hover:bg-accent"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <input
            type="text"
            placeholder="Untitled Clip"
            value={editedTitle}
            onChange={(e) => {
              setEditedTitle(e.target.value);
              markDirty();
            }}
            className="w-full bg-transparent px-0 font-bold text-2xl tracking-tight focus:outline-none focus:ring-0"
          />
        </div>
        <div className="flex items-center gap-2">
          {updateClip.isPending ? (
            <div className="inline-flex h-9 items-center gap-2 px-3 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </div>
          ) : isDirty ? (
            <div className="inline-flex h-9 items-center gap-2 px-3 text-muted-foreground text-sm">
              Unsaved changes
            </div>
          ) : (
            <div className="inline-flex h-9 items-center gap-2 px-3 text-muted-foreground text-sm">
              <Save className="h-4 w-4" />
              Saved
            </div>
          )}
        </div>
      </div>

      {/* Metadata & Config row */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-2 text-sm">
        <select
          value={sourceLanguage}
          onChange={(e) => {
            setSourceLanguage(e.target.value as "ja" | "en" | "ko");
            markDirty();
          }}
          className="h-8 rounded-md bg-transparent px-2 py-1 hover:bg-accent focus:outline-none"
        >
          <option value="ja">Japanese</option>
          <option value="en">English</option>
          <option value="ko">Korean</option>
        </select>
        <span className="text-muted-foreground">→</span>
        <select
          value={targetLanguage}
          onChange={(e) => {
            setTargetLanguage(e.target.value as "ja" | "en" | "ko" | "");
            markDirty();
          }}
          className="h-8 rounded-md bg-transparent px-2 py-1 hover:bg-accent focus:outline-none"
        >
          <option value="">None</option>
          <option value="ja">Japanese</option>
          <option value="en">English</option>
          <option value="ko">Korean</option>
        </select>

        <div className="mx-1 h-4 w-px bg-border" />

        <select
          value={jlptLevel}
          onChange={(e) => {
            setJlptLevel(e.target.value);
            markDirty();
          }}
          className="h-8 rounded-md bg-transparent px-2 py-1 font-medium text-secondary-foreground hover:bg-accent focus:outline-none"
        >
          <option value="">No JLPT</option>
          {JLPT_LEVELS.map((level) => (
            <option key={level} value={level}>
              {level}
            </option>
          ))}
        </select>
      </div>

      {/* Editor */}
      <div className="overflow-hidden rounded-lg border bg-card transition-shadow focus-within:ring-1 focus-within:ring-primary">
        <Editor
          content={editedContent}
          onChange={(content) => {
            setEditedContent(content);
            markDirty();
          }}
          editable={true}
        />
      </div>
    </div>
  );
}
