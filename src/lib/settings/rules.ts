import type { ActionResult, SettingsInput } from "@/lib/types";

// Shared by the onboarding form and its server action.
// Must match the user_settings constraints in supabase/migrations.

export const CHECK_FREQUENCIES = [
  { minutes: 15, label: "Every 15 minutes", advanced: true },
  { minutes: 30, label: "Every 30 minutes", advanced: true },
  { minutes: 60, label: "Every hour", advanced: false },
  { minutes: 120, label: "Every 2 hours", advanced: false },
  { minutes: 240, label: "Every 4 hours", advanced: false },
] as const;

export const DEFAULT_SETTINGS: Omit<SettingsInput, "time_zone"> = {
  schedule_window_start: "09:00",
  schedule_window_end: "21:00",
  schedule_weekends: true,
  check_frequency_minutes: 60,
};

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Real IANA time zones known to this JavaScript runtime, plus UTC. */
export function supportedTimeZones(): string[] {
  const zones = Intl.supportedValuesOf("timeZone");
  return zones.includes("UTC") ? zones : [...zones, "UTC"];
}

function fail(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

export function validateSettings(raw: unknown): ActionResult<SettingsInput> {
  if (typeof raw !== "object" || raw === null) return fail("Those settings aren't valid.");
  const input = raw as Record<string, unknown>;

  const timeZone = input.time_zone;
  if (typeof timeZone !== "string" || !supportedTimeZones().includes(timeZone)) {
    return fail("Pick your time zone from the list.");
  }

  const start = input.schedule_window_start;
  const end = input.schedule_window_end;
  if (typeof start !== "string" || !TIME_PATTERN.test(start)) {
    return fail("Pick a start time for your scheduling window.");
  }
  if (typeof end !== "string" || !TIME_PATTERN.test(end)) {
    return fail("Pick an end time for your scheduling window.");
  }

  if (typeof input.schedule_weekends !== "boolean") return fail("Those settings aren't valid.");

  const frequency = input.check_frequency_minutes;
  if (!CHECK_FREQUENCIES.some((option) => option.minutes === frequency)) {
    return fail("Pick how often Claude checks in.");
  }

  return {
    ok: true,
    data: {
      time_zone: timeZone,
      schedule_window_start: start,
      schedule_window_end: end,
      schedule_weekends: input.schedule_weekends,
      check_frequency_minutes: frequency as number,
    },
  };
}
