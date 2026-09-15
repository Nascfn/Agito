"use client";

import { useActionState } from "react";
import { sendMagicLink, type LoginState } from "./actions";

const initialState: LoginState = { status: "idle" };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(sendMagicLink, initialState);

  if (state.status === "sent") {
    return (
      <p className="mt-6 rounded-[10px] border border-accent-strong bg-surface px-3 py-3 text-sm text-accent-soft">
        {state.message}
      </p>
    );
  }

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-3">
      <label htmlFor="email" className="text-sm text-ink-muted">
        Email
      </label>
      <input
        id="email"
        name="email"
        type="email"
        required
        autoComplete="email"
        autoFocus
        placeholder="you@example.com"
        className="rounded-[10px] bg-surface px-3 py-2.5 text-[15px] outline-none placeholder:text-ink-muted focus:ring-2 focus:ring-accent-strong"
      />
      {state.status === "error" && <p className="text-sm text-due">{state.message}</p>}
      <button
        type="submit"
        className="mt-1 rounded-[10px] bg-accent px-4 py-2.5 font-medium text-white transition hover:bg-accent-hover active:scale-[0.98]"
      >
        {pending ? "Sending…" : "Send magic link"}
      </button>
    </form>
  );
}
