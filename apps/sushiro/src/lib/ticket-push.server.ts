import { createECDH } from "node:crypto";
import { sushiroTicketAlert as alerts, sushiroTicketReport as reports } from "@eslee/db/schema";
import { and, eq, inArray, isNull, lt } from "drizzle-orm";
import webpush from "web-push";
import { defaultLanguage, parseLanguage } from "@/lib/language";
import type { Language } from "@/lib/queue-presentation";
import type { QueueStore } from "@/lib/queues";
import { ticketProgress } from "@/lib/ticket-progress";
import {
  alertOwed,
  type PushSubscriptionKeys,
  type TicketPush,
  ticketAlertMessage,
} from "@/lib/ticket-push";
import { hongKongInput, ticketTrackingHours } from "@/lib/ticket-reports";

// A push names its sender. The site's own address does that without naming a person.
const sender = "https://sushiro.eslee.io";
// How long a push service keeps an alert for a phone that is offline. After that it is stale.
const holdSeconds = 600;

type PushKeys = { privateKey: string; publicKey: string };
type SendPush = (to: PushSubscriptionKeys, push: TicketPush) => Promise<"gone" | "sent">;

// The key pair that signs pushes, or null where push is not set up. Only the private key is
// configured. The public half, which browsers subscribe with, is worked out from it.
export function pushKeys(): PushKeys | null {
  const privateKey = process.env.SUSHIRO_VAPID_PRIVATE_KEY ?? "";

  if (!/^[A-Za-z0-9_-]{43}$/.test(privateKey)) {
    return null;
  }

  try {
    const curve = createECDH("prime256v1");
    curve.setPrivateKey(Buffer.from(privateKey, "base64url"));
    return { privateKey, publicKey: curve.getPublicKey("base64url") };
  } catch {
    return null;
  }
}

function pushSender(keys: PushKeys): SendPush {
  return async ({ auth, endpoint, p256dh }, push) => {
    try {
      await webpush.sendNotification({ endpoint, keys: { auth, p256dh } }, JSON.stringify(push), {
        TTL: holdSeconds,
        timeout: 5_000,
        urgency: "high",
        vapidDetails: { ...keys, subject: sender },
      });
      return "sent";
    } catch (error) {
      // The browser has dropped this subscription, so nothing sent to it will arrive.
      if (error instanceof webpush.WebPushError && [404, 410].includes(error.statusCode)) {
        return "gone";
      }

      throw error;
    }
  };
}

// Stores where to push one of the owner's waiting tickets. False when the ticket is not theirs
// or is no longer waiting.
export async function saveTicketPush(
  reportId: string,
  ownerHash: string,
  subscription: PushSubscriptionKeys,
  language: Language,
) {
  const { db } = await import("@/lib/db");
  const [report] = await db
    .select({ id: reports.id })
    .from(reports)
    .where(
      and(
        eq(reports.id, reportId),
        eq(reports.ownerHash, ownerHash),
        isNull(reports.calledAt),
        isNull(reports.leftAt),
      ),
    )
    .limit(1);

  if (!report) {
    return false;
  }

  await db
    .insert(alerts)
    .values({ ...subscription, language, reportId })
    .onConflictDoUpdate({ set: { ...subscription, language }, target: alerts.reportId });
  return true;
}

export async function removeTicketPush(reportId: string, ownerHash: string) {
  const { db } = await import("@/lib/db");
  await db.delete(alerts).where(
    inArray(
      alerts.reportId,
      db
        .select({ id: reports.id })
        .from(reports)
        .where(and(eq(reports.id, reportId), eq(reports.ownerHash, ownerHash))),
    ),
  );
}

// The owner's tickets that have pushed alerts on.
export async function ownTicketPushes(ownerHash: string) {
  const { db } = await import("@/lib/db");
  const rows = await db
    .select({ id: alerts.reportId })
    .from(alerts)
    .innerJoin(reports, eq(alerts.reportId, reports.id))
    .where(eq(reports.ownerHash, ownerHash));
  return rows.map(({ id }) => id);
}

// Pushes the alerts that tickets are owed after a fresh look at the feed, and returns how many
// went out. An alert is marked sent only after its push service accepts it, so a failed one is
// tried again on the next look.
export async function sendTicketAlerts(
  stores: readonly Pick<QueueStore, "id" | "storeQueue" | "storeStatus">[],
  observedAt: Date,
  send?: SendPush,
) {
  const { db } = await import("@/lib/db");
  // A ticket is tracked for a day, so an older row has nothing left to send.
  await db
    .delete(alerts)
    .where(
      lt(alerts.createdAt, new Date(observedAt.valueOf() - ticketTrackingHours * 60 * 60_000)),
    );
  const keys = pushKeys();
  const push = send ?? (keys ? pushSender(keys) : null);

  if (!push) {
    return 0;
  }

  const waiting = await db
    .select({
      auth: alerts.auth,
      endpoint: alerts.endpoint,
      language: alerts.language,
      nearSentAt: alerts.nearSentAt,
      p256dh: alerts.p256dh,
      reportId: alerts.reportId,
      storeId: reports.storeId,
      storeName: reports.storeName,
      storeNameEn: reports.storeNameEn,
      ticketNumber: reports.ticketNumber,
    })
    .from(alerts)
    .innerJoin(reports, eq(alerts.reportId, reports.id))
    .where(
      and(
        eq(reports.queueDate, hongKongInput(observedAt).slice(0, 10)),
        isNull(reports.calledAt),
        isNull(reports.leftAt),
        isNull(alerts.dueSentAt),
      ),
    );
  const byStore = new Map(stores.map((store) => [store.id, store]));
  const results = await Promise.allSettled(
    waiting.map(async (row) => {
      const store = byStore.get(row.storeId);

      if (store?.storeStatus !== "OPEN") {
        return false;
      }

      const progress = ticketProgress(row.ticketNumber, store.storeQueue);
      const kind = alertOwed(progress.state, { due: false, near: row.nearSentAt !== null });

      if (!kind) {
        return false;
      }

      const language = parseLanguage(row.language) ?? defaultLanguage;
      const message = ticketAlertMessage(kind, language, {
        count: progress.ahead ?? 0,
        latest: progress.latest ?? "",
        number: row.ticketNumber,
        store: language === "en" ? row.storeNameEn || row.storeName : row.storeName,
      });
      const outcome = await push(row, { ...message, kind, ticket: row.reportId });
      const thisAlert = eq(alerts.reportId, row.reportId);

      if (outcome === "gone") {
        await db.delete(alerts).where(thisAlert);
      } else {
        await db
          .update(alerts)
          .set(kind === "due" ? { dueSentAt: observedAt } : { nearSentAt: observedAt })
          .where(thisAlert);
      }

      return outcome === "sent";
    }),
  );

  for (const result of results) {
    if (result.status === "rejected") {
      const error: unknown = result.reason;
      // The endpoint is a secret address for one browser, so it stays out of the log.
      console.error(
        "Unable to push a ticket alert",
        error instanceof webpush.WebPushError
          ? { body: error.body, status: error.statusCode }
          : error,
      );
    }
  }

  return results.filter((result) => result.status === "fulfilled" && result.value).length;
}
