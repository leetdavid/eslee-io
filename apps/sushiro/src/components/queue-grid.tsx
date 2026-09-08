"use client";

import { useEffect, useState } from "react";
import { AppNavigation } from "@/components/app-navigation";
import { QueueAreaChart } from "@/components/queue-area-chart";
import { StoreSheet } from "@/components/store-sheet";
import { copy, type Language, queueBand } from "@/lib/queue-presentation";
import type { QueueHistory, QueueSnapshot, QueueStore } from "@/lib/queues";
import { storeGridCells } from "@/lib/store-grid";

function normalizedStoreName(name: string) {
  return name.trim().replaceAll(/\s+/g, " ").toLocaleLowerCase();
}

export function QueueGrid() {
  const [language, setLanguage] = useState<Language>("zh-HK");
  const [snapshot, setSnapshot] = useState<QueueSnapshot | null>(null);
  const [history, setHistory] = useState<QueueHistory | null>(null);
  const [historyWindow, setHistoryWindow] = useState(() => {
    const end = Date.now();
    return { end, start: end - 12 * 60 * 60 * 1_000 };
  });
  const [status, setStatus] = useState<"error" | "loading" | "ready">("loading");
  const [selectedStore, setSelectedStore] = useState<QueueStore | null>(null);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(true);

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
        const response = await fetch("/api/queues/charts?hours=12", { cache: "no-store" });

        if (!response.ok) {
          throw new Error("Unable to load queue history");
        }

        const nextHistory = (await response.json()) as QueueHistory;
        const end = Date.now();

        if (!cancelled) {
          setHistory(nextHistory);
          setHistoryWindow({ end, start: end - 12 * 60 * 60 * 1_000 });
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
  const storesByGridName = new Map(
    (snapshot?.stores ?? []).map((store) => [
      normalizedStoreName(store.nameEn || store.name),
      store,
    ]),
  );
  const configuredNames = new Set(
    storeGridCells.flatMap(({ name }) => (name ? [normalizedStoreName(name)] : [])),
  );
  const historyByStoreId = new Map(
    (history?.stores ?? []).map((store) => [store.storeId, store.points]),
  );
  const maximumWait = Math.max(
    1,
    ...(snapshot?.stores.map((store) => store.wait) ?? []),
    ...(history?.stores.flatMap((store) => store.points.map((point) => point.wait)) ?? []),
  );
  const unplacedStores = (snapshot?.stores ?? []).filter(
    (store) => !configuredNames.has(normalizedStoreName(store.nameEn || store.name)),
  );

  return (
    <div className="grid-app">
      <a className="skip-link" href="#grid-content">
        {text.grid}
      </a>
      <AppNavigation
        activePage="grid"
        isRefreshing={isRefreshing}
        language={language}
        onLanguageChange={changeLanguage}
        onRefresh={refreshQueues}
      />
      <main className="grid-home" id="grid-content">
        {status === "ready" && snapshot ? (
          <section aria-label={text.mapLabel} className="store-grid">
            {storeGridCells.map(({ key, name: gridName }) => {
              const store = gridName ? storesByGridName.get(normalizedStoreName(gridName)) : null;

              if (!store) {
                return <div aria-hidden="true" className="grid-card-empty" key={key} />;
              }

              const storeName = language === "en" ? store.nameEn || store.name : store.name;
              const points = historyByStoreId.get(store.id) ?? [];

              return (
                <button
                  aria-label={`${storeName}: ${store.wait} ${text.groups}. ${text.calledTickets} ${store.storeQueue.join(", ") || "—"}.`}
                  className="grid-queue-card"
                  data-band={queueBand(store)}
                  key={store.id}
                  onClick={() => setSelectedStore(store)}
                  type="button"
                >
                  <QueueAreaChart
                    end={historyWindow.end}
                    maximumWait={maximumWait}
                    points={points}
                    start={historyWindow.start}
                  />
                  <span className="grid-card-name">{storeName}</span>
                  <strong>{store.wait}</strong>
                  <span aria-hidden="true" className="grid-card-tickets">
                    {store.storeQueue.length > 0 ? (
                      store.storeQueue.map((ticket) => <span key={ticket}>{ticket}</span>)
                    ) : (
                      <span>—</span>
                    )}
                  </span>
                </button>
              );
            })}
          </section>
        ) : null}

        {status === "ready" && unplacedStores.length > 0 ? (
          <section aria-labelledby="unplaced-stores-heading" className="unplaced-stores">
            <h1 id="unplaced-stores-heading">{text.unplacedStores}</h1>
            <div>
              {unplacedStores.map((store) => {
                const storeName = language === "en" ? store.nameEn || store.name : store.name;

                return (
                  <button key={store.id} onClick={() => setSelectedStore(store)} type="button">
                    {storeName}
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}

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
      </main>
      <div aria-hidden="true" className="general-stats-space" />

      {selectedStore ? (
        <StoreSheet
          language={language}
          onClose={() => setSelectedStore(null)}
          store={selectedStore}
        />
      ) : null}
    </div>
  );
}
