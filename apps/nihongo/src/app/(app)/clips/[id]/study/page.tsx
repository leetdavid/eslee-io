"use client";

import { api } from "@/trpc/react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function ClipStudyPage() {
  const params = useParams();
  const clipId = params.id as string;

  const { data: clip, isLoading } = api.clip.getById.useQuery({ id: clipId });

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
          <h1 className="text-2xl font-bold tracking-tight">Study: {clip.title}</h1>
          <p className="text-sm text-muted-foreground">Review the vocabulary from this clip</p>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-8 text-center">
        <p className="text-lg text-muted-foreground">
          Study mode for individual clips is coming soon.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Head to the{" "}
          <Link href="/study" className="text-primary underline">
            Study page
          </Link>{" "}
          to review all your vocabulary with spaced repetition.
        </p>
      </div>
    </div>
  );
}
