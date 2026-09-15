"use client";

import { useState, useTransition, type FormEvent } from "react";
import { CHECK_FREQUENCIES } from "@/lib/settings/rules";
import { useDetectedTimeZone, useTimeZoneOptions } from "@/lib/settings/use-time-zones";
import { saveOnboarding } from "./actions";

type Initial = {
  time_zone: string | null;
  schedule_window_start: string;
  schedule_window_end: string;
  schedule_weekends: boolean;
  check_frequency_minutes: number;
};

const field =
  "w-full rounded-[10px] bg-surface px-3 py-2.5 text-[15px] text-ink outline-none focus:ring-2 focus:ring-accent-strong";

export function OnboardingForm({ initial }: { initial: Initial }) {
  const options = useTimeZoneOptions();
  const detected = useDetectedTimeZone();
  // null means "not chosen yet": fall back to the saved or detected zone.
  const [chosenZone, setChosenZone] = useState<string | null>(null);
  const timeZone = chosenZone ?? initial.time_zone ?? detected ?? "";

  const [start, setStart] = useState(initial.schedule_window_start);
  const [end, setEnd] = useState(initial.schedule_window_end);
  const [weekends, setWeekends] = useState(initial.schedule_weekends);
  const [frequency, setFrequency] = useState(initial.check_frequency_minutes);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const overnight = start > end;
  const allDay = start === end;
  const selectedFrequency = CHECK_FREQUENCIES.find((option) => option.minutes === frequency);

  function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      // Redirects home on success; only errors come back.
      const result = await saveOnboarding({
        time_zone: timeZone,
        schedule_window_start: start,
        schedule_window_end: end,
        schedule_weekends: weekends,
        check_frequency_minutes: frequency,
      });
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <form onSubmit={submit} className="mt-8 flex flex-col gap-7">
      <section className="flex flex-col gap-2">
        <label htmlFor="time-zone" className="text-sm font-medium">
          Time zone
        </label>
        <p className="text-xs text-ink-muted">Used for due times and your scheduling window.</p>
        {options ? (
          <select
            id="time-zone"
            value={timeZone}
            onChange={(e) => setChosenZone(e.target.value)}
            className={field}
          >
            {!timeZone && <option value="">Pick your time zone</option>}
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : (
          <div className={`${field} text-ink-muted`}>Loading time zones…</div>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">Scheduling window</h2>
        <p className="text-xs text-ink-muted">
          Your agent only puts tasks on your calendar between these times.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1 text-xs text-ink-muted">
            From
            <input
              type="time"
              required
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className={field}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-ink-muted">
            To
            <input
              type="time"
              required
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className={field}
            />
          </label>
        </div>
        {overnight && (
          <p className="text-xs text-accent-soft">Runs overnight, into the next day.</p>
        )}
        {allDay && <p className="text-xs text-accent-soft">Any time of day.</p>}
      </section>

      <section>
        <button
          type="button"
          role="switch"
          aria-checked={weekends}
          onClick={() => setWeekends((on) => !on)}
          className="flex w-full items-center justify-between gap-3 rounded-[10px] bg-surface px-3 py-3 text-left"
        >
          <span>
            <span className="block text-sm font-medium">Schedule on weekends</span>
            <span className="block text-xs text-ink-muted">
              Let your agent put tasks on Saturdays and Sundays
            </span>
          </span>
          <span
            aria-hidden="true"
            className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${
              weekends ? "bg-accent" : "bg-line-strong"
            }`}
          >
            <span
              className={`absolute top-0.5 size-5 rounded-full bg-white transition-transform ${
                weekends ? "translate-x-[18px]" : "translate-x-0.5"
              }`}
            />
          </span>
        </button>
      </section>

      <section className="flex flex-col gap-2">
        <label htmlFor="check-frequency" className="text-sm font-medium">
          How often Claude checks in
        </label>
        <p className="text-xs text-ink-muted">
          Each check reviews your new and changed tasks.
        </p>
        <select
          id="check-frequency"
          value={frequency}
          onChange={(e) => setFrequency(Number(e.target.value))}
          className={field}
        >
          {CHECK_FREQUENCIES.map((option) => (
            <option key={option.minutes} value={option.minutes}>
              {option.label}
              {option.minutes === 60 ? " (recommended)" : ""}
              {option.advanced ? " — advanced" : ""}
            </option>
          ))}
        </select>
        {selectedFrequency?.advanced && (
          <p className="text-xs text-due">
            Uses more of your Claude plan, and may not be available once your scheduled tasks run
            in the cloud.
          </p>
        )}
      </section>

      {error && (
        <p role="alert" className="text-sm text-due">
          {error}
        </p>
      )}

      <button
        type="submit"
        className="rounded-[10px] bg-accent px-4 py-3 font-medium text-white transition hover:bg-accent-hover active:scale-[0.98]"
      >
        {pending ? "Saving…" : "Save and continue"}
      </button>
    </form>
  );
}
