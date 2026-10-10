"use client";

import { QueueChartSeries } from "@/components/queue-chart-series";
import type { QueueBand } from "@/lib/queue-presentation";
import type { TimedWait } from "@/lib/stats";

type StatsChartProps = {
  // Draws the line in a queue band colour. Without it the line is the foreground colour.
  band?: QueueBand;
  label: string;
  markerLabel?: string;
  points: TimedWait[];
  // A low-to-high range drawn behind the line, such as the same weekday's usual waits.
  range?: { collectedAt: string; high: number; low: number }[];
};

const twoHours = 2 * 60 * 60_000;

// A day's line chart. The line stretches with the card, while tick and hour labels are HTML so
// they keep their size at any width.
export function StatsChart({ band, label, markerLabel, points, range = [] }: StatsChartProps) {
  const first = Date.parse(points[0]?.collectedAt ?? "");
  const last = Date.parse(points.at(-1)?.collectedAt ?? "");

  if (points.length < 2 || Number.isNaN(first) || Number.isNaN(last)) {
    return null;
  }

  const duration = Math.max(1, last - first);
  const peak = points.reduce((top, point) => (point.wait > top.wait ? point : top));
  // The range is clipped to the hours the line covers.
  const visibleRange = range.filter((point) => {
    const time = Date.parse(point.collectedAt);
    return time >= first && time <= last;
  });
  const highest = Math.max(peak.wait, ...visibleRange.map((point) => point.high));
  const top = Math.max(20, Math.ceil(highest / 20) * 20);
  const ticks = [0, top / 4, top / 2, (top * 3) / 4, top];
  const position = (point: TimedWait) => ({
    x: ((Date.parse(point.collectedAt) - first) / duration) * 100,
    y: 100 - (point.wait / top) * 100,
  });
  const marker = position(peak);
  const rangePath =
    visibleRange.length > 1
      ? [
          ...visibleRange.map((point) =>
            position({ collectedAt: point.collectedAt, wait: point.high }),
          ),
          ...visibleRange
            .toReversed()
            .map((point) => position({ collectedAt: point.collectedAt, wait: point.low })),
        ]
          .map(({ x, y }, index) => `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`)
          .join(" ")
      : null;
  // Hong Kong is eight hours ahead of UTC, so its even hours are UTC's even hours too.
  const hours: { left: number; text: string }[] = [];

  for (let time = Math.ceil(first / twoHours) * twoHours; time <= last; time += twoHours) {
    const hour = (new Date(time).getUTCHours() + 8) % 24;
    hours.push({
      left: ((time - first) / duration) * 100,
      text: `${String(hour).padStart(2, "0")}:00`,
    });
  }

  return (
    <figure aria-label={label} className="stats-chart" data-band={band}>
      <div className="stats-chart-plot">
        {ticks.map((tick) => (
          <span
            className="stats-chart-tick"
            data-tick={tick}
            key={tick}
            style={{ bottom: `${(tick / top) * 100}%` }}
          />
        ))}
        <svg aria-hidden="true" preserveAspectRatio="none" viewBox="0 0 100 100">
          {rangePath ? <path className="stats-chart-range" d={`${rangePath} Z`} /> : null}
          <QueueChartSeries
            baseline={100}
            coordinates={points.map(position)}
            left={0}
            right={100}
          />
        </svg>
        {markerLabel ? (
          <span
            className="stats-chart-marker"
            data-side={marker.x > 75 ? "left" : "right"}
            style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
          >
            {markerLabel}
          </span>
        ) : null}
      </div>
      <div aria-hidden="true" className="stats-chart-hours">
        {hours.map(({ left, text }) => (
          <span key={text} style={{ left: `${left}%` }}>
            {text}
          </span>
        ))}
      </div>
    </figure>
  );
}
