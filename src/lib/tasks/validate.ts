import type { ActionResult, TaskInput } from "@/lib/types";

// Shared by the client (instant feedback) and server actions (the real check).
// Limits match the database constraints in supabase/migrations.

export const TITLE_MAX = 500;
export const DESCRIPTION_MAX = 50000;
export const ESTIMATE_MAX_MINUTES = 100000;
export const LIST_NAME_MAX = 100;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_PATTERN = /^(\d{2}):(\d{2})(?::(\d{2}))?$/;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function fail(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

function isValidDate(value: string) {
  const match = DATE_PATTERN.exec(value);
  if (!match) return false;
  const [, y, m, d] = match.map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  );
}

function isValidTime(value: string) {
  const match = TIME_PATTERN.exec(value);
  if (!match) return false;
  const [hours, minutes, seconds = 0] = match.slice(1).map((part) => Number(part ?? 0));
  return hours < 24 && minutes < 60 && seconds < 60;
}

export function validateTaskInput(raw: unknown): ActionResult<TaskInput> {
  if (typeof raw !== "object" || raw === null) return fail("That task isn't valid.");
  const input = raw as Record<string, unknown>;

  const title = typeof input.title === "string" ? input.title.trim() : "";
  if (!title) return fail("Add a title.");
  if (title.length > TITLE_MAX) return fail("Keep the title under 500 characters.");

  let description: string | null = null;
  if (typeof input.description === "string") {
    description = input.description.trim() || null;
    if (description && description.length > DESCRIPTION_MAX) {
      return fail("That description is too long.");
    }
  } else if (input.description != null) {
    return fail("That description isn't valid.");
  }

  let dueDate: string | null = null;
  if (typeof input.due_date === "string" && input.due_date !== "") {
    if (!isValidDate(input.due_date)) return fail("Pick a valid due date.");
    dueDate = input.due_date;
  } else if (input.due_date != null && input.due_date !== "") {
    return fail("Pick a valid due date.");
  }

  let dueTime: string | null = null;
  if (typeof input.due_time === "string" && input.due_time !== "") {
    if (!isValidTime(input.due_time)) return fail("Pick a valid time.");
    if (!dueDate) return fail("Pick a date for that time.");
    dueTime = input.due_time;
  } else if (input.due_time != null && input.due_time !== "") {
    return fail("Pick a valid time.");
  }

  if (input.agent_task != null && typeof input.agent_task !== "boolean") {
    return fail("That task isn't valid.");
  }
  const agentTask = input.agent_task === true;

  // Agent tasks aren't scheduled for the user, so any estimate is dropped.
  let estimate: number | null = null;
  if (!agentTask && input.estimate_minutes != null) {
    const value = input.estimate_minutes;
    if (
      typeof value !== "number" ||
      !Number.isInteger(value) ||
      value < 1 ||
      value > ESTIMATE_MAX_MINUTES
    ) {
      return fail("Enter an estimate between 1 minute and 1,666 hours.");
    }
    estimate = value;
  }

  return {
    ok: true,
    data: {
      title,
      description,
      due_date: dueDate,
      due_time: dueTime,
      estimate_minutes: estimate,
      agent_task: agentTask,
    },
  };
}

export function validateListName(raw: unknown): ActionResult<string> {
  const name = typeof raw === "string" ? raw.trim() : "";
  if (!name) return fail("Enter a list name.");
  if (name.length > LIST_NAME_MAX) return fail("Keep the name under 100 characters.");
  return { ok: true, data: name };
}
