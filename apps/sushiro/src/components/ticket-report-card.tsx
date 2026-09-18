"use client";

import { useEffect, useRef, useState } from "react";
import type { Language } from "@/lib/queue-presentation";
import type { QueueStore } from "@/lib/queues";
import { ticketCopy } from "@/lib/ticket-copy";
import { fromHongKongInput, hongKongInput, type TicketReport } from "@/lib/ticket-reports";

export function TicketReportCard({
  report,
  language,
  now,
  store,
  onUpdate,
}: {
  report: TicketReport;
  language: Language;
  now: number;
  store?: QueueStore;
  onUpdate: (report: TicketReport) => void;
}) {
  const text = ticketCopy[language];
  const [editing, setEditing] = useState(false);
  const [calledValue, setCalledValue] = useState("");
  const [error, setError] = useState<"calledTime" | "saveError" | null>(null);
  const [saving, setSaving] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (editing) input.current?.focus();
  }, [editing]);
  const time = (value: string) =>
    new Intl.DateTimeFormat(language, {
      timeZone: "Asia/Hong_Kong",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  const end = report.calledAt ?? report.leftAt;
  const elapsed = Math.max(
    0,
    Math.floor(((end ? Date.parse(end) : now) - Date.parse(report.takenAt)) / 60_000),
  );
  const expired =
    elapsed >= 1440 ||
    hongKongInput(new Date(now)).slice(0, 10) !==
      hongKongInput(new Date(report.takenAt)).slice(0, 10);
  const state = report.calledAt
    ? "confirmed"
    : report.leftAt
      ? "left"
      : report.firstSeenCalledAt
        ? "seen"
        : expired
          ? "expired"
          : "waiting";

  async function update(action: "called" | "leave", value = "") {
    const calledAt = fromHongKongInput(value);
    if (action === "called" && !calledAt) {
      setError("calledTime");
      input.current?.focus();
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/tickets/${report.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, calledAt }),
      });
      const result = (await response.json()) as {
        report?: TicketReport;
        errors?: { calledAt?: string };
      };
      if (!response.ok || !result.report) {
        setError(result.errors?.calledAt ? "calledTime" : "saveError");
        if (result.errors?.calledAt) input.current?.focus();
        return;
      }
      onUpdate(result.report);
      setEditing(false);
    } catch {
      setError("saveError");
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="ticket-report" aria-labelledby={`ticket-${report.id}`}>
      <div className="ticket-report-heading">
        <div>
          <h3 id={`ticket-${report.id}`}>
            {language === "en" ? report.storeNameEn || report.storeName : report.storeName}
          </h3>
          <p className="ticket-number">
            <span>{text.number}</span>
            {report.ticketNumber}
          </p>
        </div>
        <span className={`ticket-status ticket-status-${state}`}>{text[state]}</span>
      </div>
      <dl className="ticket-times">
        <div>
          <dt>{text.takenAt}</dt>
          <dd>
            <time dateTime={report.takenAt}>{time(report.takenAt)}</time>
          </dd>
        </div>
        <div>
          <dt>{report.calledAt ? text.waited : text.elapsed}</dt>
          <dd>
            {elapsed} {text.minutes}
          </dd>
        </div>
        {report.calledAt ? (
          <div>
            <dt>{text.calledAt}</dt>
            <dd>
              <time dateTime={report.calledAt}>{time(report.calledAt)}</time>
            </dd>
          </div>
        ) : null}
      </dl>
      {!report.calledAt && !report.leftAt && !expired ? (
        <p className="ticket-live-numbers">
          <span>{text.feed}</span>
          <strong>
            {store ? store.storeQueue.join(", ") || text.noCalls : text.feedUnavailable}
          </strong>
        </p>
      ) : null}
      {report.firstSeenCalledAt ? (
        <p className="ticket-sighting">
          {text.sighting}:{" "}
          <time dateTime={report.firstSeenCalledAt}>{time(report.firstSeenCalledAt)}</time>.{" "}
          {text.sightingNote}
        </p>
      ) : null}
      {report.calledAt ? (
        <p className="ticket-thanks" role="status">
          {text.thanks}
        </p>
      ) : null}
      {editing ? (
        <form
          className="ticket-call-form"
          onSubmit={(event) => {
            event.preventDefault();
            void update("called", String(new FormData(event.currentTarget).get("calledAt") ?? ""));
          }}
        >
          <label htmlFor={`called-${report.id}`}>
            {text.calledAt} <span className="ticket-label-note">{text.timeZone}</span>
          </label>
          <input
            ref={input}
            id={`called-${report.id}`}
            name="calledAt"
            type="datetime-local"
            step="1"
            required
            defaultValue={calledValue}
            min={hongKongInput(new Date(report.takenAt))}
            max={hongKongInput(
              new Date(Math.min(Date.now(), Date.parse(report.takenAt) + 24 * 60 * 60_000)),
            )}
            aria-invalid={error === "calledTime"}
            aria-describedby={error ? `error-${report.id}` : undefined}
          />
          <div className="ticket-actions">
            <button className="ticket-primary" disabled={saving} type="submit">
              {saving ? text.saving : text.confirm}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                setEditing(false);
                setError(null);
              }}
            >
              {text.cancel}
            </button>
          </div>
        </form>
      ) : (
        <div className="ticket-actions">
          <button
            className={report.calledAt ? "" : "ticket-primary"}
            type="button"
            disabled={saving}
            onClick={() => {
              setCalledValue(hongKongInput(new Date(report.calledAt ?? Date.now())));
              setError(null);
              setEditing(true);
            }}
          >
            {report.calledAt ? text.editCall : text.called}
          </button>
          {!report.calledAt && !report.leftAt ? (
            <button type="button" disabled={saving} onClick={() => void update("leave")}>
              {text.leave}
            </button>
          ) : null}
        </div>
      )}
      {error ? (
        <p className="ticket-error" id={`error-${report.id}`} role="alert">
          {text[error]}
        </p>
      ) : null}
    </article>
  );
}
