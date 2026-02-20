"use client";

import { useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { ArrowRight, BookOpen, Brain, FileText, GraduationCap, Plus, Sparkles } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const { data: session } = useSession();
  const { data: clipData } = api.clip.getAll.useQuery({ limit: 6 });
  const { data: vocabStats } = api.vocabulary.getStats.useQuery();
  const { data: studyStats } = api.study.getStats.useQuery();

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back, {session?.user?.name ?? "Learner"}
        </h1>
        <p className="text-sm text-muted-foreground">Continue your Japanese learning journey</p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/clips"
          className="group rounded-lg border bg-card p-4 transition-colors hover:border-primary/50"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-primary/10 p-2">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{clipData?.items.length ?? 0}</p>
              <p className="text-xs text-muted-foreground">Clips</p>
            </div>
          </div>
        </Link>

        <Link
          href="/vocabulary"
          className="group rounded-lg border bg-card p-4 transition-colors hover:border-primary/50"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-emerald-500/10 p-2">
              <BookOpen className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{vocabStats?.total ?? 0}</p>
              <p className="text-xs text-muted-foreground">Vocabulary</p>
            </div>
          </div>
        </Link>

        <Link
          href="/study"
          className="group rounded-lg border bg-card p-4 transition-colors hover:border-primary/50"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-amber-500/10 p-2">
              <GraduationCap className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">{studyStats?.dueCount ?? 0}</p>
              <p className="text-xs text-muted-foreground">Reviews Due</p>
            </div>
          </div>
        </Link>

        <Link
          href="/study"
          className="group rounded-lg border bg-card p-4 transition-colors hover:border-primary/50"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-violet-500/10 p-2">
              <Brain className="h-5 w-5 text-violet-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {studyStats?.accuracy ? `${Math.round(studyStats.accuracy)}%` : "—"}
              </p>
              <p className="text-xs text-muted-foreground">Accuracy</p>
            </div>
          </div>
        </Link>
      </div>

      {/* JLPT Breakdown */}
      {vocabStats && vocabStats.total > 0 && (
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-medium">Vocabulary by JLPT Level</h2>
          <div className="mt-4 flex gap-2">
            {(["N5", "N4", "N3", "N2", "N1"] as const).map((level) => {
              const count = vocabStats[level];
              const pct = vocabStats.total > 0 ? (count / vocabStats.total) * 100 : 0;
              const colors: Record<string, string> = {
                N5: "bg-emerald-500",
                N4: "bg-sky-500",
                N3: "bg-amber-500",
                N2: "bg-orange-500",
                N1: "bg-rose-500",
              };
              return (
                <div key={level} className="flex-1">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium">{level}</span>
                    <span className="text-muted-foreground">{count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all", colors[level])}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Link
          href="/clips/new"
          className="flex items-center gap-3 rounded-lg border bg-card p-4 transition-colors hover:border-primary/50"
        >
          <Plus className="h-5 w-5 text-primary" />
          <div>
            <p className="font-medium">New Clip</p>
            <p className="text-xs text-muted-foreground">Create a Japanese text clip</p>
          </div>
          <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground" />
        </Link>

        <Link
          href="/study"
          className="flex items-center gap-3 rounded-lg border bg-card p-4 transition-colors hover:border-primary/50"
        >
          <GraduationCap className="h-5 w-5 text-amber-500" />
          <div>
            <p className="font-medium">Start Review</p>
            <p className="text-xs text-muted-foreground">
              {studyStats?.dueCount ? `${studyStats.dueCount} cards waiting` : "No cards due"}
            </p>
          </div>
          <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground" />
        </Link>

        <Link
          href="/ai"
          className="flex items-center gap-3 rounded-lg border bg-card p-4 transition-colors hover:border-primary/50"
        >
          <Sparkles className="h-5 w-5 text-violet-500" />
          <div>
            <p className="font-medium">AI Generate</p>
            <p className="text-xs text-muted-foreground">Create study materials with AI</p>
          </div>
          <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground" />
        </Link>
      </div>

      {/* Recent Clips */}
      {clipData?.items && clipData.items.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium">Recent Clips</h2>
            <Link href="/clips" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {clipData.items.map((clip) => (
              <Link
                key={clip.id}
                href={`/clips/${clip.id}`}
                className="rounded-lg border bg-card p-4 transition-colors hover:border-primary/50"
              >
                <h3 className="font-medium">{clip.title}</h3>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="uppercase">{clip.sourceLanguage}</span>
                  {clip.jlptLevel && (
                    <span className="rounded-full bg-secondary px-2 py-0.5 font-medium">
                      {clip.jlptLevel}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {new Date(clip.createdAt).toLocaleDateString()}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
