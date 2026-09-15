"use client";

import { useState } from "react";
import { QueueChartSeries } from "@/components/queue-chart-series";
import type { QueueHistoryPoint } from "@/lib/queues";

type QueueChartProps = {
  label: string;
  latestWait?: number;
  locale: string;
  points: QueueHistoryPoint[];
  valueLabel: string;
};

const chartWidth = 260;
const chartHeight = 52;
const chartPadding = 4;

export function QueueChart({
  label,
  latestWait: currentWait,
  locale,
  points,
  valueLabel,
}: QueueChartProps) {
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);
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
  let hoveredPoint: { coordinate: { x: number; y: number }; point: QueueHistoryPoint } | null =
    null;

  if (hoveredPointIndex !== null) {
    const point = points[hoveredPointIndex];
    const coordinate = coordinates[hoveredPointIndex];

    if (point && coordinate) {
      hoveredPoint = { coordinate, point };
    }
  }

  function setClosestHoveredPoint(clientX: number, chartLeft: number, chartDisplayWidth: number) {
    const x = ((clientX - chartLeft) / chartDisplayWidth) * chartWidth;
    let closestIndex = 0;
    let closestDistance = Number.POSITIVE_INFINITY;

    for (const [index, coordinate] of coordinates.entries()) {
      const distance = Math.abs(coordinate.x - x);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    }

    setHoveredPointIndex(closestIndex);
  }

  return (
    <div className="queue-chart min-w-0 max-w-full">
      <div className="queue-chart-caption">
        <span>{label}</span>
        <strong>
          {latestWait} <small>{valueLabel}</small>
        </strong>
      </div>
      {points.length > 0 ? (
        <div className="queue-chart-plot">
          <svg
            aria-label={`${label}: ${latestWait} ${valueLabel}`}
            className="min-w-0 max-w-full"
            onPointerLeave={() => setHoveredPointIndex(null)}
            onPointerMove={(event) => {
              const { left, width } = event.currentTarget.getBoundingClientRect();
              setClosestHoveredPoint(event.clientX, left, width);
            }}
            preserveAspectRatio="none"
            role="img"
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          >
            <line
              className="queue-chart-baseline"
              x1={chartPadding}
              x2={chartWidth - chartPadding}
              y1={chartHeight - 1}
              y2={chartHeight - 1}
            />
            <QueueChartSeries
              baseline={chartHeight - chartPadding}
              coordinates={coordinates}
              left={chartPadding}
              right={chartWidth - chartPadding}
            />
            {hoveredPoint ? (
              <circle
                className="queue-chart-hover-dot"
                cx={hoveredPoint.coordinate.x}
                cy={hoveredPoint.coordinate.y}
                r="3.5"
              />
            ) : null}
          </svg>
          {hoveredPoint ? (
            <div
              className="queue-chart-tooltip"
              data-align={
                hoveredPoint.coordinate.x < chartWidth / 4
                  ? "left"
                  : hoveredPoint.coordinate.x > (chartWidth * 3) / 4
                    ? "right"
                    : "center"
              }
              data-position={hoveredPoint.coordinate.y < chartHeight / 2 ? "below" : "above"}
              style={{
                left: `${(hoveredPoint.coordinate.x / chartWidth) * 100}%`,
                top: `${(hoveredPoint.coordinate.y / chartHeight) * 100}%`,
              }}
            >
              <strong>
                {hoveredPoint.point.wait} {valueLabel}
              </strong>
              <time dateTime={hoveredPoint.point.collectedAt}>
                {new Intl.DateTimeFormat(locale, {
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  month: "short",
                }).format(new Date(hoveredPoint.point.collectedAt))}
              </time>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="queue-chart-empty">No history</p>
      )}
    </div>
  );
}
