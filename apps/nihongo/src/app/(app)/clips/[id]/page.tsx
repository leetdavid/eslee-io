"use client";

import type { JSONContent } from "@tiptap/react";
import { ArrowLeft, Loader2, Save, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Editor } from "@/components/editor/editor";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { JLPT_LEVELS, type JLPTLevel, LANGUAGES } from "@/lib/constants";
import { api } from "@/trpc/react";

export default function ClipDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clipId = params.id as string;

  const [editedContent, setEditedContent] = useState<JSONContent | undefined>();
  const [editedTitle, setEditedTitle] = useState("");
  const [sourceLanguage, setSourceLanguage] = useState<"ja" | "en" | "ko">("ja");
  const [targetLanguage, setTargetLanguage] = useState<"ja" | "en" | "ko" | "">("");
  const [jlptLevel, setJlptLevel] = useState<string>("");

  const [isDirty, setIsDirty] = useState(false);

  const utils = api.useUtils();

  const { data: clip, isLoading } = api.clip.getById.useQuery({ id: clipId });

  // Save on unmount if dirty
  const isDirtyRef = useRef(isDirty);

  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

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
      isDirtyRef.current = false;
      void utils.clip.getById.invalidate({ id: clipId });
      void utils.clip.getAll.invalidate();
    },
  });

  const deleteClip = api.clip.delete.useMutation({
    onSuccess: () => {
      toast.success("Clip deleted successfully");
      void utils.clip.getAll.invalidate();
      router.push("/clips");
    },
    onError: (error) => {
      toast.error(`Failed to delete clip: ${error.message}`);
    },
  });

  const handleSave = useCallback(() => {
    if (!editedContent) return;

    setIsDirty(false);
    isDirtyRef.current = false;

    updateClip.mutate({
      id: clipId,
      title: editedTitle || undefined,
      content: editedContent,
      sourceLanguage,
      targetLanguage: targetLanguage || null,
      jlptLevel: (jlptLevel as JLPTLevel) || null,
    });
  }, [clipId, editedTitle, editedContent, sourceLanguage, targetLanguage, jlptLevel, updateClip]);

  const handleSaveRef = useRef(handleSave);
  useEffect(() => {
    handleSaveRef.current = handleSave;
  }, [handleSave]);

  useEffect(() => {
    return () => {
      if (isDirtyRef.current) {
        handleSaveRef.current();
      }
    };
  }, []);

  // Auto-save on debounce
  useEffect(() => {
    if (!isDirty || !editedContent) return;

    const timeout = setTimeout(() => {
      handleSave();
    }, 500);

    return () => clearTimeout(timeout);
  }, [isDirty, editedContent, handleSave]);

  const markDirty = () => {
    setIsDirty(true);
  };

  // Loading State
  if (isLoading || editedContent === undefined) {
    return (
      <div className="space-y-4 p-4">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded-lg border bg-muted" />
      </div>
    );
  }

  // Clip not found
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
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden p-4">
      <div className="mx-auto flex h-full w-full max-w-5xl flex-1 flex-col gap-6 overflow-hidden">
        <div className="flex shrink-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 items-center gap-4">
            <button
              type="button"
              onClick={() => {
                if (isDirty) {
                  handleSave();
                }
                router.push("/clips");
              }}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-input bg-background transition-colors hover:bg-accent"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
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

            <div className="ml-2 h-4 w-px bg-border" />

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Clip</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this clip? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => deleteClip.mutate({ id: clipId })}
                    disabled={deleteClip.isPending}
                  >
                    {deleteClip.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Metadata & Config row */}
        <div className="flex shrink-0 flex-wrap items-center gap-3 rounded-lg border bg-card p-2 text-sm">
          <Select
            value={sourceLanguage}
            onValueChange={(value) => setSourceLanguage(value as typeof sourceLanguage)}
          >
            <SelectTrigger size="sm">
              <SelectValue placeholder="From..." />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>From Language</SelectLabel>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <span className="text-muted-foreground">→</span>
          <Select
            value={targetLanguage}
            onValueChange={(value) => setTargetLanguage(value as typeof targetLanguage)}
          >
            <SelectTrigger size="sm">
              <SelectValue placeholder="To..." />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>To Language</SelectLabel>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          <div className="mx-1 h-4 w-px bg-border" />

          <Select
            value={jlptLevel}
            onValueChange={(value) => setJlptLevel(value as typeof jlptLevel)}
          >
            <SelectTrigger size="sm">
              <SelectValue placeholder="JLPT Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>JLPT Level</SelectLabel>
                {JLPT_LEVELS.map((level) => (
                  <SelectItem key={level} value={level}>
                    {level}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        {/* Editor */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border bg-card transition-shadow">
          <Editor
            content={editedContent}
            onChange={(content) => {
              setEditedContent(content);
              markDirty();
            }}
            editable={true}
            className="border-none"
          />
        </div>
      </div>
    </div>
  );
}
