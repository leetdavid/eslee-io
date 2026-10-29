"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, failureOf } from "@/lib/api";
import type { EventEdit, Status } from "@/server/review";

const button = "flex h-11 items-center rounded-xl px-4 text-[14.5px] font-medium";
const outline = `${button} bg-white shadow-[0_0_0_1px_rgba(22,21,19,.2)]`;

/** What a maintainer can do with the event in front of them. Each action reloads the queue. */
export function ReviewActions({
  id,
  status,
  edit,
}: {
  id: string;
  status: Status;
  edit: EventEdit;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "edit" | "merge" | "reject">("idle");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [into, setInto] = useState("");
  const [draft, setDraft] = useState(edit);
  const [spans, setSpans] = useState(JSON.stringify(edit.spans));

  const run = async (work: () => Promise<unknown>, next?: string) => {
    setBusy(true);
    setError(null);
    try {
      await work();
      setMode("idle");
      router.push(next ?? `/review?tab=${status}`);
      router.refresh();
    } catch (e) {
      const failure = failureOf(e);
      setError(
        failure.reason === "invalid"
          ? (failure.message ?? "That isn't valid")
          : failure.reason === "forbidden"
            ? "Only maintainers can do that."
            : "That didn't work. Try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  if (mode === "edit")
    return (
      <form
        className="tile flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          let parsed: EventEdit["spans"];
          try {
            parsed = JSON.parse(spans);
          } catch {
            setError('Spans must be JSON, like [{"from":"1816-12","until":"1861-03"}]');
            return;
          }
          void run(
            () => api.edit.mutate({ id, patch: { ...draft, spans: parsed } }),
            `/review?tab=${status}&id=${id}`,
          );
        }}
      >
        <div className="eyebrow">Edit</div>
        {(["title", "question", "hint"] as const).map((k) => (
          <label key={k} className="field" htmlFor={`edit-${k}`}>
            <span>{k[0]?.toUpperCase() + k.slice(1)}</span>
            {k === "title" ? (
              <input
                id={`edit-${k}`}
                value={draft[k]}
                onChange={(e) => setDraft({ ...draft, [k]: e.target.value })}
              />
            ) : (
              <textarea
                id={`edit-${k}`}
                rows={2}
                value={draft[k]}
                onChange={(e) => setDraft({ ...draft, [k]: e.target.value })}
              />
            )}
          </label>
        ))}
        <label className="field">
          <span>Spans (JSON, dates as YYYY or YYYY-MM, until null for today)</span>
          <input
            className="mono !text-[13px]"
            value={spans}
            onChange={(e) => setSpans(e.target.value)}
          />
        </label>
        <div className="grid grid-cols-4 gap-2">
          <label className="field">
            <span>Lat</span>
            <input
              inputMode="decimal"
              value={draft.lat}
              onChange={(e) => setDraft({ ...draft, lat: Number(e.target.value) })}
            />
          </label>
          <label className="field">
            <span>Lon</span>
            <input
              inputMode="decimal"
              value={draft.lon}
              onChange={(e) => setDraft({ ...draft, lon: Number(e.target.value) })}
            />
          </label>
          <label className="field">
            <span>Size</span>
            <select
              value={draft.size}
              onChange={(e) => setDraft({ ...draft, size: e.target.value as EventEdit["size"] })}
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </label>
          <label className="field flex items-center justify-between gap-2">
            <span>Regional maps only</span>
            <input
              type="checkbox"
              className="!w-5"
              checked={draft.regional}
              onChange={(e) => setDraft({ ...draft, regional: e.target.checked })}
            />
          </label>
        </div>
        {error && <p className="error">{error}</p>}
        <div className="flex gap-2">
          <button type="submit" className={`${button} bg-ink text-white`} disabled={busy}>
            Save
          </button>
          <button type="button" className={outline} onClick={() => setMode("idle")}>
            Cancel
          </button>
        </div>
      </form>
    );

  return (
    <div className="flex flex-col gap-2">
      {mode === "merge" && (
        <div className="flex gap-2">
          <label className="field flex-1">
            <span>Merge into the event with this id (its sources are kept there)</span>
            <input
              value={into}
              onChange={(e) => setInto(e.target.value.trim())}
              placeholder="two-sicilies"
            />
          </label>
          <button
            type="button"
            className={`${button} bg-ink text-white`}
            disabled={busy || !into}
            onClick={() => run(() => api.merge.mutate({ id, into }))}
          >
            Merge
          </button>
        </div>
      )}
      {mode === "reject" && (
        <div className="flex gap-2">
          <label className="field flex-1">
            <span>Why not (shown to the sender)</span>
            <input
              value={note}
              maxLength={300}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Too small to show on desk globes"
            />
          </label>
          <button
            type="button"
            className={`${button} bg-ink text-white`}
            disabled={busy}
            onClick={() => run(() => api.reject.mutate({ id, note }))}
          >
            Reject
          </button>
        </div>
      )}
      {error && <p className="error">{error}</p>}
      <div className="flex flex-wrap items-center gap-2">
        {status === "waiting" && (
          <button
            type="button"
            className={`${button} !pr-1.5 gap-3 bg-ink text-[#f5f1e6]`}
            disabled={busy}
            onClick={() => run(() => api.approve.mutate({ id }))}
          >
            Approve for trial
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-red">→</span>
          </button>
        )}
        {(status === "waiting" || status === "trial") && (
          <button
            type="button"
            className={outline}
            disabled={busy}
            onClick={() => run(() => api.goLive.mutate({ id }))}
          >
            Skip the trial, go live
          </button>
        )}
        {(status === "trial" || status === "live") && (
          <button
            type="button"
            className={outline}
            disabled={busy}
            onClick={() => run(() => api.pause.mutate({ id }))}
          >
            Back to waiting
          </button>
        )}
        {status !== "rejected" && (
          <>
            <button type="button" className={outline} onClick={() => setMode("edit")}>
              Edit
            </button>
            {status === "waiting" && (
              <button
                type="button"
                className={outline}
                onClick={() => setMode(mode === "merge" ? "idle" : "merge")}
              >
                Merge into…
              </button>
            )}
            <button
              type="button"
              className={outline}
              onClick={() => setMode(mode === "reject" ? "idle" : "reject")}
            >
              Reject
            </button>
          </>
        )}
        <span className="ml-auto text-[12px] text-faint">
          {status === "waiting"
            ? "Approving starts a 50-globe trial."
            : status === "trial"
              ? "Goes live by itself at 80% agreement."
              : ""}
        </span>
      </div>
    </div>
  );
}
