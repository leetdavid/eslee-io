"use client";

import { PlanChart } from "@/components/plan-chart";
import { StarToggle } from "@/components/star-toggle";
import { Badge } from "@/components/ui/badge";
import { clockLabel, type PlanDomain, planAnswer, shorterNearby } from "@/lib/plan";
import { planCopy } from "@/lib/plan-copy";
import { fill, type Language, shortStoreName, waitBand } from "@/lib/queue-presentation";
import { isActiveStore, type QueueHistory, type QueueStore } from "@/lib/queues";
import { useSharedJson } from "@/lib/shared-json";
import { hongKongDate } from "@/lib/stats";
import { hongKongClock, type UsualSlot } from "@/lib/usual";

type PlanBranchProps = {
  domain: PlanDomain;
  isShortest: boolean;
  language: Language;
  minute: number;
  // Minutes since Hong Kong midnight when the chosen day is today. Null for another day.
  nowMinute: number | null;
  onPickTime: (minute: number) => void;
  onToggleSaved: () => void;
  slots: UsualSlot[];
  store: QueueStore;
  top: number;
};

// One of My branches on Plan a meal: the usual wait for a ticket at the chosen time, when that
// ticket would be called, the branch's day as a chart, and a shorter time nearby if there is one.
export function PlanBranch({
  domain,
  isShortest,
  language,
  minute,
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

  const answer = planAnswer(slots, minute);
  const tipMinute = shorterNearby(slots, minute, nowMinute ?? 0);
  const tip = tipMinute === null ? null : planAnswer(slots, tipMinute);
  const range = (low: number, high: number) =>
    low === high ? String(high) : fill(plan.range, { high, low });

  return (
    <li className="plan-branch" data-band={answer ? waitBand(answer.median) : "muted"}>
      <div className="plan-answer">
        <div className="plan-name">
          <span className="branch-row-name">{shortStoreName(store, language)}</span>
          {isShortest ? <Badge color="gray">{plan.shortest}</Badge> : null}
        </div>
        {answer ? (
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
                : answer.low === answer.high
                  ? fill(plan.calledAt, { from: clockLabel(minute + answer.high) })
                  : fill(plan.called, {
                      from: clockLabel(minute + answer.low),
                      to: clockLabel(minute + answer.high),
                    })}
            </p>
          </>
        ) : (
          <p className="caption">{plan.noUsual}</p>
        )}
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
        today={today}
        top={top}
      />
      <div className="plan-tip">
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
        ) : answer ? (
          <span className="caption">{plan.noShorter}</span>
        ) : null}
      </div>
      <StarToggle isSaved language={language} onToggle={onToggleSaved} />
    </li>
  );
}
