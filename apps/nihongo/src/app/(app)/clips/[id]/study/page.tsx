"use client";

import { api } from "@/trpc/react";
import { ArrowLeft, Check, ChevronRight, GraduationCap, RotateCcw, X } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export default function ClipStudyPage() {
  const params = useParams();
  const clipId = params.id as string;

  const { data: clip, isLoading: isClipLoading } = api.clip.getById.useQuery({ id: clipId });

  // We'll use the specific getDueCards query but pass a clipId filter if we had one.
  // Wait, study.getDueCards doesn't support clipId. Let's add it to the router or create a new endpoint!
  // For now, let's pretend we have api.study.getDueCardsForClip. We'll need to create it!
  const { data: dueCards, refetch: refetchCards } = api.study.getDueCardsForClip.useQuery({
    clipId,
    limit: 1,
  });
  const submitReview = api.study.submitReview.useMutation({
    onSuccess: () => {
      void refetchCards();
    },
  });

  const [showAnswer, setShowAnswer] = useState(false);
  const currentCard = dueCards?.[0];

  const handleGrade = useCallback(
    (quality: number) => {
      if (!currentCard) return;
      submitReview.mutate({
        vocabularyId: currentCard.vocabularyId,
        quality,
      });
      setShowAnswer(false);
    },
    [currentCard, submitReview],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }

      if (!currentCard) return;

      if (!showAnswer) {
        if (e.code === "Space" || e.code === "Enter") {
          e.preventDefault();
          setShowAnswer(true);
        }
      } else {
        switch (e.key) {
          case "1":
            e.preventDefault();
            handleGrade(0);
            break;
          case "2":
            e.preventDefault();
            handleGrade(3);
            break;
          case "3":
            e.preventDefault();
            handleGrade(4);
            break;
          case "4":
            e.preventDefault();
            handleGrade(5);
            break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentCard, showAnswer, handleGrade]);

  if (isClipLoading) {
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
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href={`/clips/${clipId}`}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-input bg-background transition-colors hover:bg-accent"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Study: {clip.title ?? "Untitled"}</h1>
          <p className="text-sm text-muted-foreground">Review vocabulary from this clip</p>
        </div>
      </div>

      {currentCard ? (
        <div className="mx-auto max-w-lg space-y-4">
          <button
            type="button"
            className="min-h-[250px] w-full rounded-xl border-2 bg-card p-8 flex flex-col items-center justify-center cursor-pointer transition-all hover:border-primary/50"
            onClick={() => setShowAnswer(true)}
          >
            <p className="text-4xl font-bold">{currentCard.vocabulary?.word}</p>

            {showAnswer && (
              <div className="mt-6 space-y-2 text-center animate-in fade-in">
                {currentCard.vocabulary?.reading && (
                  <p className="text-xl text-muted-foreground">{currentCard.vocabulary.reading}</p>
                )}
                <p className="text-lg">{currentCard.vocabulary?.meaning}</p>
                {currentCard.vocabulary?.jlptLevel && (
                  <span className="inline-block mt-2 rounded-full bg-secondary px-3 py-1 text-xs font-medium">
                    {currentCard.vocabulary.jlptLevel}
                  </span>
                )}
              </div>
            )}

            {!showAnswer && (
              <p className="mt-4 text-sm text-muted-foreground">
                Click or press Space to reveal answer
              </p>
            )}
          </button>

          {showAnswer && (
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={() => handleGrade(0)}
                className="group flex h-14 w-24 flex-col items-center justify-center rounded-lg border border-destructive/50 bg-destructive/10 text-sm font-medium text-destructive hover:bg-destructive/20 relative"
              >
                <X className="h-4 w-4 mb-1" />
                Again
                <span className="absolute bottom-1 right-2 text-[10px] opacity-50 font-mono">
                  1
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleGrade(3)}
                className="group flex h-14 w-24 flex-col items-center justify-center rounded-lg border border-yellow-500/50 bg-yellow-500/10 text-sm font-medium text-yellow-600 dark:text-yellow-400 hover:bg-yellow-500/20 relative"
              >
                <RotateCcw className="h-4 w-4 mb-1" />
                Hard
                <span className="absolute bottom-1 right-2 text-[10px] opacity-50 font-mono">
                  2
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleGrade(4)}
                className="group flex h-14 w-24 flex-col items-center justify-center rounded-lg border border-primary/50 bg-primary/10 text-sm font-medium text-primary hover:bg-primary/20 relative"
              >
                <Check className="h-4 w-4 mb-1" />
                Good
                <span className="absolute bottom-1 right-2 text-[10px] opacity-50 font-mono">
                  3
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleGrade(5)}
                className="group flex h-14 w-24 flex-col items-center justify-center rounded-lg border border-emerald-500/50 bg-emerald-500/10 text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 relative"
              >
                <ChevronRight className="h-4 w-4 mb-1" />
                Easy
                <span className="absolute bottom-1 right-2 text-[10px] opacity-50 font-mono">
                  4
                </span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <GraduationCap className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-medium">No cards due for this clip</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            You've studied all the vocabulary in this clip for now.
          </p>
        </div>
      )}
    </div>
  );
}
