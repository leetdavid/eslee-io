"use client";

import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { FileText, Loader2, Plus, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ClipsPage() {
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clips</h1>
          <p className="text-sm text-muted-foreground">Your saved Japanese text clips</p>
        </div>
        <button
          type="button"
          onClick={handleCreateClip}
          disabled={createClip.isPending}
          className={cn(
            "inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 py-2",
            "text-sm font-medium text-primary-foreground",
            "hover:bg-primary/90 transition-colors disabled:opacity-50",
          )}
        >
          {createClip.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          New Clip
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search clips..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-4 py-2 text-sm",
            "placeholder:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
        />
      </div>

      {/* Clips Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {["s1", "s2", "s3", "s4", "s5", "s6"].map((key) => (
            <div key={key} className="h-40 rounded-lg border border-border bg-card animate-pulse" />
          ))}
        </div>
      ) : data?.items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileText className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-medium">No clips yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first clip to start learning Japanese
          </p>
          <button
            type="button"
            onClick={handleCreateClip}
            disabled={createClip.isPending}
            className={cn(
              "mt-4 inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 py-2",
              "text-sm font-medium text-primary-foreground",
              "hover:bg-primary/90 transition-colors disabled:opacity-50",
            )}
          >
            {createClip.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            New Clip
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data?.items.map((clip) => (
            <Link
              key={clip.id}
              href={`/clips/${clip.id}`}
              className="group relative rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/50 hover:bg-accent/50"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h3 className="font-medium leading-none">{clip.title ?? "Untitled"}</h3>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
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
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              {clip.jlptLevel && (
                <span className="mt-2 inline-block rounded-full bg-secondary px-2 py-0.5 text-xs font-medium">
                  {clip.jlptLevel}
                </span>
              )}
              {clip.tags && clip.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {clip.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="rounded-full bg-muted px-2 py-0.5 text-xs">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <p className="mt-3 text-xs text-muted-foreground">
                {new Date(clip.createdAt).toLocaleDateString()}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
