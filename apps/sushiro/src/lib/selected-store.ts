import { useCallback, useEffect, useRef, useState } from "react";
import type { QueueStore } from "@/lib/queues";

const storeParameter = "store";

// Reads ?store=ID from an address, or null when it is missing or not a branch number.
export function storeIdFromSearch(search: string) {
  const value = Number(new URLSearchParams(search).get(storeParameter));
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

// The open branch lives in the address as ?store=ID, so the Back button closes the store detail
// sheet and the link can be shared.
export function useSelectedStore(stores: QueueStore[]) {
  const [storeId, setStoreId] = useState<number | null>(null);
  // True while the sheet's history entry was added by this page, so closing can go back to it.
  const addedEntry = useRef(false);

  useEffect(() => {
    function readAddress() {
      const nextStoreId = storeIdFromSearch(window.location.search);

      if (nextStoreId === null) {
        addedEntry.current = false;
      }

      setStoreId(nextStoreId);
    }

    readAddress();
    window.addEventListener("popstate", readAddress);
    return () => window.removeEventListener("popstate", readAddress);
  }, []);

  const open = useCallback((store: QueueStore) => {
    const address = new URL(window.location.href);
    const wasOpen = address.searchParams.has(storeParameter);

    address.searchParams.set(storeParameter, String(store.id));

    if (wasOpen) {
      window.history.replaceState(window.history.state, "", address);
    } else {
      window.history.pushState(null, "", address);
      addedEntry.current = true;
    }

    setStoreId(store.id);
  }, []);

  const close = useCallback(() => {
    if (addedEntry.current) {
      // The popstate listener clears the selection.
      window.history.back();
      return;
    }

    // Opened from a shared link: there is no earlier entry on this site to go back to.
    const address = new URL(window.location.href);

    address.searchParams.delete(storeParameter);
    window.history.replaceState(window.history.state, "", address);
    setStoreId(null);
  }, []);

  useEffect(() => {
    if (storeId === null) {
      return;
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        close();
      }
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [close, storeId]);

  return {
    close,
    open,
    selectedStore: storeId === null ? null : (stores.find(({ id }) => id === storeId) ?? null),
  };
}
