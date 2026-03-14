"use client";

import type { Photo } from "@eslee/payload";
import { PhotoCard } from "@/components/photo-card";
import { api } from "@/trpc/react";

export function PhotoGallery({ initialPhotos }: { initialPhotos: Photo[] }) {
  const { data: photos } = api.photos.getAll.useQuery(undefined, {
    initialData: initialPhotos,
  });

  if (!photos || photos.length === 0) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center border-gray-200 border-b bg-white font-mono text-gray-500 text-xs uppercase tracking-widest dark:border-gray-800 dark:bg-black">
        {"// No Signal Detected"}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-px bg-gray-200 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 dark:bg-neutral-800">
      {photos.map((photo) => (
        <PhotoCard key={photo.id} photo={photo} />
      ))}
    </div>
  );
}
