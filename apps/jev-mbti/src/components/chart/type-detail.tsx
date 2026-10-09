"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type ChartData, LEVEL_COUNT, nearestLevel } from "@/lib/chart";
import { type Locale, MESSAGES } from "@/lib/i18n";
import { groupOf, type MbtiType } from "@/lib/mbti";
import { TOPIC_INFO } from "@/lore/schema";

const AXIS_KEYS = ["x", "y"] as const;

export function TypeDetail({
  chart,
  type,
  showReview,
  jevRank,
  finalRank,
  locale,
  onClose,
  titleId,
}: {
  chart: ChartData;
  type: MbtiType;
  showReview: boolean;
  jevRank: number;
  finalRank: number;
  locale: Locale;
  onClose?: () => void;
  titleId: string;
}) {
  const t = MESSAGES[locale];
  const { plot } = chart;
  const typeReview = chart.review?.types[type];
  const correction = showReview ? typeReview?.correction : undefined;
  const oneAxis = plot.axes.length === 1;
  const title = correction ? t.movedNote : showReview && typeReview ? t.keptNote : type;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span
          className={`chip-sticker ${groupOf(type)}`}
          style={{ cursor: "default", width: 68, height: 32, fontSize: 16 }}
        >
          {type}
        </span>
        <div style={{ minWidth: 0 }}>
          <h2 id={titleId} style={{ margin: 0, fontSize: 17, fontWeight: 750, lineHeight: 1.25 }}>
            {title}
          </h2>
          <span style={{ fontSize: 13, color: "var(--ink-soft)" }}>{t.group(groupOf(type))}</span>
        </div>
        {onClose ? (
          <Button
            variant="secondary"
            size="icon"
            aria-label={t.close}
            onClick={onClose}
            style={{ marginLeft: "auto" }}
          >
            <X aria-hidden="true" />
          </Button>
        ) : null}
      </div>

      <p className="detail-label">{t.placement}</p>
      {oneAxis ? (
        <p style={{ margin: "6px 0 0", fontSize: 14 }}>
          <b className="num">{t.jevRank(jevRank)}</b>{" "}
          <span style={{ color: "var(--ink-soft)" }}>{t.ofSixteen}</span>
          {correction ? (
            <>
              {" → "}
              <b className="num" style={{ color: "var(--red-pen)" }}>
                {t.penRank(finalRank)}
              </b>
            </>
          ) : null}
        </p>
      ) : null}
      {plot.axes.map((axis, index) => {
        const key = AXIS_KEYS[index] ?? "x";
        const judgment = plot.placements[type][key];
        if (!judgment) return null;
        const moved = correction?.[key];
        return (
          <p key={key} style={{ margin: "6px 0 0", fontSize: 14, lineHeight: 1.45 }}>
            {plot.axes.length === 2 ? (
              <span style={{ color: "var(--ink-soft)" }}>{axis.name[locale]} · </span>
            ) : null}
            {t.axisJev(axis.levels[nearestLevel(judgment.position)]?.label[locale] ?? "")}
            {moved !== undefined ? (
              <b style={{ color: "var(--red-pen)" }}>
                {" "}
                → {t.axisPen(axis.levels[nearestLevel(moved)]?.label[locale] ?? "")}
              </b>
            ) : null}
          </p>
        );
      })}

      <p className="detail-label">{t.howSure}</p>
      {plot.axes.map((axis, index) => {
        const key = AXIS_KEYS[index] ?? "x";
        const judgment = plot.placements[type][key];
        if (!judgment) return null;
        const percents = judgment.probabilities.map((p) => Math.round(p * 100));
        return (
          <div key={key} style={{ marginTop: 8 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span className="num" style={{ fontSize: 26, fontWeight: 800 }}>
                {Math.round(judgment.confidence * 100)}%
              </span>
              <span style={{ fontSize: 13, color: "var(--ink-soft)" }}>
                {t.confidenceWord}
                {plot.axes.length === 2 ? ` · ${axis.name[locale]}` : ""}
              </span>
            </div>
            <div
              className="dist"
              style={{ ["--levels" as string]: LEVEL_COUNT }}
              role="img"
              aria-label={axis.levels
                .map((level, i) => `${level.label[locale]} ${percents[i] ?? 0}%`)
                .join(", ")}
            >
              {percents.map((percent, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: levels are positional
                <i key={i} style={{ height: Math.max(2, percent * 0.7) }}>
                  {percent >= 5 ? <b className="num">{percent}%</b> : null}
                </i>
              ))}
            </div>
            <div className="dist-ends">
              <span>{axis.low[locale]}</span>
              <span style={{ textAlign: "right" }}>{axis.high[locale]}</span>
            </div>
          </div>
        );
      })}

      {typeReview ? (
        <>
          <p className="detail-label">{t.why}</p>
          <p style={{ margin: "4px 0 0", fontSize: 15, lineHeight: 1.45 }}>
            {typeReview.explanation[locale]}
          </p>
          {correction ? (
            <p className="hand" style={{ margin: "6px 0 0", fontSize: 23 }}>
              {correction.note[locale]}
            </p>
          ) : null}
        </>
      ) : null}

      <p className="detail-label">{t.loreRead}</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
        {plot.loreTopics.map((topic) => (
          <span key={topic} className="lore-chip">
            {TOPIC_INFO[topic].label[locale]}
          </span>
        ))}
      </div>
    </div>
  );
}
