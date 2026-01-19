"use client";

import { PhotoCard } from "@/components/photo-card";
import { api } from "@/trpc/react";
import type { Photo } from "@eslee/payload";

export function getImageUrl(url?: string | null) {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  // In development, point to the CMS running on port 3002
  // In production, point to the CMS domain
  const baseUrl =
    process.env.NODE_ENV === "development" ? "http://localhost:3002" : "https://cms.eslee.io";
  return `${baseUrl}${url}`;
}

export function PhotoGallery({ initialPhotos }: { initialPhotos: Photo[] }) {
  const { data: photos } = api.photos.getAll.useQuery(undefined, {
    initialData: initialPhotos,
  });

  if (!photos || photos.length === 0) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-black font-mono text-xs text-gray-500 uppercase tracking-widest">
        {"// No Signal Detected"}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-px bg-gray-200 dark:bg-neutral-800 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {photos.map((photo) => (
        <PhotoCard key={photo.id} photo={photo} />
      ))}
    </div>
  );
}
