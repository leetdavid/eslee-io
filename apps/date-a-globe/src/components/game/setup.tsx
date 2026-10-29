"use client";

import Link from "next/link";
import { useState } from "react";
import { Brand } from "@/components/brand";
import { ArrowIcon, GlobeIcon, PartMapIcon, WorldMapIcon } from "@/components/icons";
import type { Region, Setup } from "@/engine";
import map from "@/lib/regions-map.json";

const SHORT: Record<string, string> = {
  "North America": "N. AMERICA",
  "South America": "S. AMERICA",
  Europe: "EUROPE",
  "Middle East": "MIDDLE EAST",
  Africa: "AFRICA",
  Asia: "ASIA",
  Oceania: "OCEANIA",
};
const CHIPS: Region[] = [
  "Europe",
  "Middle East",
  "Africa",
  "Asia",
  "North America",
  "South America",
  "Oceania",
];

/** Before we start: what kind of map, and for part of the world, which regions it shows. */
export function SetupScreen({ onStart }: { onStart: (setup: Setup) => void }) {
  const [kind, setKind] = useState<Setup["kind"]>("globe");
  const [regions, setRegions] = useState<Region[]>([]);
  const toggle = (r: Region) =>
    setRegions((rs) => (rs.includes(r) ? rs.filter((x) => x !== r) : [...rs, r]));
  const ready = kind !== "part" || regions.length > 0;

  return (
    <main className="app">
      <header className="flex h-[74px] items-center justify-between pt-3">
        <Brand />
        <button
          type="button"
          className="text-[13px] text-muted underline underline-offset-[3px]"
          onClick={() => onStart({ kind: "globe", regions: [] })}
        >
          Skip
        </button>
      </header>
      <h1 className="mt-2 font-semibold text-[28px] tracking-[-0.03em]">Before we start</h1>
      <p className="mt-1 text-[14px] text-muted leading-[1.4]">
        Two quick answers so we only ask about things you can see.
      </p>

      <h2 className="eyebrow mt-6 mb-2">What are you dating?</h2>
      <div className="choice">
        {(
          [
            ["globe", "A globe", <GlobeIcon key="g" />],
            ["world", "A world map", <WorldMapIcon key="w" />],
            ["part", "Part of the world", <PartMapIcon key="p" />],
          ] as const
        ).map(([k, label, icon]) => (
          <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)}>
            {icon}
            {label}
          </button>
        ))}
      </div>

      {kind === "part" && (
        <>
          <div className="eyebrow mt-6 mb-2 flex justify-between">
            <span>Which parts does it show?</span>
            {regions.length > 0 && <span className="text-red">{regions.length} picked</span>}
          </div>
          <p className="mb-2 text-[12.5px] text-muted">
            Tap the regions on your map, or tap the chips.
          </p>
          <fieldset className="panel p-1">
            <legend className="sr-only">World regions</legend>
            <svg className="regionmap block w-full" viewBox={`0 0 ${map.width} ${map.height}`}>
              <title>World regions</title>
              <path d={map.sphere} fill="#F7F6F2" stroke="#161513" strokeOpacity=".18" />
              <path d={map.graticule} fill="none" stroke="#161513" strokeOpacity=".07" />
              {map.regions.map((r) => {
                const on = regions.includes(r.name as Region);
                return (
                  // biome-ignore lint/a11y/useSemanticElements: an SVG shape can't be a button element; the chips below are buttons too
                  <path
                    key={r.name}
                    className="region"
                    d={r.d}
                    role="button"
                    tabIndex={0}
                    aria-pressed={on}
                    aria-label={r.name}
                    fill={on ? "#F2BDB5" : "#DAD6CC"}
                    stroke={on ? "#D7382F" : "#F7F6F2"}
                    strokeWidth={on ? 0.7 : 0.6}
                    onClick={() => toggle(r.name as Region)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggle(r.name as Region);
                      }
                    }}
                  />
                );
              })}
              {map.regions.map((r) => {
                const on = regions.includes(r.name as Region);
                const [x = 0, y = 0] = r.label;
                return (
                  <text
                    key={`t${r.name}`}
                    x={x}
                    y={y + 3}
                    textAnchor="middle"
                    fontSize="8.5"
                    fontWeight={on ? 700 : 600}
                    letterSpacing=".9"
                    fill={on ? "#8E1F14" : "#6E6A62"}
                    paintOrder="stroke"
                    stroke={on ? "#fff" : "#DAD6CC"}
                    strokeWidth="2.5"
                    pointerEvents="none"
                  >
                    {SHORT[r.name]}
                  </text>
                );
              })}
            </svg>
          </fieldset>
          <div className="chips">
            {CHIPS.map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={regions.includes(r)}
                onClick={() => toggle(r)}
              >
                {regions.includes(r) && (
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                    <path
                      d="M2.5 6.5l2.2 2.2L9.5 3.5"
                      stroke="#fff"
                      strokeWidth="1.9"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
                {r}
              </button>
            ))}
          </div>
          <p className="tile mt-4 text-[12.5px] text-muted leading-[1.42]">
            <b className="font-semibold text-ink">Only part of a region on your map?</b> Pick it
            anyway. If a question asks about something off the edge, tap Can&apos;t see it and
            we&apos;ll stop asking about that area.
          </p>
        </>
      )}

      <div className="mt-auto flex flex-col gap-3 pt-6">
        <button
          type="button"
          className="cta"
          disabled={!ready}
          onClick={() => onStart({ kind, regions: kind === "part" ? regions : [] })}
        >
          <span>Start dating</span>
          <i>
            <ArrowIcon />
          </i>
        </button>
        <Link
          href="/"
          className="text-center text-[13px] text-muted underline underline-offset-[3px]"
        >
          Back to the start
        </Link>
      </div>
    </main>
  );
}
