"use client";

import { formatDistanceToNow } from "date-fns";
import { FileText, Loader2, Plus, Search, Trash2 } from "lucide-react";
import Link from "next/link";
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
import { useCreateClip } from "@/hooks/use-create-clip";
import { cn, getClipPreview } from "@/lib/utils";
import type { RouterOutputs } from "@/trpc/react";

type ClipsData = RouterOutputs["clip"]["getAll"];

interface ClipsDesktopViewProps {
  data?: ClipsData;
  isLoading: boolean;
  search: string;
  onSearchChange: (search: string) => void;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}

export function ClipsDesktopView({
  data,
  isLoading,
  search,
  onSearchChange,
  onDelete,
  isDeleting,
}: ClipsDesktopViewProps) {
  const { handleCreateClip, isPending } = useCreateClip();

  return (
    <div className="hidden min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 md:flex lg:p-6 lg:pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-2xl tracking-tight">Clips</h1>
          <p className="text-muted-foreground text-sm">Your saved Japanese text clips</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleCreateClip} disabled={isPending}>
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            New Clip
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search clips..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background py-2 pr-4 pl-10 text-sm",
            "placeholder:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
        />
      </div>

      {/* Clips Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {["s1", "s2", "s3", "s4", "s5", "s6"].map((key) => (
            <div key={key} className="h-40 animate-pulse rounded-xl border border-border bg-card" />
          ))}
        </div>
      ) : data?.items.length === 0 ? (
        <div className="mt-4 flex flex-1 flex-col items-center justify-center rounded-xl border-2 border-dashed py-16 text-center">
          <FileText className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 font-medium text-lg">No clips yet</h3>
          <p className="mt-1 text-muted-foreground text-sm">
            Create your first clip to start learning Japanese
          </p>
          <Button className="mt-4" onClick={handleCreateClip} disabled={isPending}>
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            New Clip
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {data?.items.map((clip) => (
            <Link
              key={clip.id}
              href={`/clips/${clip.id}`}
              className="group relative flex min-h-[160px] flex-col justify-between rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/50 hover:bg-accent/50"
            >
              <div className="mb-3 flex items-start justify-between">
                <div className="space-y-1">
                  <h3 className="font-semibold leading-none">{clip.title ?? "Untitled"}</h3>
                  <div className="flex items-center gap-2 pt-1.5 font-medium text-muted-foreground text-xs">
                    <span className="uppercase">{clip.sourceLanguage}</span>
                    {clip.targetLanguage && (
                      <>
                        <span>→</span>
                        <span className="uppercase">{clip.targetLanguage}</span>
                      </>
                    )}
                  </div>
                </div>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                      }}
                      className="-mt-1.5 -mr-1.5 rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Clip</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete this clip? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={(e) => e.preventDefault()}>
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={(e) => {
                          e.preventDefault();
                          onDelete(clip.id);
                        }}
                        disabled={isDeleting}
                      >
                        {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>

              <p className="mb-4 line-clamp-3 flex-1 text-muted-foreground text-sm leading-relaxed">
                {getClipPreview(clip.content, 150) || (
                  <span className="italic opacity-50">No content</span>
                )}
              </p>

              <div className="mt-auto flex items-end justify-between">
                <div className="flex flex-col items-start gap-2">
                  {clip.jlptLevel && (
                    <span className="inline-block rounded-full bg-secondary/80 px-2 py-0.5 font-medium text-[11px] text-secondary-foreground">
                      {clip.jlptLevel}
                    </span>
                  )}
                  {clip.tags && clip.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {clip.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="rounded-full bg-muted px-2 py-0.5 text-[10px]">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <p className="ml-4 shrink-0 font-medium text-[11px] text-muted-foreground">
                  {formatDistanceToNow(new Date(clip.createdAt), { addSuffix: true })}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
