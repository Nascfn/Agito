"use server";

import type { PostgrestError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { TASK_COLUMNS } from "@/lib/tasks/columns";
import { isUuid, validateTaskInput } from "@/lib/tasks/validate";
import type { ActionResult, Task, TaskStatus } from "@/lib/types";

// Arguments arrive from the browser, so every one is validated here.
// Row Level Security still enforces ownership in the database.

async function signedInClient() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims ? supabase : null;
}

function failure(action: string, error: PostgrestError, message: string) {
  // Log details on the server; never send raw database errors to the browser.
  console.error(`Failed to ${action}:`, error.message);
  return { ok: false as const, error: message };
}

const signedOut = { ok: false as const, error: "Your session expired. Sign in again." };
const invalidTask = { ok: false as const, error: "That task couldn't be found." };

export async function createTask(
  id: unknown,
  listId: unknown,
  input: unknown,
): Promise<ActionResult<Task>> {
  if (!isUuid(id) || !isUuid(listId)) return invalidTask;
  const parsed = validateTaskInput(input);
  if (!parsed.ok) return parsed;

  const supabase = await signedInClient();
  if (!supabase) return signedOut;

  const { data, error } = await supabase
    .from("tasks")
    .insert({ id, list_id: listId, ...parsed.data })
    .select(TASK_COLUMNS)
    .single();

  if (error) return failure("create task", error, "Couldn't add the task. Try again.");
  return { ok: true, data: data as unknown as Task };
}

export async function updateTask(
  id: unknown,
  input: unknown,
): Promise<ActionResult<Task>> {
  if (!isUuid(id)) return invalidTask;
  const parsed = validateTaskInput(input);
  if (!parsed.ok) return parsed;

  const supabase = await signedInClient();
  if (!supabase) return signedOut;

  const { data, error } = await supabase
    .from("tasks")
    .update(parsed.data)
    .eq("id", id)
    .select(TASK_COLUMNS)
    .single();

  if (error) return failure("update task", error, "Couldn't save your changes. Try again.");
  return { ok: true, data: data as unknown as Task };
}

export async function setTaskStatus(
  id: unknown,
  status: unknown,
): Promise<ActionResult<Task>> {
  if (!isUuid(id)) return invalidTask;
  if (status !== "todo" && status !== "done") {
    return { ok: false, error: "That status isn't valid." };
  }

  const supabase = await signedInClient();
  if (!supabase) return signedOut;

  // completed_at is set by a database trigger.
  const { data, error } = await supabase
    .from("tasks")
    .update({ status: status satisfies TaskStatus })
    .eq("id", id)
    .select(TASK_COLUMNS)
    .single();

  if (error) return failure("update task status", error, "Couldn't update the task. Try again.");
  return { ok: true, data: data as unknown as Task };
}

export async function deleteTask(id: unknown): Promise<ActionResult<null>> {
  if (!isUuid(id)) return invalidTask;

  const supabase = await signedInClient();
  if (!supabase) return signedOut;

  const { error } = await supabase.from("tasks").delete().eq("id", id);

  if (error) return failure("delete task", error, "Couldn't delete the task. Try again.");
  return { ok: true, data: null };
}
