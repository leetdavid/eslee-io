"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowIcon, ShareIcon } from "@/components/icons";
import { api } from "@/lib/api";
import { isMyPlay } from "@/lib/mine";

/** Shares the result link, through the phone's share sheet where there is one. */
export function ShareButton({ label, round = false }: { label: string; round?: boolean }) {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const url = location.href;
    const text = `My globe was most likely printed ${label}.`;
    if (navigator.share) {
      await navigator.share({ title: "Date a Globe", text, url }).catch(() => undefined);
      return;
    }
    await navigator.clipboard.writeText(url).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  if (round)
    return (
      <button type="button" className="ib" aria-label="Share this result" onClick={share}>
        <ShareIcon />
      </button>
    );
  return (
    <button type="button" className="cta" onClick={share}>
      <span>{copied ? "Link copied" : "Share your map"}</span>
      <i>
        <ArrowIcon />
      </i>
    </button>
  );
}

/** For the player only: say when the globe was really printed, if they know. It calibrates the engine. */
export function PrintedYear({ id, saved }: { id: string; saved: number | null }) {
  const [mine, setMine] = useState(false);
  const [year, setYear] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "saved" | "failed">(
    saved ? "saved" : "idle",
  );
  useEffect(() => setMine(isMyPlay(id)), [id]);
  if (!mine && state !== "saved") return null;
  if (state === "saved")
    return (
      <div className="tile text-[14px] text-muted">
        <b className="font-semibold text-ink">Thanks.</b> {saved ?? year} is noted; it helps us tune
        the questions.
      </div>
    );
  const valid =
    /^\d{4}$/.test(year) && Number(year) >= 1700 && Number(year) <= new Date().getFullYear();
  return (
    <form
      className="tile flex flex-col gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!valid) return;
        setState("saving");
        try {
          await api.confirmPrinted.mutate({ id, year: Number(year) });
          setState("saved");
        } catch {
          setState("failed");
        }
      }}
    >
      <div className="eyebrow">Do you know when it was printed?</div>
      <p className="text-[13px] text-muted leading-[1.4]">
        If the globe has a date on it, tell us. We use it to check how well the questions work.
      </p>
      <div className="flex gap-2">
        <label className="field flex-1">
          <span>Year printed</span>
          <input
            inputMode="numeric"
            maxLength={4}
            value={year}
            onChange={(e) => setYear(e.target.value.replace(/\D/g, ""))}
            placeholder="1962"
          />
        </label>
        <button
          type="submit"
          className="secondary !w-auto px-5"
          disabled={!valid || state === "saving"}
        >
          {state === "saving" ? "Saving" : "Save"}
        </button>
      </div>
      {state === "failed" && <p className="error">That didn&apos;t save. Try again in a moment.</p>}
    </form>
  );
}

/** For the player only: carry on from the reveal with more questions, offered while one could still narrow the range. */
export function KeepGoing({ id, label, answers }: { id: string; label: string; answers: number }) {
  const [mine, setMine] = useState(false);
  useEffect(() => setMine(isMyPlay(id)), [id]);
  if (!mine) return null;
  return (
    <section className="tile">
      <div className="eyebrow">Want it closer?</div>
      <p className="mt-[5px] mb-3 text-[#3e3b35] text-[14px] leading-[1.4]">
        More questions can narrow <b className="font-semibold text-ink">{label}</b>. Your {answers}{" "}
        answers stay, and you can stop whenever you like.
      </p>
      <Link href={`/play?more=${id}`} className="cta h-[52px] text-[16.5px]">
        <span>Keep going</span>
        <i>
          <ArrowIcon />
        </i>
      </Link>
    </section>
  );
}

export function AnotherGlobe() {
  return (
    <Link href="/play" className="secondary">
      Date another globe
    </Link>
  );
}
