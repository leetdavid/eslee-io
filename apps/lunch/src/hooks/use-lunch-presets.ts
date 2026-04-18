"use client";

import { useCallback, useEffect, useState } from "react";
import { type LunchPreset, normalizeLunchSpots } from "@/hooks/use-lunch-spots";

const PRESETS_KEY = "eslee.lunch.presets.v1";

function normalizePresets(raw: unknown): LunchPreset[] {
  if (!Array.isArray(raw)) return [];
  const out: LunchPreset[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const title = (entry as Record<string, unknown>).title;
    if (typeof title !== "string" || !title.trim()) continue;
    const spots = normalizeLunchSpots((entry as Record<string, unknown>).spots);
    if (!spots || spots.length === 0) continue;
    out.push({ title: title.trim(), spots });
  }
  return out;
}

export function useLunchPresets() {
  const [presets, setPresets] = useState<LunchPreset[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PRESETS_KEY);
      if (raw) setPresets(normalizePresets(JSON.parse(raw)));
    } catch {
      // ignore malformed storage
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
    } catch {
      // storage unavailable — silently drop
    }
  }, [presets, hydrated]);

  const savePreset = useCallback((title: string, spots: LunchPreset["spots"]) => {
    const clean = title.trim();
    if (!clean) return;
    setPresets((prev) => {
      const idx = prev.findIndex((p) => p.title === clean);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { title: clean, spots };
        return next;
      }
      return [...prev, { title: clean, spots }];
    });
  }, []);

  const deletePreset = useCallback((title: string) => {
    setPresets((prev) => prev.filter((p) => p.title !== title));
  }, []);

  return { presets, savePreset, deletePreset, hydrated };
}
