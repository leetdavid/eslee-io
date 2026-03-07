"use client";

import { Editor } from "@/components/editor/editor";
import { buttonVariants } from "@/components/ui/button";
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { api } from "@/trpc/react";
import type { JSONContent } from "@tiptap/react";
import { ArrowLeft, Languages, Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export default function ClipsReaderPage() {
  // Use a high limit to get a good amount of clips for swiping.
  // In a real app, you might want to implement infinite scrolling with the carousel,
  // but for now, fetching a decent batch is sufficient.
  const { data, isLoading } = api.clip.getAll.useQuery({ limit: 100 });

  const clips = useMemo(() => data?.items ?? [], [data]);

  const [apiCarousel, setApiCarousel] = useState<CarouselApi>();

  // Arrow key navigation
  useEffect(() => {
    if (!apiCarousel) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Only use left/right for carousel navigation
      // Let up/down function normally for scrolling content
      if (e.key === "ArrowRight") {
        e.preventDefault();
        apiCarousel.scrollNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        apiCarousel.scrollPrev();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [apiCarousel]);

  // Native text selection for reader mode translation
  const [selectedText, setSelectedText] = useState("");
  const [debouncedText, setDebouncedText] = useState("");
  const [translation, setTranslation] = useState<string | null>(null);

  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (selection && !selection.isCollapsed) {
        const text = selection.toString().trim();
        if (text) {
          setSelectedText(text);
        } else {
          setSelectedText("");
          setTranslation(null);
        }
      } else {
        setSelectedText("");
        setTranslation(null);
      }
    };
    document.addEventListener("selectionchange", handleSelectionChange);
    return () => document.removeEventListener("selectionchange", handleSelectionChange);
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedText(selectedText);
    }, 750); // 750ms debounce
    return () => clearTimeout(timeout);
  }, [selectedText]);

  const { mutate, isPending } = api.ai.translate.useMutation({
    onSuccess: (data) => {
      setTranslation(data.translation);
    },
  });

  useEffect(() => {
    if (debouncedText && !translation) {
      mutate({ text: debouncedText, targetLanguage: "en" });
    }
  }, [debouncedText, mutate, translation]);

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-12rem)] items-center justify-center flex-col gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading your clips...</p>
      </div>
    );
  }

  if (clips.length === 0) {
    return (
      <div className="flex h-[calc(100vh-12rem)] flex-col items-center justify-center gap-4 text-center">
        <p className="text-muted-foreground">No clips found to read.</p>
        <Link href="/clips" className={buttonVariants({ variant: "default" })}>
          Go back to Clips
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex items-center gap-4 mb-6 shrink-0">
        <Link href="/clips" className={buttonVariants({ variant: "outline", size: "icon" })}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clip Reader</h1>
          <p className="text-sm text-muted-foreground">Swipe to read through your clips</p>
        </div>
      </div>

      <div className="flex-1 min-h-0 pb-6 flex items-center justify-center">
        <Carousel
          setApi={setApiCarousel}
          opts={{
            align: "center",
            watchDrag: false,
          }}
          className="w-full max-w-3xl"
        >
          <CarouselContent>
            {clips.map((clip) => (
              <CarouselItem key={clip.id} className="md:basis-full h-full">
                <div className="p-1 h-full">
                  <div className="flex flex-col h-[calc(100vh-14rem)] md:h-[calc(100vh-16rem)] rounded-xl border bg-card p-6 md:p-10 shadow-sm overflow-hidden">
                    <div className="mb-6 shrink-0">
                      <h2 className="text-2xl md:text-3xl font-bold truncate">
                        {clip.title ?? "Untitled"}
                      </h2>
                      <div className="flex gap-2 text-sm text-muted-foreground mt-2">
                        {clip.sourceLanguage && (
                          <span className="uppercase">{clip.sourceLanguage}</span>
                        )}
                        {clip.jlptLevel && (
                          <span className="rounded-full bg-secondary/50 px-2 py-0.5 text-xs text-secondary-foreground">
                            {clip.jlptLevel}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-4 -mr-4 mt-4">
                      {/* 
                        Use custom large prose classes to make text bigger for reading 
                        Also remove the extra padding/border usually added by the Editor component itself.
                      */}
                      <Editor
                        content={clip.content as JSONContent}
                        editable={false}
                        className="border-0 bg-transparent p-0"
                        editorClassName="tiptap prose dark:prose-invert max-w-none focus:outline-none [&_p]:text-2xl md:[&_p]:text-3xl lg:[&_p]:text-4xl [&_p]:leading-[2.2] [&_li]:text-2xl md:[&_li]:text-3xl lg:[&_li]:text-4xl [&_li]:leading-[2.2] [&_blockquote]:text-2xl md:[&_blockquote]:text-3xl lg:[&_blockquote]:text-4xl [&_h1]:text-4xl md:[&_h1]:text-5xl lg:[&_h1]:text-6xl [&_h2]:text-3xl md:[&_h2]:text-4xl lg:[&_h2]:text-5xl [&_h3]:text-2xl md:[&_h3]:text-3xl lg:[&_h3]:text-4xl"
                      />
                    </div>
                  </div>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <div className="hidden md:block">
            <CarouselPrevious />
            <CarouselNext />
          </div>
        </Carousel>
      </div>

      {/* Translation Panel */}
      {selectedText.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-popover text-popover-foreground shadow-xl border rounded-xl p-4 z-50 animate-in slide-in-from-bottom-5">
          <div className="flex items-center gap-2 border-b pb-2 text-xs font-medium text-muted-foreground mb-3">
            <Languages className="h-4 w-4" />
            Translation
          </div>
          <div className="text-sm max-h-[30vh] overflow-y-auto">
            {isPending && !translation ? (
              <div className="flex items-center gap-2 text-muted-foreground py-1">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Translating...</span>
              </div>
            ) : translation ? (
              <p className="leading-relaxed">{translation}</p>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
