import type { CSSProperties } from "react";
import { clockLabel, type PlanDomain } from "@/lib/plan";
import type { UsualSlot } from "@/lib/usual";

type PlanChartProps = {
  domain: PlanDomain;
  label: string;
  // The usual median at the chosen time, where the marker's dot sits. Null draws no dot.
  markerWait: number | null;
  minute: number;
  // Text beside the end of today's line, such as "Now 20 min".
  nowLabel?: string;
  slots: UsualSlot[];
  // Today's waits so far, by minutes since midnight.
  today?: { minute: number; wait: number }[];
  // The wait at the top of the chart, shared by the charts on the page so they compare.
  top: number;
};

// A branch's day: the usual range as a grey band, today so far as a line, and a marker at the
// chosen time. The plot stretches with its column and labels are HTML so they keep their size.
export function PlanChart({
  domain,
  label,
  markerWait,
  minute,
  nowLabel,
  slots,
  today = [],
  top,
}: PlanChartProps) {
  const span = Math.max(1, domain.end - domain.start);
  const x = (at: number) => ((at - domain.start) / span) * 100;
  const y = (wait: number) => 100 - (Math.min(wait, top) / top) * 100;
  const path = (points: { minute: number; wait: number }[]) =>
    points
      .map(
        (point, index) =>
          `${index === 0 ? "M" : "L"}${x(point.minute).toFixed(2)},${y(point.wait).toFixed(2)}`,
      )
      .join(" ");
  const usual =
    slots.length > 1
      ? `${path(slots.map((slot) => ({ minute: slot.minute, wait: slot.high })))} ${path(
          slots.toReversed().map((slot) => ({ minute: slot.minute, wait: slot.low })),
        ).replace("M", "L")} Z`
      : null;
  const now = today.at(-1);
  const hours: number[] = [];

  for (let hour = Math.ceil(domain.start / 60); hour * 60 <= domain.end; hour += 2) {
    hours.push(hour);
  }

  return (
    <figure aria-label={label} className="plan-chart">
      <div className="plan-plot">
        {Array.from({ length: Math.floor(top / 60) }, (_, index) => (index + 1) * 60).map(
          (wait) => (
            <span
              className="plan-grid"
              data-label={`${wait / 60}h`}
              key={wait}
              style={{ bottom: `${(wait / top) * 100}%` }}
            />
          ),
        )}
        <svg aria-hidden="true" preserveAspectRatio="none" viewBox="0 0 100 100">
          {usual ? <path className="plan-usual" d={usual} /> : null}
          {today.length > 1 ? <path className="plan-today" d={path(today)} /> : null}
        </svg>
        {now ? (
          <span
            className="plan-now"
            style={{ bottom: `${100 - y(now.wait)}%`, left: `${x(now.minute)}%` }}
          >
            {nowLabel}
          </span>
        ) : null}
        <span className="plan-marker" style={{ left: `${x(minute)}%` }} />
        {markerWait === null ? null : (
          <span
            className="plan-marker-dot"
            style={{ bottom: `${100 - y(markerWait)}%`, left: `${x(minute)}%` }}
          />
        )}
      </div>
      <div aria-hidden="true" className="plan-hours">
        {hours.map((hour) => (
          <span key={hour} style={{ "--at": (hour * 60 - domain.start) / span } as CSSProperties}>
            {clockLabel(hour * 60)}
          </span>
        ))}
      </div>
    </figure>
  );
}
