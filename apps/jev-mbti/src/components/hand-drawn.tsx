import type { ReactNode } from "react";

/** A loose red-pen loop around inline text. */
export function Circled({ children }: { children: ReactNode }) {
  return (
    <span className="circled">
      {children}
      <svg viewBox="0 0 210 86" preserveAspectRatio="none" aria-hidden="true">
        <path
          d="M14 46 C 10 16, 110 2, 178 14 C 214 22, 206 70, 140 78 C 84 84, 16 76, 12 50 C 10 36, 30 24, 52 20"
          fill="none"
          stroke="var(--red-pen)"
          strokeWidth="2.6"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </span>
  );
}

/** The circled red grade: how many of the 16 placements the review kept. */
export function Grade({
  kept,
  label,
  aria,
  small,
}: {
  kept: number;
  label?: string;
  aria: string;
  small?: boolean;
}) {
  return (
    <div className={`grade${small ? "small" : ""}`} role="img" aria-label={aria}>
      <svg viewBox="0 0 170 120" preserveAspectRatio="none" aria-hidden="true">
        <path
          d="M22 60 C 18 26, 84 8, 130 20 C 166 30, 160 80, 112 90 C 70 98, 24 90, 18 64 C 15 48, 34 34, 52 30"
          fill="none"
          stroke="var(--red-pen)"
          strokeWidth="2.4"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <span className="score num">{kept}/16</span>
      {label && !small ? <span className="label">{label}</span> : null}
    </div>
  );
}
