"use client";

import { FileText, Loader2, Plus, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn, getClipPreview } from "@/lib/utils";
import { api } from "@/trpc/react";

export function ClipsDesktopView() {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const { data, isLoading } = api.clip.getAll.useQuery(search ? { search } : undefined);

  const deleteClip = api.clip.delete.useMutation({
    onSuccess: () => {
      // Refetch clips after deletion
      void utils.clip.getAll.invalidate();
    },
  });

  const createClip = api.clip.create.useMutation({
    onSuccess: (clip) => {
      if (clip) {
        router.push(`/clips/${clip.id}`);
      }
    },
  });

  const utils = api.useUtils();

  const handleCreateClip = () => {
    createClip.mutate({
      title: "Untitled Clip",
      content: { type: "doc", content: [{ type: "paragraph" }] },
      sourceLanguage: "ja",
    });
  };

  return (
    <div className="hidden min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 md:flex lg:p-6 lg:pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-2xl tracking-tight">Clips</h1>
          <p className="text-muted-foreground text-sm">Your saved Japanese text clips</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleCreateClip} disabled={createClip.isPending}>
            {createClip.isPending ? (
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
          onChange={(e) => setSearch(e.target.value)}
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
          <Button className="mt-4" onClick={handleCreateClip} disabled={createClip.isPending}>
            {createClip.isPending ? (
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
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (confirm("Delete this clip?")) {
                      deleteClip.mutate({ id: clip.id });
                    }
                  }}
                  className="-mt-1.5 -mr-1.5 rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
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
                  {new Date(clip.createdAt).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
