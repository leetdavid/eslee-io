"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { MapViewport } from "@/components/map-viewport";
import { QueueChart } from "@/components/queue-chart";
import { StoreSheet } from "@/components/store-sheet";
import { projectMapLocation } from "@/lib/map-projection";
import { copy, type Language, queueBand } from "@/lib/queue-presentation";
import {
  type HistoryRange,
  historyRanges,
  isActiveStore,
  type QueueHistory,
  type QueueSnapshot,
  type QueueStore,
} from "@/lib/queues";

export function QueueMap() {
  const [language, setLanguage] = useState<Language>("zh-HK");
  const [snapshot, setSnapshot] = useState<QueueSnapshot | null>(null);
  const [status, setStatus] = useState<"error" | "loading" | "ready">("loading");
  const [selectedStore, setSelectedStore] = useState<QueueStore | null>(null);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(true);
  const [history, setHistory] = useState<QueueHistory | null>(null);
  const [historyRange, setHistoryRange] = useState<HistoryRange>(24);

  useEffect(() => {
    const storedLanguage = window.localStorage.getItem("sushiro-language");

    if (storedLanguage === "en" || storedLanguage === "zh-HK") {
      setLanguage(storedLanguage);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      try {
        const response = await fetch(`/api/queues/charts?hours=${historyRange}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Unable to load queue history");
        }

        const nextHistory = (await response.json()) as QueueHistory;

        if (!cancelled) {
          setHistory(nextHistory);
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
  }, [historyRange]);

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
    const interval = window.setInterval(() => {
      setRefreshVersion((version) => version + 1);
    }, 60_000);

    return () => {
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

  const text = copy[language];
  const activeStores = snapshot?.stores.filter(isActiveStore) ?? [];
  const total = activeStores.reduce((sum, store) => sum + store.wait, 0);
  const historyStores = history
    ? [...history.stores].sort((left, right) => {
        const leftWait =
          snapshot?.stores.find(({ id }) => id === left.storeId)?.wait ?? left.latestWait;
        const rightWait =
          snapshot?.stores.find(({ id }) => id === right.storeId)?.wait ?? right.latestWait;

        return rightWait - leftWait || left.storeId - right.storeId;
      })
    : [];

  function changeLanguage(nextLanguage: Language) {
    window.localStorage.setItem("sushiro-language", nextLanguage);
    setLanguage(nextLanguage);
  }

  function refreshQueues() {
    setRefreshVersion((version) => version + 1);
  }

  function changeHistoryRange(range: HistoryRange) {
    setHistory(null);
    setHistoryRange(range);
  }

  return (
    <AppShell
      activePage="map"
      isRefreshing={isRefreshing}
      language={language}
      onLanguageChange={changeLanguage}
      onRefresh={refreshQueues}
    >
      {status === "ready" && snapshot ? (
        <MapViewport language={language}>
          <Image
            alt=""
            className="basemap"
            height={445}
            priority
            src="/hong-kong.svg"
            width={613}
          />
          {snapshot.stores.map((store) => {
            const { x, y } = projectMapLocation(store);
            const storeName = language === "en" ? store.nameEn || store.name : store.name;
            const band = queueBand(store);
            const isSelected = selectedStore?.id === store.id;
            const hasQueue = isActiveStore(store) && store.wait > 0;

            return (
              <button
                aria-label={`${storeName}: ${store.wait} ${text.groups}`}
                className={`store-marker store-marker-${band}`}
                data-has-queue={hasQueue}
                data-selected={isSelected}
                key={store.id}
                onClick={() => setSelectedStore(store)}
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                }}
                type="button"
              >
                <strong>{store.wait}</strong>
              </button>
            );
          })}
        </MapViewport>
      ) : null}

      {status === "ready" ? (
        <section className="telemetry" aria-label={text.mapLabel}>
          <p>{text.mapLabel}</p>
          <div>
            <strong>{total}</strong>
            <span>{text.groups}</span>
          </div>
          <small>
            {activeStores.length} {text.activeStores}
          </small>
        </section>
      ) : null}

      <aside aria-labelledby="history-heading" className="history-sidebar">
        <header>
          <div>
            <h2 id="history-heading">{text.history}</h2>
            <p>{text.historyPeriod[historyRange]}</p>
          </div>
          <fieldset aria-label={text.history} className="history-range">
            {historyRanges.map((range) => (
              <button
                aria-pressed={historyRange === range}
                key={range}
                onClick={() => changeHistoryRange(range)}
                type="button"
              >
                {text.historyRange[range]}
              </button>
            ))}
          </fieldset>
        </header>
        {history === null ? <p className="history-loading">{text.loading}</p> : null}
        {history && history.global.length === 0 ? (
          <p className="history-empty">{text.historyEmpty}</p>
        ) : null}
        {history && history.global.length > 0 ? (
          <div className="history-charts">
            <QueueChart
              label={text.globalQueues}
              latestWait={snapshot ? total : undefined}
              locale={language}
              points={history.global}
              valueLabel={text.groups}
            />
            <div className="history-store-list">
              {historyStores.map((store) => {
                const storeName = language === "en" ? store.nameEn || store.name : store.name;
                const matchingStore = snapshot?.stores.find(({ id }) => id === store.storeId);

                return (
                  <button
                    aria-label={`${storeName}: ${matchingStore?.wait ?? store.latestWait} ${text.groups}`}
                    className="history-store"
                    disabled={!matchingStore}
                    key={store.storeId}
                    onClick={() => matchingStore && setSelectedStore(matchingStore)}
                    type="button"
                  >
                    <QueueChart
                      label={storeName}
                      latestWait={matchingStore?.wait}
                      locale={language}
                      points={store.points}
                      valueLabel={text.groups}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </aside>

      {status === "loading" ? (
        <div aria-live="polite" className="loading">
          {text.loading}
        </div>
      ) : null}

      {status === "error" ? (
        <section className="error-state" role="alert">
          <p>{text.unavailable}</p>
          <button onClick={refreshQueues} type="button">
            {text.retry}
          </button>
        </section>
      ) : null}

      {selectedStore ? (
        <StoreSheet
          language={language}
          onClose={() => setSelectedStore(null)}
          store={selectedStore}
        />
      ) : null}
    </AppShell>
  );
}
