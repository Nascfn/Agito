"use client";

import type { EstimateUnit, TaskDraft } from "@/lib/tasks/draft";
import { DESCRIPTION_MAX } from "@/lib/tasks/validate";

const UNITS: EstimateUnit[] = ["min", "hr"];

export function fieldClass(tone: "canvas" | "surface") {
  return `w-full rounded-[10px] px-3 py-2.5 text-[15px] text-ink outline-none placeholder:text-ink-muted focus:ring-2 focus:ring-accent-strong ${
    tone === "canvas" ? "bg-canvas" : "bg-surface"
  }`;
}

type Props = {
  draft: TaskDraft;
  onChange: (patch: Partial<TaskDraft>) => void;
  idPrefix: string;
  tone: "canvas" | "surface";
};

/** The optional task fields: agent toggle, description, due date and time, estimate. */
export function TaskFields({ draft, onChange, idPrefix, tone }: Props) {
  const field = fieldClass(tone);
  const surface = tone === "canvas" ? "bg-canvas" : "bg-surface";

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={draft.agentTask}
        onClick={() => onChange({ agentTask: !draft.agentTask })}
        className={`flex items-center justify-between gap-3 rounded-[10px] px-3 py-2.5 text-left transition-colors ${surface} ${
          draft.agentTask ? "ring-1 ring-accent-strong" : ""
        }`}
      >
        <span className="min-w-0">
          <span className="block text-[15px]">Agent: do this</span>
          <span className="block text-xs text-ink-muted">
            Your agent works on it instead of scheduling time for you
          </span>
        </span>
        <span
          aria-hidden="true"
          className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${
            draft.agentTask ? "bg-accent" : "bg-line-strong"
          }`}
        >
          <span
            className={`absolute top-0.5 size-5 rounded-full bg-white transition-transform ${
              draft.agentTask ? "translate-x-[18px]" : "translate-x-0.5"
            }`}
          />
        </span>
      </button>

      <div>
        <label htmlFor={`${idPrefix}-description`} className="sr-only">
          Description
        </label>
        <textarea
          id={`${idPrefix}-description`}
          rows={3}
          maxLength={DESCRIPTION_MAX}
          value={draft.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Add context for you or your agents"
          className={`${field} min-h-20 resize-y`}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-xs text-ink-muted">
          Due date
          <input
            type="date"
            value={draft.dueDate}
            onChange={(e) => onChange({ dueDate: e.target.value })}
            className={field}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-ink-muted">
          Time
          <input
            type="time"
            value={draft.dueTime}
            onChange={(e) => onChange({ dueTime: e.target.value })}
            className={field}
          />
        </label>
      </div>

      {!draft.agentTask && (
      <div className="flex flex-col gap-1">
        <label htmlFor={`${idPrefix}-estimate`} className="text-xs text-ink-muted">
          Estimate
        </label>
        <div className="flex gap-2">
          <input
            id={`${idPrefix}-estimate`}
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            value={draft.estimate}
            onChange={(e) => onChange({ estimate: e.target.value })}
            placeholder={draft.estimateUnit === "hr" ? "1.5" : "30"}
            className={`${field} min-w-0 flex-1`}
          />
          <div
            role="group"
            aria-label="Estimate unit"
            className={`flex shrink-0 rounded-[10px] p-1 ${surface}`}
          >
            {UNITS.map((unit) => {
              const active = draft.estimateUnit === unit;
              return (
                <button
                  key={unit}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onChange({ estimateUnit: unit })}
                  className={`rounded-lg px-3.5 text-sm transition-colors ${
                    active
                      ? "bg-accent-strong text-accent-soft"
                      : "text-ink-muted hover:text-ink"
                  }`}
                >
                  {unit}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
