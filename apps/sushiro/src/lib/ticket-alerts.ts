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

// Asks to show notifications, and registers the worker Android needs before it will show one.
export async function enableNotifications(): Promise<AlertPermission> {
  if (typeof Notification === "undefined") {
    return "unsupported";
  }

  try {
    await navigator.serviceWorker?.register("/sw.js");
  } catch {
    // Desktop browsers can still notify without the worker.
  }

  if (Notification.permission === "default") {
    await Notification.requestPermission();
  }

  return notificationPermission();
}

// Shows a system notification where the browser allows it, and buzzes a phone that can. The page
// shows the same alert itself, so a refusal here loses nothing.
export async function showTicketAlert(title: string, body: string, tag: string) {
  try {
    navigator.vibrate?.([200, 100, 200]);

    if (notificationPermission() !== "granted") {
      return;
    }

    const registration = await navigator.serviceWorker?.getRegistration();

    if (registration) {
      await registration.showNotification(title, { body, tag });
    } else {
      const notification = new Notification(title, { body, tag });
      notification.onclick = () => window.focus();
    }
  } catch {
    // Some browsers refuse notifications from a page. The card still shows the alert.
  }
}
