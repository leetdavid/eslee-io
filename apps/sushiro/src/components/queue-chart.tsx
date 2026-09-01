import type { QueueHistoryPoint } from "@/lib/queues";

type QueueChartProps = {
  label: string;
  latestWait?: number;
  points: QueueHistoryPoint[];
  valueLabel: string;
};

const chartWidth = 260;
const chartHeight = 52;
const chartPadding = 3;

export function QueueChart({
  label,
  latestWait: currentWait,
  points,
  valueLabel,
}: QueueChartProps) {
  const latestWait = currentWait ?? points.at(-1)?.wait ?? 0;
  const maximumWait = Math.max(1, ...points.map((point) => point.wait));
  const firstTimestamp = new Date(points[0]?.collectedAt ?? 0).valueOf();
  const lastTimestamp = new Date(points.at(-1)?.collectedAt ?? 0).valueOf();
  const duration = Math.max(1, lastTimestamp - firstTimestamp);
  const plotWidth = chartWidth - chartPadding * 2;
  const plotHeight = chartHeight - chartPadding * 2;
  const coordinates = points.map((point) => {
    const timestamp = new Date(point.collectedAt).valueOf();
    const x = chartPadding + ((timestamp - firstTimestamp) / duration) * plotWidth;
    const y = chartPadding + (1 - point.wait / maximumWait) * plotHeight;
    return { x, y };
  });

  return (
    <div className="queue-chart">
      <div className="queue-chart-caption">
        <span>{label}</span>
        <strong>
          {latestWait} <small>{valueLabel}</small>
        </strong>
      </div>
      {points.length > 0 ? (
        <svg
          aria-label={`${label}: ${latestWait} ${valueLabel}`}
          preserveAspectRatio="none"
          role="img"
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        >
          <line
            className="queue-chart-baseline"
            x1="0"
            x2={chartWidth}
            y1={chartHeight - 1}
            y2={chartHeight - 1}
          />
          {points.length === 1 ? (
            <circle
              className="queue-chart-line"
              cx={coordinates[0]?.x}
              cy={coordinates[0]?.y}
              r="2.5"
            />
          ) : (
            <polyline
              className="queue-chart-line"
              points={coordinates.map(({ x, y }) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ")}
            />
          )}
        </svg>
      ) : (
        <p className="queue-chart-empty">No history</p>
      )}
    </div>
  );
}
