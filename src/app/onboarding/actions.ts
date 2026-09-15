"use server";

import { redirect } from "next/navigation";
import { validateSettings } from "@/lib/settings/rules";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult, SettingsInput } from "@/lib/types";

export async function saveOnboarding(input: unknown): Promise<ActionResult<null>> {
  // Validated against real time zones and allowed values, not just the form.
  const parsed = validateSettings(input);
  if (!parsed.ok) return parsed;

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (typeof userId !== "string") {
    return { ok: false, error: "Your session expired. Sign in again." };
  }

  const update: SettingsInput & { onboarded_at: string } = {
    ...parsed.data,
    onboarded_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("user_settings").update(update).eq("user_id", userId);

  if (error) {
    console.error("Failed to save onboarding:", error.message);
    return { ok: false, error: "Couldn't save your preferences. Try again." };
  }

  redirect("/");
}
