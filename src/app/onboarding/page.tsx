import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DEFAULT_SETTINGS } from "@/lib/settings/rules";
import { createClient } from "@/lib/supabase/server";
import { SETTINGS_COLUMNS } from "@/lib/tasks/columns";
import type { UserSettings } from "@/lib/types";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = { title: "Set up" };

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) redirect("/login");

  const { data } = await supabase.from("user_settings").select(SETTINGS_COLUMNS).maybeSingle();
  const settings = data as unknown as UserSettings | null;

  const initial = settings
    ? {
        time_zone: settings.time_zone,
        schedule_window_start: settings.schedule_window_start.slice(0, 5),
        schedule_window_end: settings.schedule_window_end.slice(0, 5),
        schedule_weekends: settings.schedule_weekends,
        check_frequency_minutes: settings.check_frequency_minutes,
      }
    : { ...DEFAULT_SETTINGS, time_zone: null };

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 py-8">
      <span className="flex items-center gap-2 text-[15px] font-medium">
        <span className="size-2.5 rounded-[3px] bg-accent-soft" aria-hidden="true" />
        Agito
      </span>
      <h1 className="mt-8 text-2xl font-medium">Set up Agito</h1>
      <p className="mt-2 text-sm text-ink-muted">
        These tell your agent when it can put tasks on your calendar and how often to check
        in. You can change them later.
      </p>
      <OnboardingForm initial={initial} />
    </main>
  );
}
