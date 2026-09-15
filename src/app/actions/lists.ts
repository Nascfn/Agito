"use server";

import { createClient } from "@/lib/supabase/server";
import { LIST_COLUMNS } from "@/lib/tasks/columns";
import { validateListName } from "@/lib/tasks/validate";
import type { ActionResult, List } from "@/lib/types";

export async function createList(name: unknown): Promise<ActionResult<List>> {
  const parsed = validateListName(name);
  if (!parsed.ok) return parsed;

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) {
    return { ok: false, error: "Your session expired. Sign in again." };
  }

  const { data, error } = await supabase
    .from("lists")
    .insert({ name: parsed.data })
    .select(LIST_COLUMNS)
    .single();

  if (error) {
    console.error("Failed to create list:", error.message);
    return { ok: false, error: "Couldn't create the list. Try again." };
  }

  return { ok: true, data: data as unknown as List };
}
