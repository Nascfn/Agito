import { redirect } from "next/navigation";
import { TaskBoard } from "@/components/task-board";
import { createClient } from "@/lib/supabase/server";
import { LIST_COLUMNS, TASK_COLUMNS } from "@/lib/tasks/columns";
import type { List, Task } from "@/lib/types";

// Load open tasks plus anything finished recently; the browser narrows that
// to "Done today" in the viewer's own time zone.
function recentlyCompletedSince() {
  return new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString();
}

export default async function Home({ searchParams }: PageProps<"/">) {
  const { list: listParam } = await searchParams;
  const supabase = await createClient();

  // getClaims verifies the JWT; don't trust getSession() on the server.
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) redirect("/login");

  const { data: listRows, error: listError } = await supabase
    .from("lists")
    .select(LIST_COLUMNS)
    .order("is_default", { ascending: false })
    .order("created_at");

  const lists = (listRows ?? []) as unknown as List[];

  if (listError || lists.length === 0) {
    if (listError) console.error("Failed to load lists:", listError.message);
    return (
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 py-10">
        <h1 className="text-2xl font-medium">Agito isn&apos;t ready yet</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Your lists couldn&apos;t be loaded. Check that the database migration has run, then
          reload.
        </p>
      </main>
    );
  }

  const requestedId = typeof listParam === "string" ? listParam : undefined;
  const currentList =
    lists.find((list) => list.id === requestedId) ??
    lists.find((list) => list.is_default) ??
    lists[0];

  const { data: taskRows, error: taskError } = await supabase
    .from("tasks")
    .select(TASK_COLUMNS)
    .eq("list_id", currentList.id)
    .or(`status.eq.todo,completed_at.gte."${recentlyCompletedSince()}"`)
    .order("created_at", { ascending: false });

  if (taskError) console.error("Failed to load tasks:", taskError.message);

  return (
    <TaskBoard
      key={currentList.id}
      lists={lists}
      currentList={currentList}
      initialTasks={(taskRows ?? []) as unknown as Task[]}
    />
  );
}
