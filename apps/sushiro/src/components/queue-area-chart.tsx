"use client";

import { useId } from "react";
import type { QueueHistoryPoint } from "@/lib/queues";

type QueueAreaChartProps = {
  end: number;
  maximumWait: number;
  points: QueueHistoryPoint[];
  start: number;
};

export function QueueAreaChart({ end, maximumWait, points, start }: QueueAreaChartProps) {
  const gradientId = useId();

  if (points.length === 0) {
    return null;
  }

  const duration = Math.max(1, end - start);
  const coordinates = points.map((point) => {
    const timestamp = new Date(point.collectedAt).valueOf();
    const x = Math.max(0, Math.min(100, ((timestamp - start) / duration) * 100));
    const y = 100 - (point.wait / maximumWait) * 100;
    return { x, y };
  });
  const line =
    coordinates.length === 1
      ? `0 ${coordinates[0]?.y} 100 ${coordinates[0]?.y}`
      : coordinates.map(({ x, y }) => `${x.toFixed(2)} ${y.toFixed(2)}`).join(" ");
  const area = `M 0 100 L ${line} L 100 100 Z`;

  return (
    <svg
      aria-hidden="true"
      className="grid-card-chart"
      preserveAspectRatio="none"
      viewBox="0 -2 100 104"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity={0.4} />
          <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} />
      <polyline points={line} />
    </svg>
  );
}
