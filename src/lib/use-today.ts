import { useSyncExternalStore } from "react";
import { localDateKey } from "./format";

function subscribe(onChange: () => void) {
  const interval = setInterval(onChange, 60_000);
  return () => clearInterval(interval);
}

function getSnapshot() {
  return localDateKey(new Date());
}

function getServerSnapshot() {
  return null;
}

/**
 * The viewer's local date (YYYY-MM-DD), or null during server rendering and
 * hydration so relative labels never mismatch between server and browser.
 */
export function useToday() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
