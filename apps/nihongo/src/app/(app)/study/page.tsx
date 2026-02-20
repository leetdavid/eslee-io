"use client";

import { api } from "@/trpc/react";
import { Check, ChevronRight, GraduationCap, RotateCcw, X } from "lucide-react";
import { useState } from "react";

export default function StudyPage() {
  const { data: stats } = api.study.getStats.useQuery();
  const { data: dueCards, refetch: refetchCards } = api.study.getDueCards.useQuery({ limit: 1 });
  const submitReview = api.study.submitReview.useMutation({
    onSuccess: () => {
      void refetchCards();
      void utils.study.getStats.invalidate();
    },
  });

  const utils = api.useUtils();
  const [showAnswer, setShowAnswer] = useState(false);

  const currentCard = dueCards?.[0];

  const handleGrade = (quality: number) => {
    if (!currentCard) return;
    submitReview.mutate({
      vocabularyId: currentCard.vocabularyId,
      quality,
    });
    setShowAnswer(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Study</h1>
        <p className="text-sm text-muted-foreground">Review vocabulary with spaced repetition</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Cards</p>
          <p className="mt-1 text-2xl font-bold">{stats?.totalCards ?? 0}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Due Today</p>
          <p className="mt-1 text-2xl font-bold text-primary">{stats?.dueCount ?? 0}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Reviews</p>
          <p className="mt-1 text-2xl font-bold">{stats?.totalReviews ?? 0}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Accuracy</p>
          <p className="mt-1 text-2xl font-bold">
            {stats?.accuracy ? `${Math.round(stats.accuracy)}%` : "—"}
          </p>
        </div>
      </div>

      {/* Flashcard */}
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
              <p className="mt-4 text-sm text-muted-foreground">Click to reveal answer</p>
            )}
          </button>

          {showAnswer && (
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={() => handleGrade(0)}
                className="flex h-12 w-24 flex-col items-center justify-center rounded-lg border border-destructive/50 bg-destructive/10 text-sm font-medium text-destructive hover:bg-destructive/20"
              >
                <X className="h-4 w-4" />
                Again
              </button>
              <button
                type="button"
                onClick={() => handleGrade(3)}
                className="flex h-12 w-24 flex-col items-center justify-center rounded-lg border border-yellow-500/50 bg-yellow-500/10 text-sm font-medium text-yellow-600 dark:text-yellow-400 hover:bg-yellow-500/20"
              >
                <RotateCcw className="h-4 w-4" />
                Hard
              </button>
              <button
                type="button"
                onClick={() => handleGrade(4)}
                className="flex h-12 w-24 flex-col items-center justify-center rounded-lg border border-primary/50 bg-primary/10 text-sm font-medium text-primary hover:bg-primary/20"
              >
                <Check className="h-4 w-4" />
                Good
              </button>
              <button
                type="button"
                onClick={() => handleGrade(5)}
                className="flex h-12 w-24 flex-col items-center justify-center rounded-lg border border-emerald-500/50 bg-emerald-500/10 text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
              >
                <ChevronRight className="h-4 w-4" />
                Easy
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <GraduationCap className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-medium">No cards due</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {stats?.totalCards === 0
              ? "Add vocabulary from clips to start studying"
              : "Great job! Come back later for more reviews."}
          </p>
        </div>
      )}
    </div>
  );
}
