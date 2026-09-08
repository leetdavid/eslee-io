"use client";

import Image from "next/image";
import { type PointerEvent, useEffect, useRef, useState, type WheelEvent } from "react";
import { AppNavigation } from "@/components/app-navigation";
import { QueueChart } from "@/components/queue-chart";
import { StoreSheet } from "@/components/store-sheet";
import { copy, type Language, queueBand } from "@/lib/queue-presentation";
import {
  type HistoryRange,
  historyRanges,
  isActiveStore,
  type QueueHistory,
  type QueueSnapshot,
  type QueueStore,
} from "@/lib/queues";

const minMapZoom = 1;
const maxMapZoom = 3;
const mapZoomStep = 0.25;

type MapPosition = {
  x: number;
  y: number;
};

type MapDrag = {
  clientX: number;
  clientY: number;
  position: MapPosition;
  pointerId: number;
};

function clampMapPosition(
  mapCanvas: HTMLDivElement | null,
  position: MapPosition,
  zoom: number,
): MapPosition {
  const mapStage = mapCanvas?.parentElement;

  if (!mapCanvas || !mapStage) {
    return position;
  }

  const maxX = Math.max(0, (mapCanvas.offsetWidth * zoom - mapStage.clientWidth) / 2);
  const maxY = Math.max(0, (mapCanvas.offsetHeight * zoom - mapStage.clientHeight) / 2);

  return {
    x: Math.max(-maxX, Math.min(maxX, position.x)),
    y: Math.max(-maxY, Math.min(maxY, position.y)),
  };
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

export function QueueMap() {
  const [language, setLanguage] = useState<Language>("zh-HK");
  const [snapshot, setSnapshot] = useState<QueueSnapshot | null>(null);
  const [status, setStatus] = useState<"error" | "loading" | "ready">("loading");
  const [selectedStore, setSelectedStore] = useState<QueueStore | null>(null);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(true);
  const [history, setHistory] = useState<QueueHistory | null>(null);
  const [historyRange, setHistoryRange] = useState<HistoryRange>(24);
  const [mapZoom, setMapZoom] = useState(minMapZoom);
  const [mapPosition, setMapPosition] = useState<MapPosition>({ x: 0, y: 0 });
  const [isDraggingMap, setIsDraggingMap] = useState(false);
  const mapCanvasRef = useRef<HTMLDivElement>(null);
  const mapDragRef = useRef<MapDrag | null>(null);

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

  useEffect(() => {
    function constrainMapPosition() {
      setMapPosition((position) => clampMapPosition(mapCanvasRef.current, position, mapZoom));
    }

    constrainMapPosition();
    window.addEventListener("resize", constrainMapPosition);

    return () => window.removeEventListener("resize", constrainMapPosition);
  }, [mapZoom]);

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

  function changeHistoryRange(range: HistoryRange) {
    setHistory(null);
    setHistoryRange(range);
  }

  function changeMapZoom(amount: number) {
    setMapZoom((currentZoom) => Math.max(minMapZoom, Math.min(maxMapZoom, currentZoom + amount)));
  }

  function handleMapWheel(event: WheelEvent<HTMLDivElement>) {
    if (event.deltaY === 0) {
      return;
    }

    event.preventDefault();
    changeMapZoom(event.deltaY < 0 ? mapZoomStep : -mapZoomStep);
  }

  function handleMapPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (mapZoom === minMapZoom || event.button !== 0 || event.target !== event.currentTarget) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    mapDragRef.current = {
      clientX: event.clientX,
      clientY: event.clientY,
      pointerId: event.pointerId,
      position: mapPosition,
    };
    setIsDraggingMap(true);
  }

  function handleMapPointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = mapDragRef.current;

    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    setMapPosition(
      clampMapPosition(
        mapCanvasRef.current,
        {
          x: drag.position.x + event.clientX - drag.clientX,
          y: drag.position.y + event.clientY - drag.clientY,
        },
        mapZoom,
      ),
    );
  }

  function handleMapPointerEnd(event: PointerEvent<HTMLDivElement>) {
    if (mapDragRef.current?.pointerId === event.pointerId) {
      mapDragRef.current = null;
      setIsDraggingMap(false);
    }
  }

  return (
    <main className="queue-app">
      <a className="skip-link" href="#map-content">
        {text.map}
      </a>
      <AppNavigation
        activePage="map"
        isRefreshing={isRefreshing}
        language={language}
        onLanguageChange={changeLanguage}
        onRefresh={refreshQueues}
      />
      {status === "ready" && snapshot ? (
        <div
          id="map-content"
          className="map-stage"
          data-dragging={isDraggingMap}
          data-pannable={mapZoom > minMapZoom}
        >
          <div
            className="map-canvas"
            onPointerCancel={handleMapPointerEnd}
            onPointerDown={handleMapPointerDown}
            onPointerMove={handleMapPointerMove}
            onPointerUp={handleMapPointerEnd}
            onWheel={handleMapWheel}
            ref={mapCanvasRef}
            style={{
              transform: `translate(calc(-50% + ${mapPosition.x}px), calc(-50% + ${mapPosition.y}px)) scale(${mapZoom})`,
            }}
          >
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
                  style={{
                    left: `${x}%`,
                    top: `${y}%`,
                    transform: `translate(-50%, -50%) scale(${1 / mapZoom})`,
                  }}
                  type="button"
                >
                  <strong>{store.wait}</strong>
                </button>
              );
            })}
          </div>
          <fieldset aria-label={text.mapLabel} className="map-zoom-controls">
            <button
              aria-label={text.zoomIn}
              disabled={mapZoom === maxMapZoom}
              onClick={() => changeMapZoom(mapZoomStep)}
              type="button"
            >
              +
            </button>
            <button
              aria-label={text.zoomOut}
              disabled={mapZoom === minMapZoom}
              onClick={() => changeMapZoom(-mapZoomStep)}
              type="button"
            >
              -
            </button>
          </fieldset>
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
    </main>
  );
}
