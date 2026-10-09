import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import { MESSAGES } from "@/lib/i18n";
import { packLanes } from "@/lib/layout";
import { groupOf, MBTI_TYPES, type MbtiType } from "@/lib/mbti";
import type { ExampleChart } from "@/server/charts";

const WIDTH = 352;

/** A decorative miniature of the chart: colored chips without labels. */
function Thumbnail({ example }: { example: ExampleChart }) {
  const height = 150;
  if (example.axisCount === 1) {
    const axisY = height - 26;
    const lanes = packLanes(
      MBTI_TYPES.map((type) => [type, example.points[type].x] as [MbtiType, number]),
      WIDTH,
      22,
      24,
      3,
    );
    return (
      <div className="thumb gridbg" aria-hidden="true">
        <i
          style={{
            position: "absolute",
            left: 12,
            right: 12,
            top: axisY,
            height: 2,
            background: "var(--ink)",
          }}
        />
        {lanes.map((item) => (
          <span
            key={item.type}
            style={{
              left: `${((item.cx - 11) / WIDTH) * 100}%`,
              top: axisY - 16 - item.lane * 15,
              background: `var(--${groupOf(item.type)})`,
            }}
          />
        ))}
      </div>
    );
  }
  return (
    <div className="thumb gridbg" aria-hidden="true">
      <i
        style={{
          position: "absolute",
          left: 12,
          right: 12,
          top: "50%",
          height: 2,
          background: "var(--ink)",
        }}
      />
      <i
        style={{
          position: "absolute",
          top: 10,
          bottom: 10,
          left: "50%",
          width: 2,
          background: "var(--ink)",
        }}
      />
      {MBTI_TYPES.map((type) => (
        <span
          key={type}
          style={{
            left: `calc(${example.points[type].x * 88 + 4}% - 4px)`,
            top: `calc(${(1 - (example.points[type].y ?? 0.5)) * 76 + 8}% - 4px)`,
            background: `var(--${groupOf(type)})`,
          }}
        />
      ))}
    </div>
  );
}

export function ExampleCard({ example, locale }: { example: ExampleChart; locale: Locale }) {
  const t = MESSAGES[locale];
  return (
    <Link className="example" href={`/c/${example.id}`}>
      <Thumbnail example={example} />
      <div className="body">
        <h3>{example.questionText[locale]}</h3>
        <p>
          <span>{example.axisCount === 1 ? t.oneAxis : t.twoAxes}</span>
          {example.grade !== null ? (
            <span className="hand num" style={{ fontSize: 21 }}>
              {example.grade}/16
            </span>
          ) : null}
        </p>
      </div>
    </Link>
  );
}
