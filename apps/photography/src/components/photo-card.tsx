"use client";
import type { Photo } from "@eslee/payload";
import Image from "next/image";
import { useState } from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { getImageUrl } from "@/lib/cms-utils";
import { PhotoDetailView } from "./photo-detail-view";

export function PhotoCard({ photo }: { photo: Photo }) {
  const [isHovered, setIsHovered] = useState(false);
  const { title, url, sizes, settings, captureDate } = photo;

  const imageUrl = getImageUrl(sizes?.card?.url || url);
  const width = sizes?.card?.width || photo.width || 800;
  const height = sizes?.card?.height || photo.height || 600;

  return (
    <Dialog>
      <DialogTrigger>
        {/** biome-ignore lint/a11y/noStaticElementInteractions: i dont want to change it */}
        <div
          className="group relative aspect-4/5 w-full overflow-hidden bg-white dark:bg-neutral-900"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <Image
            src={imageUrl}
            alt={title || "Photo"}
            width={width}
            height={height}
            className="h-full w-full object-cover grayscale-[0.2] transition-all duration-700 ease-out group-hover:scale-105 group-hover:grayscale-0"
          />

          <div
            className={`absolute inset-0 flex flex-col justify-between bg-white/90 p-6 transition-opacity duration-200 dark:bg-black/90 ${isHovered ? "opacity-100" : "opacity-0"}`}
          >
            <div className="flex items-start justify-between border-gray-200 border-b pb-2 dark:border-gray-800">
              <h3 className="font-bold font-mono text-black text-sm uppercase tracking-tight dark:text-white">
                {title || "UNTITLED"}
              </h3>
              <span className="font-mono text-[10px] text-gray-500 dark:text-gray-400">
                {String(photo.id).slice(0, 8)}
              </span>
            </div>

            <div className="space-y-4">
              {captureDate && (
                <div className="font-mono text-gray-600 text-xs dark:text-gray-300">
                  <span className="mb-1 block text-[10px] text-gray-400 uppercase dark:text-gray-600">
                    Date
                  </span>
                  {new Date(captureDate).toISOString().substring(0, 10).split("-").join(".")}
                </div>
              )}

              {settings && (
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 font-mono text-[10px] text-gray-600 dark:text-gray-300">
                  {settings.cameraModel && (
                    <div className="col-span-2">
                      <span className="mr-1 text-gray-400 dark:text-gray-600">CAM</span>
                      {settings.cameraModel}
                    </div>
                  )}
                  {settings.lens && (
                    <div className="col-span-2">
                      <span className="mr-1 text-gray-400 dark:text-gray-600">LENS</span>
                      {settings.lens}
                    </div>
                  )}
                  {settings.fStop && (
                    <div>
                      <span className="mr-1 text-gray-400 dark:text-gray-600">AP</span>
                      f/{settings.fStop}
                    </div>
                  )}
                  {settings.shutterSpeed && (
                    <div>
                      <span className="mr-1 text-gray-400 dark:text-gray-600">SS</span>
                      {settings.shutterSpeed}
                    </div>
                  )}
                  {settings.iso && (
                    <div>
                      <span className="mr-1 text-gray-400 dark:text-gray-600">ISO</span>
                      {settings.iso}
                    </div>
                  )}
                  {settings.focalLength && (
                    <div>
                      <span className="mr-1 text-gray-400 dark:text-gray-600">FL</span>
                      {settings.focalLength}mm
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogTrigger>
      <DialogContent className="h-full w-full max-w-none overflow-hidden rounded-none border-none bg-black p-0 focus:outline-hidden md:h-[90%] md:w-[90%]">
        <PhotoDetailView photo={photo} />
      </DialogContent>
    </Dialog>
  );
}
