"use client";

import { Download, Ruler } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Plot } from "@/components/chart/plot";
import { TypeDetail } from "@/components/chart/type-detail";
import { Grade } from "@/components/hand-drawn";
import { ProgressSteps, type Step } from "@/components/progress-steps";
import { Badge } from "@/components/ui/badge";
import {
  Banner,
  BannerAction,
  BannerActions,
  BannerDescription,
  BannerTitle,
} from "@/components/ui/banner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { InputCopy } from "@/components/ui/input-copy";
import { TabItem, Tabs, TabsList } from "@/components/ui/tabs";
import { api, failureOf } from "@/lib/api";
import {
  axesOf,
  type ChartData,
  type ChartViewMode,
  chartPresentation,
  gradeOf,
  isChartViewMode,
  isReviewComplete,
  nearestLevel,
  pointsFor,
  questionIn,
  ranksOf,
  reviewedCount,
  STALE_REVIEW_MS,
} from "@/lib/chart";
import { type Locale, MESSAGES } from "@/lib/i18n";
import { groupOf, MBTI_TYPES, type MbtiType, TYPE_GROUPS } from "@/lib/mbti";
import type { FailureReason } from "@/server/router";

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [query]);
  return matches;
}

export function ChartView({
  initial,
  locale,
  animateIn,
  reviewer,
}: {
  initial: ChartData;
  locale: Locale;
  animateIn: boolean;
  reviewer: string;
}) {
  const t = MESSAGES[locale];
  const [chart, setChart] = useState(initial);
  const [view, setView] = useState<ChartViewMode>("review");
  const [selected, setSelected] = useState<MbtiType | null>(null);
  const [reviewFailure, setReviewFailure] = useState<FailureReason | null>(null);
  const [origin, setOrigin] = useState("");
  const wide = useMediaQuery("(min-width: 1024px)");
  const detailTitle = useId();
  const runningSince = useRef<number | null>(null);
  const started = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const next = await api.chart.query({ id: initial.id });
      if (next) setChart(next);
    } catch {
      // A missed poll is retried on the next tick.
    }
  }, [initial.id]);

  const startReview = useCallback(async () => {
    setReviewFailure(null);
    setChart((current) => ({
      ...current,
      reviewStatus: "running",
      review: current.reviewStatus === "failed" ? null : current.review,
    }));
    try {
      await api.review.mutate({ id: initial.id });
    } catch (error) {
      const failure = failureOf(error);
      if (failure.reason === "rateLimited") setReviewFailure(failure);
    }
    await refresh();
  }, [initial.id, refresh]);

  useEffect(() => {
    setOrigin(window.location.origin);
    if (initial.reviewStatus === "pending" && !started.current) {
      started.current = true;
      void startReview();
    }
  }, [initial.reviewStatus, startReview]);

  const active =
    (chart.reviewStatus === "pending" || chart.reviewStatus === "running") && !reviewFailure;
  useEffect(() => {
    if (!active) {
      runningSince.current = null;
      return;
    }
    runningSince.current ??= Date.now();
    const timer = setInterval(() => {
      void refresh();
      // A review abandoned mid-way becomes claimable again once it is stale.
      if (runningSince.current && Date.now() - runningSince.current > STALE_REVIEW_MS + 10_000) {
        runningSince.current = Date.now();
        void startReview();
      }
    }, 1_500);
    return () => clearInterval(timer);
  }, [active, refresh, startReview]);

  const { plot } = chart;
  const review = chart.review;
  const axes = axesOf(plot, review);
  const failed = chart.reviewStatus === "failed";
  const hasReview = Boolean(review && reviewedCount(review) > 0) && !failed;
  const complete = chart.reviewStatus === "complete" && review !== null && isReviewComplete(review);
  const shownView = !hasReview ? "jev" : view === "clean" && !complete ? "review" : view;
  const showReview = shownView !== "jev";
  const showCorrections = shownView === "review";
  // Both corrected views use the same layout. Plot hides annotations in clean view.
  const { points, order, spots } = chartPresentation(
    plot,
    hasReview ? review : null,
    showReview ? "review" : "jev",
  );
  const jevPoints = pointsFor(plot, null);
  const finalRanks = ranksOf(points);
  const jevRanks = ranksOf(jevPoints);
  const oneAxis = plot.axes.length === 1;
  const reviewedBy = chart.reviewModel ?? reviewer;

  const levelLabel = (axisIndex: number, position: number) =>
    axes[axisIndex]?.levels[nearestLevel(position)]?.label[locale] ?? "";
  const describe = (type: MbtiType) =>
    oneAxis
      ? t.stickerAria(type, `${t.ordinal(finalRanks[type])} · ${levelLabel(0, points[type].x)}`)
      : t.stickerAria(
          type,
          `${levelLabel(0, points[type].x)}, ${levelLabel(1, points[type].y ?? 0.5)}`,
        );

  const detail = selected ? (
    <TypeDetail
      chart={chart}
      type={selected}
      view={shownView}
      jevRank={jevRanks[selected]}
      finalRank={finalRanks[selected]}
      locale={locale}
      onClose={() => setSelected(null)}
      titleId={detailTitle}
    />
  ) : null;

  const notes = order.map((type, index) => {
    const correction = review?.types[type]?.correction;
    if (!correction) return null;
    return (
      <div key={type} className="note">
        <span className="mark">{index + 1}</span>
        <p>
          <b>{type}</b>
          {correction.note[locale]}
          {oneAxis ? (
            <small className="num">{t.rankMove(jevRanks[type], finalRanks[type])}</small>
          ) : null}
        </p>
      </div>
    );
  });

  const steps: Step[] = [
    {
      key: "axes",
      label: t.stepAxesDone,
      description: axes.map((axis) => t.axisArrow(axis.low[locale], axis.high[locale])).join(" · "),
      status: "complete",
    },
    {
      key: "jev",
      label: t.stepJevDone,
      description: t.jevPlacedSummary((plot.jevMs / 1000).toFixed(1)),
      status: "complete",
    },
    { key: "review", label: t.stepReviewing(reviewedCount(review)), status: "active" },
  ];

  let margin = null;
  if (wide && detail) {
    margin = (
      <section className="panel" aria-labelledby={detailTitle}>
        {detail}
      </section>
    );
  } else if (active) {
    margin = (
      <>
        <ProgressSteps title={reviewedBy} steps={steps} />
        {showCorrections ? notes : null}
        <p className="pencil" style={{ fontSize: 22, marginTop: 16 }}>
          {t.noScoreYet}
        </p>
      </>
    );
  } else if (failed || reviewFailure) {
    margin = (
      <>
        <p className="pencil num" style={{ fontSize: 44, margin: "4px 0 0" }}>
          –/16
        </p>
        <p className="pencil" style={{ fontSize: 22, margin: "4px 0 0" }}>
          {t.noScoreYet}
        </p>
        <p style={{ fontSize: 14, color: "var(--ink-soft)", marginTop: 16, lineHeight: 1.5 }}>
          {t.retryAnyone}
        </p>
      </>
    );
  } else if (complete && review) {
    const kept = gradeOf(review);
    margin = showCorrections ? (
      <>
        {kept === 16 ? (
          <div className="stamp" role="img" aria-label={t.stampAria}>
            <div>
              {t.stamp}
              <small className="num">16 / 16</small>
            </div>
          </div>
        ) : (
          <Grade kept={kept} label={t.gradeLabel} aria={t.gradeAria(kept)} />
        )}
        {notes}
      </>
    ) : shownView === "jev" ? (
      <p className="pencil" style={{ fontSize: 24, margin: 0 }}>
        {t.beforeRedPen}
      </p>
    ) : null;
  }

  const rowContent = (type: MbtiType) => {
    const explanation = review?.types[type]?.explanation;
    if (showReview && explanation) {
      const moved = review?.types[type]?.correction;
      return (
        <span className="e">
          {explanation[locale]}
          {showCorrections && moved ? (
            <span className="fx num">
              {oneAxis ? t.rankMoveFull(jevRanks[type], finalRanks[type]) : moved.note[locale]}
            </span>
          ) : null}
        </span>
      );
    }
    if (showReview && active)
      return (
        <span
          className="skeleton"
          style={{ width: `${45 + ((MBTI_TYPES.indexOf(type) * 37) % 40)}%` }}
        />
      );
    const confidence = Math.round(plot.placements[type].x.confidence * 100);
    return (
      <span className="conf">
        <meter
          className="meter"
          aria-label={`${type} ${t.confidenceWord}`}
          value={confidence}
          min={0}
          max={100}
        />
        <span className="pct num">{confidence}%</span>
      </span>
    );
  };

  const chip = (type: MbtiType) => (
    <button
      type="button"
      className={`chip-sticker ${groupOf(type)}`}
      aria-label={describe(type)}
      onClick={() => setSelected(type)}
    >
      {type}
    </button>
  );

  const ranked = [...MBTI_TYPES].sort((a, b) =>
    showReview ? finalRanks[a] - finalRanks[b] : jevRanks[a] - jevRanks[b],
  );
  const listTitle = showReview
    ? oneAxis
      ? t.ranked
      : t.oneLineEach
    : oneAxis
      ? t.jevRankingTitle
      : t.jevConfidenceTitle;
  const listNote = showReview
    ? active
      ? t.explanationsPending
      : shownView === "clean"
        ? t.cleanDetailHint
        : t.tapForDetail
    : t.confidenceNote;

  // Everything the viewer reads or edits is in their language; the original wording stays visible below.
  const question = questionIn(chart, locale);
  const changeAxes = new URLSearchParams({ q: question, mode: oneAxis ? "one" : "two" });
  axes.forEach((axis, index) => {
    changeAxes.set(index === 0 ? "xl" : "yl", axis.low[locale]);
    changeAxes.set(index === 0 ? "xh" : "yh", axis.high[locale]);
  });

  return (
    <>
      <section className="qblock">
        <span className="qmark" aria-hidden="true">
          Q.
        </span>
        <div>
          <h1 className="question">{question}</h1>
          {question !== chart.question ? (
            <p className="original-question">
              {t.originalQuestion}: <span lang={chart.questionLanguage}>{chart.question}</span>
            </p>
          ) : null}
        </div>
      </section>

      <div className="toolbar">
        <div className="meta" style={{ marginTop: 0 }}>
          <Badge>{oneAxis ? t.oneAxis : t.twoAxes}</Badge>
          <Badge>{t.jevPlacedIn((plot.jevMs / 1000).toFixed(1))}</Badge>
          {hasReview || active ? (
            <Badge>{active ? t.reviewingBy(reviewedBy) : t.reviewedBy(reviewedBy)}</Badge>
          ) : null}
        </div>
        <Tabs
          value={shownView}
          onValueChange={(value) => {
            if (isChartViewMode(value)) setView(value);
          }}
          size="compact"
        >
          <TabsList aria-label={t.viewLabel}>
            <TabItem value="review" label={t.withReview} disabled={!hasReview} />
            <TabItem value="clean" label={t.cleanChart} disabled={!complete} />
            <TabItem value="jev" label={t.jevOnly} />
          </TabsList>
        </Tabs>
      </div>

      {failed || reviewFailure ? (
        <div style={{ marginTop: 16 }}>
          <Banner status="warning" role="alert">
            <BannerTitle>
              {reviewFailure?.reason === "rateLimited"
                ? t.rateLimited(reviewFailure.retryAfterMinutes)
                : t.reviewFailed}
            </BannerTitle>
            <BannerDescription>
              {reviewFailure?.reason === "rateLimited" ? t.rateLimitedDetail : t.reviewFailedDetail}
            </BannerDescription>
            <BannerActions>
              <BannerAction variant="primary" onClick={() => void startReview()}>
                {t.retryReview}
              </BannerAction>
            </BannerActions>
          </Banner>
        </div>
      ) : null}

      <section className="chartwrap">
        <Plot
          axes={axes}
          locale={locale}
          points={points}
          spots={spots}
          order={order}
          showCorrections={showCorrections}
          selected={selected}
          describe={describe}
          onSelect={(type) => setSelected((current) => (current === type ? null : type))}
          animateIn={animateIn}
          label={t.chartAria(question)}
        />
        <aside
          className="margin"
          aria-hidden={margin ? undefined : true}
          aria-label={margin ? (shownView === "clean" ? t.placement : t.redPenNotes) : undefined}
        >
          {margin}
        </aside>
      </section>

      {showCorrections && complete && review?.summary ? (
        <section className="summary hand" aria-label={t.overall}>
          <span className="k">{t.overall}</span>
          <p>{review.summary[locale]}</p>
        </section>
      ) : showCorrections && active ? (
        <section className="summary pencil" aria-label={t.overall}>
          <span className="k">{t.overall}</span>
          <p>{t.summaryPending}</p>
        </section>
      ) : null}

      <div className="list-head">
        <h2>{listTitle}</h2>
        <p>{listNote}</p>
      </div>
      {oneAxis ? (
        <ol className="rank">
          {ranked.map((type) => (
            <li key={type} className="row">
              <span className="n num">{showReview ? finalRanks[type] : jevRanks[type]}</span>
              {chip(type)}
              {rowContent(type)}
            </li>
          ))}
        </ol>
      ) : (
        <div>
          {TYPE_GROUPS.map((group) => (
            <section key={group} aria-label={group.toUpperCase()}>
              <p className="group-label">{group.toUpperCase()}</p>
              <ul className="rank grouped">
                {MBTI_TYPES.filter((type) => groupOf(type) === group).map((type) => (
                  <li key={type} className="row no-rank">
                    {chip(type)}
                    {rowContent(type)}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <section className="share" aria-label={t.copyLink}>
        <InputCopy value={origin ? `${origin}/c/${chart.id}` : `/c/${chart.id}`} variant="button" />
        <div className="share-actions">
          <a
            className="link-button"
            href={`/c/${chart.id}/image?download=1&lang=${locale}&view=${shownView}`}
            download
          >
            <Download size={16} aria-hidden="true" />
            {t.saveImage}
          </a>
          <a className="link-button quiet" href={`/?${changeAxes.toString()}`}>
            <Ruler size={16} aria-hidden="true" />
            {t.changeAxes}
          </a>
        </div>
      </section>

      {!wide ? (
        <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
          <DialogContent
            className="max-h-[85dvh] overflow-y-auto"
            showCloseButton={false}
            aria-describedby={undefined}
          >
            <DialogTitle className="sr-only">{selected ?? ""}</DialogTitle>
            {detail}
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}
