import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <span className="flex items-center gap-2 text-[15px] font-medium">
          <span className="size-2.5 rounded-[3px] bg-accent-soft" aria-hidden="true" />
          Agito
        </span>
        <h1 className="mt-8 text-2xl font-medium">Sign in</h1>
        <p className="mt-2 text-sm text-ink-muted">
          We&apos;ll email you a link. No password needed.
        </p>
        {error === "link" && (
          <p className="mt-4 rounded-[10px] bg-due-bg px-3 py-2.5 text-sm text-due">
            That link is invalid or expired. Request a new one.
          </p>
        )}
        <LoginForm />
      </div>
    </main>
  );
}
