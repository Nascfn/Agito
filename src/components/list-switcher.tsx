"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { createList } from "@/app/actions/lists";
import { LIST_NAME_MAX, validateListName } from "@/lib/tasks/validate";
import type { List } from "@/lib/types";
import { CheckIcon, ChevronDownIcon } from "./icons";

type Props = {
  lists: List[];
  currentList: List;
};

export function ListSwitcher({ lists, currentList }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = validateListName(name);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }

    startTransition(async () => {
      const result = await createList(parsed.data);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setName("");
      router.push(`/?list=${result.data.id}`);
    });
  }

  return (
    <details className="relative">
      <summary className="flex cursor-pointer list-none items-center gap-1 rounded-lg px-2.5 py-2 text-sm text-ink-muted transition-colors hover:bg-surface hover:text-ink [&::-webkit-details-marker]:hidden">
        <span className="max-w-40 truncate">{currentList.name}</span>
        <ChevronDownIcon className="size-4" />
      </summary>

      <div className="absolute right-0 z-20 mt-1 w-64 rounded-xl border border-line-strong bg-surface p-1.5 shadow-2xl shadow-black/40">
        <ul>
          {lists.map((list) => {
            const active = list.id === currentList.id;
            return (
              <li key={list.id}>
                <Link
                  href={list.is_default ? "/" : `/?list=${list.id}`}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-surface-hover ${
                    active ? "text-ink" : "text-ink-muted"
                  }`}
                >
                  <span className="truncate">{list.name}</span>
                  {active && <CheckIcon className="size-4 shrink-0 text-accent-soft" />}
                </Link>
              </li>
            );
          })}
        </ul>

        <form onSubmit={submit} className="mt-1 border-t border-line px-1.5 pb-1.5 pt-2.5">
          <label htmlFor="new-list-name" className="sr-only">
            New list name
          </label>
          <div className="flex gap-1.5">
            <input
              id="new-list-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              maxLength={LIST_NAME_MAX}
              placeholder="New list"
              autoComplete="off"
              className="min-w-0 flex-1 rounded-lg bg-canvas px-2.5 py-2 text-sm outline-none placeholder:text-ink-muted focus:ring-2 focus:ring-accent-strong"
            />
            <button
              type="submit"
              className="rounded-lg bg-accent px-3 text-sm font-medium text-white transition hover:bg-accent-hover"
            >
              {pending ? "Adding…" : "Add"}
            </button>
          </div>
          {error && <p className="mt-1.5 px-1 text-xs text-due">{error}</p>}
        </form>
      </div>
    </details>
  );
}
