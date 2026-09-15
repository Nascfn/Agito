"use client";

import { XIcon } from "./icons";

export type ToastItem = {
  id: number;
  message: string;
  undo?: () => void;
};

type Props = {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
};

/** Stacked so a new message never hides an earlier Undo. */
export function Toasts({ toasts, onDismiss }: Props) {
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex flex-col items-center gap-2 px-4"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="animate-toast-in pointer-events-auto flex items-center gap-2 rounded-xl border border-line-strong bg-surface py-1.5 pl-4 pr-1.5 text-sm shadow-2xl shadow-black/40"
        >
          <span className="pr-2">{toast.message}</span>
          {toast.undo && (
            <button
              type="button"
              onClick={() => {
                toast.undo?.();
                onDismiss(toast.id);
              }}
              className="rounded-lg px-3 py-2 font-medium text-accent-soft transition-colors hover:bg-surface-hover"
            >
              Undo
            </button>
          )}
          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            aria-label="Dismiss"
            className="rounded-lg p-2 text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink"
          >
            <XIcon className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
