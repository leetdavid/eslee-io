"use client";

import { useCallback, useEffect, useState } from "react";
import { DEFAULT_SPOTS, type LunchPreset, type LunchSpot, mapsUrl } from "@/data/presets";

export type { LunchSpot, LunchPreset };
export { mapsUrl, DEFAULT_SPOTS };

const STORAGE_KEY = "eslee.lunch.spots.v1";

export function normalizeLunchSpots(raw: unknown): LunchSpot[] | null {
  if (!Array.isArray(raw)) return null;
  const out: LunchSpot[] = [];
  for (const entry of raw) {
    if (typeof entry === "string") {
      out.push({ name: entry });
    } else if (
      entry &&
      typeof entry === "object" &&
      typeof (entry as LunchSpot).name === "string"
    ) {
      const name = (entry as LunchSpot).name;
      const url = (entry as LunchSpot).url;
      out.push({
        name,
        ...(typeof url === "string" && url ? { url } : {}),
      });
    }
  }
  return out;
}

export function useLunchSpots() {
  const [spots, setSpots] = useState<LunchSpot[]>(DEFAULT_SPOTS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = normalizeLunchSpots(JSON.parse(raw));
        if (parsed) setSpots(parsed);
      }
    } catch {
      // ignore malformed storage
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(spots));
    } catch {
      // storage unavailable — silently drop
    }
  }, [spots, hydrated]);

  const addSpot = useCallback((name: string, url?: string) => {
    const cleanName = name.trim();
    if (!cleanName) return;
    const cleanUrl = url?.trim();
    setSpots((prev) => {
      if (prev.some((s) => s.name === cleanName)) return prev;
      return [...prev, { name: cleanName, ...(cleanUrl ? { url: cleanUrl } : {}) }];
    });
  }, []);

  const removeSpot = useCallback((name: string) => {
    setSpots((prev) => prev.filter((s) => s.name !== name));
  }, []);

  const resetSpots = useCallback(() => {
    setSpots(DEFAULT_SPOTS);
  }, []);

  const loadSpots = useCallback((incoming: LunchSpot[]) => {
    const normalized = normalizeLunchSpots(incoming);
    if (normalized) setSpots(normalized);
  }, []);

  return { spots, addSpot, removeSpot, resetSpots, loadSpots, hydrated };
}
