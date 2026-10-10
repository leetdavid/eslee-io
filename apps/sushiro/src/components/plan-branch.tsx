"use client";

import { PlanChart } from "@/components/plan-chart";
import { StarToggle } from "@/components/star-toggle";
import { Badge } from "@/components/ui/badge";
import {
  clockLabel,
  eatPlan,
  type PlanDomain,
  type PlanMode,
  planAnswer,
  shorterNearby,
} from "@/lib/plan";
import { planCopy } from "@/lib/plan-copy";
import { copy, fill, type Language, shortStoreName, waitBand } from "@/lib/queue-presentation";
import { isActiveStore, type QueueHistory, type QueueStore } from "@/lib/queues";
import { useSharedJson } from "@/lib/shared-json";
import { hongKongDate } from "@/lib/stats";
import { hongKongClock, type UsualSlot } from "@/lib/usual";

type PlanBranchProps = {
  domain: PlanDomain;
  isShortest: boolean;
  language: Language;
  // The chosen time: when the ticket is taken, or in eat mode when the meal should start.
  minute: number;
  mode: PlanMode;
  // Minutes since Hong Kong midnight when the chosen day is today. Null for another day.
  nowMinute: number | null;
  onPickTime: (minute: number) => void;
  onToggleSaved: () => void;
  slots: UsualSlot[];
  store: QueueStore;
  top: number;
};

// One of My branches on Plan a meal. By ticket time: the usual wait for a ticket then, when it
// would be called, and a shorter time nearby if there is one. By eating time: the ticket to take.
// Either way the branch's day is drawn as a chart.
export function PlanBranch({
  domain,
  isShortest,
  language,
  minute,
  mode,
  nowMinute,
  onPickTime,
  onToggleSaved,
  slots,
  store,
  top,
}: PlanBranchProps) {
  const plan = planCopy[language];
  const isToday = nowMinute !== null;
  const history = useSharedJson<QueueHistory>(
    isToday ? `/api/queues/charts?storeId=${store.id}&hours=24&issuing=1` : null,
    { maxAgeMs: 5 * 60_000, pollMs: 5 * 60_000 },
  );
  const todayDate = hongKongDate(new Date());
  const today = isToday
    ? (history.data?.stores[0]?.points ?? [])
        .filter((point) => hongKongDate(new Date(point.collectedAt)) === todayDate)
        .map((point) => ({
          minute: hongKongClock(new Date(point.collectedAt)).minute,
          wait: point.wait,
        }))
        .filter((point) => point.minute >= domain.start && point.minute < nowMinute)
    : [];

  // The live wait closes today's line, so the chart ends on the figure shown everywhere else.
  if (isToday && isActiveStore(store) && nowMinute >= domain.start && nowMinute <= domain.end) {
    today.push({ minute: nowMinute, wait: store.wait });
  }

  const text = copy[language];
  const eat = mode === "eat" ? eatPlan(slots, minute, nowMinute ?? 0) : null;
  // When the ticket is taken: the chosen time, or the one worked back from the eating time.
  const ticket = mode === "ticket" ? minute : eat && eat.kind !== "early" ? eat.minute : null;
  const answer = ticket === null ? null : planAnswer(slots, ticket);
  const tipMinute = mode === "ticket" ? shorterNearby(slots, minute, nowMinute ?? 0) : null;
  const tip = tipMinute === null ? null : planAnswer(slots, tipMinute);
  const range = (low: number, high: number) =>
    low === high ? String(high) : fill(plan.range, { high, low });
  const time = clockLabel(minute);
  const called =
    answer && ticket !== null
      ? { from: clockLabel(ticket + answer.low), to: clockLabel(ticket + answer.high) }
      : null;
  const isExact = answer?.low === answer?.high;

  return (
    <li className="plan-branch" data-band={answer ? waitBand(answer.median) : "muted"}>
      <div className="plan-answer">
        <div className="plan-name">
          <span className="branch-row-name">{shortStoreName(store, language)}</span>
          {isShortest ? <Badge color="gray">{plan.shortest}</Badge> : null}
        </div>
        {mode === "ticket" && answer && called ? (
          <>
            <p className="plan-wait">
              {answer.high === 0 ? (
                <strong className="figure-m">{plan.noQueue}</strong>
              ) : (
                <>
                  <strong className="figure-m">{range(answer.low, answer.high)}</strong>{" "}
                  <span className="caption">{plan.waitUnit}</span>
                </>
              )}
            </p>
            <p className="caption">
              {answer.high === 0
                ? plan.noWait
                : fill(isExact ? plan.calledAt : plan.called, called)}
            </p>
          </>
        ) : null}
        {eat?.kind === "ticket" && answer && called ? (
          <>
            <p className="plan-wait">
              <span className="caption">{plan.eatTicketBefore}</span>{" "}
              <strong className="figure-m">{clockLabel(eat.minute)}</strong>
              {plan.eatTicketAfter ? (
                <>
                  {" "}
                  <span className="caption">{plan.eatTicketAfter}</span>
                </>
              ) : null}
            </p>
            <p className="caption">
              {answer.high === 0
                ? plan.noWait
                : fill(isExact ? plan.eatCalledAt : plan.eatCalled, called)}
            </p>
          </>
        ) : null}
        {eat?.kind === "late" && called ? (
          <>
            <p className="plan-wait">
              <strong className="plan-late">{plan.eatNow}</strong>
            </p>
            <p className="caption">
              {fill(isExact ? plan.eatLateAt : plan.eatLate, { ...called, time })}
            </p>
          </>
        ) : null}
        {eat?.kind === "early" ? <p className="caption">{fill(plan.eatEarly, { time })}</p> : null}
        {!answer && eat?.kind !== "early" ? <p className="caption">{plan.noUsual}</p> : null}
      </div>
      <PlanChart
        domain={domain}
        label={shortStoreName(store, language)}
        markerWait={answer?.median ?? null}
        minute={minute}
        nowLabel={
          isToday && isActiveStore(store) ? fill(plan.now, { wait: store.wait }) : undefined
        }
        slots={slots}
        ticket={mode === "eat" ? (ticket ?? undefined) : undefined}
        today={today}
        top={top}
      />
      <div className="plan-tip">
        {mode === "eat" && answer && answer.high > 0 ? (
          <>
            <span className="caption">{plan.eatWaitThen}</span>
            <strong className="plan-wait-then">
              {range(answer.low, answer.high)} {text.minutes}
            </strong>
          </>
        ) : null}
        {tip && tipMinute !== null ? (
          <>
            <span className="caption">{plan.shorterNearby}</span>
            <button
              className="chip"
              data-band={waitBand(tip.median)}
              onClick={() => onPickTime(tipMinute)}
              type="button"
            >
              <i className="band-dot" />
              {tip.high === 0
                ? fill(plan.tipNoQueue, { time: clockLabel(tipMinute) })
                : fill(plan.tip, { range: range(tip.low, tip.high), time: clockLabel(tipMinute) })}
            </button>
          </>
        ) : null}
        {mode === "ticket" && !tip && answer ? (
          <span className="caption">{plan.noShorter}</span>
        ) : null}
      </div>
      <StarToggle isSaved language={language} onToggle={onToggleSaved} />
    </li>
  );
}
