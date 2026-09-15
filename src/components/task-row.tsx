"use client";

import { formatDue, formatEstimate } from "@/lib/format";
import type { Task } from "@/lib/types";
import { CheckIcon } from "./icons";

type Props = {
  task: Task;
  today: string | null;
  /** True while the completion animation plays, before the row moves. */
  completing: boolean;
  onToggle: () => void;
  onOpen: () => void;
};

export function TaskRow({ task, today, completing, onToggle, onOpen }: Props) {
  const done = task.status === "done";
  const checked = done || completing;
  const due = task.due_date && !done ? formatDue(task.due_date, task.due_time, today) : null;
  const preview = done
    ? null
    : task.description?.split("\n").find((line) => line.trim())?.trim();

  return (
    <li
      className={`animate-row-in flex items-center border-b border-line transition-opacity duration-300 last:border-b-0 ${
        completing ? "opacity-50" : ""
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={checked}
        aria-label={checked ? `Mark "${task.title}" as not done` : `Mark "${task.title}" as done`}
        className="group flex size-11 shrink-0 items-center justify-center"
      >
        <span
          className={`flex size-[22px] items-center justify-center rounded-full border-2 transition-colors ${
            checked
              ? "border-accent bg-accent"
              : "border-ink-faint group-hover:border-accent-soft"
          } ${completing ? "animate-check-pop" : ""}`}
        >
          {checked && <CheckIcon className="size-3.5 text-white" animated={completing} />}
        </span>
      </button>

      <button
        type="button"
        onClick={onOpen}
        className="flex min-h-11 min-w-0 flex-1 items-center gap-3 py-3 pr-1 text-left"
      >
        <span className="min-w-0 flex-1">
          <span
            className={`block truncate text-[15px] ${
              done ? "text-ink-faint line-through" : completing ? "text-ink-muted line-through" : ""
            }`}
          >
            {task.title}
          </span>
          {preview && (
            <span className="mt-0.5 block truncate text-xs text-ink-muted">{preview}</span>
          )}
        </span>
        {task.agent_task && !done && (
          <span className="shrink-0 rounded-md bg-accent-strong/60 px-1.5 py-0.5 text-xs text-accent-soft">
            Agent
          </span>
        )}
        {due && (
          <span
            className={`shrink-0 rounded-md px-1.5 py-0.5 text-xs ${
              due.overdue ? "bg-due text-canvas" : "bg-due-bg text-due"
            }`}
          >
            {due.label}
          </span>
        )}
        {task.estimate_minutes != null && !done && (
          <span className="shrink-0 text-xs text-ink-muted">
            {formatEstimate(task.estimate_minutes)}
          </span>
        )}
      </button>
    </li>
  );
}
