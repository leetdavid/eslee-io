"use client";

import { QueueChartSeries } from "@/components/queue-chart-series";
import type { QueueHistoryPoint } from "@/lib/queues";

type QueueAreaChartProps = {
  end: number;
  maximumWait: number;
  points: QueueHistoryPoint[];
  start: number;
};

export function QueueAreaChart({ end, maximumWait, points, start }: QueueAreaChartProps) {
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

  return (
    <svg
      aria-hidden="true"
      className="grid-card-chart"
      preserveAspectRatio="none"
      viewBox="0 -2 100 104"
    >
      <QueueChartSeries baseline={100} coordinates={coordinates} left={0} right={100} />
    </svg>
  );
}
