"use client";

import { AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useLanguage } from "@/components/language-provider";
import { LoadError } from "@/components/load-error";
import { MapViewport } from "@/components/map-viewport";
import { QueueChart } from "@/components/queue-chart";
import { QueueLegend } from "@/components/queue-legend";
import { StoreSheet } from "@/components/store-sheet";
import { projectMapLocation } from "@/lib/map-projection";
import {
  copy,
  fill,
  networkTotal,
  queueBand,
  storeName,
  waitingGroups,
} from "@/lib/queue-presentation";
import {
  type HistoryRange,
  historyRanges,
  isActiveStore,
  type QueueHistory,
  type QueueSnapshot,
} from "@/lib/queues";
import { useSelectedStore } from "@/lib/selected-store";
import { useSharedJson } from "@/lib/shared-json";

export function QueueMap() {
  const { language, setLanguage } = useLanguage();
  const [historyRange, setHistoryRange] = useState<HistoryRange>(24);
  const feed = useSharedJson<QueueSnapshot>("/api/queues", { maxAgeMs: 60_000, pollMs: 60_000 });
  const chart = useSharedJson<QueueHistory>(`/api/queues/charts?hours=${historyRange}`, {
    maxAgeMs: 5 * 60_000,
    pollMs: 5 * 60_000,
  });
  const snapshot = feed.data;
  // A failed history load shows the empty state instead of loading forever.
  const history: QueueHistory | null =
    chart.data ?? (chart.error ? { global: [], stores: [] } : null);
  const {
    close: closeStore,
    open: openStore,
    selectedStore,
  } = useSelectedStore(snapshot?.stores ?? []);
  const status = snapshot ? "ready" : feed.error ? "error" : "loading";

  const text = copy[language];
  const activeStores = snapshot?.stores.filter(isActiveStore) ?? [];
  const total = networkTotal(snapshot?.stores ?? []);
  const averageWait = Math.round(
    activeStores.reduce((sum, store) => sum + store.wait, 0) / Math.max(1, activeStores.length),
  );
  // The history total sums every store's wait, so divide it back into an average wait.
  const averageHistory = (history?.global ?? []).map((point) => ({
    ...point,
    wait: Math.round(point.wait / Math.max(1, history?.stores.length ?? 1)),
  }));
  const historyStores = history
    ? [...history.stores].sort((left, right) => {
        const leftWait =
          snapshot?.stores.find(({ id }) => id === left.storeId)?.wait ?? left.latestWait;
        const rightWait =
          snapshot?.stores.find(({ id }) => id === right.storeId)?.wait ?? right.latestWait;

        return rightWait - leftWait || left.storeId - right.storeId;
      })
    : [];

  return (
    <AppShell
      activePage="map"
      isRefreshing={feed.pending}
      language={language}
      onLanguageChange={setLanguage}
      onRefresh={feed.refresh}
      staleSince={feed.error && feed.data ? feed.loadedAt : null}
      updatedAt={feed.loadedAt}
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
            const band = queueBand(store);
            const isSelected = selectedStore?.id === store.id;

            return (
              <button
                aria-label={`${storeName(store, language)}: ${store.wait} ${text.minutes}, ${waitingGroups(store)} ${text.groups}`}
                className="store-marker"
                data-band={band}
                data-selected={isSelected}
                key={store.id}
                onClick={() => openStore(store)}
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                }}
                type="button"
              >
                {band === "muted" ? text.pausedFigure : store.wait}
              </button>
            );
          })}
        </MapViewport>
      ) : null}

      {status === "ready" ? (
        <>
          <section aria-label={text.mapLabel} className="telemetry">
            <div className="home-total">
              <strong className="figure-l">{total.groups}</strong>
              <span>{text.groupsWaiting}</span>
            </div>
            <p className="caption">{fill(text.branchesIssuing, { count: total.activeStores })}</p>
          </section>
          <div className="map-legend">
            <QueueLegend language={language} />
            <p className="caption">{text.mapCredit}</p>
          </div>
        </>
      ) : null}

      <aside aria-labelledby="history-heading" className="history-sidebar min-w-0">
        <header>
          <div className="min-w-0">
            <h2 id="history-heading">{text.history}</h2>
            <p>{text.historyPeriod[historyRange]}</p>
          </div>
          <fieldset aria-label={text.history} className="segmented">
            {historyRanges.map((range) => (
              <button
                aria-pressed={historyRange === range}
                key={range}
                onClick={() => setHistoryRange(range)}
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
          <div className="history-charts min-w-0">
            <QueueChart
              label={text.averageWait}
              latestWait={snapshot ? averageWait : undefined}
              locale={language}
              points={averageHistory}
              valueLabel={text.minutes}
            />
            <p className="history-list-label">{text.longestWaits}</p>
            <div className="history-store-list">
              {historyStores.map((store) => {
                const name = language === "en" ? store.nameEn || store.name : store.name;
                const matchingStore = snapshot?.stores.find(({ id }) => id === store.storeId);

                return (
                  <button
                    aria-label={`${name}: ${matchingStore?.wait ?? store.latestWait} ${text.minutes}`}
                    className="history-store min-w-0"
                    data-band={matchingStore ? queueBand(matchingStore) : "muted"}
                    disabled={!matchingStore}
                    key={store.storeId}
                    onClick={() => matchingStore && openStore(matchingStore)}
                    type="button"
                  >
                    <QueueChart
                      label={name.replace(/店$/, "")}
                      latestWait={matchingStore?.wait}
                      locale={language}
                      points={store.points}
                      valueLabel={text.minutes}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </aside>

      {status === "loading" ? (
        <div aria-live="polite" className="map-status">
          {text.loading}
        </div>
      ) : null}

      {status === "error" ? (
        <div className="map-status">
          <LoadError language={language} onRetry={feed.refresh} />
        </div>
      ) : null}

      {/* Keeps the sheet mounted while it animates out. */}
      <AnimatePresence>
        {selectedStore ? (
          <StoreSheet
            key="sheet"
            language={language}
            onClose={() => closeStore()}
            points={history?.stores.find(({ storeId }) => storeId === selectedStore.id)?.points}
            store={selectedStore}
          />
        ) : null}
      </AnimatePresence>
    </AppShell>
  );
}
