"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PinMap } from "@/components/add/where";
import { Brand } from "@/components/brand";
import { ArrowIcon, BackIcon, CheckIcon, CloseIcon } from "@/components/icons";
import { parseDate, REGIONS, type Region, yearOf } from "@/engine";
import { api, failureOf } from "@/lib/api";
import { regionsOf } from "@/lib/countries";
import type { GameEvent } from "@/lib/events";
import { rememberSent, sentEvents } from "@/lib/mine";
import {
  CHANGES,
  type Change,
  draftQuestion,
  type Submission,
  submissionSchema,
} from "@/lib/submission";
import type { CheckStatus, Checks, SourceCheck } from "@/server/checks";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const SIZES = [
  ["hard", "Hard", "a small island or city", 2.5],
  ["medium", "Medium", "a region, like Botswana", 5],
  ["easy", "Easy", "a big country", 9],
] as const;

interface Draft {
  change: Change;
  name: string;
  before: string;
  after: string;
  lat: number;
  lon: number;
  region: Region | "";
  place: string;
  size: Submission["size"];
  fromYear: string;
  fromMonth: string;
  untilYear: string;
  untilMonth: string;
  today: boolean;
  sources: string[];
  question: string;
  questionEdited: boolean;
  senderName: string;
}

const START: Draft = {
  change: "country",
  name: "",
  before: "",
  after: "",
  lat: 20,
  lon: 10,
  region: "",
  place: "",
  size: "medium",
  fromYear: "",
  fromMonth: "",
  untilYear: "",
  untilMonth: "",
  today: false,
  sources: [""],
  question: "",
  questionEdited: false,
  senderName: "",
};

const date = (year: string, month: string) => (month ? `${year}-${month.padStart(2, "0")}` : year);

function toSubmission(d: Draft) {
  return submissionSchema.safeParse({
    change: d.change,
    name: d.name,
    before: d.before,
    after: d.after,
    lat: d.lat,
    lon: d.lon,
    region: d.region || undefined,
    size: d.size,
    span: {
      from: date(d.fromYear, d.fromMonth),
      until: d.today ? null : date(d.untilYear, d.untilMonth),
    },
    sources: d.sources.map((s) => s.trim()).filter(Boolean),
    question: d.question || draftQuestion(d.change, d.name, d.before),
    senderName: d.senderName,
  });
}

export function AddFlow() {
  const [step, setStep] = useState(0);
  const [d, setD] = useState<Draft>(START);
  const set = (patch: Partial<Draft>) => setD((x) => ({ ...x, ...patch }));
  const [sent, setSent] = useState<{ id: string; checks: Checks } | null>(null);

  if (step === 0) return <Entry onStart={() => setStep(1)} />;
  if (step === 5 && sent)
    return (
      <Sent
        draft={d}
        checks={sent.checks}
        onAnother={() => {
          setD(START);
          setSent(null);
          setStep(1);
        }}
      />
    );
  const titles = [
    "What changed on the map?",
    "Where is it?",
    "When was it on maps?",
    "Where did you read it?",
  ];
  return (
    <main className="app">
      <header className="bar">
        <button
          type="button"
          className="ib"
          aria-label={step === 1 ? "Close" : "Back"}
          onClick={() => setStep(step - 1)}
        >
          {step === 1 ? <CloseIcon /> : <BackIcon />}
        </button>
        <div className="qn">
          <b>Add an event</b>
          <span>Step {step} of 4</span>
        </div>
        <span />
      </header>
      <div className="mb-4 grid grid-cols-4 gap-1.5" aria-hidden="true">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={`h-1 rounded ${i <= step ? "bg-ink" : "bg-[#d9d6ce]"}`} />
        ))}
      </div>
      <h1 className="font-semibold text-[28px] leading-[1.1] tracking-[-0.03em]">
        {titles[step - 1]}
      </h1>
      {step === 1 && <StepWhat d={d} set={set} onNext={() => setStep(2)} />}
      {step === 2 && <StepWhere d={d} set={set} onNext={() => setStep(3)} />}
      {step === 3 && <StepWhen d={d} set={set} onNext={() => setStep(4)} />}
      {step === 4 && (
        <StepSource
          d={d}
          set={set}
          onSent={(r) => {
            rememberSent(r.id);
            setSent(r);
            setStep(5);
          }}
        />
      )}
    </main>
  );
}

function Next({
  label,
  disabled,
  onClick,
  busy,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  busy?: boolean;
}) {
  return (
    <div className="mt-auto pt-6">
      <button type="button" className="cta" disabled={disabled || busy} onClick={onClick}>
        <span>{busy ? "Checking…" : label}</span>
        <i>
          <ArrowIcon />
        </i>
      </button>
    </div>
  );
}

const chipIcon = (s: CheckStatus) => (s === "pass" ? "✓" : s === "warn" ? "–" : "×");

function Entry({ onStart }: { onStart: () => void }) {
  const [coverage, setCoverage] = useState<{ decade: number; changes: number }[]>([]);
  const [mine, setMine] = useState<Awaited<ReturnType<typeof api.myEvents.query>>>([]);
  useEffect(() => {
    api.coverage
      .query()
      .then(setCoverage)
      .catch(() => undefined);
    const ids = sentEvents();
    if (ids.length)
      api.myEvents
        .query({ ids })
        .then(setMine)
        .catch(() => undefined);
  }, []);
  const max = Math.max(1, ...coverage.map((c) => c.changes));
  const sorted = [...coverage].sort((a, b) => a.changes - b.changes);
  const thin = new Set(sorted.slice(0, Math.ceil(sorted.length / 3)).map((c) => c.decade));
  const STATUS: Record<string, [string, string]> = {
    live: ["Live", "pass"],
    trial: ["On trial", "pass"],
    waiting: ["Waiting", "warn"],
    rejected: ["Not added", "fail"],
  };
  return (
    <main className="app gap-4">
      <header className="flex h-[74px] items-center justify-between pt-3">
        <Brand />
        <Link href="/" className="ib" aria-label="Close">
          <CloseIcon />
        </Link>
      </header>
      <div>
        <h1 className="font-semibold text-[28px] tracking-[-0.03em]">Help date more globes</h1>
        <p className="mt-1 text-[14px] text-muted leading-[1.42]">
          Every event you add becomes a question. We check each one, try it on a few globes, then
          add it for everyone.
        </p>
      </div>
      <section>
        <h2 className="eyebrow mb-2">Where we need events most</h2>
        <div className="tile">
          <div
            className="flex h-[70px] items-end gap-[3px]"
            role="img"
            aria-label="Changes we ask about, per decade"
          >
            {coverage.map((c) => (
              <div
                key={c.decade}
                className="flex-1 rounded-t-[2px]"
                style={{
                  height: `${Math.max(6, (c.changes / max) * 100)}%`,
                  background: thin.has(c.decade) ? "#D7382F" : "#55514A",
                }}
                title={`${c.decade}s: ${c.changes} changes`}
              />
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-faint">
            <span>1800</span>
            <span>1850</span>
            <span>1900</span>
            <span>1950</span>
            <span>2000</span>
          </div>
          <p className="mt-2 text-[12.5px] text-muted leading-[1.4]">
            Globes from the red decades get the widest answers, because we have few events from
            those years.
          </p>
        </div>
      </section>
      {mine.length > 0 && (
        <section>
          <h2 className="eyebrow mb-2 flex justify-between">
            <span>Your events</span>
            <span>{mine.length} sent</span>
          </h2>
          <div className="flex flex-col gap-2">
            {mine.map((e) => {
              const [label, tone] = STATUS[e.status] ?? ["Waiting", "warn"];
              return (
                <div key={e.id} className="tile flex items-center gap-3">
                  <span className="grid h-11 w-12 flex-none place-items-center rounded-lg bg-[#f1efe9] font-semibold text-[13px]">
                    {e.year}
                  </span>
                  <div className="min-w-0 flex-1">
                    <b className="block truncate font-semibold text-[14.5px]">{e.title}</b>
                    <span className="text-[12px] text-muted">
                      {e.note ?? (e.asked ? `Asked on ${e.asked} globes so far` : "Not asked yet")}
                    </span>
                  </div>
                  <span className={`chip ${tone}`}>{label}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}
      <div className="mt-auto pt-4">
        <button type="button" className="cta" onClick={onStart}>
          <span>Add an event</span>
          <i>
            <ArrowIcon />
          </i>
        </button>
      </div>
    </main>
  );
}

function StepWhat({
  d,
  set,
  onNext,
}: {
  d: Draft;
  set: (p: Partial<Draft>) => void;
  onNext: () => void;
}) {
  const [dupe, setDupe] = useState<{ status: CheckStatus; label: string } | null>(null);
  useEffect(() => {
    if (d.name.trim().length < 3) return setDupe(null);
    const t = setTimeout(() => {
      api.checkName
        .query({ change: d.change, name: d.name, before: d.before })
        .then((c) =>
          setDupe(
            c.status === "pass"
              ? { status: "pass", label: "Not in our list yet" }
              : { status: c.status, label: c.label },
          ),
        )
        .catch(() => setDupe(null));
    }, 600);
    return () => clearTimeout(t);
  }, [d.change, d.name, d.before]);
  return (
    <>
      <div className="mt-4 flex flex-col gap-2" role="radiogroup" aria-label="What changed">
        {(Object.entries(CHANGES) as [Change, string][]).map(([k, label]) => (
          // biome-ignore lint/a11y/useSemanticElements: a styled radio row
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={d.change === k}
            className={`flex h-[50px] items-center justify-between rounded-[14px] bg-white px-4 text-left font-medium text-[15px] ${d.change === k ? "shadow-[0_0_0_2px_#161513]" : "shadow-[0_0_0_1px_rgba(22,21,19,.12)]"}`}
            onClick={() => set({ change: k })}
          >
            {label}
            <span
              className={`grid h-5 w-5 place-items-center rounded-full ${d.change === k ? "bg-ink" : "shadow-[0_0_0_1.5px_#a8a398]"}`}
            >
              {d.change === k && <span className="h-2 w-2 rounded-full bg-white" />}
            </span>
          </button>
        ))}
      </div>
      <h2 className="eyebrow mt-5 mb-2">Names on the map</h2>
      <label className="field">
        <span>What it&apos;s called</span>
        <input
          value={d.name}
          maxLength={80}
          onChange={(e) => set({ name: e.target.value })}
          placeholder="Kingdom of the Two Sicilies"
        />
      </label>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <label className="field">
          <span>Before, maps showed</span>
          <input
            value={d.before}
            maxLength={80}
            onChange={(e) => set({ before: e.target.value })}
          />
        </label>
        <label className="field">
          <span>After, maps showed</span>
          <input value={d.after} maxLength={80} onChange={(e) => set({ after: e.target.value })} />
        </label>
      </div>
      {dupe && (
        <span
          className={`chip ${dupe.status} mt-2 self-start`}
        >{`${chipIcon(dupe.status)} ${dupe.label}`}</span>
      )}
      <Next label="Next: where is it?" disabled={d.name.trim().length < 2} onClick={onNext} />
    </>
  );
}

function StepWhere({
  d,
  set,
  onNext,
}: {
  d: Draft;
  set: (p: Partial<Draft>) => void;
  onNext: () => void;
}) {
  const [query, setQuery] = useState(d.name);
  const [searching, setSearching] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const radius = SIZES.find((s) => s[0] === d.size)?.[3] ?? 5;

  const locate = async (lat: number, lon: number) => {
    set({ lat, lon });
    try {
      const place = await api.place.query({ lat, lon });
      const regions = place?.code ? regionsOf(place.code, lon) : [];
      set({
        lat,
        lon,
        place: place ? [place.near, place.country].filter(Boolean).join(", ") : "",
        region: regions[0] ?? d.region,
      });
    } catch (error) {
      if (failureOf(error).reason === "rateLimited")
        setNote("That's a lot of lookups today; pick the region below.");
    }
  };

  return (
    <>
      <p className="mt-1 text-[14px] text-muted leading-[1.4]">
        Drag the map so the ring sits on it. We&apos;ll draw the outline when we review it.
      </p>
      <form
        className="mt-3 flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          if (query.trim().length < 2) return;
          setSearching(true);
          setNote(null);
          try {
            const hit = await api.search.query({ q: query });
            if (hit) await locate(Math.round(hit.lat * 100) / 100, Math.round(hit.lon * 100) / 100);
            else setNote("No place by that name. Try a nearby city.");
          } catch {
            setNote("The search didn't work. Drag the map instead.");
          } finally {
            setSearching(false);
          }
        }}
      >
        <label className="field flex-1">
          <span>Find a place</span>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Naples" />
        </label>
        <button type="submit" className="secondary !w-auto px-4" disabled={searching}>
          {searching ? "…" : "Find"}
        </button>
      </form>
      <div className="tile !p-2 mt-3">
        <PinMap lat={d.lat} lon={d.lon} radius={radius} onMove={locate} />
        <p className="px-2 pb-1 text-[12.5px] text-muted">
          {d.place ? `Pinned near ${d.place}` : "Pinned"} · {Math.abs(d.lat).toFixed(1)}°
          {d.lat >= 0 ? "N" : "S"} {Math.abs(d.lon).toFixed(1)}°{d.lon >= 0 ? "E" : "W"}
        </p>
      </div>
      {note && <p className="error">{note}</p>}
      <label className="field mt-3">
        <span>Region</span>
        <select value={d.region} onChange={(e) => set({ region: e.target.value as Region })}>
          <option value="">Pick a region</option>
          {REGIONS.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
      </label>
      <h2 className="eyebrow mt-4 mb-2">How easy is it to spot on a desk globe?</h2>
      <div className="choice">
        {SIZES.map(([k, label, hint]) => (
          <button
            key={k}
            type="button"
            aria-pressed={d.size === k}
            className="!h-auto py-3"
            onClick={() => set({ size: k })}
          >
            <b className="font-semibold text-[15px]">{label}</b>
            <span className="px-2 text-center text-[11px] text-muted leading-tight">{hint}</span>
          </button>
        ))}
      </div>
      <p className="mt-2 text-[12px] text-faint">
        This tells us how often people will answer can&apos;t see.
      </p>
      <Next label="Next: when was it on maps?" disabled={!d.region} onClick={onNext} />
    </>
  );
}

function YearMonth({
  label,
  year,
  month,
  onYear,
  onMonth,
  disabled,
}: {
  label: string;
  year: string;
  month: string;
  onYear: (v: string) => void;
  onMonth: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className={`field ${disabled ? "opacity-40" : ""}`}>
      <span>{label}</span>
      <input
        aria-label={`${label}, year`}
        inputMode="numeric"
        maxLength={4}
        placeholder="1816"
        value={year}
        disabled={disabled}
        onChange={(e) => onYear(e.target.value.replace(/\D/g, ""))}
      />
      <select
        aria-label={`${label}, month`}
        className="!text-[13px] !font-normal !text-muted"
        value={month}
        disabled={disabled}
        onChange={(e) => onMonth(e.target.value)}
      >
        <option value="">Month (if known)</option>
        {MONTHS.map((m, i) => (
          <option key={m} value={String(i + 1)}>
            {m}
          </option>
        ))}
      </select>
    </div>
  );
}

function StepWhen({
  d,
  set,
  onNext,
}: {
  d: Draft;
  set: (p: Partial<Draft>) => void;
  onNext: () => void;
}) {
  const [events, setEvents] = useState<GameEvent[]>([]);
  useEffect(() => {
    fetch("/api/events")
      .then((r) => r.json())
      .then(setEvents)
      .catch(() => undefined);
  }, []);
  const now = new Date().getFullYear();
  const from = Number(d.fromYear);
  const until = d.today ? now : Number(d.untilYear);
  const valid =
    d.fromYear.length === 4 &&
    from >= 1500 &&
    from <= now &&
    (d.today || (d.untilYear.length === 4 && until > from && until <= now));
  const ticks = useMemo(
    () => [
      ...new Set(
        events
          .flatMap((e) =>
            e.spans.flatMap((s) =>
              [s.from, s.until]
                .filter((x): x is string => !!x)
                .map((x) => yearOf(Math.max(0, parseDate(x).month))),
            ),
          )
          .filter((y) => y > 1805),
      ),
    ],
    [events],
  );
  const inside = valid
    ? new Set(
        events
          .filter((e) =>
            e.spans.some((s) =>
              [s.from, s.until].some(
                (x) =>
                  x && yearOf(parseDate(x).month) >= from && yearOf(parseDate(x).month) <= until,
              ),
            ),
          )
          .map((e) => e.id),
      ).size
    : 0;
  const x = (y: number) => `${((Math.max(1805, Math.min(now, y)) - 1805) / (now - 1805)) * 100}%`;
  return (
    <>
      <p className="mt-1 text-[14px] text-muted leading-[1.4]">
        The years it was on maps. If you only know the year, that&apos;s enough.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <YearMonth
          label="Shown from"
          year={d.fromYear}
          month={d.fromMonth}
          onYear={(v) => set({ fromYear: v })}
          onMonth={(v) => set({ fromMonth: v })}
        />
        <YearMonth
          label="Shown until"
          year={d.untilYear}
          month={d.untilMonth}
          disabled={d.today}
          onYear={(v) => set({ untilYear: v })}
          onMonth={(v) => set({ untilMonth: v })}
        />
      </div>
      <label className="mt-3 flex items-center justify-between text-[15px]">
        It&apos;s still on maps today
        <input
          type="checkbox"
          className="h-5 w-5 accent-[#161513]"
          checked={d.today}
          onChange={(e) => set({ today: e.target.checked })}
        />
      </label>
      <h2 className="eyebrow mt-5 mb-2">Where it fits</h2>
      <div className="tile">
        <div className="relative h-[34px]" aria-hidden="true">
          {valid && (
            <div
              className="absolute top-0 h-full rounded-[3px] bg-[#fbe3df] shadow-[inset_2px_0_0_#d7382f,inset_-2px_0_0_#d7382f]"
              style={{ left: x(from), width: `calc(${x(until)} - ${x(from)})` }}
            />
          )}
          {ticks.map((y) => (
            <div
              key={y}
              className="absolute top-[8px] h-[18px] w-px bg-[#55514a]/50"
              style={{ left: x(y) }}
            />
          ))}
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-faint">
          <span>1805</span>
          <span>1850</span>
          <span>1900</span>
          <span>1950</span>
          <span>2000</span>
        </div>
        <p className="mt-1 text-[11px] text-faint">Each tick is a change we already ask about.</p>
        {valid && (
          <p className="mt-2 text-[#3e3b35] text-[13px] leading-[1.4]">
            <b className="font-semibold text-ink">
              {inside < events.length / 20
                ? "This fills a thin stretch."
                : "We know this stretch well."}
            </b>{" "}
            {inside} of our {events.length} events change between {from} and{" "}
            {d.today ? "today" : until}.
          </p>
        )}
      </div>
      <Next label="Next: your source" disabled={!valid} onClick={onNext} />
    </>
  );
}

function StepSource({
  d,
  set,
  onSent,
}: {
  d: Draft;
  set: (p: Partial<Draft>) => void;
  onSent: (r: { id: string; checks: Checks }) => void;
}) {
  const [checks, setChecks] = useState<Record<string, SourceCheck | "checking">>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const years = [d.fromYear, d.today ? "" : d.untilYear].filter(Boolean).map(Number);
  const question = d.questionEdited ? d.question : draftQuestion(d.change, d.name, d.before);

  const check = async (url: string) => {
    if (!/^https?:\/\/\S+\.\S+/.test(url) || checks[url]) return;
    setChecks((c) => ({ ...c, [url]: "checking" }));
    try {
      const result = await api.checkSource.mutate({
        url,
        names: [d.name, d.before, d.after].filter(Boolean),
        years,
      });
      setChecks((c) => ({ ...c, [url]: result }));
    } catch {
      setChecks((c) => {
        const { [url]: _, ...rest } = c;
        return rest;
      });
    }
  };

  const send = async () => {
    const parsed = toSubmission({ ...d, question });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Something is missing");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      onSent(await api.submit.mutate(parsed.data));
    } catch (e) {
      const failure = failureOf(e);
      setError(
        failure.reason === "rateLimited"
          ? "You've sent five today, which is the most we take. Thank you! Come back tomorrow."
          : "That didn't send. Try again in a moment.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <p className="mt-1 text-[14px] text-muted leading-[1.4]">
        One link is enough. Two get it live faster.
      </p>
      <h2 className="eyebrow mt-4 mb-2">Source</h2>
      <div className="flex flex-col gap-2">
        {d.sources.map((url, i) => {
          const c = checks[url.trim()];
          return (
            // biome-ignore lint/suspicious/noArrayIndexKey: the list only grows at the end
            <div key={i} className="field">
              <span>Link</span>
              <input
                type="url"
                inputMode="url"
                placeholder="https://en.wikipedia.org/wiki/…"
                value={url}
                onChange={(e) =>
                  set({ sources: d.sources.map((s, j) => (j === i ? e.target.value : s)) })
                }
                onBlur={(e) => void check(e.target.value.trim())}
              />
              {c === "checking" && <p className="mt-1 text-[12px] text-faint">Opening it…</p>}
              {c && c !== "checking" && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className={`chip ${c.opens ? "pass" : "fail"}`}>
                    {c.opens ? "✓ Opens" : `× ${c.error ?? "Didn't open"}`}
                  </span>
                  {c.opens && (
                    <span className={`chip ${c.mentions ? "pass" : "warn"}`}>
                      {c.mentions ? `✓ Mentions ${d.name}` : `– Doesn't name ${d.name}`}
                    </span>
                  )}
                  {c.opens && (
                    <span className={`chip ${c.found.length === c.years.length ? "pass" : "warn"}`}>
                      {c.found.length ? `✓ Says ${c.found.join(" and ")}` : "– No dates found"}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {d.sources.length < 3 && (
          <button
            type="button"
            className="secondary !justify-start !text-[14.5px] px-4"
            onClick={() => set({ sources: [...d.sources, ""] })}
          >
            + Add another source
          </button>
        )}
      </div>
      <h2 className="eyebrow mt-5 mb-2">This is how we&apos;d ask it</h2>
      <div className="tile">
        <label className="block">
          <span className="sr-only">Question</span>
          <textarea
            className="w-full resize-none bg-transparent font-semibold text-[17px] leading-[1.25] tracking-[-0.01em] outline-none"
            rows={2}
            value={question}
            maxLength={160}
            onChange={(e) => set({ question: e.target.value, questionEdited: true })}
          />
        </label>
        <p className="mt-1 text-[12px] text-faint">
          Yes should mean the globe shows it. You can reword it.
        </p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div className="rounded-xl p-2.5 shadow-[0_0_0_1.5px_#161513]">
            <b className="block font-semibold text-[16px]">Yes</b>
            <span className="text-[11px] text-muted">
              keeps {d.fromYear}–{d.today ? "today" : d.untilYear}
            </span>
          </div>
          <div className="rounded-xl p-2.5 shadow-[0_0_0_1.5px_#161513]">
            <b className="block font-semibold text-[16px]">No</b>
            <span className="text-[11px] text-muted">keeps the other years</span>
          </div>
        </div>
      </div>
      <label className="field mt-3">
        <span>Your name, if you&apos;d like it shown to reviewers (optional)</span>
        <input
          value={d.senderName}
          maxLength={40}
          onChange={(e) => set({ senderName: e.target.value })}
        />
      </label>
      {error && <p className="error">{error}</p>}
      <Next label="Send for review" busy={busy} onClick={send} />
    </>
  );
}

function Sent({
  draft,
  checks,
  onAnother,
}: {
  draft: Draft;
  checks: Checks;
  onAnother: () => void;
}) {
  const passed = [checks.duplicate, checks.dates, checks.pin, checks.clash].every(
    (c) => c.status === "pass",
  );
  const steps = [
    [
      "Checks",
      passed
        ? "Not a duplicate, your source gives the dates, and the pin is where it should be."
        : [checks.duplicate, checks.dates, checks.pin, checks.clash]
            .filter((c) => c.status !== "pass")
            .map((c) => c.detail)
            .join(" "),
    ],
    ["Our review", "We draw the outline and check the source, usually within a few days."],
    [
      "Trial",
      "We ask it on 50 globes without counting it, and compare the answers with the results.",
    ],
    ["Live", "It's asked on every globe it helps."],
  ];
  return (
    <main className="app">
      <header className="bar">
        <Link href="/" className="ib" aria-label="Close">
          <CloseIcon />
        </Link>
        <div className="qn">
          <b>Add an event</b>
          <span>Sent</span>
        </div>
        <span />
      </header>
      <span className="mt-2 grid h-14 w-14 place-items-center rounded-full bg-ink">
        <CheckIcon color="#fff" size={24} />
      </span>
      <h1 className="mt-4 font-semibold text-[28px] tracking-[-0.03em]">Sent for review</h1>
      <p className="mt-1 text-[14px] text-muted leading-[1.4]">
        {draft.name}, {draft.fromYear}–{draft.today ? "today" : draft.untilYear}. Here&apos;s what
        happens next.
      </p>
      <ol className="mt-4 flex flex-col">
        {steps.map(([title, text], i) => (
          <li key={title} className="flex gap-3 border-[rgba(22,21,19,.1)] border-t py-3">
            <span
              className={`grid h-7 w-7 flex-none place-items-center rounded-full font-semibold text-[12px] ${i === 0 ? (passed ? "bg-yes" : "bg-[#f8ebc9]") : i === 1 ? "bg-ink text-white" : "text-faint shadow-[0_0_0_1.5px_#a8a398]"}`}
            >
              {i === 0 ? (passed ? "✓" : "!") : i + 1}
            </span>
            <p className="text-[13.5px] text-muted leading-[1.4]">
              <b className="block font-semibold text-[15px] text-ink">{title}</b>
              {text}
            </p>
          </li>
        ))}
      </ol>
      <div className="mt-auto flex flex-col gap-2.5 pt-6">
        <button type="button" className="cta" onClick={onAnother}>
          <span>Add another event</span>
          <i>
            <ArrowIcon />
          </i>
        </button>
        <Link href="/play" className="secondary">
          Back to my globe
        </Link>
      </div>
    </main>
  );
}
