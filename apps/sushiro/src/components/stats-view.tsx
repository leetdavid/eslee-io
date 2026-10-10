"use client";

import { ChevronDown, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { BranchPicker } from "@/components/branch-picker";
import { DatePicker } from "@/components/date-picker";
import { useLanguage } from "@/components/language-provider";
import { LoadError } from "@/components/load-error";
import { QueueAreaChart } from "@/components/queue-area-chart";
import { StatsBranchDay } from "@/components/stats-branch-day";
import { StatsChart } from "@/components/stats-chart";
import { StatsPatterns } from "@/components/stats-patterns";
import { Button } from "@/components/ui/button";
import type { PatternsResponse } from "@/lib/patterns";
import { copy, fill, type Language, waitBand } from "@/lib/queue-presentation";
import type { QueueHistory, QueueSnapshot } from "@/lib/queues";
import { useSharedJson } from "@/lib/shared-json";
import { dailyStats, hongKongDate, hongKongDayRange, shiftDate } from "@/lib/stats";
import { statsCopy } from "@/lib/stats-copy";

type StatsViewName = "daily" | "patterns";

type StatsViewProps = {
  initialBranch: number | null;
  initialDate: string | null;
  initialView: StatsViewName;
};

// Rows shown in the day's branch table before "Show all".
const branchPreview = 8;

function branchName(branch: { name: string; nameEn: string }, language: Language) {
  return language === "en" ? branch.nameEn || branch.name : branch.name.replace(/店$/, "");
}

export function StatsView({ initialBranch, initialDate, initialView }: StatsViewProps) {
  const { language, setLanguage } = useLanguage();
  const [view, setView] = useState<StatsViewName>(initialView);
  const [date, setDate] = useState(initialDate);
  const [branchId, setBranchId] = useState(initialBranch);
  const [showAllBranches, setShowAllBranches] = useState(false);
  const today = hongKongDate(new Date());
  // issuing=1 leaves out the hours a branch was not issuing tickets, so they do not read as
  // a zero wait.
  const dayResource = useSharedJson<QueueHistory>(
    view === "daily" && date ? `/api/queues/charts?date=${date}&issuing=1` : null,
    { maxAgeMs: 5 * 60_000 },
  );
  const patternResource = useSharedJson<PatternsResponse>(
    view === "patterns" ? `/api/queues/patterns${branchId ? `?storeId=${branchId}` : ""}` : null,
    { maxAgeMs: 10 * 60_000 },
  );
  const resource = view === "daily" ? dayResource : patternResource;
  const history = dayResource.data;
  // The live feed supplies the branch list for the picker.
  const feed = useSharedJson<QueueSnapshot>("/api/queues", { maxAgeMs: 60_000 });
  // One branch's last 30 days at half-hour detail, for its own Daily history.
  const branchResource = useSharedJson<QueueHistory>(
    branchId ? `/api/queues/charts?storeId=${branchId}&hours=720&issuing=1` : null,
    { maxAgeMs: 5 * 60_000 },
  );
  const branchHistory = branchResource.data?.stores[0] ?? null;
  const waitingForBranch = branchId !== null && view === "daily" && !branchResource.data;
  const status = (view === "daily" ? history && !waitingForBranch : patternResource.data)
    ? "ready"
    : resource.error || (waitingForBranch && branchResource.error)
      ? "error"
      : "loading";
  const firstDate =
    useSharedJson<{ first: string | null }>("/api/queues/range", { maxAgeMs: 60 * 60_000 }).data
      ?.first ?? null;

  useEffect(() => {
    // Without a date in the URL, open on yesterday: the latest complete day.
    setDate((current) => current ?? shiftDate(hongKongDate(new Date()), -1));
  }, []);

  useEffect(() => {
    if (!date) {
      return;
    }

    const address = view === "patterns" ? "view=patterns" : `date=${date}`;
    window.history.replaceState(
      null,
      "",
      `/stats?${address}${branchId ? `&branch=${branchId}` : ""}`,
    );
  }, [branchId, date, view]);

  const text = copy[language];
  const stats = statsCopy[language];
  const clock = new Intl.DateTimeFormat(language, {
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    timeZone: "Asia/Hong_Kong",
  });
  const dayMonth = new Intl.DateTimeFormat(language, {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Hong_Kong",
  });
  const time = (collectedAt: string) => clock.format(new Date(collectedAt));
  const range = date ? hongKongDayRange(date) : null;
  const selectedBranch =
    branchId === null
      ? null
      : (branchHistory ??
        history?.stores.find(({ storeId }) => storeId === branchId) ??
        patternResource.data?.dinner.find(({ storeId }) => storeId === branchId) ??
        feed.data?.stores.find(({ id }) => id === branchId) ??
        null);
  const selectedName = selectedBranch ? branchName(selectedBranch, language) : "";
  const daily = view === "daily" && history && branchId === null ? dailyStats(history) : null;
  const longest = daily?.branches[0];
  const branches = daily
    ? showAllBranches
      ? daily.branches
      : daily.branches.slice(0, branchPreview)
    : [];

  return (
    <AppShell
      activePage="stats"
      isRefreshing={resource.pending}
      language={language}
      onLanguageChange={setLanguage}
      onRefresh={resource.refresh}
      updatedAt={resource.loadedAt}
    >
      <div className="stats">
        <header>
          <h1>{stats.title}</h1>
          <p>{stats.intro}</p>
        </header>

        <div className="stats-controls">
          <fieldset aria-label={stats.title} className="segmented segmented-large">
            <button aria-pressed={view === "daily"} onClick={() => setView("daily")} type="button">
              {stats.daily}
            </button>
            <button
              aria-pressed={view === "patterns"}
              onClick={() => setView("patterns")}
              type="button"
            >
              {stats.patterns}
            </button>
          </fieldset>
          <div className="stats-date">
            {view === "daily" && date ? (
              <>
                <Button
                  aria-label={stats.previousDay}
                  disabled={firstDate !== null && date <= firstDate}
                  onClick={() => setDate(shiftDate(date, -1))}
                  size="icon"
                  variant="secondary"
                >
                  <ChevronLeft size={16} />
                </Button>
                <DatePicker
                  first={firstDate}
                  label={stats.date}
                  language={language}
                  last={today}
                  note={
                    firstDate
                      ? fill(stats.recordsFrom, {
                          date: dayMonth.format(new Date(`${firstDate}T00:00:00+08:00`)),
                        })
                      : undefined
                  }
                  onChange={setDate}
                  todayLabel={stats.today}
                  value={date}
                />
                <Button
                  aria-label={stats.nextDay}
                  disabled={date >= today}
                  onClick={() => setDate(shiftDate(date, 1))}
                  size="icon"
                  variant="secondary"
                >
                  <ChevronRight size={16} />
                </Button>
              </>
            ) : null}
            {branchId !== null && selectedName ? (
              <Button
                aria-label={`${selectedName}: ${stats.clearBranch}`}
                className="branch-chip"
                onClick={() => setBranchId(null)}
                trailingIcon={X}
                variant="secondary"
              >
                {selectedName}
              </Button>
            ) : (
              <BranchPicker
                language={language}
                onChoose={(store) => setBranchId(store?.id ?? null)}
                selectedId={branchId}
                stores={feed.data?.stores ?? []}
                trigger={
                  <Button className="branch-trigger" trailingIcon={ChevronDown} variant="secondary">
                    {text.allBranches}
                  </Button>
                }
              />
            )}
          </div>
        </div>

        {status === "loading" ? (
          <p aria-live="polite" className="stats-status">
            {text.loading}
          </p>
        ) : null}

        {status === "error" ? (
          <LoadError
            language={language}
            onRetry={() => {
              resource.refresh();
              branchResource.refresh();
            }}
          />
        ) : null}

        {status === "ready" && view === "daily" && date && branchId !== null ? (
          <StatsBranchDay
            date={date}
            language={language}
            name={selectedName}
            onSelectDate={setDate}
            points={branchHistory?.points ?? []}
          />
        ) : null}

        {daily && daily.branches.length === 0 ? (
          <p className="stats-status">{stats.noData}</p>
        ) : null}

        {daily && longest && daily.busiest && daily.quietest && range ? (
          <>
            <div className="stats-cards">
              <div className="stats-card">
                <p className="caption">{stats.busiestTime}</p>
                <p className="stats-figure">
                  <strong className="figure-l">{time(daily.busiest.collectedAt)}</strong>
                </p>
                <p className="caption">
                  {fill(stats.averageAcross, { wait: Math.round(daily.busiest.wait) })}
                </p>
              </div>
              <div className="stats-card">
                <p className="caption">{stats.longestWait}</p>
                <p className="stats-figure">
                  <strong className="figure-l">{longest.peak}</strong> {text.minutes}
                </p>
                <p className="caption">
                  {fill(stats.longestAt, {
                    store: branchName(longest, language),
                    time: longest.peakAt ? time(longest.peakAt) : "",
                  })}
                </p>
              </div>
              <div className="stats-card">
                <p className="caption">{stats.overAnHour}</p>
                <p className="stats-figure">
                  <strong className="figure-l">{daily.overAnHour}</strong>{" "}
                  {fill(stats.ofBranches, { count: daily.branches.length })}
                </p>
                <p className="caption">{stats.reachedHour}</p>
              </div>
              <div className="stats-card">
                <p className="caption">{stats.quietestBranch}</p>
                <p className="stats-figure">
                  <strong className="figure-l">{Math.round(daily.quietest.average)}</strong>{" "}
                  {stats.minAverage}
                </p>
                <p className="caption">{branchName(daily.quietest, language)}</p>
              </div>
            </div>

            <section className="stats-card">
              <h2>{stats.chartTitle}</h2>
              <p className="caption">{fill(stats.chartNote, { count: daily.branches.length })}</p>
              <StatsChart
                label={stats.chartTitle}
                markerLabel={`${Math.round(daily.busiest.wait)} ${text.minutes} · ${time(daily.busiest.collectedAt)}`}
                points={daily.average}
              />
            </section>

            <section className="stats-card">
              <h2>{stats.branchesTitle}</h2>
              <p className="caption">{stats.branchesNote}</p>
              <div className="stats-table-scroll">
                <table className="stats-table">
                  <thead>
                    <tr>
                      <th>{stats.columnBranch}</th>
                      <th className="numeric">{stats.columnLongest}</th>
                      <th className="numeric">{stats.columnAverage}</th>
                      <th className="numeric">{stats.columnOver30}</th>
                      <th>{stats.columnDay}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {branches.map((branch) => (
                      <tr data-band={waitBand(branch.peak)} key={branch.storeId}>
                        <th scope="row">
                          <button
                            className="row-link"
                            onClick={() => setBranchId(branch.storeId)}
                            type="button"
                          >
                            {branchName(branch, language)}
                          </button>
                        </th>
                        <td className="numeric cell-peak">
                          <strong>
                            {branch.peak} {text.minutes}
                          </strong>{" "}
                          <span>
                            {fill(stats.peakAt, { time: branch.peakAt ? time(branch.peakAt) : "" })}
                          </span>
                        </td>
                        <td className="numeric cell-average" data-label={stats.averageShort}>
                          {Math.round(branch.average)} {text.minutes}
                        </td>
                        <td className="numeric cell-over" data-label={stats.columnOver30}>
                          {branch.hoursOver30} {stats.hours}
                        </td>
                        <td className="cell-spark">
                          <QueueAreaChart
                            end={range.to.valueOf()}
                            maximumWait={Math.max(30, branch.peak)}
                            points={branch.points}
                            start={range.from.valueOf() + 10 * 60 * 60_000}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {daily.branches.length > branchPreview ? (
                <Button
                  onClick={() => setShowAllBranches((showAll) => !showAll)}
                  size="compact"
                  variant="secondary"
                >
                  {showAllBranches
                    ? stats.showFewer
                    : fill(stats.showAll, { count: daily.branches.length })}
                </Button>
              ) : null}
            </section>
          </>
        ) : null}

        {status === "ready" && view === "patterns" && patternResource.data ? (
          <StatsPatterns
            branchId={branchId}
            data={patternResource.data}
            language={language}
            onSelectBranch={setBranchId}
            selectedName={selectedName}
          />
        ) : null}
      </div>
    </AppShell>
  );
}
