"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SetupScreen } from "@/components/game/setup";
import { CheckIcon, CloseIcon, CrossIcon, EyeOffIcon, UndoIcon } from "@/components/icons";
import { PlateView } from "@/components/plate-view";
import { AnswerScale, Trail, TwoFitsScale, yearsLabel } from "@/components/scales";
import {
  type Answer,
  createEngine,
  type Engine,
  type Next,
  type Setup,
  type Turn,
  width,
} from "@/engine";
import { api, failureOf } from "@/lib/api";
import type { GameEvent } from "@/lib/events";
import { rememberPlay } from "@/lib/mine";

/** Answers before "Show my answer now" appears. */
const EARLY_OUT_AFTER = 5;

interface Props {
  /** Reopen a saved game to ask one of its answers again. */
  recheck?: { id: string; turn: number };
}

export function Game({ recheck }: Props) {
  const router = useRouter();
  const [events, setEvents] = useState<GameEvent[] | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [setup, setSetup] = useState<Setup | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  // A re-check asks this event first, whatever the engine would pick.
  const [forced, setForced] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/events")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((list: GameEvent[]) => setEvents(list))
      .catch(() => setFailed("The questions didn't load. Check your connection and try again."));
  }, []);

  useEffect(() => {
    if (!recheck) return;
    api.play
      .query({ id: recheck.id })
      .then((saved) => {
        if (!saved) return;
        const again = saved.turns[recheck.turn];
        setSetup(saved.setup);
        setTurns(saved.turns.filter((_, i) => i !== recheck.turn));
        if (again) setForced(again.eventId);
      })
      .catch(() => setFailed("That game couldn't be opened."));
  }, [recheck]);

  const engine = useMemo(
    () => (events ? createEngine(events, { now: new Date() }) : null),
    [events],
  );
  const byId = useMemo(() => new Map((events ?? []).map((e) => [e.id, e])), [events]);

  const next: Next | null = useMemo(() => {
    if (!engine || !setup) return null;
    if (forced && !turns.some((t) => t.eventId === forced))
      return { type: "ask", eventId: forced, reason: "hinge" };
    return engine.next(setup, turns);
  }, [engine, setup, turns, forced]);

  const finish = useCallback(
    async (final: Turn[]) => {
      if (!setup || saving) return;
      setSaving(true);
      try {
        const { id } = await api.savePlay.mutate({ setup, turns: final });
        rememberPlay(id);
        router.push(`/r/${id}`);
      } catch (error) {
        const failure = failureOf(error);
        setSaving(false);
        setFailed(
          failure.reason === "rateLimited"
            ? "That's a lot of globes for one day. Try again tomorrow."
            : "Your answer couldn't be saved. Try again in a moment.",
        );
      }
    },
    [router, saving, setup],
  );

  useEffect(() => {
    if (next?.type === "done" && turns.length > 0) void finish(turns);
  }, [next, turns, finish]);

  if (failed)
    return (
      <main className="app justify-center gap-4 text-center">
        <p className="text-[15px]">{failed}</p>
        <button type="button" className="secondary" onClick={() => location.reload()}>
          Try again
        </button>
      </main>
    );
  if (!setup) return <SetupScreen onStart={setSetup} />;
  if (!engine || !next || next.type === "done" || saving)
    return (
      <main className="app items-center justify-center">
        <p className="text-[15px] text-muted">
          {saving || next?.type === "done" ? "Working out your answer…" : "Loading the questions…"}
        </p>
      </main>
    );

  const event = byId.get(next.eventId);
  if (!event) return null;
  return (
    <Question
      key={`${turns.length}-${event.id}`}
      engine={engine}
      byId={byId}
      turns={turns}
      next={next}
      event={event}
      onAnswer={(answer) =>
        setTurns((ts) => [...ts, { eventId: event.id, answer, reason: next.reason }])
      }
      onUndo={() => setTurns((ts) => ts.slice(0, -1))}
      onFinish={() => void finish(turns)}
      onClose={() => router.push("/")}
    />
  );
}

interface QuestionProps {
  engine: Engine;
  byId: Map<string, GameEvent>;
  turns: Turn[];
  next: Extract<Next, { type: "ask" }>;
  event: GameEvent;
  onAnswer: (a: Answer) => void;
  onUndo: () => void;
  onFinish: () => void;
  onClose: () => void;
}

function Question({
  engine,
  byId,
  turns,
  next,
  event,
  onAnswer,
  onUndo,
  onFinish,
  onClose,
}: QuestionProps) {
  const preview = useMemo(() => engine.preview(turns, event.id), [engine, turns, event.id]);
  const counted = turns.filter((t) => t.answer !== "cant" && !byId.get(t.eventId)?.trial).length;
  const n = turns.length + 1;
  const months = width(preview.current);
  const toGo = Math.max(
    1,
    Math.min(15 - turns.length, Math.round(Math.log2(Math.max(2, months / 30)) * 1.5) + 1),
  );

  const fits = useMemo(() => {
    if (next.reason !== "settle") return null;
    const [a, b] = next.turns;
    return {
      a: engine.windowOf(engine.posterior(turns, { skip: a })),
      b: engine.windowOf(engine.posterior(turns, { skip: b })),
      ns: [a + 1, b + 1],
    };
  }, [engine, next, turns]);

  const trail = useMemo(() => {
    const rows = turns.map((t, i) => ({
      n: i + 1,
      title: byId.get(t.eventId)?.title ?? t.eventId,
      answer: t.answer,
      window: t.answer === "cant" ? null : engine.windowOf(engine.posterior(turns.slice(0, i + 1))),
    }));
    return rows.slice(-3).map((r, i, all) => ({ ...r, last: i === all.length - 1 }));
  }, [engine, turns, byId]);

  return (
    <main className="app">
      <header className="bar">
        <button
          type="button"
          className="ib"
          aria-label="Stop and go back to the start"
          onClick={onClose}
        >
          <CloseIcon />
        </button>
        <div className="qn" aria-live="polite">
          <b>Question {n}</b>
          <span>
            {next.reason === "settle"
              ? "one extra to settle a clash"
              : next.reason === "hinge"
                ? "checking one answer"
                : `about ${toGo} to go`}
          </span>
        </div>
        <button
          type="button"
          className="ib"
          aria-label="Undo the last answer"
          disabled={turns.length === 0}
          onClick={onUndo}
        >
          <UndoIcon />
        </button>
      </header>

      {fits && (
        <div className="strip" role="status">
          <i>!</i>
          <span>
            <b>
              Answers {fits.ns[0]} and {fits.ns[1]} disagree.
            </b>{" "}
            One is probably a misread, so this question settles it.
          </span>
        </div>
      )}
      {next.reason === "trial" && (
        <div className="strip" role="status">
          <i style={{ background: "#E4E1D9" }}>?</i>
          <span>
            <b>A new event on trial.</b> Your answer helps us check it, and it won&apos;t change
            your result.
          </span>
        </div>
      )}

      <section className="ask">
        <h2>{event.question}</h2>
        <p>{event.hint}</p>
      </section>

      <section className="qcard" aria-label="The years still possible">
        <div className="hd">
          <span className="eyebrow">{fits ? "Two fits" : "Still possible"}</span>
          <span className="yr">
            {fits ? `${yearsLabel(fits.a)} · ${yearsLabel(fits.b)}` : yearsLabel(preview.possible)}
          </span>
        </div>
        <div className="sc">
          {fits ? (
            <TwoFitsScale a={fits.a} b={fits.b} />
          ) : (
            <AnswerScale current={preview.possible} ifYes={preview.ifYes} ifNo={preview.ifNo} />
          )}
        </div>
        <PlateView event={event} />
      </section>

      {trail.length > 0 && (
        <div className="trail">
          <div className="k eyebrow">
            <span>How the years narrowed</span>
            <span>1805 · · · today</span>
          </div>
          <Trail rows={trail} months={engine.months} />
        </div>
      )}

      <div className="answers">
        <button type="button" className="answer" onClick={() => onAnswer("yes")}>
          <i style={{ background: "#CDE8C2" }}>
            <CheckIcon />
          </i>
          <b>Yes</b>
          <span>keeps {yearsLabel(preview.ifYes)}</span>
        </button>
        <button type="button" className="answer" onClick={() => onAnswer("no")}>
          <i style={{ background: "#F6CBD2" }}>
            <CrossIcon />
          </i>
          <b>No</b>
          <span>keeps {yearsLabel(preview.ifNo)}</span>
        </button>
        <button type="button" className="cantsee" onClick={() => onAnswer("cant")}>
          <EyeOffIcon />
          Can&apos;t see it<span>no years lost</span>
        </button>
        {counted >= EARLY_OUT_AFTER && (
          <button type="button" className="earlyout" onClick={onFinish}>
            Show my answer now
          </button>
        )}
      </div>
    </main>
  );
}
