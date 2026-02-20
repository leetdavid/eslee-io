"use client";

import { Editor } from "@/components/editor/editor";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import type { JSONContent } from "@tiptap/react";
import { ArrowLeft, GraduationCap, Pencil, Save } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function ClipDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clipId = params.id as string;

  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState<JSONContent | undefined>();
  const [editedTitle, setEditedTitle] = useState("");
  const initializedRef = useRef(false);

  const utils = api.useUtils();

  const { data: clip, isLoading } = api.clip.getById.useQuery({ id: clipId });

  useEffect(() => {
    if (clip && !initializedRef.current) {
      initializedRef.current = true;
      setEditedTitle(clip.title);
      setEditedContent(clip.content as JSONContent);
    }
  }, [clip]);

  const updateClip = api.clip.update.useMutation({
    onSuccess: () => {
      setIsEditing(false);
      void utils.clip.getById.invalidate({ id: clipId });
    },
  });

  const handleSave = () => {
    updateClip.mutate({
      id: clipId,
      title: editedTitle,
      content: editedContent,
    });
  };

  if (isLoading) {
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
        <Link href="/clips" className="mt-4 text-sm text-primary underline">
          Back to clips
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/clips"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-input bg-background transition-colors hover:bg-accent"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          {isEditing ? (
            <input
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              className="text-2xl font-bold tracking-tight bg-transparent border-b border-input focus:outline-none focus:border-primary"
            />
          ) : (
            <h1 className="text-2xl font-bold tracking-tight">{clip.title}</h1>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="inline-flex h-9 items-center rounded-md border border-input bg-background px-3 text-sm hover:bg-accent"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={updateClip.isPending}
                className={cn(
                  "inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3",
                  "text-sm font-medium text-primary-foreground hover:bg-primary/90",
                  "disabled:opacity-50",
                )}
              >
                <Save className="h-4 w-4" />
                {updateClip.isPending ? "Saving..." : "Save"}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="inline-flex h-9 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm hover:bg-accent"
              >
                <Pencil className="h-4 w-4" />
                Edit
              </button>
              <Link
                href={`/clips/${clipId}/study`}
                className={cn(
                  "inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3",
                  "text-sm font-medium text-primary-foreground hover:bg-primary/90",
                )}
              >
                <GraduationCap className="h-4 w-4" />
                Study
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Metadata */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span className="uppercase">{clip.sourceLanguage}</span>
        {clip.targetLanguage && (
          <>
            <span>→</span>
            <span className="uppercase">{clip.targetLanguage}</span>
          </>
        )}
        {clip.jlptLevel && (
          <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium">
            {clip.jlptLevel}
          </span>
        )}
        <span>{new Date(clip.createdAt).toLocaleDateString()}</span>
      </div>

      {/* Editor */}
      <Editor
        content={isEditing ? editedContent : (clip.content as JSONContent)}
        onChange={isEditing ? setEditedContent : undefined}
        editable={isEditing}
      />
    </div>
  );
}
