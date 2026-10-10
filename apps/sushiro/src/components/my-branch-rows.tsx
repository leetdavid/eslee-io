"use client";

import { QueueAreaChart } from "@/components/queue-area-chart";
import {
  copy,
  fill,
  type Language,
  queueBand,
  shortStoreName,
  usualText,
  waitingGroups,
} from "@/lib/queue-presentation";
import { isActiveStore, type QueueHistoryPoint, type QueueStore } from "@/lib/queues";
import { statsCopy } from "@/lib/stats-copy";
import { type UsualStore, usualAt } from "@/lib/usual";

type MyBranchRowsProps = {
  className: string;
  historyByStoreId: Map<number, QueueHistoryPoint[]>;
  historyWindow: { end: number; start: number };
  language: Language;
  // Minutes since midnight and weekday in Hong Kong, for the usual wait at this time.
  now: { minute: number; weekday: number };
  onOpen: (store: QueueStore) => void;
  stores: QueueStore[];
  usual: UsualStore[];
};

// My branches on Home: the starred branches with their wait now and the usual wait for this time.
export function MyBranchRows({
  className,
  historyByStoreId,
  historyWindow,
  language,
  now,
  onOpen,
  stores,
  usual,
}: MyBranchRowsProps) {
  const text = copy[language];

  return (
    <section aria-label={text.myBranches} className={className}>
      <div className="list-heading">
        <h2>{text.myBranches}</h2>
        <span className="caption">
          {fill(text.myBranchesNote, {
            weekday: statsCopy[language].weekdaysLong[now.weekday] ?? "",
          })}
        </span>
      </div>
      <ul className="branch-rows">
        {stores.map((store) => {
          const points = historyByStoreId.get(store.id) ?? [];
          const slots = usual.find(({ storeId }) => storeId === store.id)?.slots ?? [];
          const usualNow = usualText(usualAt(slots, now.minute), language);

          return (
            <li key={store.id}>
              <button
                className="branch-row"
                data-band={queueBand(store)}
                onClick={() => onOpen(store)}
                type="button"
              >
                <i className="band-dot" />
                <span className="branch-row-main">
                  <span className="branch-row-name">{shortStoreName(store, language)}</span>
                  <span className="caption">
                    {usualNow ? `${usualNow} · ` : null}
                    {waitingGroups(store)} {text.groups}
                  </span>
                </span>
                <QueueAreaChart
                  end={historyWindow.end}
                  maximumWait={Math.max(30, ...points.map((point) => point.wait))}
                  points={points}
                  start={historyWindow.start}
                />
                {/* A branch that is closed or not issuing tickets shows that, not a zero wait. */}
                <span className="branch-row-figure">
                  <strong className="figure-m">
                    {isActiveStore(store) ? store.wait : text.pausedFigure}
                  </strong>
                  {isActiveStore(store) ? <span className="caption">{text.minutes}</span> : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
