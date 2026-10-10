"use client";

import { QueueLegend } from "@/components/queue-legend";
import { longLevel, type PatternsResponse, patternSlotMinutes, patternView } from "@/lib/patterns";
import { copy, fill, type Language, waitBand } from "@/lib/queue-presentation";
import { statsCopy } from "@/lib/stats-copy";

type StatsPatternsProps = {
  branchId: number | null;
  data: PatternsResponse;
  language: Language;
  onSelectBranch: (storeId: number) => void;
  selectedName: string;
};

// Bars shown when branches are compared.
const comparePreview = 10;

function clock(minute: number) {
  return `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
}

function branchName(branch: { name: string; nameEn: string }, language: Language) {
  return language === "en" ? branch.nameEn || branch.name : branch.name.replace(/店$/, "");
}

// Patterns: the average wait for every weekday and half hour, and how branches compare at
// weekend dinner. With a branch selected the grid is that branch's alone.
export function StatsPatterns({
  branchId,
  data,
  language,
  onSelectBranch,
  selectedName,
}: StatsPatternsProps) {
  const text = copy[language];
  const stats = statsCopy[language];
  const view = patternView(data.grid);
  const dayMonth = new Intl.DateTimeFormat(language, {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Hong_Kong",
  });
  const date = (value: string | null) =>
    value ? dayMonth.format(new Date(`${value}T00:00:00+08:00`)) : "";
  const slotLabel = (cell: { minute: number; weekday: number }) =>
    fill(stats.slot, {
      day: stats.weekdays[cell.weekday] ?? "",
      from: clock(cell.minute),
      to: clock(cell.minute + patternSlotMinutes),
    });
  const rank = data.dinner.findIndex(({ storeId }) => storeId === branchId) + 1;
  // The selected branch always shows, even when it is outside the first rows.
  const compared =
    rank > comparePreview
      ? [...data.dinner.slice(0, comparePreview - 1), ...data.dinner.slice(rank - 1, rank)]
      : data.dinner.slice(0, comparePreview);
  const cell = (wait: number | null, key: number | string) =>
    wait === null ? (
      <td key={key} />
    ) : (
      <td data-band={waitBand(Math.round(wait))} data-level={longLevel(wait)} key={key}>
        {Math.round(wait)}
      </td>
    );

  if (!(view.busiest && view.quietest && view.calmestDay)) {
    return <p className="stats-status">{stats.noPatterns}</p>;
  }

  return (
    <>
      <div className="stats-cards stats-cards-three">
        <div className="stats-card">
          <p className="caption">{stats.busiestSlot}</p>
          <p className="stats-figure">
            <strong className="figure-l">{Math.round(view.busiest.wait)}</strong> {stats.minAverage}
          </p>
          <p className="caption">{slotLabel(view.busiest)}</p>
        </div>
        <div className="stats-card">
          <p className="caption">{stats.quietestSlot}</p>
          <p className="stats-figure">
            <strong className="figure-l">{Math.round(view.quietest.wait)}</strong>{" "}
            {stats.minAverage}
          </p>
          <p className="caption">{slotLabel(view.quietest)}</p>
        </div>
        <div className="stats-card">
          <p className="caption">{stats.calmestDay}</p>
          <p className="stats-figure">
            <strong className="figure-l">{stats.weekdays[view.calmestDay.weekday]}</strong>
          </p>
          <p className="caption">
            {fill(stats.dayAverage, { wait: Math.round(view.calmestDay.wait) })}
          </p>
        </div>
      </div>

      <section className="stats-card">
        <h2>{selectedName ? fill(stats.branchHeat, { branch: selectedName }) : stats.heatTitle}</h2>
        <p className="caption">
          {fill(selectedName ? stats.branchHeatNote : stats.heatNote, {
            from: date(data.from),
            to: date(data.to),
          })}
        </p>
        {/* Wide screens read time across. Phones turn the grid so the seven days fit the width. */}
        <table className="heat heat-wide">
          <thead>
            <tr>
              <td />
              {view.slots.map((minute) => (
                <th key={minute} scope="col">
                  <span className="heat-hour">{minute % 60 === 0 ? minute / 60 : ""}</span>
                  <span className="sr-only">{clock(minute)}</span>
                </th>
              ))}
              <th className="heat-over" scope="col">
                {stats.overAnHourColumn}
              </th>
            </tr>
          </thead>
          <tbody>
            {view.rows.map((row, weekday) => {
              const over = view.overAnHour[weekday];

              return (
                <tr key={stats.weekdays[weekday]}>
                  <th scope="row">{stats.weekdaysShort[weekday]}</th>
                  {row.map((wait, index) => cell(wait, view.slots[index] ?? index))}
                  <td className="heat-over">
                    {/* A weekday with nothing recorded says nothing, not "Never". */}
                    {over
                      ? fill(stats.rangeJoin, { high: clock(over.to), low: clock(over.from) })
                      : row.some((wait) => wait !== null)
                        ? stats.never
                        : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <table className="heat heat-tall">
          <thead>
            <tr>
              <td />
              {stats.weekdaysNarrow.map((day, weekday) => (
                <th key={day} scope="col">
                  <span aria-hidden="true">{day}</span>
                  <span className="sr-only">{stats.weekdays[weekday]}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {view.slots.map((minute, index) => (
              <tr key={minute}>
                <th scope="row">{clock(minute)}</th>
                {view.rows.map((row, weekday) => cell(row[index] ?? null, weekday))}
              </tr>
            ))}
          </tbody>
        </table>
        <QueueLegend language={language} />
        <p className="caption heat-levels">
          <i data-level="2" />
          <i data-level="3" />
          {stats.levelsNote}
        </p>
      </section>

      <section className="stats-card">
        <h2>{selectedName ? stats.againstTitle : stats.compareTitle}</h2>
        <p className="caption">
          {stats.compareNote}
          {selectedName && rank > 0
            ? ` ${fill(stats.againstRank, { branch: selectedName, count: data.dinner.length, rank })}`
            : null}
        </p>
        <ul className="stats-bars stats-bars-two">
          {compared.map((branch) => (
            <li
              aria-current={branch.storeId === branchId ? "true" : undefined}
              className="stats-bar"
              data-band={waitBand(Math.round(branch.wait))}
              key={branch.storeId}
            >
              <span>
                <button
                  className="row-link"
                  onClick={() => onSelectBranch(branch.storeId)}
                  type="button"
                >
                  {branchName(branch, language)}
                </button>
              </span>
              <span>
                <i style={{ width: `${(branch.wait / (data.dinner[0]?.wait || 1)) * 100}%` }} />
              </span>
              <strong>
                {Math.round(branch.wait)} {text.minutes}
              </strong>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
