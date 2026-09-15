"use client";

import { useRef, useState, type FormEvent } from "react";
import { formatFileSize } from "@/lib/attachments/rules";
import { draftToInput, emptyDraft, type TaskDraft } from "@/lib/tasks/draft";
import { TITLE_MAX } from "@/lib/tasks/validate";
import type { TaskInput } from "@/lib/types";
import { FileDrop } from "./file-drop";
import { ArrowUpIcon, FileIcon, XIcon } from "./icons";
import { TaskFields } from "./task-fields";

type Props = {
  /** Files upload after the task is saved. */
  onAdd: (input: TaskInput, files: File[]) => void;
};

/** Always-visible add bar. Title + Enter is enough; details are optional. */
export function QuickAdd({ onAdd }: Props) {
  const [draft, setDraft] = useState<TaskDraft>(emptyDraft);
  const [files, setFiles] = useState<File[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  function update(patch: Partial<TaskDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
    setError(null);
  }

  function reset() {
    setDraft(emptyDraft);
    setFiles([]);
    setExpanded(false);
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

    onAdd(result.data, files);
    reset();
    titleRef.current?.focus();
  }

  let detailsLabel = "Details";
  if (expanded) detailsLabel = "Less";
  else if (files.length > 0) detailsLabel = `Details · ${files.length}`;

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
          {detailsLabel}
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

          <div className="mt-3 flex flex-col gap-2">
            {files.length > 0 && (
              <ul className="flex flex-col gap-1">
                {files.map((file, index) => (
                  <li
                    key={`${file.name}-${file.size}-${index}`}
                    className="flex items-center gap-2 rounded-[10px] bg-canvas py-1.5 pl-3 pr-1.5"
                  >
                    <FileIcon className="size-4 shrink-0 text-accent-soft" />
                    <span className="min-w-0 flex-1 truncate text-sm">{file.name}</span>
                    <span className="shrink-0 text-xs text-ink-muted">
                      {formatFileSize(file.size)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setFiles((current) => current.filter((_, i) => i !== index))}
                      aria-label={`Remove ${file.name}`}
                      className="rounded-md p-1.5 text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink"
                    >
                      <XIcon className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <FileDrop
              tone="canvas"
              onFiles={(picked) => {
                setFiles((current) => [...current, ...picked]);
                setError(null);
              }}
              onRejected={(messages) => {
                if (messages.length > 0) setError(messages[0]);
              }}
            />
          </div>

          {error && (
            <p role="alert" className="mt-2 text-sm text-due">
              {error}
            </p>
          )}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={reset}
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
