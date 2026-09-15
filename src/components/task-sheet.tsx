"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { deleteAttachment, getAttachmentUrls } from "@/app/actions/attachments";
import { formatFileSize } from "@/lib/attachments/rules";
import { uploadAttachment } from "@/lib/attachments/upload";
import { draftFromTask, draftToInput, type TaskDraft } from "@/lib/tasks/draft";
import { TITLE_MAX } from "@/lib/tasks/validate";
import type { Attachment, Task, TaskInput } from "@/lib/types";
import { FileDrop } from "./file-drop";
import { FileIcon, TrashIcon, XIcon } from "./icons";
import { TaskFields } from "./task-fields";

type Props = {
  task: Task;
  userId: string;
  onClose: () => void;
  onSave: (id: string, input: TaskInput) => void;
  onDelete: (id: string) => void;
  onAttachmentAdded: (taskId: string, attachment: Attachment) => void;
  onAttachmentRemoved: (taskId: string, attachmentId: string) => void;
};

/** View and edit a task. Uses the native <dialog> for focus and Escape handling. */
export function TaskSheet({
  task,
  userId,
  onClose,
  onSave,
  onDelete,
  onAttachmentAdded,
  onAttachmentRemoved,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  // Only close on the backdrop when the press also started there, so
  // selecting text and releasing outside the sheet doesn't discard edits.
  const pressStartedOnBackdrop = useRef(false);
  const [draft, setDraft] = useState<TaskDraft>(() => draftFromTask(task));
  const [error, setError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(0);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  const attachments = [...task.attachments].sort((a, b) =>
    a.created_at.localeCompare(b.created_at),
  );
  const attachmentKey = attachments.map((attachment) => attachment.id).join(",");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  // Fetch short-lived links whenever the set of files changes. Links are
  // prepared ahead of time so opening a file isn't blocked as a popup.
  useEffect(() => {
    if (!attachmentKey) return;
    let cancelled = false;
    void getAttachmentUrls(task.id).then((result) => {
      if (!cancelled && result.ok) setUrls(result.data);
    });
    return () => {
      cancelled = true;
    };
  }, [task.id, attachmentKey]);

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

  async function upload(files: File[]) {
    setFileError(null);
    setUploading((count) => count + files.length);
    await Promise.all(
      files.map(async (file) => {
        const result = await uploadAttachment(userId, task.id, file);
        setUploading((count) => count - 1);
        if (result.ok) onAttachmentAdded(task.id, result.data);
        else setFileError(result.error);
      }),
    );
  }

  async function remove(attachment: Attachment) {
    setConfirmRemoveId(null);
    setFileError(null);
    onAttachmentRemoved(task.id, attachment.id);
    const result = await deleteAttachment(attachment.id);
    if (!result.ok) {
      onAttachmentAdded(task.id, attachment);
      setFileError(result.error);
    }
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

        <section aria-label="Files" className="flex flex-col gap-2">
          {attachments.length > 0 && (
            <ul className="flex flex-col gap-1">
              {attachments.map((attachment) => {
                const url = urls[attachment.id];
                return (
                  <li
                    key={attachment.id}
                    className="flex items-center gap-2 rounded-[10px] bg-surface py-1.5 pl-3 pr-1.5"
                  >
                    <FileIcon className="size-4 shrink-0 text-accent-soft" />
                    {url ? (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-w-0 flex-1 truncate text-sm hover:underline"
                      >
                        {attachment.file_name}
                      </a>
                    ) : (
                      <span className="min-w-0 flex-1 truncate text-sm">
                        {attachment.file_name}
                      </span>
                    )}
                    <span className="shrink-0 text-xs text-ink-muted">
                      {formatFileSize(attachment.size_bytes)}
                    </span>
                    {confirmRemoveId === attachment.id ? (
                      <>
                        <button
                          type="button"
                          onClick={() => void remove(attachment)}
                          className="rounded-md px-2 py-1.5 text-xs text-due transition-colors hover:bg-surface-hover"
                        >
                          Remove
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmRemoveId(null)}
                          className="rounded-md px-2 py-1.5 text-xs text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink"
                        >
                          Keep
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmRemoveId(attachment.id)}
                        aria-label={`Remove ${attachment.file_name}`}
                        className="rounded-md p-1.5 text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink"
                      >
                        <XIcon className="size-4" />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {uploading > 0 && (
            <p className="text-xs text-accent-soft">
              Uploading {uploading} {uploading === 1 ? "file" : "files"}…
            </p>
          )}
          <FileDrop
            tone="surface"
            onFiles={(files) => void upload(files)}
            onRejected={(messages) => setFileError(messages[0] ?? null)}
          />
          {fileError && (
            <p role="alert" className="text-sm text-due">
              {fileError}
            </p>
          )}
        </section>

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
