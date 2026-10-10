"use client";

import type { CSSProperties } from "react";
import { clockLabel, type PlanDomain } from "@/lib/plan";
import { usualStepMinutes } from "@/lib/usual";

type PlanRulerProps = {
  domain: PlanDomain;
  label: string;
  minute: number;
  onChange: (minute: number) => void;
};

// The time ruler: a five-minute slider whose thumb lines up with the marker in every chart
// drawn under it.
export function PlanRuler({ domain, label, minute, onChange }: PlanRulerProps) {
  const span = Math.max(1, domain.end - domain.start);
  const hours: number[] = [];

  for (let hour = Math.ceil(domain.start / 60); hour * 60 <= domain.end; hour += 1) {
    hours.push(hour);
  }

  return (
    <div className="plan-ruler" style={{ "--at": (minute - domain.start) / span } as CSSProperties}>
      <output className="plan-ruler-time">{clockLabel(minute)}</output>
      <input
        aria-label={label}
        aria-valuetext={clockLabel(minute)}
        className="plan-range"
        max={domain.end}
        min={domain.start}
        onChange={(event) => onChange(Number(event.target.value))}
        step={usualStepMinutes}
        type="range"
        value={minute}
      />
      <div aria-hidden="true" className="plan-ruler-hours">
        {hours.map((hour, index) => (
          <span
            data-alternate={index % 2 === 1 || undefined}
            key={hour}
            style={{ "--at": (hour * 60 - domain.start) / span } as CSSProperties}
          >
            {clockLabel(hour * 60)}
          </span>
        ))}
      </div>
    </div>
  );
}
