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
  attachments: Attachment[];
};

export type Attachment = {
  id: string;
  task_id: string;
  /** <user_id>/<task_id>/<attachment_id>.<extension> in the task-attachments bucket */
  storage_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
};

/** The fields a user sets when creating or editing a task. */
export type TaskInput = Pick<
  Task,
  "title" | "description" | "due_date" | "due_time" | "estimate_minutes" | "agent_task"
>;

export type UserSettings = {
  /** IANA name, e.g. America/New_York. Null until onboarding. */
  time_zone: string | null;
  /** HH:MM:SS. End earlier than start means overnight; equal means all day. */
  schedule_window_start: string;
  schedule_window_end: string;
  schedule_weekends: boolean;
  check_frequency_minutes: number;
  onboarded_at: string | null;
};

/** The settings a user picks during onboarding. Times are HH:MM. */
export type SettingsInput = {
  time_zone: string;
  schedule_window_start: string;
  schedule_window_end: string;
  schedule_weekends: boolean;
  check_frequency_minutes: number;
};

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };
