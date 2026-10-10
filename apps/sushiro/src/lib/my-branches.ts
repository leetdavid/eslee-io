import { useCallback, useSyncExternalStore } from "react";

// My branches: the branches a visitor has starred, kept on their device. There are no accounts.
const storageKey = "sushiro-my-branches";
const none: number[] = [];
const listeners = new Set<() => void>();
let saved: number[] | null = null;

// Reads the stored list, dropping anything that is not a branch number.
export function parseSavedBranches(value: string | null): number[] {
  try {
    const ids: unknown = JSON.parse(value ?? "[]");

    return Array.isArray(ids)
      ? [...new Set(ids.filter((id): id is number => Number.isSafeInteger(id) && id > 0))]
      : [];
  } catch {
    return [];
  }
}

// Adds a branch to the end of the list, or removes it when it is already there.
export function toggleSavedBranch(ids: number[], id: number) {
  return ids.includes(id) ? ids.filter((savedId) => savedId !== id) : [...ids, id];
}

function read() {
  if (saved === null) {
    try {
      saved = parseSavedBranches(window.localStorage.getItem(storageKey));
    } catch {
      saved = [];
    }
  }

  return saved;
}

function subscribe(listener: () => void) {
  // Another tab changing the list makes this one read it again.
  function readAgain(event: StorageEvent) {
    if (event.key === storageKey) {
      saved = null;
      listener();
    }
  }

  listeners.add(listener);
  window.addEventListener("storage", readAgain);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", readAgain);
  };
}

export function useMyBranches() {
  const ids = useSyncExternalStore(subscribe, read, () => none);
  const toggle = useCallback((id: number) => {
    saved = toggleSavedBranch(read(), id);

    try {
      window.localStorage.setItem(storageKey, JSON.stringify(saved));
    } catch {
      // The list still holds for this visit when storage is blocked.
    }

    for (const listener of listeners) {
      listener();
    }
  }, []);

  return { ids, toggle };
}
