"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { QueueAreaChart } from "@/components/queue-area-chart";
import { QueueLegend } from "@/components/queue-legend";
import { StoreSheet } from "@/components/store-sheet";
import { Button } from "@/components/ui/button";
import {
  copy,
  fill,
  homeLists,
  type Language,
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
import { storeGridBands, storeGridNames } from "@/lib/store-grid";

// Rows shown in the queueing list before "Show all".
const queueingPreview = 8;

function normalizedStoreName(name: string) {
  return name.trim().replaceAll(/\s+/g, " ").toLocaleLowerCase();
}

export function QueueGrid() {
  const [language, setLanguage] = useState<Language>("zh-HK");
  const [snapshot, setSnapshot] = useState<QueueSnapshot | null>(null);
  const [history, setHistory] = useState<QueueHistory | null>(null);
  const [historyWindow, setHistoryWindow] = useState(() => {
    const end = Date.now();
    return { end, start: end - gridHistoryHours * 60 * 60 * 1_000 };
  });
  const [status, setStatus] = useState<"error" | "loading" | "ready">("loading");
  const [selectedStore, setSelectedStore] = useState<QueueStore | null>(null);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [showAllQueueing, setShowAllQueueing] = useState(false);

  useEffect(() => {
    const storedLanguage = window.localStorage.getItem("sushiro-language");

    if (storedLanguage === "en" || storedLanguage === "zh-HK") {
      setLanguage(storedLanguage);
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    let cancelled = false;

    async function loadQueues() {
      setStatus((currentStatus) => (currentStatus === "ready" ? currentStatus : "loading"));
      setIsRefreshing(true);

      try {
        const response = await fetch(`/api/queues?request=${refreshVersion}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Unable to load queues");
        }

        const nextSnapshot = (await response.json()) as QueueSnapshot;

        if (!cancelled) {
          setSnapshot(nextSnapshot);
          setUpdatedAt(new Date());
          setStatus("ready");
          setSelectedStore((store) =>
            store ? (nextSnapshot.stores.find(({ id }) => id === store.id) ?? null) : null,
          );
        }
      } catch {
        if (!cancelled) {
          setStatus((currentStatus) => (currentStatus === "ready" ? currentStatus : "error"));
        }
      } finally {
        if (!cancelled) {
          setIsRefreshing(false);
        }
      }
    }

    void loadQueues();

    return () => {
      cancelled = true;
    };
  }, [refreshVersion]);

  useEffect(() => {
    const interval = window.setInterval(() => setRefreshVersion((version) => version + 1), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      try {
        const response = await fetch(`/api/queues/charts?hours=${gridHistoryHours}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Unable to load queue history");
        }

        const nextHistory = (await response.json()) as QueueHistory;
        const end = Date.now();

        if (!cancelled) {
          setHistory(nextHistory);
          setHistoryWindow({ end, start: end - gridHistoryHours * 60 * 60 * 1_000 });
        }
      } catch {
        if (!cancelled) {
          setHistory({ global: [], stores: [] });
        }
      }
    }

    void loadHistory();
    const interval = window.setInterval(() => void loadHistory(), 5 * 60_000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!selectedStore) {
      return;
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelectedStore(null);
      }
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [selectedStore]);

  function changeLanguage(nextLanguage: Language) {
    window.localStorage.setItem("sushiro-language", nextLanguage);
    setLanguage(nextLanguage);
  }

  function refreshQueues() {
    setRefreshVersion((version) => version + 1);
  }

  const text = copy[language];
  const stores = snapshot?.stores ?? [];
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
      isRefreshing={isRefreshing}
      language={language}
      onLanguageChange={changeLanguage}
      onRefresh={refreshQueues}
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
                          data-band={band}
                          key={store.id}
                          onClick={() => setSelectedStore(store)}
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
                        onClick={() => setSelectedStore(store)}
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
                        onClick={() => setSelectedStore(store)}
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
                          onClick={() => setSelectedStore(store)}
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
            <Button onClick={refreshQueues} variant="secondary">
              {text.retry}
            </Button>
          </section>
        ) : null}
      </div>

      {selectedStore ? (
        <StoreSheet
          language={language}
          onClose={() => setSelectedStore(null)}
          points={historyByStoreId.get(selectedStore.id) ?? []}
          store={selectedStore}
        />
      ) : null}
    </AppShell>
  );
}
