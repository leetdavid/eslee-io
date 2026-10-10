"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useLanguage } from "@/components/language-provider";
import { QueueAreaChart } from "@/components/queue-area-chart";
import { QueueLegend } from "@/components/queue-legend";
import { StatsChart } from "@/components/stats-chart";
import { Button } from "@/components/ui/button";
import { copy, fill, type Language, waitBand } from "@/lib/queue-presentation";
import type { QueueHistory } from "@/lib/queues";
import { useSharedJson } from "@/lib/shared-json";
import { dailyStats, hongKongDate, hongKongDayRange, patternStats, shiftDate } from "@/lib/stats";
import { statsCopy } from "@/lib/stats-copy";

type StatsViewName = "daily" | "patterns";

type StatsViewProps = {
  initialDate: string | null;
  initialView: StatsViewName;
};

// Rows shown in the day's branch table before "Show all".
const branchPreview = 8;

function branchName(branch: { name: string; nameEn: string }, language: Language) {
  return language === "en" ? branch.nameEn || branch.name : branch.name.replace(/店$/, "");
}

export function StatsView({ initialDate, initialView }: StatsViewProps) {
  const { language, setLanguage } = useLanguage();
  const [view, setView] = useState<StatsViewName>(initialView);
  const [date, setDate] = useState(initialDate);
  const [showAllBranches, setShowAllBranches] = useState(false);
  const today = hongKongDate(new Date());
  // issuing=1 leaves out the hours a branch was not issuing tickets, so they do not read as
  // a zero wait.
  const query = `${view === "patterns" ? "hours=720" : `date=${date}`}&issuing=1`;
  const resource = useSharedJson<QueueHistory>(date ? `/api/queues/charts?${query}` : null, {
    maxAgeMs: 5 * 60_000,
  });
  const history = resource.data;
  const status = history ? "ready" : resource.error ? "error" : "loading";

  useEffect(() => {
    // Without a date in the URL, open on yesterday: the latest complete day.
    setDate((current) => current ?? shiftDate(hongKongDate(new Date()), -1));
  }, []);

  useEffect(() => {
    if (!date) {
      return;
    }

    const address = view === "patterns" ? "view=patterns" : `date=${date}`;
    window.history.replaceState(null, "", `/stats?${address}`);
  }, [date, view]);

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
  const daily = view === "daily" && history ? dailyStats(history) : null;
  const patterns = view === "patterns" && history ? patternStats(history) : null;
  const longest = daily?.branches[0];
  const branches = daily
    ? showAllBranches
      ? daily.branches
      : daily.branches.slice(0, branchPreview)
    : [];
  const slotLabel = (slot: { hour: number; weekday: number }) =>
    fill(stats.slot, {
      day: stats.weekdays[slot.weekday] ?? "",
      from: String(slot.hour).padStart(2, "0"),
      to: String(slot.hour + 2).padStart(2, "0"),
    });

  return (
    <AppShell
      activePage="stats"
      isRefreshing={resource.pending}
      language={language}
      onLanguageChange={setLanguage}
      onRefresh={resource.refresh}
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
          {view === "daily" && date ? (
            <div className="stats-date">
              <Button
                aria-label={stats.previousDay}
                onClick={() => setDate(shiftDate(date, -1))}
                size="icon"
                variant="secondary"
              >
                <ChevronLeft size={16} />
              </Button>
              <input
                aria-label={stats.date}
                max={today}
                onChange={(event) => {
                  if (hongKongDayRange(event.target.value)) {
                    setDate(event.target.value);
                  }
                }}
                type="date"
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
            </div>
          ) : null}
        </div>

        {status === "loading" ? (
          <p aria-live="polite" className="stats-status">
            {text.loading}
          </p>
        ) : null}

        {status === "error" ? (
          <section className="stats-status" role="alert">
            <p>{text.unavailable}</p>
            <Button onClick={resource.refresh} variant="secondary">
              {text.retry}
            </Button>
          </section>
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
                        <th scope="row">{branchName(branch, language)}</th>
                        <td className="numeric">
                          <strong>
                            {branch.peak} {text.minutes}
                          </strong>{" "}
                          <span>
                            {fill(stats.peakAt, { time: branch.peakAt ? time(branch.peakAt) : "" })}
                          </span>
                        </td>
                        <td className="numeric">
                          {Math.round(branch.average)} {text.minutes}
                        </td>
                        <td className="numeric">
                          {branch.hoursOver30} {stats.hours}
                        </td>
                        <td>
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
                  variant="ghost"
                >
                  {showAllBranches
                    ? stats.showFewer
                    : fill(stats.showAll, { count: daily.branches.length })}
                </Button>
              ) : null}
            </section>
          </>
        ) : null}

        {patterns && !patterns.busiest ? <p className="stats-status">{stats.noPatterns}</p> : null}

        {patterns?.busiest && patterns.quietest && patterns.calmestDay ? (
          <>
            <div className="stats-cards stats-cards-three">
              <div className="stats-card">
                <p className="caption">{stats.busiestSlot}</p>
                <p className="stats-figure">
                  <strong className="figure-l">{Math.round(patterns.busiest.wait)}</strong>{" "}
                  {stats.minAverage}
                </p>
                <p className="caption">{slotLabel(patterns.busiest)}</p>
              </div>
              <div className="stats-card">
                <p className="caption">{stats.quietestSlot}</p>
                <p className="stats-figure">
                  <strong className="figure-l">{Math.round(patterns.quietest.wait)}</strong>{" "}
                  {stats.minAverage}
                </p>
                <p className="caption">{slotLabel(patterns.quietest)}</p>
              </div>
              <div className="stats-card">
                <p className="caption">{stats.calmestDay}</p>
                <p className="stats-figure">
                  <strong className="figure-l">
                    {stats.weekdays[patterns.calmestDay.weekday]}
                  </strong>
                </p>
                <p className="caption">
                  {fill(stats.dayAverage, { wait: Math.round(patterns.calmestDay.wait) })}
                </p>
              </div>
            </div>

            <div className="stats-split">
              <section className="stats-card">
                <h2>{stats.heatTitle}</h2>
                <p className="caption">
                  {fill(stats.heatNote, {
                    from: patterns.from ? dayMonth.format(new Date(patterns.from)) : "",
                    to: patterns.to ? dayMonth.format(new Date(patterns.to)) : "",
                  })}
                </p>
                <div className="stats-table-scroll">
                  <table className="heat">
                    <thead>
                      <tr>
                        <td />
                        {patterns.slots.map((slot) => (
                          <th key={slot} scope="col">
                            {String(slot).padStart(2, "0")}:00
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {patterns.grid.map((row, weekday) => (
                        <tr key={stats.weekdays[weekday]}>
                          <th scope="row">{stats.weekdays[weekday]}</th>
                          {row.map((wait, index) =>
                            wait === null ? (
                              <td key={patterns.slots[index]} />
                            ) : (
                              <td
                                data-band={waitBand(Math.round(wait))}
                                key={patterns.slots[index]}
                              >
                                {Math.round(wait)}
                              </td>
                            ),
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <QueueLegend language={language} />
              </section>

              <section className="stats-card">
                <h2>{stats.compareTitle}</h2>
                <p className="caption">{stats.compareNote}</p>
                <ul className="stats-bars">
                  {patterns.branches.map((branch) => (
                    <li
                      className="stats-bar"
                      data-band={waitBand(Math.round(branch.wait))}
                      key={branch.storeId}
                    >
                      <span>{branchName(branch, language)}</span>
                      <span>
                        <i
                          style={{
                            width: `${(branch.wait / (patterns.branches[0]?.wait || 1)) * 100}%`,
                          }}
                        />
                      </span>
                      <strong>
                        {Math.round(branch.wait)} {text.minutes}
                      </strong>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}
