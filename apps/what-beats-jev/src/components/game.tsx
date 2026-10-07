"use client";

import { TRPCClientError } from "@trpc/client";
import { MotionConfig } from "framer-motion";
import { ArrowRight, Info, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InputMessage } from "@/components/ui/input-message";
import { Tooltip, TooltipProvider } from "@/components/ui/tooltip";
import { api } from "@/lib/api";
import {
  answerError,
  countCharacters,
  MAX_ANSWER_LENGTH,
  phraseIdentity,
  STARTER,
} from "@/lib/game";
import { applyJudgment, createRun, type GameRun, RUN_STORAGE_KEY, restoreRun } from "@/lib/run";
import { cn } from "@/lib/utils";

function Rock() {
  return (
    <svg className="rock-art" viewBox="0 0 120 110" aria-hidden="true">
      <path
        d="M15 47 34 20 71 14 103 37 109 75 88 93 44 98 14 82Z"
        fill="var(--surface-2)"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M34 20 45 45 70 32 71 14M15 47 45 45 36 70 14 82M103 37 70 32 82 59 109 75"
        fill="none"
        stroke="currentColor"
        strokeOpacity=".22"
        strokeWidth="2"
      />
      <ellipse cx="43" cy="68" rx="5" ry="3" fill="var(--discovery)" />
      <ellipse cx="80" cy="67" rx="5" ry="3" fill="var(--discovery)" />
      <circle cx="49" cy="59" r="2.8" fill="currentColor" />
      <circle cx="74" cy="58" r="2.8" fill="currentColor" />
      <path
        d="M54 69q8 8 16-1"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Confidence({ value }: { value: number }) {
  return (
    <span className="confidence">
      <span>
        Jev confidence{" "}
        <strong>
          {new Intl.NumberFormat("en", { style: "percent", maximumFractionDigits: 0 }).format(
            value,
          )}
        </strong>
      </span>
      <Tooltip
        content="How strongly Jev favored this verdict, not your probability of winning."
        side="top"
      >
        <Button
          variant="ghost"
          size="icon"
          aria-label="About Jev confidence"
          className="confidence-help"
        >
          <Info />
        </Button>
      </Tooltip>
    </span>
  );
}

export function Game() {
  const [run, setRun] = useState<GameRun>(createRun);
  const [hydrated, setHydrated] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(false);
  const [storageWarning, setStorageWarning] = useState(false);
  const requestId = useRef(0);
  const pending = useRef(false);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => {
    try {
      setRun(restoreRun(localStorage.getItem(RUN_STORAGE_KEY)) ?? createRun());
    } catch {
      setStorageWarning(true);
    }
    setHydrated(true);
    return () => {
      controller.current?.abort();
      requestId.current += 1;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(RUN_STORAGE_KEY, JSON.stringify(run));
    } catch {
      setStorageWarning(true);
    }
  }, [run, hydrated]);

  const challenge = run.chain.at(-1) ?? STARTER;
  const last = run.lastJudgment;
  const characters = countCharacters(run.draft);
  const isLong = countCharacters(challenge) > 90;
  const isPhrase = countCharacters(challenge) > 12;

  useEffect(() => {
    if (run.ended) document.getElementById("game-prompt")?.focus();
  }, [run.ended]);

  async function submit() {
    if (!hydrated || run.ended || pending.current) return;
    const validation = answerError(run.draft, run.chain);
    if (validation) {
      setError(validation);
      setRetry(false);
      document.getElementById("answer")?.focus();
      return;
    }
    const snapshot = run;
    const id = ++requestId.current;
    const abort = new AbortController();
    controller.current = abort;
    pending.current = true;
    setChecking(true);
    setError(null);
    const timeout = window.setTimeout(() => abort.abort(), 25_000);
    try {
      const judgment = await api.matchup.mutate(
        { challenge, answer: snapshot.draft },
        { signal: abort.signal },
      );
      if (requestId.current !== id) return;
      setRun(applyJudgment(snapshot, snapshot.draft, judgment));
      setRetry(false);
    } catch (cause) {
      if (requestId.current !== id) return;
      setError(
        cause instanceof TRPCClientError && cause.data?.code === "TOO_MANY_REQUESTS"
          ? cause.message
          : "Couldn't check this answer. Your chain is safe. Try again.",
      );
      setRetry(true);
    } finally {
      window.clearTimeout(timeout);
      if (requestId.current === id) {
        pending.current = false;
        setChecking(false);
      }
    }
  }

  function newRun() {
    requestId.current += 1;
    controller.current?.abort();
    pending.current = false;
    setRun(createRun());
    setError(null);
    setRetry(false);
    setChecking(false);
    requestAnimationFrame(() => document.getElementById("answer")?.focus());
  }

  return (
    <MotionConfig reducedMotion="user">
      <TooltipProvider>
        <div className="game-shell">
          <a className="skip-link" href="#play">
            Skip to game
          </a>
          <header className="game-header">
            <a className="game-brand" href="/">
              what beats <span>jev</span>?
            </a>
            <div className="game-score">
              <span>Chain length</span>
              <strong>{run.chain.length - 1}</strong>
            </div>
          </header>
          <main id="play" className="game-layout">
            <section className="play-area" aria-labelledby="game-prompt">
              <div className="game-intro">
                <p>
                  {run.ended
                    ? "Every chain ends somewhere. This one was yours."
                    : "One good counter can lead anywhere."}
                </p>
                <h1 id="game-prompt" tabIndex={-1}>
                  {run.ended ? (
                    "Chain ended"
                  ) : (
                    <>
                      What beats <span className="sr-only">{challenge}?</span>
                    </>
                  )}
                </h1>
              </div>
              <div
                className={cn(
                  "challenge-piece",
                  isLong && "challenge-long",
                  !isLong && isPhrase && "challenge-phrase",
                )}
              >
                {phraseIdentity(challenge) === STARTER && <Rock />}
                <div className="challenge-name" dir="auto">
                  {challenge}
                  {!run.ended && <span aria-hidden="true">?</span>}
                </div>
                {!isLong && <Sparkles className="challenge-spark" aria-hidden="true" />}
              </div>
              <div className="verdict-region" role="status" aria-live="polite" aria-atomic="true">
                {checking ? (
                  <p>Checking this matchup...</p>
                ) : last && run.ended ? (
                  <p className="sr-only">
                    Chain ended. {last.answer} didn&apos;t beat {last.challenge}. Your chain has{" "}
                    {run.chain.length - 1} accepted answers. Jev confidence{" "}
                    {Math.round(last.confidence * 100)} percent.
                  </p>
                ) : last && !retry ? (
                  <div className="verdict-summary">
                    <span>That works.</span>
                    <Confidence value={last.confidence} />
                    {last.isNewMatchup && (
                      <Badge color="pink" style={{ backgroundColor: "var(--discovery)" }}>
                        New matchup
                      </Badge>
                    )}
                    {last.isNewMatchup && (
                      <span className="verdict-note">First win for this matchup.</span>
                    )}
                  </div>
                ) : null}
              </div>
              {run.ended && last ? (
                <section className="run-ended" aria-label="Run result">
                  <h2>Nice run.</h2>
                  <p>
                    <strong dir="auto">{last.answer}</strong> didn&apos;t beat{" "}
                    <span dir="auto">{last.challenge}</span>.
                  </p>
                  <Confidence value={last.confidence} />
                  <p>
                    You kept it going for <strong>{run.chain.length - 1}</strong>{" "}
                    {run.chain.length === 2 ? "answer" : "answers"}. Ready for another?
                  </p>
                  <Button onClick={newRun} trailingIcon={ArrowRight}>
                    New run
                  </Button>
                </section>
              ) : (
                <form
                  className="answer-field"
                  aria-busy={checking}
                  onSubmit={(event) => {
                    event.preventDefault();
                    void submit();
                  }}
                >
                  <label htmlFor="answer">Your answer</label>
                  <InputMessage
                    data-composer=""
                    value={run.draft}
                    onValueChange={(draft) => {
                      setRun((previous) => ({ ...previous, draft }));
                      setError(null);
                      setRetry(false);
                    }}
                    onSend={() => {
                      void submit();
                    }}
                    disabled={checking || !hydrated}
                    minRows={2}
                    maxRows={8}
                    allowEmptySend
                    showSendButton={false}
                    placeholder="e.g. a very persuasive pigeon"
                    leftSlot={
                      <span
                        className="character-count"
                        data-over-limit={characters > MAX_ANSWER_LENGTH}
                      >
                        {characters} / {MAX_ANSWER_LENGTH}
                      </span>
                    }
                    rightSlot={
                      <Button
                        type="submit"
                        loading={checking}
                        disabled={!hydrated}
                        trailingIcon={ArrowRight}
                      >
                        {retry ? "Retry" : "Try this"}
                      </Button>
                    }
                    textareaProps={{
                      id: "answer",
                      name: "answer",
                      dir: "auto",
                      "aria-label": "Your answer",
                      "aria-invalid": !!error && !retry,
                      "aria-describedby": "answer-rules answer-error",
                      autoComplete: "off",
                      spellCheck: true,
                    }}
                  />
                  <p id="answer-rules" className="game-rules">
                    Anything goes. No repeats. Up to 240 characters.
                  </p>
                  <p id="answer-error" className="answer-error" role="status">
                    {error}
                  </p>
                </form>
              )}
              {storageWarning && (
                <p className="storage-warning" role="status">
                  This browser couldn&apos;t save your run. Keep this tab open to preserve your
                  chain.
                </p>
              )}
            </section>
            <aside className="game-chain" aria-labelledby="chain-title">
              <h2 id="chain-title">
                Your chain{" "}
                <span>
                  {run.ended
                    ? "Run complete"
                    : run.chain.length === 1
                      ? "Just getting started"
                      : "Keep it going"}
                </span>
              </h2>
              <ol className="chain-steps">
                {run.chain.map((phrase, index) => (
                  <li
                    key={phraseIdentity(phrase)}
                    className={index === run.chain.length - 1 ? "current-step" : undefined}
                  >
                    <span className="step-number" aria-hidden="true">
                      {index}
                    </span>
                    <div>
                      <span className="step-phrase" dir="auto">
                        {phrase}
                      </span>
                      {index === 0 ? (
                        <small>The starting point</small>
                      ) : (
                        index === run.chain.length - 1 && (
                          <small>
                            {run.ended ? "Last accepted answer" : "Your current challenge"}
                          </small>
                        )
                      )}
                    </div>
                  </li>
                ))}
              </ol>
              {run.chain.length === 1 && (
                <p className="chain-empty">Your next answer goes here. How far can you take it?</p>
              )}
            </aside>
          </main>
          <footer className="game-footer">
            <span>
              Judged by{" "}
              <a href="https://typesafe.ai" target="_blank" rel="noreferrer">
                Jev
              </a>
              . No account. No timer.
            </span>
            <span>Your run stays in this browser.</span>
          </footer>
        </div>
      </TooltipProvider>
    </MotionConfig>
  );
}
