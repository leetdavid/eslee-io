import { copy, type Language, type QueueBand } from "@/lib/queue-presentation";

const legendBands: Exclude<QueueBand, "muted">[] = ["none", "short", "moderate", "long"];

// The band key: one dot and its official-wait range per band, then what the numbers mean.
export function QueueLegend({ language }: { language: Language }) {
  const text = copy[language];

  return (
    <div className="legend">
      {legendBands.map((band) => (
        <span data-band={band} key={band}>
          <i className="band-dot" />
          {text.bandRange[band]}
        </span>
      ))}
      <span>{text.legendNote}</span>
    </div>
  );
}
