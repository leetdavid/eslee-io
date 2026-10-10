"use client";

import { useState } from "react";
import { QueueAreaChart } from "@/components/queue-area-chart";
import { StatsChart } from "@/components/stats-chart";
import { Button } from "@/components/ui/button";
import { copy, fill, type Language, waitBand } from "@/lib/queue-presentation";
import type { QueueHistoryPoint } from "@/lib/queues";
import { branchDailyStats, hongKongDayRange } from "@/lib/stats";
import { statsCopy } from "@/lib/stats-copy";

type StatsBranchDayProps = {
  date: string;
  language: Language;
  name: string;
  onSelectDate: (date: string) => void;
  // The branch's half-hour history over the last weeks, from the times it was issuing tickets.
  points: QueueHistoryPoint[];
};

// Days listed before "Show all".
const dayPreview = 7;

// Daily history for one branch: its day against the same weekday's usual range, then its
// recent days.
export function StatsBranchDay({
  date,
  language,
  name,
  onSelectDate,
  points,
}: StatsBranchDayProps) {
  const [showAllDays, setShowAllDays] = useState(false);
  const text = copy[language];
  const stats = statsCopy[language];
  const { day, days, usual, usualPeak, weekday } = branchDailyStats(points, date);
  const clock = new Intl.DateTimeFormat(language, {
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    timeZone: "Asia/Hong_Kong",
  });
  const dayLabel = new Intl.DateTimeFormat(language, {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Hong_Kong",
    weekday: "short",
  });
  const time = (collectedAt: string) => clock.format(new Date(collectedAt));
  const weekdayName = stats.weekdaysLong[weekday] ?? "";
  const visibleDays = showAllDays ? days : days.slice(0, dayPreview);

  if (!day) {
    return <p className="stats-status">{stats.noData}</p>;
  }

  const band = waitBand(day.peak);
  const halfHour = 30 * 60_000;
  const verdict = !usualPeak
    ? fill(stats.noUsual, { weekday: weekdayName })
    : day.peak > usualPeak.high
      ? fill(stats.peakHigher, { weekday: weekdayName })
      : day.peak < usualPeak.low
        ? fill(stats.peakLower, { weekday: weekdayName })
        : fill(stats.peakWithin, { weekday: weekdayName });

  return (
    <>
      <div className="stats-cards">
        <div className="stats-card">
          <p className="caption">{stats.longestWait}</p>
          <p className="stats-figure">
            <strong className="figure-l">{day.peak}</strong> {text.minutes}
          </p>
          <p className="caption">
            {fill(stats.peakAt, { time: day.peakAt ? time(day.peakAt) : "" })}
          </p>
        </div>
        <div className="stats-card">
          <p className="caption">{stats.columnAverage}</p>
          <p className="stats-figure">
            <strong className="figure-l">{Math.round(day.average)}</strong> {text.minutes}
          </p>
          <p className="caption">{stats.whileIssued}</p>
        </div>
        <div className="stats-card">
          <p className="caption">{stats.columnOver30}</p>
          <p className="stats-figure">
            <strong className="figure-l">{day.hoursOver30}</strong> {stats.hours}
          </p>
          <p className="caption">
            {day.over30From && day.over30To
              ? fill(stats.overWindow, {
                  from: time(day.over30From),
                  to: clock.format(new Date(Date.parse(day.over30To) + halfHour)),
                })
              : stats.neverOver30}
          </p>
        </div>
        <div className="stats-card">
          <p className="caption">{fill(stats.usualPeak, { weekday: weekdayName })}</p>
          <p className="stats-figure">
            <strong className="figure-l">
              {usualPeak
                ? usualPeak.low === usualPeak.high
                  ? usualPeak.high
                  : fill(stats.rangeJoin, { high: usualPeak.high, low: usualPeak.low })
                : "-"}
            </strong>{" "}
            {usualPeak ? text.minutes : null}
          </p>
          <p className="caption">{verdict}</p>
        </div>
      </div>

      <section className="stats-card">
        <h2>{fill(stats.throughDay, { branch: name })}</h2>
        <p className="caption stats-keys">
          <span>
            <i className="stats-key-line" data-band={band} />
            {stats.keyThisDay}
          </span>
          {usual.length > 0 ? (
            <span>
              <i className="stats-key-range" />
              {fill(stats.keyRange, { weekday: weekdayName })}
            </span>
          ) : null}
        </p>
        <StatsChart
          band={band}
          label={fill(stats.throughDay, { branch: name })}
          markerLabel={day.peakAt ? `${day.peak} ${text.minutes} · ${time(day.peakAt)}` : undefined}
          points={day.points}
          range={usual}
        />
      </section>

      <section className="stats-card">
        <h2>{fill(stats.recentDays, { branch: name })}</h2>
        <p className="caption">{stats.selectDay}</p>
        <div className="stats-table-scroll">
          <table className="stats-table">
            <thead>
              <tr>
                <th>{stats.columnDate}</th>
                <th className="numeric">{stats.columnLongest}</th>
                <th className="numeric">{stats.columnAverage}</th>
                <th className="numeric">{stats.columnOver30}</th>
                <th>{stats.columnDay}</th>
              </tr>
            </thead>
            <tbody>
              {visibleDays.map((row) => {
                const rowRange = hongKongDayRange(row.date);

                return (
                  <tr data-band={waitBand(row.peak)} key={row.date}>
                    <th scope="row">
                      <button
                        aria-current={row.date === date ? "true" : undefined}
                        className="row-link"
                        onClick={() => onSelectDate(row.date)}
                        type="button"
                      >
                        {rowRange ? dayLabel.format(rowRange.from) : row.date}
                      </button>
                      {row.date === date ? <span className="tag">{stats.shownAbove}</span> : null}
                    </th>
                    <td className="numeric">
                      <strong>
                        {row.peak} {text.minutes}
                      </strong>{" "}
                      <span>
                        {fill(stats.peakAt, { time: row.peakAt ? time(row.peakAt) : "" })}
                      </span>
                    </td>
                    <td className="numeric">
                      {Math.round(row.average)} {text.minutes}
                    </td>
                    <td className="numeric">
                      {row.hoursOver30} {stats.hours}
                    </td>
                    <td>
                      {rowRange ? (
                        <QueueAreaChart
                          end={rowRange.to.valueOf()}
                          maximumWait={Math.max(30, row.peak)}
                          points={row.points}
                          start={rowRange.from.valueOf() + 10 * 60 * 60_000}
                        />
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {days.length > dayPreview ? (
          <Button
            onClick={() => setShowAllDays((showAll) => !showAll)}
            size="compact"
            variant="secondary"
          >
            {showAllDays ? stats.showFewer : fill(stats.showAllDays, { count: days.length })}
          </Button>
        ) : null}
      </section>
    </>
  );
}
