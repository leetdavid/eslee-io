"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { QueueChart } from "@/components/queue-chart";
import {
  isActiveStore,
  isTicketing,
  type QueueHistory,
  type QueueSnapshot,
  type QueueStore,
} from "@/lib/queues";

type Language = "en" | "zh-HK";

const copy = {
  "zh-HK": {
    activeStores: "間正在派籌",
    address: "地址",
    calledTickets: "店鋪籌號",
    counter: "吧檯",
    dataSource: "非官方工具，資料來自壽司郎香港。",
    groups: "組",
    long: "輪候較多",
    language: "語言",
    mapLabel: "香港壽司郎籌號",
    moderate: "輪候中等",
    noQueue: "暫無輪候",
    pair: "二人枱",
    queueBreakdown: "輪候分類",
    refresh: "更新",
    retry: "重試",
    close: "關閉",
    loading: "載入中",
    short: "輪候較少",
    table: "餐桌",
    ticketing: "派籌中",
    ticketingPaused: "停止派籌",
    unavailable: "未能載入籌號資料",
    waitingGroups: "輪候組數",
    closed: "閉店中",
    history: "輪候趨勢",
    historyEmpty: "首次收集後將顯示趨勢。",
    historyPeriod: "過去 24 小時",
    globalQueues: "全港輪候組數",
    open: "營業中",
  },
  en: {
    activeStores: "issuing tickets",
    address: "Address",
    calledTickets: "Called tickets",
    counter: "Counter",
    dataSource: "Unofficial tool. Data from Sushiro Hong Kong.",
    groups: "groups",
    long: "Long queue",
    language: "Language",
    mapLabel: "Sushiro Hong Kong Queue",
    moderate: "Moderate queue",
    noQueue: "No queue",
    pair: "Pair seating",
    queueBreakdown: "Queue breakdown",
    refresh: "Refresh",
    retry: "Retry",
    close: "Close",
    loading: "Loading",
    short: "Short queue",
    table: "Table",
    ticketing: "Issuing tickets",
    ticketingPaused: "Ticketing paused",
    unavailable: "Unable to load queue data",
    waitingGroups: "Waiting groups",
    closed: "Closed",
    history: "Queue trends",
    historyEmpty: "Trends will appear after the first collection.",
    historyPeriod: "Last 24 hours",
    globalQueues: "All-store queue",
    open: "Open",
  },
} as const;

function queueBand(store: QueueStore) {
  if (!isActiveStore(store)) {
    return "muted";
  }

  if (store.wait === 0) {
    return "none";
  }

  if (store.wait <= 10) {
    return "short";
  }

  if (store.wait <= 30) {
    return "moderate";
  }

  return "long";
}

type PositionedStore = {
  store: QueueStore;
  x: number;
  y: number;
};

function layoutStores(stores: QueueStore[]) {
  const positioned: PositionedStore[] = [];

  for (const store of [...stores].sort((left, right) => left.id - right.id)) {
    const baseX = ((store.longitude - 113.79) / 0.67) * 100;
    const baseY = ((22.58 - store.latitude) / 0.44) * 100;
    let x = baseX;
    let y = baseY;

    for (let step = 0; step < 80; step += 1) {
      const overlaps = positioned.some((other) => Math.hypot(other.x - x, other.y - y) < 2.15);

      if (!overlaps) {
        break;
      }

      const angle = step * 2.4;
      const radius = 1 + Math.floor(step / 8) * 0.85;
      x = baseX + Math.cos(angle) * radius;
      y = baseY + Math.sin(angle) * radius;
    }

    positioned.push({ store, x, y });
  }

  return positioned;
}

function queueBandLabel(store: QueueStore, language: Language) {
  const text = copy[language];
  const band = queueBand(store);

  if (band === "none") {
    return text.noQueue;
  }

  if (band === "short") {
    return text.short;
  }

  if (band === "moderate") {
    return text.moderate;
  }

  return band === "long" ? text.long : null;
}

export function QueueMap() {
  const [language, setLanguage] = useState<Language>("zh-HK");
  const [snapshot, setSnapshot] = useState<QueueSnapshot | null>(null);
  const [status, setStatus] = useState<"error" | "loading" | "ready">("loading");
  const [selectedStore, setSelectedStore] = useState<QueueStore | null>(null);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [history, setHistory] = useState<QueueHistory | null>(null);

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
        const response = await fetch("/api/queues/charts?hours=24", { cache: "no-store" });

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
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    let cancelled = false;

    async function loadQueues() {
      setStatus("loading");
      setSnapshot(null);
      setSelectedStore(null);

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
        }
      } catch {
        if (!cancelled) {
          setStatus("error");
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

  const text = copy[language];
  const activeStores = snapshot?.stores.filter(isActiveStore) ?? [];
  const positionedStores = snapshot ? layoutStores(snapshot.stores) : [];
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

  return (
    <main className="queue-app">
      {status === "ready" && snapshot ? (
        <div className="map-stage">
          <div className="map-canvas">
            <Image
              alt=""
              className="basemap"
              height={2229}
              priority
              src="/hong-kong.png"
              width={3072}
            />
            {positionedStores.map(({ store, x, y }) => {
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
                  style={{ left: `${x}%`, top: `${y}%` }}
                  type="button"
                >
                  <strong>{store.wait}</strong>
                  <span>{storeName}</span>
                </button>
              );
            })}
          </div>
        </div>
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

      <div className="controls">
        <fieldset aria-label={text.language} className="language-toggle">
          <button
            aria-pressed={language === "zh-HK"}
            onClick={() => changeLanguage("zh-HK")}
            type="button"
          >
            中
          </button>
          <button
            aria-pressed={language === "en"}
            onClick={() => changeLanguage("en")}
            type="button"
          >
            EN
          </button>
        </fieldset>
        <button
          className="refresh-control"
          disabled={status === "loading"}
          onClick={refreshQueues}
          type="button"
        >
          {text.refresh}
        </button>
      </div>

      <aside aria-labelledby="history-heading" className="history-sidebar">
        <header>
          <div>
            <h2 id="history-heading">{text.history}</h2>
            <p>{text.historyPeriod}</p>
          </div>
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
        <aside
          aria-label={language === "en" ? selectedStore.nameEn : selectedStore.name}
          className="store-sheet"
        >
          <div className="sheet-handle" />
          <div className="sheet-heading">
            <div>
              <p>{selectedStore.area}</p>
              <h1>
                {language === "en"
                  ? selectedStore.nameEn || selectedStore.name
                  : selectedStore.name}
              </h1>
            </div>
            <button
              aria-label={text.close}
              className="close-sheet"
              onClick={() => setSelectedStore(null)}
              type="button"
            >
              {text.close}
            </button>
          </div>

          <div className="store-status">
            <span>{selectedStore.storeStatus === "OPEN" ? text.open : text.closed}</span>
            <span>{isTicketing(selectedStore) ? text.ticketing : text.ticketingPaused}</span>
            {queueBandLabel(selectedStore, language) ? (
              <span className={`status-dot status-dot-${queueBand(selectedStore)}`}>
                {queueBandLabel(selectedStore, language)}
              </span>
            ) : null}
          </div>

          <div className="wait-stat">
            <span>{text.waitingGroups}</span>
            <strong className={`count-${queueBand(selectedStore)}`}>{selectedStore.wait}</strong>
            <small>{text.groups}</small>
          </div>

          <div className="sheet-grid">
            <div>
              <p>{text.address}</p>
              <span>{selectedStore.address}</span>
            </div>
            <div>
              <p>{text.calledTickets}</p>
              <span>{selectedStore.storeQueue.join(", ") || "—"}</span>
            </div>
          </div>

          <section className="breakdown">
            <p>{text.queueBreakdown}</p>
            <table>
              <thead>
                <tr>
                  <th>{text.table}</th>
                  <th>{text.counter}</th>
                  <th>{text.pair}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{selectedStore.waitingGroupTable}</td>
                  <td>{selectedStore.waitingGroupCounter}</td>
                  <td>{selectedStore.waitingGroupPair}</td>
                </tr>
              </tbody>
            </table>
          </section>

          <footer>{text.dataSource}</footer>
        </aside>
      ) : null}
    </main>
  );
}
