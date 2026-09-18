"use client";

import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { TicketReportCard } from "@/components/ticket-report-card";
import type { Language } from "@/lib/queue-presentation";
import type { QueueStore } from "@/lib/queues";
import { ticketCopy } from "@/lib/ticket-copy";
import {
  fromHongKongInput,
  hongKongInput,
  type TicketErrors,
  type TicketReport,
} from "@/lib/ticket-reports";

type TicketData = { reports: TicketReport[]; stores: QueueStore[]; feedAvailable: boolean };

export function TicketTracker({ initialStoreId }: { initialStoreId: string }) {
  const [language, setLanguage] = useState<Language>("zh-HK");
  const [data, setData] = useState<TicketData | null>(null);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [refreshing, setRefreshing] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [errors, setErrors] = useState<TicketErrors>({});
  const [storeId, setStoreId] = useState(initialStoreId);
  const [number, setNumber] = useState("");
  const [justNow, setJustNow] = useState(true);
  const [takenValue, setTakenValue] = useState("");
  const [now, setNow] = useState(0);
  const [announcement, setAnnouncement] = useState("");
  const form = useRef<HTMLFormElement>(null);
  const mutationVersion = useRef(0);
  const text = ticketCopy[language];
  const hasReports = Boolean(data?.reports.length);

  useEffect(() => {
    const stored = localStorage.getItem("sushiro-language");
    if (stored === "en" || stored === "zh-HK") setLanguage(stored);
    setNow(Date.now());
    setTakenValue(hongKongInput(new Date()));
    const interval = setInterval(() => {
      setNow(Date.now());
      setRefreshVersion((value) => value + 1);
    }, 60_000);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);
  useEffect(() => {
    const controller = new AbortController();
    const startedAtVersion = mutationVersion.current;
    setRefreshing(true);
    fetch(`/api/tickets?refresh=${refreshVersion}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("load");
        const result = (await response.json()) as TicketData;
        if (!controller.signal.aborted && startedAtVersion === mutationVersion.current) {
          setData(result);
          setLoadError(false);
          setNow(Date.now());
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setLoadError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setRefreshing(false);
      });
    return () => controller.abort();
  }, [refreshVersion]);

  function updateReport(report: TicketReport) {
    mutationVersion.current++;
    setData((current) =>
      current
        ? {
            ...current,
            reports: [report, ...current.reports.filter(({ id }) => id !== report.id)].slice(0, 20),
          }
        : current,
    );
    setNow(Date.now());
  }

  async function submit(fields: FormData) {
    setSaving(true);
    setSaveError(false);
    setErrors({});
    setAnnouncement("");
    try {
      const response = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId: Number(fields.get("storeId")),
          ticketNumber: fields.get("ticketNumber"),
          takenAt: justNow ? null : (fromHongKongInput(String(fields.get("takenAt") ?? "")) ?? ""),
        }),
      });
      const result = (await response.json()) as { report?: TicketReport; errors?: TicketErrors };
      if (!response.ok || !result.report) {
        if (result.errors) {
          setErrors(result.errors);
          const field = Object.keys(result.errors)[0];
          requestAnimationFrame(() => {
            const control = form.current?.elements.namedItem(field ?? "");
            if (control instanceof HTMLElement) control.focus();
          });
        } else setSaveError(true);
        return;
      }
      updateReport(result.report);
      setNumber("");
      setJustNow(true);
      setAnnouncement(text.added);
      requestAnimationFrame(() => document.getElementById("ticket-reports")?.focus());
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell
      activePage="tickets"
      language={language}
      isRefreshing={refreshing}
      onLanguageChange={(value) => {
        setLanguage(value);
        localStorage.setItem("sushiro-language", value);
      }}
      onRefresh={() => setRefreshVersion((value) => value + 1)}
    >
      <div className="ticket-page">
        <header className="ticket-page-heading">
          <h1>{text.title}</h1>
          <p>{text.intro}</p>
        </header>
        <p className="ticket-announcement" role="status">
          {announcement}
        </p>
        {loadError ? (
          <p className="ticket-error" role="alert">
            {text.loadError}{" "}
            <button type="button" onClick={() => setRefreshVersion((value) => value + 1)}>
              {text.retry}
            </button>
          </p>
        ) : null}
        {data && !data.feedAvailable ? (
          <p className="ticket-feed-notice" role="status">
            {text.feedUnavailable}
          </p>
        ) : null}
        <div className={hasReports ? "ticket-layout ticket-layout-has-reports" : "ticket-layout"}>
          <section className="ticket-entry" aria-labelledby="ticket-entry-heading">
            <h2 id="ticket-entry-heading">{text.newTicket}</h2>
            <form
              ref={form}
              onSubmit={(event) => {
                event.preventDefault();
                void submit(new FormData(event.currentTarget));
              }}
            >
              <div className="ticket-field">
                <label htmlFor="ticket-store">{text.branch}</label>
                <select
                  id="ticket-store"
                  name="storeId"
                  required
                  value={storeId}
                  onChange={(event) => setStoreId(event.target.value)}
                  disabled={!data?.stores.length}
                  aria-invalid={Boolean(errors.storeId)}
                  aria-describedby={errors.storeId ? "store-error" : undefined}
                >
                  <option value="">{!data && refreshing ? text.loading : text.chooseBranch}</option>
                  {[...(data?.stores ?? [])]
                    .sort((a, b) =>
                      (language === "en" ? a.nameEn : a.name).localeCompare(
                        language === "en" ? b.nameEn : b.name,
                        language,
                      ),
                    )
                    .map((store) => (
                      <option key={store.id} value={store.id}>
                        {language === "en" ? store.nameEn || store.name : store.name}
                      </option>
                    ))}
                </select>
                {errors.storeId ? (
                  <p className="ticket-error" id="store-error">
                    {text.store}
                  </p>
                ) : null}
              </div>
              <div className="ticket-field">
                <label htmlFor="ticket-number">{text.number}</label>
                <input
                  id="ticket-number"
                  name="ticketNumber"
                  required
                  type="text"
                  autoComplete="off"
                  maxLength={9}
                  placeholder={text.example}
                  value={number}
                  onChange={(event) => setNumber(event.target.value)}
                  aria-invalid={Boolean(errors.ticketNumber)}
                  aria-describedby={errors.ticketNumber ? "number-error" : undefined}
                />
                {errors.ticketNumber ? (
                  <p className="ticket-error" id="number-error">
                    {text.ticket}
                  </p>
                ) : null}
              </div>
              <fieldset className="ticket-when">
                <legend>{text.taken}</legend>
                <div>
                  <label>
                    <input
                      type="radio"
                      name="when"
                      checked={justNow}
                      onChange={() => setJustNow(true)}
                    />
                    {text.now}
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="when"
                      checked={!justNow}
                      onChange={() => {
                        setJustNow(false);
                        setTakenValue(hongKongInput(new Date()));
                      }}
                    />
                    {text.earlier}
                  </label>
                </div>
              </fieldset>
              {!justNow ? (
                <div className="ticket-field">
                  <label htmlFor="ticket-taken">
                    {text.takenAt} <span className="ticket-label-note">{text.timeZone}</span>
                  </label>
                  <input
                    id="ticket-taken"
                    name="takenAt"
                    type="datetime-local"
                    step="1"
                    required
                    defaultValue={takenValue}
                    min={hongKongInput(new Date(Date.now() - 24 * 60 * 60_000))}
                    max={hongKongInput(new Date())}
                    aria-invalid={Boolean(errors.takenAt)}
                    aria-describedby={errors.takenAt ? "taken-error" : undefined}
                  />
                  {errors.takenAt ? (
                    <p className="ticket-error" id="taken-error">
                      {text.takenTime}
                    </p>
                  ) : null}
                </div>
              ) : null}
              <button
                className="ticket-primary ticket-submit"
                type="submit"
                disabled={saving || !data?.stores.length}
              >
                {saving ? text.saving : text.save}
              </button>
              {saveError ? (
                <p className="ticket-error" role="alert">
                  {text.saveError}
                </p>
              ) : null}
            </form>
          </section>
          {hasReports && data ? (
            <section className="ticket-reports" aria-labelledby="ticket-reports">
              <h2 id="ticket-reports" tabIndex={-1}>
                {text.reports}
              </h2>
              {data.reports.map((report) => (
                <TicketReportCard
                  key={report.id}
                  report={report}
                  language={language}
                  now={now}
                  store={
                    loadError ? undefined : data.stores.find(({ id }) => id === report.storeId)
                  }
                  onUpdate={updateReport}
                />
              ))}
            </section>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}
