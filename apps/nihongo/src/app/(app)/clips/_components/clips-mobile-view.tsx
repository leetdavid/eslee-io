"use client";

import type { JSONContent } from "@tiptap/react";
import { Edit3, Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { Editor } from "@/components/editor/editor";
import { api } from "@/trpc/react";

export function ClipsMobileView() {
  const router = useRouter();
  const { data, isLoading } = api.clip.getAll.useQuery();

  const createClip = api.clip.create.useMutation({
    onSuccess: (clip) => {
      if (clip) {
        router.push(`/clips/${clip.id}`);
      }
    },
  });

  const handleCreateClip = () => {
    createClip.mutate({
      title: "Untitled Clip",
      content: { type: "doc", content: [{ type: "paragraph" }] },
      sourceLanguage: "ja",
    });
  };

  return (
    <div className="relative flex h-full min-h-0 w-full flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden text-foreground md:hidden">
      <button
        type="button"
        onClick={handleCreateClip}
        disabled={createClip.isPending}
        className="fixed right-6 bottom-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95 disabled:opacity-50"
      >
        {createClip.isPending ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : (
          <Plus className="h-6 w-6" />
        )}
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
            className="flex h-full w-full shrink-0 snap-center flex-col items-center justify-center p-4"
          >
            <div className="relative flex h-full w-full flex-col overflow-hidden rounded-3xl border bg-card p-6 shadow-xl">
              <div className="mb-4 flex shrink-0 items-center justify-between">
                <h2 className="font-bold text-xl">{clip.title || "Untitled"}</h2>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => router.push(`/clips/${clip.id}`)}
                    className="rounded-full bg-accent p-2 transition-colors hover:bg-accent/80"
                  >
                    <Edit3 className="h-4 w-4 text-accent-foreground" />
                  </button>
                </div>
              </div>

              <div className="scrollbar-hide min-h-0 flex-1 overflow-y-auto pr-2 text-2xl leading-relaxed">
                <Editor
                  content={clip.content as JSONContent}
                  onChange={() => {}}
                  editable={false}
                  className="!p-0 border-none bg-transparent"
                  editorClassName="tiptap prose prose-sm dark:prose-invert lg:prose-xl max-w-none focus:outline-none"
                />
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
