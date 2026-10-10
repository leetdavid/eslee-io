"use client";

import { Minus, Plus, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { BranchPicker } from "@/components/branch-picker";
import { useLanguage } from "@/components/language-provider";
import { LoadError } from "@/components/load-error";
import { PlanBranch } from "@/components/plan-branch";
import { PlanRuler } from "@/components/plan-ruler";
import { QueueLegend } from "@/components/queue-legend";
import { StarToggle } from "@/components/star-toggle";
import { Button } from "@/components/ui/button";
import { useMyBranches } from "@/lib/my-branches";
import {
  clockLabel,
  openingMinute,
  type PlanMode,
  planDomain,
  rankBranches,
  rankForEating,
} from "@/lib/plan";
import { planCopy } from "@/lib/plan-copy";
import { copy, fill, shortStoreName, waitBand } from "@/lib/queue-presentation";
import type { QueueSnapshot } from "@/lib/queues";
import { useSharedJson } from "@/lib/shared-json";
import { statsCopy } from "@/lib/stats-copy";
import { type TerritoryBand, territoryBandOf } from "@/lib/store-grid";
import { hongKongClock, type UsualResponse, type UsualSlot, usualStepMinutes } from "@/lib/usual";

type PlanViewProps = {
  initialMinute: number | null;
  initialMode: PlanMode;
  initialWeekday: number | null;
};

// Rows of the all-branch list before "Show all".
const rankPreview = 8;
const territories: TerritoryBand[] = ["newTerritories", "kowloon", "hongKongIsland"];
// Charts share one scale so branches compare, capped so one extreme evening does not flatten
// the rest of the day.
const maximumChartTop = 240;

export function PlanView({ initialMinute, initialMode, initialWeekday }: PlanViewProps) {
  const { language, setLanguage } = useLanguage();
  const feed = useSharedJson<QueueSnapshot>("/api/queues", { maxAgeMs: 60_000, pollMs: 60_000 });
  const { ids: savedIds, toggle: toggleSaved } = useMyBranches();
  // The clock is read after mount, so the server and the first paint agree.
  const [clock, setClock] = useState<ReturnType<typeof hongKongClock> | null>(null);
  const [chosenWeekday, setChosenWeekday] = useState(initialWeekday);
  const [chosenMinute, setChosenMinute] = useState(initialMinute);
  // Whether the chosen time is when the ticket is taken or when the meal should start.
  const [mode, setMode] = useState(initialMode);
  const [territory, setTerritory] = useState<TerritoryBand | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const read = () => setClock(hongKongClock(new Date()));

    read();
    const interval = window.setInterval(read, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const weekday = chosenWeekday ?? clock?.weekday ?? null;
  const isToday = clock !== null && weekday === clock.weekday;
  // Today's usual waits follow the kind of day it is, so a public holiday plans like a Sunday.
  const usual = useSharedJson<UsualResponse>(
    weekday === null ? null : `/api/queues/usual?weekday=${isToday ? clock.dayType : weekday}`,
    { maxAgeMs: 10 * 60_000 },
  );
  const usualStores = usual.data?.stores ?? [];
  const domain = planDomain(usualStores);
  const minute = Math.min(
    domain.end,
    Math.max(domain.start, chosenMinute ?? openingMinute(isToday ? clock.minute : null, domain)),
  );

  useEffect(() => {
    if (chosenWeekday === null && chosenMinute === null && mode === initialMode) {
      return;
    }

    const parts = [
      chosenWeekday === null ? null : `day=${chosenWeekday}`,
      chosenMinute === null ? null : `time=${clockLabel(chosenMinute)}`,
      mode === "eat" ? "mode=eat" : null,
    ].filter(Boolean);

    window.history.replaceState(
      window.history.state,
      "",
      parts.length > 0 ? `/plan?${parts.join("&")}` : "/plan",
    );
  }, [chosenMinute, chosenWeekday, initialMode, mode]);

  const text = copy[language];
  const plan = planCopy[language];
  const stats = statsCopy[language];
  const stores = feed.data?.stores ?? [];
  const slotsByStore = new Map(usualStores.map((store) => [store.storeId, store.slots]));
  const dayName = weekday === null ? "" : (stats.weekdaysLong[weekday] ?? "");
  const time = clockLabel(minute);
  const mine = stores
    .filter(({ id }) => savedIds.includes(id))
    .map((store) => ({ slots: slotsByStore.get(store.id) ?? [], store }));
  const isEating = mode === "eat";
  // By eating time, only branches whose ticket can still be called by then are ranked.
  const ranking = isEating
    ? rankForEating(usualStores, minute, isToday ? clock.minute : 0)
    : rankBranches(usualStores, minute).map((entry) => ({ ...entry, ticket: minute }));
  const order = new Map(ranking.map(({ storeId }, index) => [storeId, index]));
  const rankOf = (storeId: number) => order.get(storeId) ?? Number.POSITIVE_INFINITY;

  mine.sort(
    (left, right) =>
      rankOf(left.store.id) - rankOf(right.store.id) || left.store.id - right.store.id,
  );

  const highest = Math.max(0, ...mine.flatMap(({ slots }) => slots.map((slot) => slot.high)));
  const top = Math.min(maximumChartTop, Math.max(120, Math.ceil(highest / 60) * 60));
  const ranked = ranking.flatMap((entry) => {
    const store = stores.find(({ id }) => id === entry.storeId);
    return store && (territory === null || territoryBandOf(store.nameEn) === territory)
      ? [{ ...entry, store }]
      : [];
  });
  const status =
    feed.data && usual.data ? "ready" : feed.error || usual.error ? "error" : "loading";
  const step = (change: number) => setChosenMinute(minute + change);
  const days = Array.from({ length: 7 }, (_, index) => ((clock?.weekday ?? 0) + index) % 7);
  const refresh = () => {
    feed.refresh();
    usual.refresh();
  };
  const addBranch = (size: "compact" | "default") => (
    <BranchPicker
      language={language}
      onToggleSaved={toggleSaved}
      savedIds={savedIds}
      stores={stores}
      trigger={
        <Button leadingIcon={Plus} size={size} variant="secondary">
          {plan.addBranch}
        </Button>
      }
    />
  );
  const ruler = (
    <PlanRuler
      domain={domain}
      label={isEating ? plan.eatTime : plan.ticketTime}
      minute={minute}
      onChange={setChosenMinute}
    />
  );
  const stepper = (
    <div className="plan-stepper">
      <Button
        aria-label={plan.earlier}
        disabled={minute <= domain.start}
        onClick={() => step(-usualStepMinutes)}
        size="icon"
        variant="secondary"
      >
        <Minus size={16} />
      </Button>
      <strong className="figure-m">{time}</strong>
      <Button
        aria-label={plan.later}
        disabled={minute >= domain.end}
        onClick={() => step(usualStepMinutes)}
        size="icon"
        variant="secondary"
      >
        <Plus size={16} />
      </Button>
    </div>
  );

  return (
    <AppShell
      activePage="plan"
      isRefreshing={feed.pending || usual.pending}
      language={language}
      onLanguageChange={setLanguage}
      onRefresh={refresh}
      staleSince={feed.error && feed.data ? feed.loadedAt : null}
      updatedAt={feed.loadedAt}
    >
      <div className="plan">
        <header>
          <h1>{plan.title}</h1>
          <p>{plan.intro}</p>
        </header>

        <div className="plan-controls">
          <fieldset aria-label={plan.title} className="segmented segmented-large plan-days">
            {days.map((day) => (
              <button
                aria-pressed={day === weekday}
                key={day}
                onClick={() => setChosenWeekday(day)}
                type="button"
              >
                {clock && day === clock.weekday
                  ? fill(plan.todayChip, { day: stats.weekdaysNarrow[day] ?? "" })
                  : stats.weekdaysNarrow[day]}
              </button>
            ))}
          </fieldset>
          <div className="plan-time">
            <fieldset aria-label={plan.modeLabel} className="segmented segmented-large plan-mode">
              <button aria-pressed={!isEating} onClick={() => setMode("ticket")} type="button">
                {plan.modeTicket}
              </button>
              <button aria-pressed={isEating} onClick={() => setMode("eat")} type="button">
                {plan.modeEat}
              </button>
            </fieldset>
            <span className="plan-time-label">
              <strong>{isEating ? plan.eatQuestion : plan.ticketQuestion}</strong>
              <span className="caption">{fill(plan.stepNote, { day: dayName })}</span>
            </span>
            {stepper}
            <div className="plan-time-ruler">{ruler}</div>
          </div>
        </div>

        {status === "loading" ? (
          <p aria-live="polite" className="stats-status">
            {text.loading}
          </p>
        ) : null}

        {status === "error" ? <LoadError language={language} onRetry={refresh} /> : null}

        {status === "ready" ? (
          <>
            <section aria-labelledby="plan-mine" className="plan-card plan-mine">
              <div className="plan-card-heading">
                <div>
                  <h2 id="plan-mine">{text.myBranches}</h2>
                  <p className="caption">
                    {fill(isEating ? plan.mineNoteEat : plan.mineNote, { day: dayName, time })}
                  </p>
                </div>
                <div className="plan-card-actions">
                  <p className="caption stats-keys">
                    {isToday ? (
                      <span>
                        <i className="plan-key-today" />
                        {plan.keyToday}
                      </span>
                    ) : null}
                    <span>
                      <i className="plan-key-usual" />
                      {fill(plan.keyUsual, { day: dayName })}
                    </span>
                    <span>
                      <i className="plan-key-wide" />
                      {plan.keyWide}
                    </span>
                  </p>
                  {mine.length > 0 ? (
                    <div className="plan-add-wide">{addBranch("compact")}</div>
                  ) : null}
                </div>
              </div>
              {mine.length > 0 ? (
                <>
                  <div className="plan-branch plan-ruler-row">
                    <span className="caption">{isEating ? plan.dragNoteEat : plan.dragNote}</span>
                    {ruler}
                  </div>
                  <ul className="plan-branches">
                    {mine.map(({ slots, store }, index) => (
                      <PlanBranch
                        domain={domain}
                        isShortest={
                          index === 0 && mine.length > 1 && Number.isFinite(rankOf(store.id))
                        }
                        key={store.id}
                        language={language}
                        minute={minute}
                        mode={mode}
                        nowMinute={isToday ? clock.minute : null}
                        onPickTime={setChosenMinute}
                        onToggleSaved={() => toggleSaved(store.id)}
                        slots={slots}
                        store={store}
                        top={top}
                      />
                    ))}
                  </ul>
                </>
              ) : (
                <div className="plan-empty-card">
                  <Star aria-hidden="true" size={20} />
                  <p>{plan.emptyMine}</p>
                  {addBranch("default")}
                </div>
              )}
              {/* On phones the button sits under the cards, full width. */}
              {mine.length > 0 ? (
                <div className="plan-add-narrow">{addBranch("default")}</div>
              ) : null}
            </section>

            <section aria-labelledby="plan-all" className="plan-card">
              <div className="plan-card-heading">
                <div>
                  <h2 id="plan-all">{text.allBranches}</h2>
                  <p className="caption">
                    {fill(isEating ? plan.allNoteEat : plan.allNote, { day: dayName, time })}
                  </p>
                </div>
                <fieldset aria-label={text.allBranches} className="segmented plan-territories">
                  <button
                    aria-pressed={territory === null}
                    onClick={() => setTerritory(null)}
                    type="button"
                  >
                    {plan.allTerritories}
                  </button>
                  {territories.map((band) => (
                    <button
                      aria-pressed={territory === band}
                      key={band}
                      onClick={() => setTerritory(band)}
                      type="button"
                    >
                      {text.territory[band]}
                    </button>
                  ))}
                </fieldset>
              </div>
              {ranked.length > 0 ? (
                <ul className="plan-rows">
                  {(showAll ? ranked : ranked.slice(0, rankPreview)).map(
                    ({ answer, slots, store, ticket }) => {
                      const waitRange =
                        answer.low === answer.high
                          ? String(answer.high)
                          : fill(plan.range, { high: answer.high, low: answer.low });

                      return (
                        <li className="plan-row" data-band={waitBand(answer.median)} key={store.id}>
                          <i className="band-dot" />
                          <span className="branch-row-main">
                            <span className="branch-row-name">
                              {shortStoreName(store, language)}
                            </span>
                            <span className="caption">
                              {isEating
                                ? answer.high === 0
                                  ? plan.rowNoQueueThen
                                  : fill(plan.rowWaitThen, { range: waitRange })
                                : store.area}
                            </span>
                          </span>
                          <span className="plan-row-answer">
                            {isEating ? (
                              <>
                                {plan.rowTicketBefore ? (
                                  <span className="caption">{plan.rowTicketBefore} </span>
                                ) : null}
                                <strong>{clockLabel(ticket)}</strong>
                                {plan.rowTicketAfter ? (
                                  <span className="caption"> {plan.rowTicketAfter}</span>
                                ) : null}
                              </>
                            ) : answer.high === 0 ? (
                              <strong>{plan.noQueue}</strong>
                            ) : (
                              <>
                                <strong>{waitRange}</strong>{" "}
                                <span className="caption">{text.minutes}</span>
                              </>
                            )}
                          </span>
                          <PlanMini domain={domain} minute={ticket} slots={slots} />
                          <StarToggle
                            isSaved={savedIds.includes(store.id)}
                            language={language}
                            onToggle={() => toggleSaved(store.id)}
                          />
                        </li>
                      );
                    },
                  )}
                </ul>
              ) : (
                <p className="caption plan-empty">
                  {isEating ? fill(plan.noneInTime, { time }) : plan.noUsual}
                </p>
              )}
              <div className="plan-card-footer">
                {ranked.length > rankPreview ? (
                  <Button onClick={() => setShowAll((all) => !all)} variant="secondary">
                    {showAll ? plan.showFewer : fill(plan.showAll, { count: ranked.length })}
                  </Button>
                ) : (
                  <span />
                )}
                <QueueLegend language={language} />
              </div>
            </section>
            <p className="caption plan-footnote">
              {isEating ? `${plan.footnoteEat} ` : null}
              {plan.footnote}
            </p>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}

// The shape of a branch's usual day, with a tick at the ticket time.
function PlanMini({
  domain,
  minute,
  slots,
}: {
  domain: { end: number; start: number };
  minute: number;
  slots: UsualSlot[];
}) {
  const span = Math.max(1, domain.end - domain.start);
  const top = Math.max(60, ...slots.map((slot) => slot.median));
  const points = slots
    .filter((slot) => slot.minute % 15 === 0)
    .map(
      (slot) =>
        `${(((slot.minute - domain.start) / span) * 100).toFixed(1)},${(22 - (slot.median / top) * 20).toFixed(1)}`,
    );

  return (
    <span aria-hidden="true" className="plan-mini">
      {points.length > 1 ? (
        <svg aria-hidden="true" preserveAspectRatio="none" viewBox="0 0 100 24">
          <path
            className="plan-mini-area"
            d={`M${points[0]?.split(",")[0]},24 L${points.join(" L")} L${points.at(-1)?.split(",")[0]},24 Z`}
          />
          <path className="plan-mini-line" d={`M${points.join(" L")}`} />
        </svg>
      ) : null}
      <i style={{ left: `${((minute - domain.start) / span) * 100}%` }} />
    </span>
  );
}
