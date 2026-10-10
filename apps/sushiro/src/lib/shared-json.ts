import { useCallback, useEffect, useSyncExternalStore } from "react";

// JSON resources shared by every page, keyed by URL. Switching tabs shows the last copy at
// once and refreshes it in the background when it is older than the page allows.
type Entry = { data: unknown; error: boolean; loadedAt: number; pending: boolean };

const empty: Entry = { data: null, error: false, loadedAt: 0, pending: false };
const entries = new Map<string, Entry>();
const listeners = new Map<string, Set<() => void>>();

function update(url: string, patch: Partial<Entry>) {
  entries.set(url, { ...(entries.get(url) ?? empty), ...patch });

  for (const listener of listeners.get(url) ?? []) {
    listener();
  }
}

function subscribe(url: string | null, listener: () => void) {
  if (!url) {
    return () => {};
  }

  const urlListeners = listeners.get(url) ?? new Set();

  urlListeners.add(listener);
  listeners.set(url, urlListeners);
  return () => urlListeners.delete(listener);
}

export async function loadSharedJson(url: string) {
  if (entries.get(url)?.pending) {
    return;
  }

  update(url, { pending: true });

  try {
    const response = await fetch(url, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`Request failed: ${url}`);
    }

    update(url, {
      data: await response.json(),
      error: false,
      loadedAt: Date.now(),
      pending: false,
    });
  } catch {
    // The last good copy stays in place when a refresh fails.
    update(url, { error: true, pending: false });
  }
}

export type SharedJson<T> = {
  data: T | null;
  error: boolean;
  // When the data last loaded, in epoch milliseconds, or 0 before the first load.
  loadedAt: number;
  pending: boolean;
  refresh: () => void;
};

export function useSharedJson<T>(
  url: string | null,
  { maxAgeMs, pollMs }: { maxAgeMs: number; pollMs?: number },
): SharedJson<T> {
  const entry = useSyncExternalStore(
    useCallback((listener: () => void) => subscribe(url, listener), [url]),
    () => (url ? (entries.get(url) ?? empty) : empty),
    () => empty,
  );

  useEffect(() => {
    if (!url) {
      return;
    }

    if (Date.now() - (entries.get(url)?.loadedAt ?? 0) > maxAgeMs) {
      void loadSharedJson(url);
    }

    if (!pollMs) {
      return;
    }

    const interval = window.setInterval(() => void loadSharedJson(url), pollMs);
    return () => window.clearInterval(interval);
  }, [maxAgeMs, pollMs, url]);

  const refresh = useCallback(() => {
    if (url) {
      void loadSharedJson(url);
    }
  }, [url]);

  return { ...entry, data: entry.data as T | null, refresh };
}

export function peekSharedJson(url: string) {
  return entries.get(url) ?? empty;
}

// For tests: forget everything that was loaded.
export function clearSharedJson() {
  entries.clear();
  listeners.clear();
}
