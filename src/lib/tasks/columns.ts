export const ATTACHMENT_COLUMNS =
  "id, task_id, storage_path, file_name, mime_type, size_bytes, created_at";

export const TASK_COLUMNS = `id, list_id, title, description, due_date, due_time, estimate_minutes, agent_task, status, completed_at, created_at, attachments:task_attachments(${ATTACHMENT_COLUMNS})`;

export const LIST_COLUMNS = "id, name, is_default";

export const SETTINGS_COLUMNS =
  "time_zone, schedule_window_start, schedule_window_end, schedule_weekends, check_frequency_minutes, onboarded_at";
