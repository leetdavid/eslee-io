"use client";

import { Download, ExternalLink, Plus, RotateCcw, Upload, Utensils, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  RECOMMENDED_PRESETS,
  type LunchPreset,
  type LunchSpot,
  mapsUrl,
  normalizeLunchSpots,
  useLunchSpots,
} from "@/hooks/use-lunch-spots";
import { useLunchPresets } from "@/hooks/use-lunch-presets";
import { cn } from "@/lib/utils";

const ITEM_HEIGHT = 88;
const VISIBLE_ROWS = 3;
const CENTER_ROW = 1;
const SPIN_DURATION_MS = 4200;
const MAX_LOOPS = 9;
const STRIP_MULTIPLIER = MAX_LOOPS + 3;

const LEVER_HEIGHT = VISIBLE_ROWS * ITEM_HEIGHT;
const BALL_SIZE = 42;
const ROD_HEIGHT = LEVER_HEIGHT - 16;
const BRACKET_HEIGHT = 12;
const MAX_DRAG = Math.round(LEVER_HEIGHT * 0.5);
const PULL_THRESHOLD = Math.round(MAX_DRAG * 0.75);

function downloadPreset(preset: LunchPreset) {
  const blob = new Blob([JSON.stringify(preset, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = preset.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") + ".json";
  a.click();
  URL.revokeObjectURL(url);
}

export function SlotMachine() {
  const { spots, addSpot, removeSpot, resetSpots, loadSpots, hydrated } = useLunchSpots();
  const { presets, savePreset, deletePreset, hydrated: presetsHydrated } = useLunchPresets();
  const [activePresetTitle, setActivePresetTitle] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<LunchSpot | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const strip = useMemo(() => {
    if (spots.length === 0) return [] as LunchSpot[];
    const arr: LunchSpot[] = [];
    for (let i = 0; i < STRIP_MULTIPLIER; i++) arr.push(...spots);
    return arr;
  }, [spots]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

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
      setSpinning(false);
      setIndex(winnerIdx);
      setWinner(spots[winnerIdx] ?? null);
    }, SPIN_DURATION_MS);
  }, [spinning, spots]);

  const handleLoadPreset = useCallback(
    (preset: LunchPreset) => {
      loadSpots(preset.spots);
      setActivePresetTitle(preset.title);
    },
    [loadSpots],
  );

  const handleSavePreset = useCallback(
    (title: string) => {
      savePreset(title, spots);
      setActivePresetTitle(title);
    },
    [savePreset, spots],
  );

  const handleImportFile = useCallback(
    (preset: LunchPreset) => {
      savePreset(preset.title, preset.spots);
      loadSpots(preset.spots);
      setActivePresetTitle(preset.title);
    },
    [savePreset, loadSpots],
  );

  const handleExportPreset = useCallback(() => {
    downloadPreset({ title: activePresetTitle ?? "my-spots", spots });
  }, [activePresetTitle, spots]);

  const leverActive = !spinning && spots.length >= 2 && hydrated;

  return (
    <div className="w-full">
      <div className="cabinet relative overflow-hidden rounded-3xl border border-panel-edge p-5 md:p-8">
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
                {strip.map((spot, i) => (
                  <div
                    key={`${spot.name}-${i}`}
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
            <>
              <p className="font-mono text-[10px] text-gold uppercase tracking-[0.4em]">
                jackpot
              </p>
              <p className="mt-1.5 font-display text-cream text-lg md:text-xl">
                go eat {winner.name}
              </p>
              <a
                href={winner.url ?? mapsUrl(winner.name)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 font-mono text-[10px] text-gold uppercase tracking-[0.35em] transition-opacity hover:opacity-70"
              >
                <ExternalLink className="h-3 w-3" />
                open in maps
              </a>
            </>
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
        onAdd={addSpot}
        onRemove={removeSpot}
        onReset={resetSpots}
        disabled={spinning}
        recommendedPresets={RECOMMENDED_PRESETS}
        presets={presets}
        presetsHydrated={presetsHydrated}
        activePresetTitle={activePresetTitle}
        onSavePreset={handleSavePreset}
        onLoadSavedPreset={handleLoadPreset}
        onDeletePreset={deletePreset}
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

function SpotsManager({
  spots,
  onAdd,
  onRemove,
  onReset,
  disabled,
  recommendedPresets,
  presets,
  presetsHydrated,
  activePresetTitle,
  onSavePreset,
  onLoadSavedPreset,
  onDeletePreset,
  onExportPreset,
  onImportFile,
}: {
  spots: LunchSpot[];
  onAdd: (name: string, url?: string) => void;
  onRemove: (name: string) => void;
  onReset: () => void;
  disabled: boolean;
  recommendedPresets: LunchPreset[];
  presets: LunchPreset[];
  presetsHydrated: boolean;
  activePresetTitle: string | null;
  onSavePreset: (title: string) => void;
  onLoadSavedPreset: (preset: LunchPreset) => void;
  onDeletePreset: (title: string) => void;
  onExportPreset: () => void;
  onImportFile: (preset: LunchPreset) => void;
}) {
  const [input, setInput] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [saveInput, setSaveInput] = useState(activePresetTitle ?? "");
  const [importError, setImportError] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSaveInput(activePresetTitle ?? "");
  }, [activePresetTitle]);

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
        const importedSpots = normalizeLunchSpots(
          (parsed as Record<string, unknown>).spots,
        );
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

  const submitSpot = (e: React.FormEvent) => {
    e.preventDefault();
    const v = input.trim();
    if (!v) return;
    onAdd(v, urlInput.trim() || undefined);
    setInput("");
    setUrlInput("");
  };

  const submitSave = (e: React.FormEvent) => {
    e.preventDefault();
    const v = saveInput.trim();
    if (!v) return;
    onSavePreset(v);
  };

  return (
    <section className="mt-8">
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
        <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.3em] text-[oklch(0.65_0.2_25)]">
          {importError}
        </p>
      )}

      {/* Presets: recommended + saved */}
      <div className="mb-4">
        <p className="mb-2 font-mono text-[10px] text-muted uppercase tracking-[0.35em]">
          presets
        </p>
        <div className="flex flex-wrap gap-2">
          {recommendedPresets.map((preset) => (
            <button
              key={preset.title}
              type="button"
              onClick={() => onLoadSavedPreset(preset)}
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
          {presetsHydrated &&
            presets.map((preset) => (
              <div key={preset.title} className="flex items-center">
                <button
                  type="button"
                  onClick={() => onLoadSavedPreset(preset)}
                  disabled={disabled}
                  className={cn(
                    "flex items-center rounded-l-full border py-1.5 pl-3 pr-2 font-mono text-[10px] uppercase tracking-[0.2em] transition-colors disabled:opacity-50",
                    activePresetTitle === preset.title
                      ? "border-gold bg-[oklch(0.25_0.08_50)] text-gold"
                      : "border-panel-edge text-muted hover:border-gold hover:text-gold",
                  )}
                >
                  {preset.title}
                </button>
                <button
                  type="button"
                  onClick={() => onDeletePreset(preset.title)}
                  disabled={disabled}
                  className="flex items-center rounded-r-full border border-l-0 border-panel-edge px-2 py-1.5 text-muted transition-colors hover:border-red hover:text-red disabled:opacity-50"
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
        </div>
      </div>

      {/* Save as preset */}
      <form onSubmit={submitSave} className="mb-4 flex gap-2">
        <input
          type="text"
          value={saveInput}
          onChange={(e) => setSaveInput(e.target.value)}
          disabled={disabled}
          placeholder="save as…"
          maxLength={60}
          className="flex-1 border-b border-panel-edge bg-transparent px-1 py-2 text-ink text-sm outline-none placeholder:text-muted focus:border-gold transition-colors disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={disabled || !saveInput.trim()}
          className="gold-plate flex items-center rounded-md px-3 py-2 font-mono text-[10px] text-bg uppercase tracking-[0.3em] shadow-md transition-transform active:translate-y-px disabled:opacity-50"
        >
          save
        </button>
      </form>

      {/* Add spot */}
      <form onSubmit={submitSpot} className="flex flex-col gap-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={disabled}
            placeholder="add a spot…"
            maxLength={60}
            className="flex-1 rounded-md border border-panel-edge bg-panel px-3 py-2 text-ink text-sm outline-none placeholder:text-muted focus:border-gold disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={disabled || !input.trim()}
            className="gold-plate flex items-center gap-1 rounded-md px-3 py-2 font-mono text-[10px] text-bg uppercase tracking-[0.3em] shadow-md transition-transform active:translate-y-px disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={3} />
            add
          </button>
        </div>
        <input
          type="url"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          disabled={disabled}
          placeholder="google maps link (optional)"
          className="rounded-md border border-panel-edge bg-panel px-3 py-2 text-ink text-sm outline-none placeholder:text-muted focus:border-gold disabled:opacity-50"
        />
      </form>

      {spots.length > 0 && (
        <>
          <p className="mt-6 mb-2 font-mono text-[10px] text-muted uppercase tracking-[0.35em]">
            your spots ({spots.length})
          </p>
          <ul className="flex flex-wrap gap-2">
            {spots.map((spot) => (
            <li
              key={spot.name}
              className={cn(
                "flex items-stretch overflow-hidden rounded-full border border-panel-edge bg-panel text-sm",
                disabled && "opacity-50",
              )}
            >
              <a
                href={spot.url ?? mapsUrl(spot.name)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 py-1.5 pl-3 pr-3 text-ink transition-colors hover:text-gold"
              >
                {spot.name}
                <ExternalLink className="size-3 shrink-0 text-muted" />
              </a>
              <span aria-hidden className="w-px self-stretch bg-panel-edge" />
              <button
                type="button"
                onClick={() => onRemove(spot.name)}
                disabled={disabled}
                className="group flex items-center px-2.5 py-1.5 text-muted transition-colors hover:text-red"
              >
                <X className="size-3" />
              </button>
            </li>
          ))}
        </ul>
        </>
      )}
    </section>
  );
}
