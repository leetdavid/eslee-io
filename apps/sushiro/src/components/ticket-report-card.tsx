"use client";

import { Bell, Check, Share } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fill, type Language } from "@/lib/queue-presentation";
import type { QueueStore } from "@/lib/queues";
import {
  type AlertPermission,
  disablePush,
  enableNotifications,
  enablePush,
  needsHomeScreen,
  notificationPermission,
  showTicketAlert,
  useTicketAlert,
} from "@/lib/ticket-alerts";
import { ticketCopy } from "@/lib/ticket-copy";
import { nearCalledNumbers, ticketProgress } from "@/lib/ticket-progress";
import { alertOwed, ticketAlertMessage } from "@/lib/ticket-push";
import { fromHongKongInput, hongKongInput, type TicketReport } from "@/lib/ticket-reports";

export function TicketReportCard({
  report,
  language,
  now,
  store,
  onUpdate,
  pushKey,
  hasPush,
  onPushChange,
}: {
  report: TicketReport;
  language: Language;
  now: number;
  store?: QueueStore;
  onUpdate: (report: TicketReport) => void;
  // The key to subscribe to pushed alerts with, or null where the server cannot push.
  pushKey: string | null;
  // Whether the server pushes this ticket's alerts, so they arrive with the page closed.
  hasPush: boolean;
  onPushChange: (on: boolean) => void;
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
  const isWaiting = !report.calledAt && !report.leftAt && !expired;
  // How close the ticket is, from the numbers the branch is calling now.
  const progress =
    isWaiting && store ? ticketProgress(report.ticketNumber, store.storeQueue) : null;
  const state = report.calledAt
    ? "confirmed"
    : report.leftAt
      ? "left"
      : report.firstSeenCalledAt
        ? "seen"
        : expired
          ? "expired"
          : (progress?.state ?? "waiting");
  const isClose = state === "near" || state === "due";
  const storeLabel = language === "en" ? report.storeNameEn || report.storeName : report.storeName;
  const alert = useTicketAlert(report.id);
  const [permission, setPermission] = useState<AlertPermission | null>(null);
  const [homeScreenHint, setHomeScreenHint] = useState(false);
  // True while turning alerts on, until it is known whether the server will push them.
  const [connecting, setConnecting] = useState(false);
  // The alert this page still has to show: nearly called, then once more when the number comes
  // up. A ticket the server pushes is left to the server, so it never alerts twice.
  const alertKind =
    alert.isOn && progress && !hasPush && !connecting
      ? alertOwed(progress.state, {
          due: alert.fired.includes("due"),
          near: alert.fired.includes("near"),
        })
      : null;
  const alertMessage = ticketAlertMessage(alertKind ?? "near", language, {
    count: progress?.ahead ?? 0,
    latest: progress?.latest ?? "",
    number: report.ticketNumber,
    store: storeLabel,
  });
  const { isOn: alertIsOn, markFired, setOn: setAlertOn } = alert;

  useEffect(() => {
    if (alertIsOn) {
      setPermission(notificationPermission());
      setHomeScreenHint(needsHomeScreen());
    }
  }, [alertIsOn]);
  useEffect(() => {
    if (alertKind) {
      markFired(alertKind);
      void showTicketAlert(alertMessage.title, alertMessage.body, report.id, alertKind);
    }
  }, [alertKind, alertMessage.body, alertMessage.title, markFired, report.id]);

  async function toggleAlert() {
    setAlertOn(!alertIsOn);

    if (alertIsOn) {
      if (hasPush) {
        onPushChange(false);
        void disablePush(report.id);
      }

      return;
    }

    setConnecting(true);

    try {
      const allowed = await enableNotifications();
      setPermission(allowed);

      if (allowed === "granted" && pushKey && (await enablePush(report.id, pushKey, language))) {
        onPushChange(true);
      }
    } finally {
      setConnecting(false);
    }
  }

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
    <article
      aria-labelledby={`ticket-${report.id}`}
      className="ticket-report"
      data-close={isClose || undefined}
    >
      <div className="ticket-report-heading">
        <div>
          <h3 id={`ticket-${report.id}`}>{storeLabel}</h3>
          <p className="ticket-number">
            <span>{text.number}</span>
            {report.ticketNumber}
          </p>
        </div>
        {isClose ? (
          <span className="ticket-close-badge">{text[state]}</span>
        ) : (
          <Badge>
            {state === "confirmed" ? <Check className="mr-1 inline-block" size={12} /> : null}
            {text[state]}
          </Badge>
        )}
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
      {isWaiting ? (
        <div className="ticket-live">
          <p className="ticket-live-numbers">
            <span>{text.feed}</span>
            {store && store.storeQueue.length > 0 ? (
              <span className="ticket-chips">
                {store.storeQueue.map((ticket) => (
                  <span className="chip" key={ticket}>
                    {ticket}
                  </span>
                ))}
              </span>
            ) : (
              <strong>{store ? text.noCalls : text.feedUnavailable}</strong>
            )}
          </p>
          {progress && progress.ahead !== null ? (
            <p aria-live="polite" className="ticket-to-go">
              <span>{text.toGoLabel}</span>
              <strong>
                {progress.ahead === 0
                  ? text.anyMoment
                  : fill(text.toGoValue, { count: progress.ahead })}
              </strong>
            </p>
          ) : null}
        </div>
      ) : null}
      {isWaiting ? (
        <div className="ticket-alert">
          <Bell aria-hidden="true" size={16} />
          <p>
            {alertIsOn
              ? state === "due"
                ? text.alertDueNote
                : state === "near"
                  ? text.alertNearNote
                  : fill(text.alertOnNote, { count: nearCalledNumbers })
              : text.alertOff}
            {alertIsOn ? (
              <span className="caption">
                {hasPush
                  ? text.alertPushOn
                  : permission === "blocked"
                    ? text.alertPageOnly
                    : text.alertKeepOpen}
              </span>
            ) : null}
          </p>
          <Button
            aria-pressed={alertIsOn}
            onClick={() => void toggleAlert()}
            size="compact"
            variant={alertIsOn ? "primary" : "secondary"}
          >
            {alertIsOn ? text.alertIsOn : text.alertTurnOn}
          </Button>
        </div>
      ) : null}
      {isWaiting && alertIsOn && homeScreenHint ? (
        <p className="ticket-alert-hint">
          <Share aria-hidden="true" size={16} />
          <span>
            <strong>{text.alertHomeScreenLead}</strong>
            {language === "en" ? " " : ""}
            {text.alertHomeScreen}
          </span>
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
            <Button className="h-11" disabled={saving} type="submit">
              {saving ? text.saving : text.confirm}
            </Button>
            <Button
              className="h-11"
              disabled={saving}
              onClick={() => {
                setEditing(false);
                setError(null);
              }}
              type="button"
              variant="ghost"
            >
              {text.cancel}
            </Button>
          </div>
        </form>
      ) : (
        <div className="ticket-actions">
          <Button
            className={report.calledAt ? "h-11" : "h-11 flex-1"}
            disabled={saving}
            onClick={() => {
              setCalledValue(hongKongInput(new Date(report.calledAt ?? Date.now())));
              setError(null);
              setEditing(true);
            }}
            variant={report.calledAt ? "secondary" : "primary"}
          >
            {report.calledAt ? text.editCall : text.called}
          </Button>
          {!report.calledAt && !report.leftAt ? (
            <Button
              className="h-11"
              disabled={saving}
              onClick={() => void update("leave")}
              variant="ghost"
            >
              {text.leave}
            </Button>
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
