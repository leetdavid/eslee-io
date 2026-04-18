"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "eslee.lunch.spots.v1";

export type LunchSpot = {
  name: string;
  url?: string;
};

export type LunchPreset = {
  title: string;
  spots: LunchSpot[];
};

export const mapsUrl = (query: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

export const DEFAULT_SPOTS: LunchSpot[] = [
  { name: "Maison Libanaise", url: mapsUrl("Maison Libanaise") },
  { name: "BaseHall", url: mapsUrl("BaseHall") },
  { name: "Kyung Yang Katsu", url: mapsUrl("Kyung Yang Katsu") },
  {
    name: "Unremarkable Korean Place (Jeonpo Meat Shop)",
    url: mapsUrl("Jeonpo Meat Shop"),
  },
  { name: "Samsic", url: mapsUrl("Samsic") },
  { name: "Blue Supreme", url: mapsUrl("Blue Supreme") },
  { name: "La Parrilla", url: mapsUrl("La Parrilla") },
  { name: "Morty's", url: mapsUrl("Morty's") },
  { name: "IFC (Shake Shack)", url: mapsUrl("Shake Shack IFC") },
  { name: "BRKLYN Pizza", url: mapsUrl("BRKLYN Pizza") },
  { name: "The Globe", url: mapsUrl("The Globe") },
  { name: "Jus", url: mapsUrl("Jus") },
  { name: "Samsen", url: mapsUrl("Samsen") },
  { name: "Here Thai", url: mapsUrl("Here Thai") },
  { name: "Korean" },
  { name: "Brunch" },
  { name: "Ramen" },
  { name: "Pizza" },
  { name: "Burger" },
  { name: "Sushi" },
  { name: "Sandwich" },
];

export const RECOMMENDED_PRESETS: LunchPreset[] = [
  { title: "Today's Lunch", spots: DEFAULT_SPOTS },
  {
    title: "Dessert",
    spots: [
      { name: "Ice Cream" },
      { name: "Bakery" },
      { name: "Café" },
      { name: "Patisserie" },
      { name: "Gelato" },
      { name: "Bingsu" },
    ],
  },
  {
    title: "4:30pm Snack",
    spots: [
      { name: "Bakehouse", url: mapsUrl("Bakehouse Staunton") },
      { name: "Amo·Ago", url: mapsUrl("Amo·Ago") },
      { name: "Vission Bakery", url: mapsUrl("Vission Bakery") },
      { name: "Frenchies", url: mapsUrl("Frenchies") },
      { name: "Coffee Shop" },
      { name:"Boba" },
      { name: "Convenience Store" },
      { name: "Snack Bar" },
      { name: "Fruit Stand" },
      { name: "Chips" },
    ],
  },
];

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
