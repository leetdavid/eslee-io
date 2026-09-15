"use client";

import { useId } from "react";

type QueueChartSeriesProps = {
  baseline: number;
  coordinates: { x: number; y: number }[];
  left: number;
  right: number;
};

export function QueueChartSeries({ baseline, coordinates, left, right }: QueueChartSeriesProps) {
  const gradientId = useId();
  const firstCoordinate = coordinates[0];

  if (!firstCoordinate) {
    return null;
  }

  const line =
    coordinates.length === 1
      ? `${left} ${firstCoordinate.y} ${right} ${firstCoordinate.y}`
      : coordinates.map(({ x, y }) => `${x.toFixed(2)} ${y.toFixed(2)}`).join(" ");
  const area = `M ${left} ${baseline} L ${line} L ${right} ${baseline} Z`;

  return (
    <>
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity={0.4} />
          <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} />
      <polyline className="queue-chart-line" points={line} />
    </>
  );
}
