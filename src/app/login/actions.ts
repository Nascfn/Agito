"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type LoginState = {
  status: "idle" | "sent" | "error";
  message?: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function sendMagicLink(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();

  if (!EMAIL_PATTERN.test(email) || email.length > 320) {
    return { status: "error", message: "Enter a valid email address." };
  }

  // Prefer the configured site URL. Supabase also only redirects to URLs on the
  // project's allowlist, so a spoofed Origin header can't redirect elsewhere.
  // In production the site URL must be configured, never taken from the request.
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const siteUrl =
    configuredUrl ||
    (process.env.NODE_ENV === "production" ? null : (await headers()).get("origin"));
  if (!siteUrl) {
    if (!configuredUrl) console.error("NEXT_PUBLIC_SITE_URL is not set.");
    return { status: "error", message: "Couldn't send the link. Please try again in a minute." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${siteUrl.replace(/\/$/, "")}/auth/confirm` },
  });

  if (error) {
    // Don't leak internal details; log them on the server instead.
    console.error("Magic link error:", error.message);
    return {
      status: "error",
      message: "Couldn't send the link. Please try again in a minute.",
    };
  }

  return { status: "sent", message: `Check ${email} for your sign-in link.` };
}
