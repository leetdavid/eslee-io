"use client";

import { CalendarClock, ChartColumn, X } from "lucide-react";
import Link from "next/link";
import { QueueChart } from "@/components/queue-chart";
import { StarToggle } from "@/components/star-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMyBranches } from "@/lib/my-branches";
import {
  copy,
  fill,
  type Language,
  queueBand,
  queueBandLabel,
  storeName,
  waitingGroups,
} from "@/lib/queue-presentation";
import { isTicketing, type QueueHistoryPoint, type QueueStore } from "@/lib/queues";
import { useSharedJson } from "@/lib/shared-json";
import { statsCopy } from "@/lib/stats-copy";
import { ticketCopy } from "@/lib/ticket-copy";
import { hongKongClock, type UsualResponse, usualAt, usualRange } from "@/lib/usual";

type StoreSheetProps = {
  language: Language;
  onClose: () => void;
  points?: QueueHistoryPoint[];
  store: QueueStore;
};

// The band badge takes its tint and text from the band tokens, not the Badge palette, so it
// matches the tiles and rows exactly.
const bandBadgeStyle = { backgroundColor: "var(--band-tint)", color: "var(--band-text)" };

export function StoreSheet({ language, onClose, points = [], store }: StoreSheetProps) {
  const text = copy[language];
  const name = storeName(store, language);
  const band = queueBand(store);
  const bandLabel = queueBandLabel(store, language);
  const { ids: savedIds, toggle: toggleSaved } = useMyBranches();
  const isSaved = savedIds.includes(store.id);
  const now = hongKongClock(new Date());
  const usual = useSharedJson<UsualResponse>(
    `/api/queues/usual?weekday=${now.dayType}&storeIds=${store.id}`,
    { maxAgeMs: 10 * 60_000 },
  );
  const usualSlot = usualAt(usual.data?.stores[0]?.slots ?? [], now.minute);
  const usualNow = usualSlot ? usualRange(usualSlot) : null;
  const weekday = statsCopy[language].weekdaysLong[now.dayType] ?? "";

  return (
    <>
      <button
        aria-label={text.close}
        className="sheet-backdrop"
        onClick={onClose}
        tabIndex={-1}
        type="button"
      />
      <aside aria-label={name} className="store-sheet" data-band={band}>
        <div className="sheet-handle" />
        <div className="sheet-heading">
          <div>
            <p className="caption">{store.area}</p>
            <h1>{name}</h1>
          </div>
          <div className="sheet-heading-actions">
            <StarToggle
              isSaved={isSaved}
              language={language}
              onToggle={() => toggleSaved(store.id)}
            />
            <Button aria-label={text.close} onClick={onClose} size="icon" variant="ghost">
              <X size={16} />
            </Button>
          </div>
        </div>

        <div className="sheet-badges">
          <Badge color="gray">{store.storeStatus === "OPEN" ? text.open : text.closed}</Badge>
          <Badge color="gray">{isTicketing(store) ? text.ticketing : text.ticketingPaused}</Badge>
          {bandLabel ? (
            <Badge style={bandBadgeStyle}>
              <i className="band-dot mr-1.5 inline-block" />
              {bandLabel}
            </Badge>
          ) : null}
        </div>

        {!isTicketing(store) ? <p className="sheet-notice">{text.ticketingPausedNotice}</p> : null}

        <div className="sheet-figures">
          <div>
            <div className="sheet-wait">
              <strong className="figure-xl">{store.wait}</strong>
              <span>{text.minutes}</span>
            </div>
            <p className="caption">{text.officialWait}</p>
            {usualNow ? (
              <p className="sheet-usual">
                {usualNow.high === 0
                  ? fill(text.usualSheetNone, { weekday })
                  : fill(text.usualSheet, { ...usualNow, weekday })}
              </p>
            ) : null}
          </div>
          <div className="sheet-groups">
            <div>
              <strong className="figure-m">{waitingGroups(store)}</strong> {text.groups}
            </div>
            <p className="caption">{text.waitingGroups}</p>
          </div>
        </div>

        {points.length > 0 ? (
          <QueueChart
            label={text.history}
            latestWait={store.wait}
            locale={language}
            points={points}
            valueLabel={text.minutes}
          />
        ) : null}

        <section className="sheet-section">
          <p className="caption">{text.calledTickets}</p>
          {store.storeQueue.length > 0 ? (
            <div className="ticket-chips">
              {store.storeQueue.map((ticket) => (
                <span className="chip" key={ticket}>
                  {ticket}
                </span>
              ))}
            </div>
          ) : (
            <p>{text.noCalledTickets}</p>
          )}
        </section>

        <section className="sheet-section">
          <p className="caption">{text.address}</p>
          <p>{store.address}</p>
        </section>

        <Button asChild className="sheet-action h-11">
          <Link href={`/tickets?storeId=${store.id}`}>{ticketCopy[language].link}</Link>
        </Button>
        <div className="sheet-links">
          <Button asChild className="h-11" leadingIcon={CalendarClock} variant="secondary">
            <Link href="/plan">{text.planMeal}</Link>
          </Button>
          <Button asChild className="h-11" leadingIcon={ChartColumn} variant="secondary">
            <Link href={`/stats?branch=${store.id}`}>{text.branchStats}</Link>
          </Button>
        </div>
        <p className="caption sheet-footer">{text.dataSource}</p>
      </aside>
    </>
  );
}
