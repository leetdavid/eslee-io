"use client";

import { ExternalLink, Plus, RotateCcw, Utensils, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type LunchSpot, useLunchSpots } from "@/hooks/use-lunch-spots";
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

export function SlotMachine() {
  const { spots, addSpot, removeSpot, resetSpots, hydrated } = useLunchSpots();
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

  const leverActive = !spinning && spots.length >= 2 && hydrated;

  return (
    <div className="w-full">
      <div className="cabinet relative overflow-hidden rounded-3xl border border-[var(--color-panel-edge)] p-5 md:p-8">
        <div className="mb-6 flex items-center justify-center gap-3">
          <Utensils className="h-3.5 w-3.5 text-[var(--color-gold)]" strokeWidth={2.4} />
          <span className="font-mono text-[10px] text-[var(--color-gold)] uppercase tracking-[0.4em]">
            today&rsquo;s lunch
          </span>
          <Utensils className="h-3.5 w-3.5 text-[var(--color-gold)]" strokeWidth={2.4} />
        </div>

        <div className="flex items-stretch gap-3 md:gap-5">
          <div
            className="reel-glass reel-mask relative flex-1 overflow-hidden rounded-xl border-4 border-[var(--color-gold-deep)]"
            style={{ height: `${VISIBLE_ROWS * ITEM_HEIGHT}px` }}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 z-20 border-[var(--color-red)] border-y-2"
              style={{
                top: `${CENTER_ROW * ITEM_HEIGHT}px`,
                height: `${ITEM_HEIGHT}px`,
                background:
                  "linear-gradient(180deg, oklch(0.6 0.22 25 / 0.14), oklch(0.6 0.22 25 / 0.04))",
              }}
            />

            {spots.length === 0 ? (
              <div className="flex h-full items-center justify-center px-4 text-center font-display text-[var(--color-bg)] text-lg">
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
                    className="flex items-center justify-center px-4 font-display text-2xl text-[var(--color-bg)] md:text-3xl"
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
              <p className="font-mono text-[10px] text-[var(--color-gold)] uppercase tracking-[0.4em]">
                jackpot
              </p>
              <p className="mt-1.5 font-display text-[var(--color-cream)] text-lg md:text-xl">
                go eat at {winner.name}
              </p>
              {winner.url && (
                <a
                  href={winner.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1.5 font-mono text-[10px] text-[var(--color-gold)] uppercase tracking-[0.35em] transition-opacity hover:opacity-70"
                >
                  <ExternalLink className="h-3 w-3" />
                  open in maps
                </a>
              )}
            </>
          ) : (
            <p className="font-mono text-[10px] text-[var(--color-muted)] uppercase tracking-[0.4em]">
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
          primed ? "text-[var(--color-gold)]" : "text-[var(--color-muted)]",
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
}: {
  spots: LunchSpot[];
  onAdd: (name: string, url?: string) => void;
  onRemove: (name: string) => void;
  onReset: () => void;
  disabled: boolean;
}) {
  const [input, setInput] = useState("");
  const [urlInput, setUrlInput] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = input.trim();
    if (!v) return;
    const u = urlInput.trim() || undefined;
    onAdd(v, u);
    setInput("");
    setUrlInput("");
  };

  return (
    <section className="mt-10">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="font-mono text-[10px] text-[var(--color-muted)] uppercase tracking-[0.35em]">
          your spots ({spots.length})
        </h2>
        <button
          type="button"
          onClick={onReset}
          disabled={disabled}
          className="flex items-center gap-1.5 font-mono text-[10px] text-[var(--color-muted)] uppercase tracking-[0.3em] transition-colors hover:text-[var(--color-gold)] disabled:opacity-50"
        >
          <RotateCcw className="h-3 w-3" />
          reset
        </button>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={disabled}
            placeholder="add a spot…"
            maxLength={60}
            className="flex-1 rounded-md border border-[var(--color-panel-edge)] bg-[var(--color-panel)] px-3 py-2 text-[var(--color-ink)] text-sm outline-none placeholder:text-[var(--color-muted)] focus:border-[var(--color-gold)] disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={disabled || !input.trim()}
            className="gold-plate flex items-center gap-1 rounded-md px-3 py-2 font-mono text-[10px] text-[var(--color-bg)] uppercase tracking-[0.3em] shadow-md transition-transform active:translate-y-px disabled:opacity-50"
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
          className="rounded-md border border-[var(--color-panel-edge)] bg-[var(--color-panel)] px-3 py-2 text-[var(--color-ink)] text-sm outline-none placeholder:text-[var(--color-muted)] focus:border-[var(--color-gold)] disabled:opacity-50"
        />
      </form>

      {spots.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-2">
          {spots.map((spot) => (
            <li key={spot.name} className="flex items-center">
              <button
                type="button"
                onClick={() => onRemove(spot.name)}
                disabled={disabled}
                className={cn(
                  "group flex items-center gap-2 border border-[var(--color-panel-edge)] bg-[var(--color-panel)] py-1.5 pl-3 text-[var(--color-ink)] text-sm transition-colors hover:border-[var(--color-red)] hover:bg-[oklch(0.25_0.08_25)] disabled:opacity-50",
                  spot.url ? "rounded-l-full pr-2" : "rounded-full pr-2",
                )}
              >
                <span>{spot.name}</span>
                <X className="h-3.5 w-3.5 text-[var(--color-muted)] group-hover:text-[var(--color-red)]" />
              </button>
              {spot.url && (
                <a
                  href={spot.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center rounded-r-full border border-[var(--color-panel-edge)] border-l-0 bg-[var(--color-panel)] px-2 py-1.5 text-[var(--color-muted)] transition-colors hover:border-[var(--color-gold)] hover:text-[var(--color-gold)]"
                  title="Open in Google Maps"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
