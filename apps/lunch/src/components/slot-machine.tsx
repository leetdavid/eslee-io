"use client";

import confetti from "canvas-confetti";
import { Download, ExternalLink, Github, RotateCcw, Upload, Utensils } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type LunchPreset, type LunchSpot, mapsUrl, RECOMMENDED_PRESETS } from "@/data/presets";
import { normalizeLunchSpots, useLunchSpots } from "@/hooks/use-lunch-spots";
import { cn } from "@/lib/utils";

const ITEM_HEIGHT = 88;
const VISIBLE_ROWS = 3;
const CENTER_ROW = 1;
const SPIN_DURATION_MS = 4200;
const MAX_LOOPS = 9;
const STRIP_MULTIPLIER = MAX_LOOPS + 3;

type StripSlot = LunchSpot & { slotKey: string };

const LEVER_HEIGHT = VISIBLE_ROWS * ITEM_HEIGHT;
const BALL_SIZE = 42;
const ROD_HEIGHT = LEVER_HEIGHT - 16;
const BRACKET_HEIGHT = 12;
const MAX_DRAG = Math.round(LEVER_HEIGHT * 0.5);
const PULL_THRESHOLD = Math.round(MAX_DRAG * 0.75);

function fireConfetti() {
  const colors = ["#d4a843", "#f2e8d0", "#c97b5a", "#e8c97a"];
  confetti({
    particleCount: 120,
    spread: 70,
    origin: { y: 0.4 },
    colors,
    startVelocity: 45,
    decay: 0.92,
    scalar: 0.9,
  });
  window.setTimeout(() => {
    confetti({ particleCount: 40, angle: 60, spread: 55, origin: { x: 0, y: 0.5 }, colors });
    confetti({ particleCount: 40, angle: 120, spread: 55, origin: { x: 1, y: 0.5 }, colors });
  }, 150);
}

function downloadPreset(preset: LunchPreset) {
  const blob = new Blob([JSON.stringify(preset, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${preset.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function SlotMachine() {
  const { spots, resetSpots, replaceSpots, hydrated } = useLunchSpots();
  const [activePresetTitle, setActivePresetTitle] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<LunchSpot | null>(null);
  const [winFlash, setWinFlash] = useState(false);
  const [animKey, setAnimKey] = useState(0);
  const timeoutRef = useRef<number | null>(null);
  const didInitRef = useRef(false);

  const strip = useMemo(() => {
    if (spots.length === 0) return [] as StripSlot[];
    const arr: StripSlot[] = [];
    for (let repeat = 0; repeat < STRIP_MULTIPLIER; repeat++) {
      spots.forEach((spot, spotIndex) => {
        arr.push({ ...spot, slotKey: `${repeat}-${spotIndex}` });
      });
    }
    return arr;
  }, [spots]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!hydrated || didInitRef.current || spots.length === 0) return;
    didInitRef.current = true;
    setIndex(Math.floor(Math.random() * spots.length));
  }, [hydrated, spots]);

  useEffect(() => {
    if (!spinning && spots.length > 0 && index >= spots.length) {
      setIndex(0);
      setWinner(null);
    }
  }, [spots, spinning, index]);

  const spin = useCallback(() => {
    if (spinning || spots.length < 2) return;

    const winnerIdx = Math.floor(Math.random() * spots.length);
    const loops = MAX_LOOPS - 2 + Math.floor(Math.random() * 3);
    const target = loops * spots.length + winnerIdx;

    setWinner(null);
    setSpinning(true);
    setIndex(target);

    timeoutRef.current = window.setTimeout(() => {
      const won = spots[winnerIdx] ?? null;
      setSpinning(false);
      setIndex(winnerIdx);
      setWinner(won);
      if (won) {
        setAnimKey((k) => k + 1);
        setWinFlash(true);
        fireConfetti();
        window.setTimeout(() => setWinFlash(false), 800);
      }
    }, SPIN_DURATION_MS);
  }, [spinning, spots]);

  const handleLoadPreset = useCallback(
    (preset: LunchPreset) => {
      replaceSpots(preset.spots);
      setActivePresetTitle(preset.title);
      setWinner(null);
      setIndex(0);
    },
    [replaceSpots],
  );

  const handleReplaceSpots = useCallback(
    (nextSpots: LunchSpot[]) => {
      replaceSpots(nextSpots);
      setActivePresetTitle(null);
      setWinner(null);
      setIndex(0);
    },
    [replaceSpots],
  );

  const handleResetSpots = useCallback(() => {
    resetSpots();
    setActivePresetTitle(null);
    setWinner(null);
    setIndex(0);
  }, [resetSpots]);

  const handleImportFile = useCallback(
    (preset: LunchPreset) => {
      replaceSpots(preset.spots);
      setActivePresetTitle(preset.title);
      setWinner(null);
      setIndex(0);
    },
    [replaceSpots],
  );

  const handleExportPreset = useCallback(() => {
    downloadPreset({ title: activePresetTitle ?? "my-options", spots });
  }, [activePresetTitle, spots]);

  const leverActive = !spinning && spots.length >= 2 && hydrated;

  return (
    <div className="w-full">
      <div className="mb-3 flex justify-end">
        <a
          href="https://github.com/leetdavid/eslee-io/blob/main/apps/lunch/src/data/presets.ts"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 font-mono text-[9px] text-muted uppercase tracking-[0.3em] opacity-60 transition-all hover:text-gold hover:opacity-100"
        >
          <Github className="h-2.5 w-2.5" />
          suggest a preset
        </a>
      </div>
      <PresetPicker
        presets={RECOMMENDED_PRESETS}
        activePresetTitle={activePresetTitle}
        disabled={spinning}
        onLoadPreset={handleLoadPreset}
      />
      <div
        className={cn(
          "cabinet relative overflow-hidden rounded-3xl border border-panel-edge p-5 md:p-8",
          winFlash && "cabinet-flash",
        )}
      >
        <div className="mb-6 flex items-center justify-center gap-3">
          <Utensils className="h-3.5 w-3.5 text-gold" strokeWidth={2.4} />
          <span className="font-mono text-[10px] text-gold uppercase tracking-[0.4em]">
            {activePresetTitle ?? "today\u2019s lunch"}
          </span>
          <Utensils className="h-3.5 w-3.5 text-gold" strokeWidth={2.4} />
        </div>

        <div className="flex items-stretch gap-3 md:gap-5">
          <div
            className="reel-glass reel-mask relative flex-1 overflow-hidden rounded-xl border-4 border-gold-deep"
            style={{ height: `${VISIBLE_ROWS * ITEM_HEIGHT}px` }}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 z-20 border-red border-y-2"
              style={{
                top: `${CENTER_ROW * ITEM_HEIGHT}px`,
                height: `${ITEM_HEIGHT}px`,
                background:
                  "linear-gradient(180deg, oklch(0.6 0.22 25 / 0.14), oklch(0.6 0.22 25 / 0.04))",
              }}
            />

            {spots.length === 0 ? (
              <div className="flex h-full items-center justify-center px-4 text-center font-display text-bg text-lg">
                add some spots to get started
              </div>
            ) : (
              <div
                className="relative z-10"
                style={{
                  transform: `translateY(${-(index - CENTER_ROW) * ITEM_HEIGHT}px)`,
                  transition: spinning
                    ? `transform ${SPIN_DURATION_MS}ms cubic-bezier(0.15, 0.85, 0.15, 1)`
                    : "transform 0s",
                  willChange: "transform",
                }}
              >
                {strip.map((spot) => (
                  <div
                    key={spot.slotKey}
                    className="flex items-center justify-center px-4 font-display text-2xl text-bg md:text-3xl"
                    style={{ height: `${ITEM_HEIGHT}px` }}
                  >
                    <span className="line-clamp-1 text-center">{spot.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DraggableLever onPull={spin} active={leverActive} spinning={spinning} />
        </div>

        <div className="mt-6 min-h-14 text-center">
          {winner ? (
            <div key={animKey}>
              <p
                className="font-mono text-[10px] text-gold uppercase tracking-[0.4em]"
                style={{ animation: "jackpot-pop 0.4s cubic-bezier(0.34,1.56,0.64,1) both" }}
              >
                jackpot
              </p>
              <p
                className="mt-1.5 font-display text-cream text-lg md:text-xl"
                style={{ animation: "winner-slide-up 0.35s ease-out 0.05s both" }}
              >
                go eat {winner.name}
              </p>
              <a
                href={winner.url ?? mapsUrl(winner.name)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 font-mono text-[10px] text-gold uppercase tracking-[0.35em] transition-opacity hover:opacity-70"
                style={{ animation: "winner-slide-up 0.35s ease-out 0.15s both" }}
              >
                <ExternalLink className="h-3 w-3" />
                open in maps
              </a>
            </div>
          ) : (
            <p className="font-mono text-[10px] text-muted uppercase tracking-[0.4em]">
              {spinning
                ? "spinning…"
                : spots.length < 2
                  ? "add at least two spots"
                  : "grab the lever and pull down"}
            </p>
          )}
        </div>
      </div>

      <SpotsManager
        spots={spots}
        onReplace={handleReplaceSpots}
        onReset={handleResetSpots}
        disabled={spinning}
        onExportPreset={handleExportPreset}
        onImportFile={handleImportFile}
      />
    </div>
  );
}

function DraggableLever({
  onPull,
  active,
  spinning,
}: {
  onPull: () => void;
  active: boolean;
  spinning: boolean;
}) {
  const [dragY, setDragY] = useState(0);
  const [grabbing, setGrabbing] = useState(false);
  const [primed, setPrimed] = useState(false);
  const startYRef = useRef(0);

  const release = useCallback(() => {
    setGrabbing(false);
    setDragY(0);
    setPrimed(false);
  }, []);

  const handleDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!active) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    startYRef.current = e.clientY;
    setGrabbing(true);
  };

  const handleMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!grabbing) return;
    const delta = Math.max(0, Math.min(MAX_DRAG, e.clientY - startYRef.current));
    setDragY(delta);
    setPrimed(delta >= PULL_THRESHOLD);
  };

  const handleUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!grabbing) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore capture errors
    }
    const committed = primed;
    release();
    if (committed) onPull();
  };

  const disabled = !active;
  const hint = spinning
    ? "spinning"
    : !active
      ? "—"
      : grabbing
        ? primed
          ? "release"
          : "keep pulling"
        : "pull down";

  return (
    <div className="flex w-14 flex-col items-center md:w-16">
      <div
        className="relative overflow-hidden rounded-md"
        style={{ height: `${LEVER_HEIGHT}px`, width: "48px" }}
      >
        <div
          onPointerDown={handleDown}
          onPointerMove={handleMove}
          onPointerUp={handleUp}
          onPointerCancel={handleUp}
          className={cn(
            "flex touch-none select-none flex-col items-center",
            disabled
              ? "cursor-not-allowed opacity-50"
              : grabbing
                ? "cursor-grabbing"
                : "cursor-grab",
          )}
          style={{
            transform: `translateY(${dragY}px)`,
            transition: grabbing
              ? "transform 0s"
              : "transform 0.55s cubic-bezier(0.34, 1.56, 0.64, 1)",
            willChange: "transform",
          }}
        >
          <div
            className={cn(
              "lever-ball rounded-full",
              "shadow-[0_8px_18px_oklch(0_0_0/0.6),inset_-3px_-4px_6px_oklch(0_0_0/0.45)]",
              "transition-shadow duration-150",
              primed &&
                "shadow-[0_0_20px_oklch(0.7_0.25_25/0.8),0_8px_18px_oklch(0_0_0/0.6),inset_-3px_-4px_6px_oklch(0_0_0/0.45)]",
            )}
            style={{ width: `${BALL_SIZE}px`, height: `${BALL_SIZE}px` }}
          />
          <div
            className="lever -mt-2 w-2.5 rounded-full shadow-[inset_-1px_0_0_oklch(0_0_0/0.5),inset_1px_0_0_oklch(1_0_0/0.12)]"
            style={{ height: `${ROD_HEIGHT}px` }}
          />
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-1 bottom-0 rounded-b-md bg-[oklch(0.2_0.01_30)] shadow-[inset_0_1px_0_oklch(1_0_0/0.08),inset_0_-1px_0_oklch(0_0_0/0.5)]"
          style={{ height: `${BRACKET_HEIGHT}px` }}
        />
      </div>
      <span
        className={cn(
          "mt-3 font-mono text-[9px] uppercase tracking-[0.3em] transition-colors",
          primed ? "text-gold" : "text-muted",
        )}
      >
        {hint}
      </span>
    </div>
  );
}

function PresetPicker({
  presets,
  activePresetTitle,
  disabled,
  onLoadPreset,
}: {
  presets: LunchPreset[];
  activePresetTitle: string | null;
  disabled: boolean;
  onLoadPreset: (preset: LunchPreset) => void;
}) {
  return (
    <section className="mb-4" aria-label="Presets">
      <p className="mb-2 font-mono text-[10px] text-muted uppercase tracking-[0.35em]">presets</p>
      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => (
          <button
            key={preset.title}
            type="button"
            onClick={() => onLoadPreset(preset)}
            disabled={disabled}
            className={cn(
              "rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.3em] transition-colors disabled:opacity-50",
              activePresetTitle === preset.title
                ? "gold-plate border-transparent text-bg"
                : "border-panel-edge text-muted hover:border-gold hover:text-gold",
            )}
          >
            {preset.title}
          </button>
        ))}
      </div>
    </section>
  );
}

function SpotsManager({
  spots,
  onReplace,
  onReset,
  disabled,
  onExportPreset,
  onImportFile,
}: {
  spots: LunchSpot[];
  onReplace: (spots: LunchSpot[]) => void;
  onReset: () => void;
  disabled: boolean;
  onExportPreset: () => void;
  onImportFile: (preset: LunchPreset) => void;
}) {
  const [optionsInput, setOptionsInput] = useState(() => spots.map((spot) => spot.name).join(", "));
  const [importError, setImportError] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setOptionsInput(spots.map((spot) => spot.name).join(", "));
  }, [spots]);

  useEffect(() => {
    if (!importError) return;
    const t = window.setTimeout(() => setImportError(null), 4000);
    return () => window.clearTimeout(t);
  }, [importError]);

  const handleImportChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          setImportError("invalid file");
          return;
        }
        const title = (parsed as Record<string, unknown>).title;
        if (typeof title !== "string" || !title.trim()) {
          setImportError("missing title");
          return;
        }
        const importedSpots = normalizeLunchSpots((parsed as Record<string, unknown>).spots);
        if (!importedSpots || importedSpots.length === 0) {
          setImportError("no spots found");
          return;
        }
        onImportFile({ title: title.trim(), spots: importedSpots });
      } catch {
        setImportError("invalid file");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const submitOptions = (e: React.FormEvent) => {
    e.preventDefault();
    const urlsByName = new Map(spots.map((spot) => [spot.name.toLocaleLowerCase(), spot.url]));
    const seen = new Set<string>();
    const nextSpots = optionsInput
      .split(/[,;\n]+/)
      .map((name) => name.trim())
      .filter((name) => {
        const key = name.toLocaleLowerCase();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((name) => {
        const url = urlsByName.get(name.toLocaleLowerCase());
        return { name, ...(url ? { url } : {}) };
      });

    onReplace(nextSpots);
  };

  return (
    <section className="mt-8">
      <details open className="mb-5 rounded-xl border border-panel-edge bg-panel/50 px-4 py-3">
        <summary className="cursor-pointer font-mono text-[10px] text-gold uppercase tracking-[0.3em] focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-4">
          edit options
        </summary>
        <form onSubmit={submitOptions} className="mt-4">
          <label
            htmlFor="lunch-options"
            className="font-mono text-[10px] text-muted uppercase tracking-[0.25em]"
          >
            Lunch options
          </label>
          <textarea
            id="lunch-options"
            value={optionsInput}
            onChange={(e) => setOptionsInput(e.target.value)}
            disabled={disabled}
            placeholder="Pizza, Ramen, Sushi"
            rows={4}
            className="mt-2 w-full rounded-md border border-panel-edge bg-bg px-3 py-2 text-ink text-sm outline-none transition-colors placeholder:text-muted focus:border-gold focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-2 disabled:opacity-50"
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="font-mono text-[9px] text-muted uppercase tracking-[0.2em]">
              Separate with commas, semicolons, or new lines
            </p>
            <button
              type="submit"
              disabled={disabled}
              className="gold-plate rounded-md px-3 py-2 font-mono text-[10px] text-bg uppercase tracking-[0.3em] shadow-md transition-transform focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-2 active:translate-y-px disabled:opacity-50"
            >
              save options
            </button>
          </div>
        </form>
      </details>

      {/* Import / export / reset */}
      <div className="mb-4 flex items-center justify-end gap-3">
        <input
          ref={importRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={handleImportChange}
        />
        <button
          type="button"
          onClick={() => importRef.current?.click()}
          disabled={disabled}
          className="flex items-center gap-1.5 font-mono text-[10px] text-muted uppercase tracking-[0.3em] transition-colors hover:text-gold disabled:opacity-50"
        >
          <Upload className="h-3 w-3" />
          import
        </button>
        <button
          type="button"
          onClick={onExportPreset}
          disabled={disabled || spots.length === 0}
          className="flex items-center gap-1.5 font-mono text-[10px] text-muted uppercase tracking-[0.3em] transition-colors hover:text-gold disabled:opacity-50"
        >
          <Download className="h-3 w-3" />
          export
        </button>
        <button
          type="button"
          onClick={onReset}
          disabled={disabled}
          className="flex items-center gap-1.5 font-mono text-[10px] text-muted uppercase tracking-[0.3em] transition-colors hover:text-gold disabled:opacity-50"
        >
          <RotateCcw className="h-3 w-3" />
          reset
        </button>
      </div>

      {importError && (
        <p className="mb-3 font-mono text-[10px] text-[oklch(0.65_0.2_25)] uppercase tracking-[0.3em]">
          {importError}
        </p>
      )}
    </section>
  );
}
