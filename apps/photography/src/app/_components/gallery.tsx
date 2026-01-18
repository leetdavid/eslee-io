"use client";

import { api } from "@/trpc/react";
import Image from "next/image";
import { useState } from "react";

function getImageUrl(url?: string | null) {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  // In development, point to the CMS running on port 3002
  // In production, point to the CMS domain
  const baseUrl =
    process.env.NODE_ENV === "development" ? "http://localhost:3002" : "https://cms.eslee.io";
  return `${baseUrl}${url}`;
}

export function PhotoGallery() {
  const [photos] = api.photos.getAll.useSuspenseQuery();

  if (!photos || photos.length === 0) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-white/60">
        No photos found. Upload some in the CMS!
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
      {photos.map((photo) => (
        <PhotoCard key={photo.id} photo={photo} />
      ))}
    </div>
  );
}

import type { Photo } from "@eslee/payload";

function PhotoCard({ photo }: { photo: Photo }) {
  const [isHovered, setIsHovered] = useState(false);
  const { title, url, sizes, settings, captureDate } = photo;

  // Prefer the 'card' size, fallback to original
  const imageUrl = getImageUrl(sizes?.card?.url || url);
  const width = sizes?.card?.width || photo.width || 800;
  const height = sizes?.card?.height || photo.height || 600;

  return (
    <div
      className="group relative overflow-hidden rounded-lg bg-black/20"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="aspect-[3/4] w-full">
        <Image
          src={imageUrl}
          alt={title || "Photo"}
          width={width}
          height={height}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>

      <div
        className={`absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6 transition-opacity duration-300 ${isHovered ? "opacity-100" : "opacity-0 md:opacity-0"}`}
      >
        <h3 className="text-xl font-bold text-white">{title}</h3>
        {captureDate && (
          <p className="text-sm text-gray-300">
            {new Date(captureDate).toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        )}

        {settings && (
          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-400">
            {settings.cameraModel && (
              <div className="col-span-2 flex items-center gap-1">
                <span className="font-semibold text-gray-300">Camera:</span> {settings.cameraModel}
              </div>
            )}
            {settings.lens && (
              <div className="col-span-2 flex items-center gap-1">
                <span className="font-semibold text-gray-300">Lens:</span> {settings.lens}
              </div>
            )}
            {settings.fStop && (
              <div>
                <span className="font-semibold text-gray-300">Ap:</span> f/{settings.fStop}
              </div>
            )}
            {settings.shutterSpeed && (
              <div>
                <span className="font-semibold text-gray-300">SS:</span> {settings.shutterSpeed}s
              </div>
            )}
            {settings.iso && (
              <div>
                <span className="font-semibold text-gray-300">ISO:</span> {settings.iso}
              </div>
            )}
            {settings.focalLength && (
              <div>
                <span className="font-semibold text-gray-300">FL:</span> {settings.focalLength}mm
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
