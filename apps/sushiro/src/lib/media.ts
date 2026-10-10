import { useSyncExternalStore } from "react";

// True below the phone breakpoint used across the styles. False on the server.
const narrowQuery = "(max-width: 700px)";

function subscribe(listener: () => void) {
  const media = window.matchMedia(narrowQuery);

  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
}

export function useIsNarrow() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(narrowQuery).matches,
    () => false,
  );
}
