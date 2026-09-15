"use client";

import { useEffect, useRef, useState } from "react";
import { createTask, deleteTask, setTaskStatus, updateTask } from "@/app/actions/tasks";
import { signOut } from "@/app/auth/actions";
import { uploadAttachment } from "@/lib/attachments/upload";
import { formatEstimate, localDateKey } from "@/lib/format";
import type { Attachment, List, Task, TaskInput, TaskStatus } from "@/lib/types";
import { useToday } from "@/lib/use-today";
import { newId } from "@/lib/uuid";
import { ListSwitcher } from "./list-switcher";
import { QuickAdd } from "./quick-add";
import { TaskRow } from "./task-row";
import { TaskSheet } from "./task-sheet";
import { Toast, type ToastState } from "./toast";

const COMPLETE_ANIMATION_MS = 450;
const UNDO_WINDOW_MS = 5000;

type Timer = ReturnType<typeof setTimeout>;

type Props = {
  lists: List[];
  currentList: List;
  initialTasks: Task[];
  userId: string;
};

function inputFields(task: Task): TaskInput {
  return {
    title: task.title,
    description: task.description,
    due_date: task.due_date,
    due_time: task.due_time,
    estimate_minutes: task.estimate_minutes,
    agent_task: task.agent_task,
  };
}

export function TaskBoard({ lists, currentList, initialTasks, userId }: Props) {
  const [tasks, setTasks] = useState(initialTasks);
  const [uploadCounts, setUploadCounts] = useState<Record<string, number>>({});
  const [completingIds, setCompletingIds] = useState<ReadonlySet<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const today = useToday();

  const completeTimers = useRef(new Map<string, Timer>());
  const deleteTimers = useRef(new Map<string, Timer>());
  const toastTimer = useRef<Timer | null>(null);
  const toastCount = useRef(0);
  // Server writes per task run in order, so a quick "done" then "undo" (or
  // completing a task before its create finishes) can't land out of order.
  const taskQueues = useRef(new Map<string, Promise<unknown>>());

  function enqueue<T>(id: string, run: () => Promise<T>) {
    const previous = taskQueues.current.get(id) ?? Promise.resolve();
    const next = previous.then(run, run);
    taskQueues.current.set(id, next);
    return next;
  }

  function queueStatus(id: string, status: TaskStatus) {
    return enqueue(id, () => setTaskStatus(id, status));
  }

  useEffect(() => {
    const deletes = deleteTimers.current;
    const completes = completeTimers.current;
    const toastTimeout = toastTimer;
    return () => {
      // Leaving the page: commit deletes that were still waiting on undo.
      for (const [id, timer] of deletes) {
        clearTimeout(timer);
        void deleteTask(id);
      }
      deletes.clear();
      completes.forEach(clearTimeout);
      if (toastTimeout.current) clearTimeout(toastTimeout.current);
    };
  }, []);

  function showToast(message: string, undo?: () => void) {
    const id = ++toastCount.current;
    setToast({ id, message, undo });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
    }, UNDO_WINDOW_MS);
  }

  function patchTask(id: string, patch: Partial<Task>) {
    setTasks((current) => current.map((task) => (task.id === id ? { ...task, ...patch } : task)));
  }

  function addAttachment(taskId: string, attachment: Attachment) {
    setTasks((current) =>
      current.map((task) =>
        task.id === taskId
          ? {
              ...task,
              attachments: [
                ...task.attachments.filter((existing) => existing.id !== attachment.id),
                attachment,
              ],
            }
          : task,
      ),
    );
  }

  function removeAttachment(taskId: string, attachmentId: string) {
    setTasks((current) =>
      current.map((task) =>
        task.id === taskId
          ? { ...task, attachments: task.attachments.filter((a) => a.id !== attachmentId) }
          : task,
      ),
    );
  }

  function countUploads(taskId: string, delta: number) {
    setUploadCounts((current) => {
      const next = { ...current, [taskId]: (current[taskId] ?? 0) + delta };
      if (next[taskId] <= 0) delete next[taskId];
      return next;
    });
  }

  async function uploadFiles(taskId: string, files: File[]) {
    countUploads(taskId, files.length);
    const results = await Promise.all(
      files.map(async (file) => {
        const result = await uploadAttachment(userId, taskId, file);
        countUploads(taskId, -1);
        if (result.ok) addAttachment(taskId, result.data);
        return result;
      }),
    );

    const failures = results.flatMap((result) => (result.ok ? [] : [result.error]));
    if (failures.length === 1) showToast(failures[0]);
    else if (failures.length > 1) showToast(`${failures.length} files couldn't be uploaded. Try again.`);
  }

  function stopCompleting(id: string) {
    const timer = completeTimers.current.get(id);
    if (timer) clearTimeout(timer);
    completeTimers.current.delete(id);
    setCompletingIds((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
  }

  async function handleAdd(input: TaskInput, files: File[]) {
    const id = newId();
    const optimistic: Task = {
      id,
      list_id: currentList.id,
      ...input,
      status: "todo",
      completed_at: null,
      created_at: new Date().toISOString(),
      attachments: [],
    };
    setTasks((current) => [optimistic, ...current]);

    const result = await enqueue(id, () => createTask(id, currentList.id, input));
    if (!result.ok) {
      setTasks((current) => current.filter((task) => task.id !== id));
      showToast(result.error);
      return;
    }

    // Files can only upload once the task exists (storage policies check it).
    if (files.length > 0) await uploadFiles(id, files);
  }

  function handleComplete(task: Task) {
    // Play the check animation, then move the task to "Done today".
    setCompletingIds((current) => new Set(current).add(task.id));
    completeTimers.current.set(
      task.id,
      setTimeout(() => {
        stopCompleting(task.id);
        patchTask(task.id, { status: "done", completed_at: new Date().toISOString() });
      }, COMPLETE_ANIMATION_MS),
    );
    showToast("Task done", () => void handleReopen(task.id));

    void queueStatus(task.id, "done").then((result) => {
      if (result.ok) return;
      stopCompleting(task.id);
      patchTask(task.id, { status: "todo", completed_at: null });
      showToast(result.error);
    });
  }

  async function handleReopen(id: string) {
    stopCompleting(id);
    patchTask(id, { status: "todo", completed_at: null });

    const result = await queueStatus(id, "todo");
    if (!result.ok) {
      patchTask(id, { status: "done", completed_at: new Date().toISOString() });
      showToast(result.error);
    }
  }

  async function handleSave(id: string, input: TaskInput) {
    const previous = tasks.find((task) => task.id === id);
    if (!previous) return;
    patchTask(id, input);

    const result = await updateTask(id, input);
    if (!result.ok) {
      patchTask(id, inputFields(previous));
      showToast(result.error);
    }
  }

  function handleDelete(id: string) {
    const index = tasks.findIndex((task) => task.id === id);
    const removed = tasks[index];
    if (!removed) return;

    // The sheet unmounts with the task, so its <dialog> close event never
    // reaches React. Clear the editing id here, or Undo would reopen the sheet.
    setEditingId(null);

    setTasks((current) => current.filter((task) => task.id !== id));
    const restore = () =>
      setTasks((current) => {
        const next = [...current];
        next.splice(Math.min(index, next.length), 0, removed);
        return next;
      });

    // Wait out the undo window before deleting for real.
    const timer = setTimeout(async () => {
      deleteTimers.current.delete(id);
      const result = await deleteTask(id);
      if (!result.ok) {
        restore();
        showToast(result.error);
      }
    }, UNDO_WINDOW_MS);
    deleteTimers.current.set(id, timer);

    showToast("Task deleted", () => {
      clearTimeout(timer);
      deleteTimers.current.delete(id);
      restore();
    });
  }

  const openTasks = tasks.filter((task) => task.status === "todo");
  const remaining = openTasks.filter((task) => !completingIds.has(task.id));
  const totalEstimate = remaining.reduce((sum, task) => sum + (task.estimate_minutes ?? 0), 0);
  const doneToday = today
    ? tasks
        .filter(
          (task) =>
            task.status === "done" &&
            task.completed_at &&
            localDateKey(new Date(task.completed_at)) === today,
        )
        .sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? ""))
    : [];
  const editingTask = editingId ? tasks.find((task) => task.id === editingId) : undefined;

  let summary: string;
  if (totalEstimate > 0) summary = `About ${formatEstimate(totalEstimate)} of work`;
  else if (remaining.length > 0) summary = "Add estimates to see how long it'll take";
  else summary = "Add a task to get started";

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 pb-28 pt-5">
      <header className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-[15px] font-medium">
          <span className="size-2.5 rounded-[3px] bg-accent-soft" aria-hidden="true" />
          Agito
        </span>
        <div className="flex items-center">
          <ListSwitcher lists={lists} currentList={currentList} />
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-lg px-2.5 py-2 text-sm text-ink-faint transition-colors hover:bg-surface hover:text-ink"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <section className="mt-8">
        <h1 className="text-2xl font-medium">
          {remaining.length > 0 ? `${remaining.length} to do` : "All clear"}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">{summary}</p>
      </section>

      <div className="mt-5">
        <QuickAdd onAdd={handleAdd} />
      </div>

      {openTasks.length > 0 && (
        <ul className="mt-3">
          {openTasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              today={today}
              completing={completingIds.has(task.id)}
              uploading={uploadCounts[task.id] ?? 0}
              onToggle={() =>
                completingIds.has(task.id) ? void handleReopen(task.id) : handleComplete(task)
              }
              onOpen={() => setEditingId(task.id)}
            />
          ))}
        </ul>
      )}

      {doneToday.length > 0 && (
        <section className="mt-6">
          <h2 className="px-1 text-xs text-ink-faint">Done today</h2>
          <ul className="mt-1">
            {doneToday.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                today={today}
                completing={false}
                uploading={0}
                onToggle={() => void handleReopen(task.id)}
                onOpen={() => setEditingId(task.id)}
              />
            ))}
          </ul>
        </section>
      )}

      {editingTask && (
        <TaskSheet
          key={editingTask.id}
          task={editingTask}
          onClose={() => setEditingId(null)}
          onSave={handleSave}
          onDelete={handleDelete}
          userId={userId}
          onAttachmentAdded={addAttachment}
          onAttachmentRemoved={removeAttachment}
        />
      )}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </main>
  );
}
