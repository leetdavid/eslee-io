import { fill, type Language } from "@/lib/queue-presentation";
import type { TicketAlertKind } from "@/lib/ticket-alerts";
import { ticketCopy } from "@/lib/ticket-copy";
import type { TicketProgress } from "@/lib/ticket-progress";

// Ticket alerts sent as web push, so they reach a phone that is locked or has the page closed.
// The browser hands over a subscription, and the collector pushes to it when the ticket is close.

export type PushSubscriptionKeys = { auth: string; endpoint: string; p256dh: string };
// What a pushed alert carries to the service worker.
export type TicketPush = { body: string; kind: TicketAlertKind; ticket: string; title: string };

// The push services browsers subscribe to: Chrome and Android, Firefox, Safari and iPhone, Edge.
// The server only ever posts to these hosts, so a made-up endpoint cannot point it elsewhere.
const pushHosts = [
  "fcm.googleapis.com",
  ".push.services.mozilla.com",
  ".push.apple.com",
  ".notify.windows.com",
];

function isPushEndpoint(value: string) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      value.length <= 2048 &&
      pushHosts.some((host) =>
        host.startsWith(".") ? url.hostname.endsWith(host) : url.hostname === host,
      )
    );
  } catch {
    return false;
  }
}

// Reads the subscription a browser sends, as `PushSubscription.toJSON()` writes it. Null unless
// it names a known push service and carries keys of the right size.
export function parsePushSubscription(value: unknown): PushSubscriptionKeys | null {
  const body =
    typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  const keys =
    typeof body.keys === "object" && body.keys !== null
      ? (body.keys as Record<string, unknown>)
      : {};
  const { endpoint } = body;
  const { auth, p256dh } = keys;

  if (
    typeof endpoint !== "string" ||
    typeof auth !== "string" ||
    typeof p256dh !== "string" ||
    !isPushEndpoint(endpoint) ||
    // A 16-byte secret and a 65-byte public key, in URL-safe base64 without padding.
    !/^[A-Za-z0-9_-]{22}$/.test(auth) ||
    !/^[A-Za-z0-9_-]{87}$/.test(p256dh)
  ) {
    return null;
  }

  return { auth, endpoint, p256dh };
}

// The alert a ticket is owed now: once when it is nearly called, and once when its number is up.
// Nothing more follows the second.
export function alertOwed(
  state: TicketProgress["state"],
  sent: { due: boolean; near: boolean },
): TicketAlertKind | null {
  if (sent.due || state === "waiting") {
    return null;
  }

  return state === "near" && sent.near ? null : state;
}

export function ticketAlertMessage(
  kind: TicketAlertKind,
  language: Language,
  values: { count: number; latest: number | string; number: string; store: string },
) {
  const text = ticketCopy[language];

  return {
    body: fill(kind === "due" ? text.notifyDueBody : text.notifyNearBody, values),
    title: fill(kind === "due" ? text.notifyDueTitle : text.notifyNearTitle, values),
  };
}
