"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { draftFromTask, draftToInput, type TaskDraft } from "@/lib/tasks/draft";
import { TITLE_MAX } from "@/lib/tasks/validate";
import type { Task, TaskInput } from "@/lib/types";
import { TrashIcon, XIcon } from "./icons";
import { TaskFields } from "./task-fields";

type Props = {
  task: Task;
  onClose: () => void;
  onSave: (id: string, input: TaskInput) => void;
  onDelete: (id: string) => void;
};

/** View and edit a task. Uses the native <dialog> for focus and Escape handling. */
export function TaskSheet({ task, onClose, onSave, onDelete }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  // Only close on the backdrop when the press also started there, so
  // selecting text and releasing outside the sheet doesn't discard edits.
  const pressStartedOnBackdrop = useRef(false);
  const [draft, setDraft] = useState<TaskDraft>(() => draftFromTask(task));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  function close() {
    dialogRef.current?.close();
  }

  function update(patch: Partial<TaskDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
    setError(null);
  }

  function save(event: FormEvent) {
    event.preventDefault();
    const result = draftToInput(draft);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onSave(task.id, result.data);
    close();
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onPointerDown={(event) => {
        pressStartedOnBackdrop.current = event.target === event.currentTarget;
      }}
      onClick={(event) => {
        if (pressStartedOnBackdrop.current && event.target === event.currentTarget) close();
      }}
      aria-labelledby="task-sheet-title"
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-line bg-canvas p-0 text-ink backdrop:bg-black/60"
    >
      <form onSubmit={save} className="flex flex-col gap-4 p-5">
        <div className="flex items-start gap-2">
          <label id="task-sheet-title" htmlFor="task-sheet-title-input" className="sr-only">
            Title
          </label>
          <input
            id="task-sheet-title-input"
            value={draft.title}
            onChange={(e) => update({ title: e.target.value })}
            maxLength={TITLE_MAX}
            className="min-w-0 flex-1 rounded-lg bg-transparent px-1 py-1 text-lg font-medium outline-none focus:ring-2 focus:ring-accent-strong"
          />
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="rounded-lg p-2 text-ink-muted transition-colors hover:bg-surface hover:text-ink"
          >
            <XIcon className="size-5" />
          </button>
        </div>

        <TaskFields draft={draft} onChange={update} idPrefix="task-sheet" tone="surface" />

        {error && (
          <p role="alert" className="text-sm text-due">
            {error}
          </p>
        )}

        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => {
              onDelete(task.id);
              close();
            }}
            className="flex items-center gap-1.5 rounded-[10px] px-3 py-2.5 text-sm text-ink-muted transition-colors hover:bg-surface hover:text-ink"
          >
            <TrashIcon className="size-4" />
            Delete
          </button>
          <span className="flex-1" />
          <button
            type="button"
            onClick={close}
            className="rounded-[10px] border border-line-strong px-4 py-2.5 text-sm text-ink-soft transition-colors hover:bg-surface"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-[10px] bg-accent px-5 py-2.5 text-sm font-medium text-white transition hover:bg-accent-hover active:scale-[0.98]"
          >
            Save
          </button>
        </div>
      </form>
    </dialog>
  );
}
