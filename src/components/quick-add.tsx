"use client";

import { useRef, useState, type FormEvent } from "react";
import { draftToInput, emptyDraft, type TaskDraft } from "@/lib/tasks/draft";
import { TITLE_MAX } from "@/lib/tasks/validate";
import type { TaskInput } from "@/lib/types";
import { ArrowUpIcon } from "./icons";
import { TaskFields } from "./task-fields";

type Props = {
  onAdd: (input: TaskInput) => void;
};

/** Always-visible add bar. Title + Enter is enough; details are optional. */
export function QuickAdd({ onAdd }: Props) {
  const [draft, setDraft] = useState<TaskDraft>(emptyDraft);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  function update(patch: Partial<TaskDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
    setError(null);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!draft.title.trim()) {
      titleRef.current?.focus();
      return;
    }

    const result = draftToInput(draft);
    if (!result.ok) {
      setError(result.error);
      setExpanded(true);
      return;
    }

    onAdd(result.data);
    setDraft(emptyDraft);
    setExpanded(false);
    titleRef.current?.focus();
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-xl border border-accent-strong bg-surface p-1.5 transition-colors focus-within:border-accent"
    >
      <div className="flex items-center gap-1">
        <label htmlFor="quick-add-title" className="sr-only">
          Task title
        </label>
        <input
          ref={titleRef}
          id="quick-add-title"
          value={draft.title}
          onChange={(e) => update({ title: e.target.value })}
          maxLength={TITLE_MAX}
          placeholder="Add a task"
          autoComplete="off"
          enterKeyHint="done"
          className="min-w-0 flex-1 bg-transparent px-2.5 py-2 text-[15px] outline-none placeholder:text-ink-muted"
        />
        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          aria-expanded={expanded}
          aria-controls="quick-add-details"
          className="shrink-0 rounded-lg px-2.5 py-2 text-sm text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink"
        >
          {expanded ? "Less" : "Details"}
        </button>
        <button
          type="submit"
          aria-label="Add task"
          className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-accent text-white transition hover:bg-accent-hover active:scale-95"
        >
          <ArrowUpIcon className="size-5" />
        </button>
      </div>

      {expanded && (
        <div id="quick-add-details" className="px-1 pb-1 pt-2">
          <TaskFields draft={draft} onChange={update} idPrefix="quick-add" tone="canvas" />
          {error && (
            <p role="alert" className="mt-2 text-sm text-due">
              {error}
            </p>
          )}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => {
                setDraft(emptyDraft);
                setExpanded(false);
                setError(null);
              }}
              className="flex-1 rounded-[10px] border border-line-strong py-2.5 text-sm text-ink-soft transition-colors hover:bg-surface-hover"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-[2] rounded-[10px] bg-accent py-2.5 text-sm font-medium text-white transition hover:bg-accent-hover active:scale-[0.98]"
            >
              Add task
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
