"use client";
import type { Photo } from "@eslee/payload";
import { ChevronDown, ChevronUp } from "lucide-react";
import Image from "next/image";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { getImageUrl } from "@/lib/cms-utils";
import { cn } from "@/lib/utils";

interface PhotoDetailViewProps {
  photo: Photo;
}

const backgroundColors = [
  {
    name: "Black",
    value: "bg-black",
    text: "text-white",
    border: "border-white/20",
    gradient: "bg-linear-to-t from-black/80 via-black/40 to-transparent",
  },
  {
    name: "White",
    value: "bg-white",
    text: "text-black",
    border: "border-black/20",
    gradient: "bg-linear-to-t from-white/80 via-white/40 to-transparent",
  },
  {
    name: "Grey",
    value: "bg-neutral-800",
    text: "text-white",
    border: "border-white/20",
    gradient: "bg-linear-to-t from-neutral-800/80 via-neutral-800/40 to-transparent",
  },
  {
    name: "Beige",
    value: "bg-[#e5e5e0]",
    text: "text-black",
    border: "border-black/20",
    gradient: "bg-linear-to-t from-[#e5e5e0]/80 via-[#e5e5e0]/40 to-transparent",
  },
];

export function PhotoDetailView({ photo }: PhotoDetailViewProps) {
  const { theme } = useTheme();
  const [activeColor, setActiveColor] = useState(() => {
    // Initialize state based on theme to avoid flicker
    return theme === "light" ? backgroundColors[1] : backgroundColors[0];
  });
  const [showInfo, setShowInfo] = useState(true);

  // Update background when theme changes
  useEffect(() => {
    if (theme === "light") {
      setActiveColor(backgroundColors[1]); // White
    } else if (theme === "dark") {
      setActiveColor(backgroundColors[0]); // Black
    }
  }, [theme]);

  if (!activeColor) return null;

  const { title, url, settings, captureDate } = photo;

  const imageUrl = getImageUrl(url);

  return (
    <div
      className={cn(
        "relative flex h-full w-full flex-col items-center justify-center transition-colors duration-500",
        activeColor.value,
      )}
    >
      {/* Image Container */}
      <div className="relative flex h-full w-full items-center justify-center p-0 md:p-8">
        <Image
          src={imageUrl}
          alt={title || "Photo"}
          fill
          className="object-contain p-4 md:p-8"
          priority
          quality={95}
          sizes="100vw"
        />
      </div>

      {/* Gradient Scrim - only visible when info is shown */}
      {showInfo && (
        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 bottom-0 h-2/5",
            "transition-opacity duration-500",
            "fade-in animate-in duration-500",
            activeColor.gradient,
          )}
        />
      )}

      {/* Controls & Info */}
      <div
        className={cn(
          "absolute bottom-6 left-6 z-10 max-w-md md:bottom-10 md:left-10",
          activeColor.text,
        )}
      >
        {/* Color Toggles */}
        <div className="mb-6 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowInfo(!showInfo)}
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-full transition-all hover:bg-current/10",
              !showInfo && "opacity-50",
            )}
            title={showInfo ? "Collapse Info" : "Expand Info"}
          >
            {showInfo ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
          <div className="mx-1 h-4 w-px bg-current opacity-20" />
          {backgroundColors.map((color) => (
            <button
              key={color.name}
              type="button"
              onClick={() => setActiveColor(color)}
              className={cn(
                "h-5 w-5 rounded-full border transition-all hover:scale-110 focus:outline-hidden focus:ring-2 focus:ring-offset-2",
                color.value,
                color.border,
                activeColor.name === color.name
                  ? "scale-110 ring-2 ring-current ring-offset-2"
                  : "opacity-60 hover:opacity-100",
              )}
              title={`Set background to ${color.name}`}
              style={{
                borderColor:
                  activeColor.text === "text-white" ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)",
              }}
            />
          ))}
        </div>

        {/* EXIF Data */}
        {showInfo && (
          <div className="fade-in slide-in-from-bottom-4 animate-in space-y-3 duration-500">
            <div>
              <h1 className="font-bold font-mono text-lg uppercase tracking-tight md:text-xl">
                {title || "Untitled"}
              </h1>
              {captureDate && (
                <p className="mt-1 font-mono text-[10px] uppercase opacity-60">
                  {new Date(captureDate).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              )}
            </div>

            {settings && (
              <div className="grid grid-cols-2 gap-x-8 gap-y-1 border-current/20 border-t pt-3 font-mono text-xs opacity-80">
                {settings.cameraModel && <div className="col-span-2">{settings.cameraModel}</div>}
                {settings.lens && <div className="col-span-2 opacity-80">{settings.lens}</div>}

                <div className="col-span-2 mt-2 flex flex-wrap gap-x-4 gap-y-1 opacity-90">
                  {settings.fStop && <span>f/{settings.fStop}</span>}
                  {settings.shutterSpeed && <span>{settings.shutterSpeed}</span>}
                  {settings.iso && <span>ISO {settings.iso}</span>}
                  {settings.focalLength && <span>{settings.focalLength}mm</span>}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
