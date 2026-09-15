import { useSyncExternalStore } from "react";
import { supportedTimeZones } from "./rules";

export type TimeZoneOption = { value: string; label: string };

let cachedOptions: TimeZoneOption[] | null = null;

function offsetLabel(zone: string, now: Date) {
  const part = new Intl.DateTimeFormat("en-US", { timeZone: zone, timeZoneName: "shortOffset" })
    .formatToParts(now)
    .find((p) => p.type === "timeZoneName");
  return part?.value ?? "";
}

function getSnapshot() {
  if (!cachedOptions) {
    const now = new Date();
    cachedOptions = supportedTimeZones().map((zone) => ({
      value: zone,
      label: `${zone.replaceAll("_", " ")} (${offsetLabel(zone, now)})`,
    }));
  }
  return cachedOptions;
}

function getServerSnapshot() {
  return null;
}

function subscribe() {
  return () => {};
}

/**
 * Time zone options from the browser's own list. Null during server rendering
 * and hydration, since the server's list and offsets can differ.
 */
export function useTimeZoneOptions() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** The browser's detected time zone, or null on the server. */
export function useDetectedTimeZone() {
  return useSyncExternalStore(
    subscribe,
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    () => null,
  );
}
