"use client";

import { api } from "@/trpc/react";
import type { Photo } from "@eslee/payload";
import Image from "next/image";
import { useState } from "react";
import { PhotoModal } from "./photo-modal";

function getImageUrl(url?: string | null) {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  const baseUrl =
    process.env.NODE_ENV === "development" ? "http://localhost:3002" : "https://cms.eslee.io";
  return `${baseUrl}${url}`;
}

export function PhotoGallery() {
  const [photos] = api.photos.getAll.useSuspenseQuery();
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

  if (!photos || photos.length === 0) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-black font-mono text-xs text-gray-500 uppercase tracking-widest">
        {"// No Signal Detected"}
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-px bg-gray-200 dark:bg-neutral-800 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {photos.map((photo) => (
          <PhotoCard key={photo.id} photo={photo} onClick={() => setSelectedPhoto(photo)} />
        ))}
      </div>

      {selectedPhoto && <PhotoModal photo={selectedPhoto} onClose={() => setSelectedPhoto(null)} />}
    </>
  );
}

function PhotoCard({ photo, onClick }: { photo: Photo; onClick: () => void }) {
  const [isHovered, setIsHovered] = useState(false);
  const { title, url, sizes, settings, captureDate } = photo;

  const imageUrl = getImageUrl(sizes?.card?.url || url);
  const width = sizes?.card?.width || photo.width || 800;
  const height = sizes?.card?.height || photo.height || 600;

  return (
    <button
      type="button"
      className="group relative aspect-[4/5] w-full bg-white dark:bg-neutral-900 overflow-hidden text-left focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      <Image
        src={imageUrl}
        alt={title || "Photo"}
        width={width}
        height={height}
        className="h-full w-full object-cover transition-all duration-700 ease-out group-hover:scale-105 group-hover:grayscale-0 grayscale-[0.2]"
      />

      <div
        className={`absolute inset-0 flex flex-col justify-between bg-white/90 dark:bg-black/90 p-6 transition-opacity duration-200 ${
          isHovered ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="flex justify-between items-start border-b border-gray-200 dark:border-gray-800 pb-2">
          <h3 className="font-mono text-sm font-bold text-black dark:text-white uppercase tracking-tight">
            {title || "UNTITLED"}
          </h3>
          <span className="font-mono text-[10px] text-gray-500 dark:text-gray-400">
            {String(photo.id).slice(0, 8)}
          </span>
        </div>

        <div className="space-y-4">
          {captureDate && (
            <div className="font-mono text-xs text-gray-600 dark:text-gray-300">
              <span className="text-gray-400 dark:text-gray-600 block text-[10px] uppercase mb-1">
                Date
              </span>
              {new Date(captureDate)
                .toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                })
                .split("/")
                .join(".")}
            </div>
          )}

          {settings && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 font-mono text-[10px] text-gray-600 dark:text-gray-300">
              {settings.cameraModel && (
                <div className="col-span-2">
                  <span className="text-gray-400 dark:text-gray-600 mr-1">CAM</span>
                  {settings.cameraModel}
                </div>
              )}
              {settings.lens && (
                <div className="col-span-2">
                  <span className="text-gray-400 dark:text-gray-600 mr-1">LENS</span>
                  {settings.lens}
                </div>
              )}
              {settings.fStop && (
                <div>
                  <span className="text-gray-400 dark:text-gray-600 mr-1">AP</span>
                  f/{settings.fStop}
                </div>
              )}
              {settings.shutterSpeed && (
                <div>
                  <span className="text-gray-400 dark:text-gray-600 mr-1">SS</span>
                  {settings.shutterSpeed}
                </div>
              )}
              {settings.iso && (
                <div>
                  <span className="text-gray-400 dark:text-gray-600 mr-1">ISO</span>
                  {settings.iso}
                </div>
              )}
              {settings.focalLength && (
                <div>
                  <span className="text-gray-400 dark:text-gray-600 mr-1">FL</span>
                  {settings.focalLength}mm
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
