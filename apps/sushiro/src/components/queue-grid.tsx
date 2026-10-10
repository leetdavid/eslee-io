"use client";

import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useLanguage } from "@/components/language-provider";
import { MyBranchRows } from "@/components/my-branch-rows";
import { QueueAreaChart } from "@/components/queue-area-chart";
import { QueueLegend } from "@/components/queue-legend";
import { StoreSheet } from "@/components/store-sheet";
import { Button } from "@/components/ui/button";
import { useMyBranches } from "@/lib/my-branches";
import {
  copy,
  fill,
  homeLists,
  networkTotal,
  queueBand,
  shortStoreName,
  storeName,
  waitingGroups,
} from "@/lib/queue-presentation";
import {
  gridHistoryHours,
  type QueueHistory,
  type QueueSnapshot,
  type QueueStore,
} from "@/lib/queues";
import { useSelectedStore } from "@/lib/selected-store";
import { useSharedJson } from "@/lib/shared-json";
import { storeGridBands, storeGridNames } from "@/lib/store-grid";
import { hongKongClock, type UsualResponse } from "@/lib/usual";

// Rows shown in the queueing list before "Show all".
const queueingPreview = 8;

function normalizedStoreName(name: string) {
  return name.trim().replaceAll(/\s+/g, " ").toLocaleLowerCase();
}

export function QueueGrid() {
  const { language, setLanguage } = useLanguage();
  const feed = useSharedJson<QueueSnapshot>("/api/queues", { maxAgeMs: 60_000, pollMs: 60_000 });
  const chart = useSharedJson<QueueHistory>(`/api/queues/charts?hours=${gridHistoryHours}`, {
    maxAgeMs: 5 * 60_000,
    pollMs: 5 * 60_000,
  });
  const [showAllQueueing, setShowAllQueueing] = useState(false);
  const snapshot = feed.data;
  const history = chart.data;
  const stores = snapshot?.stores ?? [];
  const { close: closeStore, open: openStore, selectedStore } = useSelectedStore(stores);
  const status = snapshot ? "ready" : feed.error ? "error" : "loading";
  // Trends cover the hours up to the moment the history last loaded.
  const historyWindow = {
    end: chart.loadedAt,
    start: chart.loadedAt - gridHistoryHours * 60 * 60 * 1_000,
  };
  const updatedAt = feed.loadedAt ? new Date(feed.loadedAt) : null;
  const { ids: savedIds } = useMyBranches();
  // The clock moves on each time the feed refreshes.
  const now = hongKongClock(new Date(feed.loadedAt || Date.now()));
  const usual = useSharedJson<UsualResponse>(
    savedIds.length > 0
      ? `/api/queues/usual?weekday=${now.dayType}&storeIds=${[...savedIds].sort((left, right) => left - right).join(",")}`
      : null,
    { maxAgeMs: 10 * 60_000 },
  );
  const savedStores = stores
    .filter(({ id }) => savedIds.includes(id))
    .sort((left, right) => left.wait - right.wait || left.id - right.id);

  const text = copy[language];
  const storesByGridName = new Map(
    stores.map((store) => [normalizedStoreName(store.nameEn || store.name), store]),
  );
  const configuredNames = new Set(storeGridNames.map(normalizedStoreName));
  const unplacedStores = stores.filter(
    (store) => !configuredNames.has(normalizedStoreName(store.nameEn || store.name)),
  );
  const historyByStoreId = new Map(
    (history?.stores ?? []).map((store) => [
      store.storeId,
      store.points.filter((point) => {
        const timestamp = new Date(point.collectedAt).valueOf();
        return timestamp >= historyWindow.start && timestamp <= historyWindow.end;
      }),
    ]),
  );
  const total = networkTotal(stores);
  const { noQueue, queueing } = homeLists(stores, language);
  const visibleQueueing = showAllQueueing ? queueing : queueing.slice(0, queueingPreview);
  const updatedTime = updatedAt
    ? new Intl.DateTimeFormat(language, {
        hour: "2-digit",
        hourCycle: "h23",
        minute: "2-digit",
      }).format(updatedAt)
    : null;

  function describe(store: QueueStore) {
    return `${storeName(store, language)}: ${store.wait} ${text.minutes}, ${waitingGroups(store)} ${text.groups}`;
  }

  return (
    <AppShell
      activePage="grid"
      isRefreshing={feed.pending}
      language={language}
      onLanguageChange={setLanguage}
      onRefresh={feed.refresh}
    >
      <div className="home">
        {status === "ready" && snapshot ? (
          <>
            <div>
              <div className="home-summary">
                <div className="home-total">
                  <strong className="figure-l">{total.groups}</strong>
                  <span>{text.groupsWaiting}</span>
                </div>
                <p className="caption home-meta">
                  {fill(text.branchesIssuing, { count: total.activeStores })}
                  {updatedTime ? ` · ${fill(text.updated, { time: updatedTime })}` : null}
                </p>
              </div>
              {savedStores.length > 0 ? (
                <MyBranchRows
                  className="my-branches my-branches-stacked"
                  historyByStoreId={historyByStoreId}
                  historyWindow={historyWindow}
                  language={language}
                  now={now}
                  onOpen={openStore}
                  stores={savedStores}
                  usual={usual.data?.stores ?? []}
                />
              ) : null}

              {storeGridBands.map(({ band, cells }) => (
                <section aria-label={text.territory[band]} key={band}>
                  {band === "hongKongIsland" ? (
                    <p aria-hidden="true" className="harbour">
                      <span>{text.territory.harbour}</span>
                    </p>
                  ) : null}
                  <p aria-hidden="true" className="band-label">
                    <span>{text.territory[band]}</span>
                    {band === "kowloon" ? <span>{text.territory.tseungKwanO}</span> : null}
                  </p>
                  <div className="tile-grid">
                    {cells.map(({ key, name }) => {
                      const store = name ? storesByGridName.get(normalizedStoreName(name)) : null;

                      if (!store) {
                        return <div aria-hidden="true" className="tile tile-empty" key={key} />;
                      }

                      const band = queueBand(store);

                      return (
                        <button
                          aria-label={describe(store)}
                          className="tile"
                          data-saved={savedIds.includes(store.id) || undefined}
                          data-band={band}
                          key={store.id}
                          onClick={() => openStore(store)}
                          type="button"
                        >
                          <span className="tile-name">{shortStoreName(store, language)}</span>
                          <span className="tile-figure">
                            {band === "muted" ? text.pausedFigure : store.wait}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}

              <QueueLegend language={language} />

              {unplacedStores.length > 0 ? (
                <section aria-labelledby="unplaced-stores-heading">
                  <div className="unplaced-heading list-heading">
                    <h2 id="unplaced-stores-heading">{text.unplacedStores}</h2>
                  </div>
                  <div className="chip-list">
                    {unplacedStores.map((store) => (
                      <button
                        className="chip"
                        key={store.id}
                        onClick={() => openStore(store)}
                        type="button"
                      >
                        {shortStoreName(store, language)}
                      </button>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>

            <div className="home-lists">
              {savedStores.length > 0 ? (
                <MyBranchRows
                  className="my-branches my-branches-side"
                  historyByStoreId={historyByStoreId}
                  historyWindow={historyWindow}
                  language={language}
                  now={now}
                  onOpen={openStore}
                  stores={savedStores}
                  usual={usual.data?.stores ?? []}
                />
              ) : null}
              {noQueue.length > 0 ? (
                <section aria-labelledby="no-queue-heading">
                  <div className="list-heading">
                    <h2 id="no-queue-heading">{text.noQueue}</h2>
                    <span className="caption">
                      {fill(text.branchCount, { count: noQueue.length })}
                    </span>
                  </div>
                  <div className="chip-list">
                    {noQueue.map((store) => (
                      <button
                        className="chip"
                        key={store.id}
                        onClick={() => openStore(store)}
                        type="button"
                      >
                        {shortStoreName(store, language)}
                      </button>
                    ))}
                  </div>
                </section>
              ) : null}

              <section aria-labelledby="queueing-heading">
                <div className="list-heading">
                  <h2 id="queueing-heading">{text.queueing}</h2>
                  <span className="caption">
                    {fill(text.branchCount, { count: queueing.length })}
                  </span>
                </div>
                <ul className="branch-rows">
                  {visibleQueueing.map((store) => {
                    const points = historyByStoreId.get(store.id) ?? [];

                    return (
                      <li key={store.id}>
                        <button
                          aria-label={describe(store)}
                          className="branch-row"
                          data-band={queueBand(store)}
                          onClick={() => openStore(store)}
                          type="button"
                        >
                          <i className="band-dot" />
                          <span className="branch-row-main">
                            <span className="branch-row-name">
                              {shortStoreName(store, language)}
                            </span>
                            <span className="caption">
                              {store.area} · {waitingGroups(store)} {text.groups}
                            </span>
                          </span>
                          {/* Each row scales to its own peak, with a 30-minute floor so a quiet
                              branch does not look dramatic. */}
                          <QueueAreaChart
                            end={historyWindow.end}
                            maximumWait={Math.max(30, ...points.map((point) => point.wait))}
                            points={points}
                            start={historyWindow.start}
                          />
                          <span className="branch-row-figure">
                            <strong className="figure-m">{store.wait}</strong>
                            <span className="caption">{text.minutes}</span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
                {queueing.length > queueingPreview ? (
                  <Button
                    className="w-full"
                    onClick={() => setShowAllQueueing((showAll) => !showAll)}
                    variant="secondary"
                  >
                    {showAllQueueing
                      ? text.showFewer
                      : fill(text.showAll, { count: queueing.length })}
                  </Button>
                ) : null}
              </section>
            </div>
          </>
        ) : null}

        {status === "loading" ? (
          <div aria-live="polite" className="home-status">
            {text.loading}
          </div>
        ) : null}

        {status === "error" ? (
          <section className="home-status" role="alert">
            <p>{text.unavailable}</p>
            <Button onClick={feed.refresh} variant="secondary">
              {text.retry}
            </Button>
          </section>
        ) : null}
      </div>

      {selectedStore ? (
        <StoreSheet
          language={language}
          onClose={() => closeStore()}
          points={historyByStoreId.get(selectedStore.id) ?? []}
          store={selectedStore}
        />
      ) : null}
    </AppShell>
  );
}
