import { useCallback, useSyncExternalStore } from "react";

// Nearly-called alerts: which tracked tickets have alerts on and which alerts have already gone
// out, kept on the device so a reload does not alert twice. There are no accounts.
const storageKey = "sushiro-ticket-alerts";
const noAlerts: TicketAlerts = {};
const noneFired: TicketAlertKind[] = [];
const listeners = new Set<() => void>();
let stored: TicketAlerts | null = null;

export type TicketAlertKind = "due" | "near";
// Ticket report id -> the alerts already shown for it. A ticket that is listed has alerts on.
export type TicketAlerts = Record<string, TicketAlertKind[]>;
export type AlertPermission = "blocked" | "granted" | "unsupported";

// Reads the stored alerts, dropping anything that is not in the expected shape.
export function parseTicketAlerts(value: string | null): TicketAlerts {
  try {
    const alerts: unknown = JSON.parse(value ?? "{}");

    if (typeof alerts !== "object" || alerts === null || Array.isArray(alerts)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(alerts).flatMap(([id, fired]) =>
        Array.isArray(fired)
          ? [[id, fired.filter((kind) => kind === "due" || kind === "near")]]
          : [],
      ),
    );
  } catch {
    return {};
  }
}

function read() {
  if (stored === null) {
    try {
      stored = parseTicketAlerts(window.localStorage.getItem(storageKey));
    } catch {
      stored = {};
    }
  }

  return stored;
}

function write(next: TicketAlerts) {
  stored = next;

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(next));
  } catch {
    // Private browsing can refuse storage. The alerts still work until the page closes.
  }

  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useTicketAlert(id: string) {
  const alerts = useSyncExternalStore(subscribe, read, () => noAlerts);
  const fired = alerts[id];
  const setOn = useCallback(
    (on: boolean) => {
      const others = Object.fromEntries(Object.entries(read()).filter(([key]) => key !== id));
      write(on ? { ...others, [id]: [] } : others);
    },
    [id],
  );
  const markFired = useCallback(
    (kind: TicketAlertKind) => {
      const current = read();
      const already = current[id];

      if (already && !already.includes(kind)) {
        write({ ...current, [id]: [...already, kind] });
      }
    },
    [id],
  );

  return { fired: fired ?? noneFired, isOn: fired !== undefined, markFired, setOn };
}

export function notificationPermission(): AlertPermission {
  if (typeof Notification === "undefined") {
    return "unsupported";
  }

  return Notification.permission === "granted" ? "granted" : "blocked";
}

// Asks to show notifications, and registers the worker that shows them on phones and receives
// pushed ones. Call it straight from a tap: Safari only asks in answer to one, so the question
// goes out before anything is awaited.
export async function enableNotifications(): Promise<AlertPermission> {
  if (typeof Notification === "undefined") {
    return "unsupported";
  }

  const answer = Notification.permission === "default" ? Notification.requestPermission() : null;

  try {
    await navigator.serviceWorker?.register("/sw.js");
  } catch {
    // Desktop browsers can still notify without the worker.
  }

  try {
    await answer;
  } catch {
    // A refused or dismissed question reads as blocked below.
  }

  return notificationPermission();
}

// Shows a system notification where the browser allows it, and buzzes a phone that can. The page
// shows the same alert itself, so a refusal here loses nothing.
export async function showTicketAlert(
  title: string,
  body: string,
  ticket: string,
  kind: TicketAlertKind,
) {
  try {
    navigator.vibrate?.([200, 100, 200]);

    if (notificationPermission() !== "granted") {
      return;
    }

    // The same tags the service worker uses, so an alert never shows twice.
    const tag = `ticket-${ticket}-${kind}`;
    const registration = await navigator.serviceWorker?.getRegistration();

    if (registration) {
      // A newer alert takes the place of the ticket's older one, and sounds again.
      for (const shown of await registration.getNotifications()) {
        if (shown.tag.startsWith(`ticket-${ticket}-`)) {
          shown.close();
        }
      }

      await registration.showNotification(title, { body, icon: "/icon-192.png", tag });
    } else {
      const notification = new Notification(title, { body, icon: "/icon-192.png", tag });
      notification.onclick = () => window.focus();
    }
  } catch {
    // Some browsers refuse notifications from a page. The card still shows the alert.
  }
}

// True on an iPhone or iPad with the site open in a browser tab. There it can only take a push
// once it has been added to the Home Screen and opened from there.
export function needsHomeScreen() {
  return (
    typeof navigator !== "undefined" &&
    (navigator as Navigator & { standalone?: boolean }).standalone === false &&
    typeof PushManager === "undefined"
  );
}

function keyBytes(key: string) {
  const base64 = key.replaceAll("-", "+").replaceAll("_", "/");
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
}

// Subscribes this browser to pushed alerts for a ticket, so they arrive with the page closed.
// False when the browser cannot take a push or the server did not store the subscription. The
// page then keeps alerting by itself.
export async function enablePush(reportId: string, key: string, language: string) {
  try {
    if (typeof PushManager === "undefined" || notificationPermission() !== "granted") {
      return false;
    }

    const wanted = keyBytes(key);
    const registration = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<never>((_, reject) => setTimeout(reject, 5_000)),
    ]);
    let subscription = await registration.pushManager.getSubscription();
    const current = new Uint8Array(subscription?.options.applicationServerKey ?? []);

    // A subscription made for another signing key cannot be pushed to, so it is replaced.
    if (
      subscription &&
      (current.length !== wanted.length || current.some((byte, index) => byte !== wanted[index]))
    ) {
      await subscription.unsubscribe();
      subscription = null;
    }

    subscription ??= await registration.pushManager.subscribe({
      applicationServerKey: wanted,
      userVisibleOnly: true,
    });
    const response = await fetch(`/api/tickets/${reportId}/alert`, {
      body: JSON.stringify({ language, subscription }),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function disablePush(reportId: string) {
  try {
    await fetch(`/api/tickets/${reportId}/alert`, { method: "DELETE" });
  } catch {
    // The row is removed with the ticket's day if this does not get through.
  }
}
