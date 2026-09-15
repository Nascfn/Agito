"use client";

import { useId, useRef, useState, type DragEvent } from "react";
import { ACCEPT_ATTRIBUTE, checkFile } from "@/lib/attachments/rules";
import { UploadIcon } from "./icons";

type Props = {
  onFiles: (files: File[]) => void;
  /** Messages for files that were rejected (empty when all were accepted). */
  onRejected: (messages: string[]) => void;
  tone: "canvas" | "surface";
};

/** Drop area plus a native file picker, filtered to allowed types and sizes. */
export function FileDrop({ onFiles, onRejected, tone }: Props) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function take(list: FileList | null) {
    if (!list || list.length === 0) return;
    const accepted: File[] = [];
    const rejected: string[] = [];
    for (const file of Array.from(list)) {
      const result = checkFile(file.name, file.size);
      if (result.ok) accepted.push(file);
      else rejected.push(result.error);
    }
    if (accepted.length > 0) onFiles(accepted);
    onRejected(rejected);
    // Allow picking the same file again.
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    take(event.dataTransfer.files);
  }

  return (
    <label
      htmlFor={inputId}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`flex cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-dashed px-3 py-3 text-sm transition-colors focus-within:ring-2 focus-within:ring-accent-strong ${
        dragging
          ? "border-accent bg-accent-strong/20 text-ink"
          : `border-accent-strong text-ink-muted hover:text-ink ${tone === "canvas" ? "bg-canvas" : "bg-surface"}`
      }`}
    >
      <UploadIcon className="size-4" />
      <span>
        Drop files or <span className="text-accent-soft">browse</span>
      </span>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        multiple
        accept={ACCEPT_ATTRIBUTE}
        onChange={(event) => take(event.target.files)}
        className="sr-only"
      />
    </label>
  );
}
