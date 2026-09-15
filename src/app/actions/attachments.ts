"use server";

import { createClient } from "@/lib/supabase/server";
import { ATTACHMENTS_BUCKET, checkFile, isPreviewable } from "@/lib/attachments/rules";
import { ATTACHMENT_COLUMNS } from "@/lib/tasks/columns";
import { isUuid } from "@/lib/tasks/validate";
import type { ActionResult, Attachment } from "@/lib/types";

// Arguments arrive from the browser, so every one is validated here.
// Row Level Security and storage policies still enforce ownership.

const SIGNED_URL_SECONDS = 10 * 60;

const signedOut = { ok: false as const, error: "Your session expired. Sign in again." };
const notFound = { ok: false as const, error: "That file couldn't be found." };

async function signedIn() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  return typeof userId === "string" ? { supabase, userId } : null;
}

export async function recordAttachment(input: unknown): Promise<ActionResult<Attachment>> {
  if (typeof input !== "object" || input === null) return notFound;
  const { id, taskId, storagePath, fileName, sizeBytes } = input as Record<string, unknown>;

  if (!isUuid(id) || !isUuid(taskId) || typeof fileName !== "string") return notFound;
  const checked = checkFile(fileName, typeof sizeBytes === "number" ? sizeBytes : 0);
  if (!checked.ok) return checked;

  const session = await signedIn();
  if (!session) return signedOut;

  // The path must be exactly where the browser was supposed to upload it.
  const expectedPath = `${session.userId}/${taskId}/${id}.${checked.data.extension}`;
  if (storagePath !== expectedPath) return notFound;

  const { data, error } = await session.supabase
    .from("task_attachments")
    .insert({
      id,
      task_id: taskId,
      storage_path: expectedPath,
      file_name: fileName,
      mime_type: checked.data.mimeType,
      size_bytes: sizeBytes,
    })
    .select(ATTACHMENT_COLUMNS)
    .single();

  if (error) {
    console.error("Failed to record attachment:", error.message);
    return { ok: false, error: `Couldn't save ${fileName}. Try again.` };
  }
  return { ok: true, data: data as unknown as Attachment };
}

/** Short-lived links for a task's files. Previewable types open in the browser; others download. */
export async function getAttachmentUrls(
  taskId: unknown,
): Promise<ActionResult<Record<string, string>>> {
  if (!isUuid(taskId)) return notFound;

  const session = await signedIn();
  if (!session) return signedOut;

  const { data, error } = await session.supabase
    .from("task_attachments")
    .select(ATTACHMENT_COLUMNS)
    .eq("task_id", taskId);

  if (error) {
    console.error("Failed to load attachments:", error.message);
    return { ok: false, error: "Couldn't load files. Try again." };
  }

  const storage = session.supabase.storage.from(ATTACHMENTS_BUCKET);
  const urls: Record<string, string> = {};

  await Promise.all(
    (data as unknown as Attachment[]).map(async (attachment) => {
      const { data: signed, error: signError } = await storage.createSignedUrl(
        attachment.storage_path,
        SIGNED_URL_SECONDS,
        isPreviewable(attachment.mime_type) ? undefined : { download: attachment.file_name },
      );
      if (signed) urls[attachment.id] = signed.signedUrl;
      else console.error("Failed to sign file URL:", signError?.message);
    }),
  );

  return { ok: true, data: urls };
}

export async function deleteAttachment(id: unknown): Promise<ActionResult<null>> {
  if (!isUuid(id)) return notFound;

  const session = await signedIn();
  if (!session) return signedOut;

  const { data, error } = await session.supabase
    .from("task_attachments")
    .delete()
    .eq("id", id)
    .select("storage_path")
    .maybeSingle();

  if (error) {
    console.error("Failed to delete attachment:", error.message);
    return { ok: false, error: "Couldn't remove the file. Try again." };
  }

  if (data) {
    const { error: storageError } = await session.supabase.storage
      .from(ATTACHMENTS_BUCKET)
      .remove([data.storage_path as string]);
    // The record is gone either way; log so an orphaned file can be cleaned up.
    if (storageError) console.error("Failed to remove stored file:", storageError.message);
  }

  return { ok: true, data: null };
}
