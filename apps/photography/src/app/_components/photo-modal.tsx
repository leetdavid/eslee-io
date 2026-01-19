"use client";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { Photo } from "@eslee/payload";
import Image from "next/image";
import { useState } from "react";

function getImageUrl(url?: string | null) {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  const baseUrl =
    process.env.NODE_ENV === "development" ? "http://localhost:3002" : "https://cms.eslee.io";
  return `${baseUrl}${url}`;
}

const BACKGROUNDS = [
  { name: "Black", class: "bg-black", text: "text-white" },
  { name: "Dark Grey", class: "bg-neutral-900", text: "text-white" },
  { name: "Grey", class: "bg-neutral-500", text: "text-black" },
  { name: "Light Grey", class: "bg-neutral-200", text: "text-black" },
  { name: "White", class: "bg-white", text: "text-black" },
  { name: "Beige", class: "bg-[#e5e5e0]", text: "text-black" },
] as const;

export function PhotoModal({ photo, onClose }: { photo: Photo; onClose: () => void }) {
  const [bgIndex, setBgIndex] = useState(0); // Default to Black
  const activeBg = BACKGROUNDS[bgIndex] ?? BACKGROUNDS[0];

  const imageUrl = getImageUrl(photo.url);
  const { title, settings, captureDate } = photo;

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={`max-w-[100vw] w-screen h-screen p-0 border-0 sm:rounded-none bg-transparent shadow-none ${activeBg.class} transition-colors duration-300 gap-0 block overflow-hidden [&>button]:hidden outline-none`}
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">Viewing {title || "Untitled"}</DialogTitle>
        <DialogDescription className="sr-only">Photo detail view</DialogDescription>

        <div className={`flex flex-col h-full w-full ${activeBg.text}`}>
          {/* Header / Controls */}
          <div className="flex items-center justify-between p-6 z-10 relative">
            <div className="font-mono text-xs uppercase tracking-widest opacity-50">
              Viewing: {title || "Untitled"}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="group flex items-center gap-2 font-mono text-xs uppercase tracking-widest hover:opacity-50 transition-opacity"
            >
              <span>Close</span>
              <span className="block h-4 w-4 border border-current flex items-center justify-center">
                ×
              </span>
            </button>
          </div>

          {/* Main Image Area */}
          <div className="relative flex-1 flex items-center justify-center p-4 md:p-12 overflow-hidden">
            <div className="relative h-full w-full">
              <Image
                src={imageUrl}
                alt={title || "Photo"}
                fill
                className="object-contain"
                sizes="100vw"
                priority
              />
            </div>
          </div>

          {/* Footer / Info / Toggles */}
          <div className="p-6 z-10 relative">
            <div className="flex flex-col md:flex-row items-end md:items-center justify-between gap-6">
              {/* EXIF Data */}
              <div className="font-mono text-[10px] md:text-xs opacity-60 space-y-1">
                {captureDate && (
                  <div>
                    DATE: {new Date(captureDate).toLocaleDateString("en-US").split("/").join(".")}
                  </div>
                )}
                {settings && (
                  <div className="flex flex-wrap gap-x-4">
                    {settings.cameraModel && <span>CAM: {settings.cameraModel}</span>}
                    {settings.lens && <span>LENS: {settings.lens}</span>}
                    {settings.iso && <span>ISO: {settings.iso}</span>}
                    {settings.fStop && <span>AP: f/{settings.fStop}</span>}
                    {settings.shutterSpeed && <span>SS: {settings.shutterSpeed}</span>}
                  </div>
                )}
              </div>

              {/* Background Toggles */}
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] opacity-40 uppercase mr-2">Display</span>
                {BACKGROUNDS.map((bg, index) => (
                  <button
                    key={bg.name}
                    type="button"
                    onClick={() => setBgIndex(index)}
                    className={`h-6 w-6 border ${activeBg.text === "text-white" ? "border-white/20" : "border-black/20"} ${bg.class} relative group transition-transform active:scale-95`}
                    title={bg.name}
                  >
                    {bgIndex === index && (
                      <span
                        className={`absolute inset-0 m-auto h-1.5 w-1.5 rounded-full ${bg.text === "text-white" ? "bg-white" : "bg-black"}`}
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
