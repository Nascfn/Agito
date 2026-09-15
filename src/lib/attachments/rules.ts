import type { ActionResult } from "@/lib/types";

// Shared by the browser (instant feedback) and server actions (the real check).
// Must match the bucket settings and constraints in supabase/migrations.

export const ATTACHMENTS_BUCKET = "task-attachments";
export const MAX_FILE_BYTES = 50 * 1024 * 1024;
export const FILE_NAME_MAX = 255;

/** Allowed extensions and the content type each file is stored with. */
const TYPES_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  heic: "image/heic",
  heif: "image/heif",
  txt: "text/plain",
  md: "text/markdown",
  csv: "text/csv",
  json: "application/json",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

/** Types browsers can show safely in a new tab; everything else downloads. */
const PREVIEWABLE_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "text/plain",
]);

export const ACCEPT_ATTRIBUTE = Object.keys(TYPES_BY_EXTENSION)
  .map((extension) => `.${extension}`)
  .join(",");

export function extensionOf(fileName: string) {
  const match = /\.([a-z0-9]+)$/i.exec(fileName);
  return match ? match[1].toLowerCase() : null;
}

/**
 * Checks a file by name and size. The content type comes from the extension,
 * never from what the browser reports.
 */
export function checkFile(
  fileName: string,
  size: number,
): ActionResult<{ extension: string; mimeType: string }> {
  const extension = extensionOf(fileName);
  const mimeType = extension ? TYPES_BY_EXTENSION[extension] : undefined;

  if (!extension || !mimeType) {
    return { ok: false, error: `${fileName} isn't a supported file type.` };
  }
  if (fileName.length > FILE_NAME_MAX) {
    return { ok: false, error: "That file name is too long. Rename it and try again." };
  }
  if (!Number.isInteger(size) || size <= 0) {
    return { ok: false, error: `${fileName} is empty.` };
  }
  if (size > MAX_FILE_BYTES) {
    return { ok: false, error: `${fileName} is over 50 MB.` };
  }
  return { ok: true, data: { extension, mimeType } };
}

export function isPreviewable(mimeType: string) {
  return PREVIEWABLE_TYPES.has(mimeType);
}

/** "820 KB", "4.2 MB" */
export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
