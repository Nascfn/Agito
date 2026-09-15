import { recordAttachment } from "@/app/actions/attachments";
import { createClient } from "@/lib/supabase/client";
import type { ActionResult, Attachment } from "@/lib/types";
import { newId } from "@/lib/uuid";
import { ATTACHMENTS_BUCKET, checkFile } from "./rules";

/**
 * Uploads a file straight from the browser to Supabase Storage (files are too
 * large for server actions), then records it. Storage policies only allow
 * uploads into the user's own task folders.
 */
export async function uploadAttachment(
  userId: string,
  taskId: string,
  file: File,
): Promise<ActionResult<Attachment>> {
  const checked = checkFile(file.name, file.size);
  if (!checked.ok) return checked;

  const id = newId();
  const storagePath = `${userId}/${taskId}/${id}.${checked.data.extension}`;
  const storage = createClient().storage.from(ATTACHMENTS_BUCKET);

  const { error } = await storage.upload(storagePath, file, {
    contentType: checked.data.mimeType,
    upsert: false,
  });
  if (error) {
    console.error("Failed to upload file:", error.message);
    return { ok: false, error: `Couldn't upload ${file.name}. Try again.` };
  }

  const result = await recordAttachment({
    id,
    taskId,
    storagePath,
    fileName: file.name,
    sizeBytes: file.size,
  });

  // Don't leave an unrecorded file behind.
  if (!result.ok) await storage.remove([storagePath]);
  return result;
}
