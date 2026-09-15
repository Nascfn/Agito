// Mirrors supabase/migrations. Update both together.

export type TaskStatus = "todo" | "done";

export type List = {
  id: string;
  name: string;
  is_default: boolean;
};

export type Task = {
  id: string;
  list_id: string;
  title: string;
  description: string | null;
  /** YYYY-MM-DD */
  due_date: string | null;
  /** HH:MM:SS */
  due_time: string | null;
  estimate_minutes: number | null;
  /** "Agent: do this" — the agent works on it; no estimate or scheduling. */
  agent_task: boolean;
  status: TaskStatus;
  completed_at: string | null;
  created_at: string;
};

/** The fields a user sets when creating or editing a task. */
export type TaskInput = Pick<
  Task,
  "title" | "description" | "due_date" | "due_time" | "estimate_minutes" | "agent_task"
>;

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };
