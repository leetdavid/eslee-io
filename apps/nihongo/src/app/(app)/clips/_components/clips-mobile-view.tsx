"use client";

import type { JSONContent } from "@tiptap/react";
import { Edit3, Loader2, Minus, Plus, Trash2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
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
import { useCreateClip } from "@/hooks/use-create-clip";
import type { RouterOutputs } from "@/trpc/react";

type ClipsData = RouterOutputs["clip"]["getAll"];

interface ClipsMobileViewProps {
  data?: ClipsData;
  isLoading: boolean;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}

function ClipsMobileViewInner({ data, isLoading, onDelete, isDeleting }: ClipsMobileViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [textScale, setTextScale] = useState(1);
  const { handleCreateClip, isPending } = useCreateClip();
  const containerRef = useRef<HTMLDivElement>(null);
  const hasScrolledToInitial = useRef(false);

  const handleZoomIn = () => setTextScale((s) => Math.min(Number((s + 0.1).toFixed(2)), 3));
  const handleZoomOut = () => setTextScale((s) => Math.max(Number((s - 0.1).toFixed(2)), 0.5));

  useEffect(() => {
    if (!hasScrolledToInitial.current && data?.items && data.items.length > 0) {
      const initialClipId = searchParams.get("clipId");
      if (initialClipId) {
        const activeElement = document.getElementById(`clip-${initialClipId}`);
        if (activeElement) {
          activeElement.scrollIntoView({ behavior: "auto", inline: "center" });
        }
      }
      hasScrolledToInitial.current = true;
    }
  }, [data, searchParams]);

  useEffect(() => {
    if (!containerRef.current || !data?.items) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const clipId = entry.target.getAttribute("data-clip-id");
            if (clipId) {
              const currentParams = new URLSearchParams(window.location.search);
              if (currentParams.get("clipId") !== clipId) {
                currentParams.set("clipId", clipId);
                const newUrl = `${pathname}?${currentParams.toString()}`;
                window.history.replaceState(null, "", newUrl);
              }
            }
          }
        });
      },
      {
        root: containerRef.current,
        threshold: 0.6,
      },
    );

    const clipElements = containerRef.current.querySelectorAll("[data-clip-id]");
    clipElements.forEach((el) => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, [data, pathname]);

  return (
    <div
      ref={containerRef}
      className="relative flex h-full min-h-0 w-full flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden text-foreground md:hidden"
    >
      <button
        type="button"
        onClick={handleCreateClip}
        disabled={isPending}
        className="fixed right-6 bottom-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95 disabled:opacity-50"
      >
        {isPending ? <Loader2 className="h-6 w-6 animate-spin" /> : <Plus className="h-6 w-6" />}
      </button>

      {isLoading ? (
        <div className="flex h-full w-full shrink-0 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : data?.items.length === 0 ? (
        <div className="flex h-full w-full shrink-0 snap-center flex-col items-center justify-center space-y-4">
          <p className="font-medium text-lg">No clips yet</p>
          <p className="text-muted-foreground text-sm">
            Tap the + button to create your first clip.
          </p>
        </div>
      ) : (
        data?.items.map((clip) => (
          <div
            key={clip.id}
            id={`clip-${clip.id}`}
            data-clip-id={clip.id}
            className="flex h-full w-full shrink-0 snap-center flex-col items-center justify-center p-2 sm:p-4"
          >
            <div className="relative flex h-full w-full flex-col overflow-hidden rounded-3xl border bg-card py-6 shadow-xl">
              <div className="mb-4 flex shrink-0 items-center justify-between px-6">
                <h2 className="font-bold text-xl">{clip.title || "Untitled"}</h2>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => router.push(`/clips/${clip.id}`)}
                    className="rounded-full bg-accent p-2 transition-colors hover:bg-accent/80"
                  >
                    <Edit3 className="h-4 w-4 text-accent-foreground" />
                  </button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button
                        type="button"
                        className="rounded-full bg-destructive/10 p-2 transition-colors hover:bg-destructive/20"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </button>
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
                          onClick={() => onDelete(clip.id)}
                          disabled={isDeleting}
                        >
                          {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>

              <div className="relative min-h-0 flex-1">
                <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-8 bg-linear-to-b from-card to-transparent" />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-8 bg-linear-to-t from-card to-transparent" />

                <div className="scrollbar-hide h-full overflow-y-auto py-6">
                  <div className="my-auto transition-all duration-200">
                    <Editor
                      content={clip.content as JSONContent}
                      onChange={() => {}}
                      editable={false}
                      textScale={textScale * 1.5}
                      className="border-none bg-transparent p-0!"
                      editorClassName="tiptap prose dark:prose-invert max-w-none focus:outline-none prose-p:my-2 prose-headings:mb-2 prose-headings:mt-4 prose-li:my-0 leading-loose text-[length:var(--editor-font-size)]"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4 flex shrink-0 items-center justify-center gap-6 border-t pt-4">
                <button
                  type="button"
                  onClick={handleZoomOut}
                  disabled={textScale <= 0.5}
                  className="rounded-full bg-accent p-3 transition-colors hover:bg-accent/80 disabled:opacity-50"
                  aria-label="Decrease text size"
                >
                  <Minus className="h-5 w-5 text-accent-foreground" />
                </button>
                <span className="w-16 text-center font-medium text-muted-foreground">
                  {Math.round(textScale * 100)}%
                </span>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  disabled={textScale >= 3}
                  className="rounded-full bg-accent p-3 transition-colors hover:bg-accent/80 disabled:opacity-50"
                  aria-label="Increase text size"
                >
                  <Plus className="h-5 w-5 text-accent-foreground" />
                </button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export function ClipsMobileView(props: ClipsMobileViewProps) {
  return (
    <Suspense
      fallback={
        <div className="flex h-full w-full shrink-0 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <ClipsMobileViewInner {...props} />
    </Suspense>
  );
}
