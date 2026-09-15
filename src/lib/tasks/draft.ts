import type { ActionResult, Task, TaskInput } from "@/lib/types";
import { validateTaskInput } from "./validate";

export type EstimateUnit = "min" | "hr";

/** Form state for creating or editing a task — strings, as the inputs hold them. */
export type TaskDraft = {
  title: string;
  description: string;
  dueDate: string;
  dueTime: string;
  estimate: string;
  estimateUnit: EstimateUnit;
  agentTask: boolean;
};

export const emptyDraft: TaskDraft = {
  title: "",
  description: "",
  dueDate: "",
  dueTime: "",
  estimate: "",
  estimateUnit: "min",
  agentTask: false,
};

export function draftFromTask(task: Task): TaskDraft {
  const minutes = task.estimate_minutes;
  const inHours = minutes != null && minutes >= 60 && minutes % 30 === 0;

  return {
    title: task.title,
    description: task.description ?? "",
    dueDate: task.due_date ?? "",
    dueTime: task.due_time?.slice(0, 5) ?? "",
    estimate: minutes == null ? "" : String(inHours ? minutes / 60 : minutes),
    estimateUnit: inHours ? "hr" : "min",
    agentTask: task.agent_task,
  };
}

export function draftToInput(draft: TaskDraft): ActionResult<TaskInput> {
  let estimateMinutes: number | null = null;
  const estimate = draft.estimate.trim();

  if (estimate && !draft.agentTask) {
    const value = Number(estimate);
    if (!Number.isFinite(value) || value <= 0) {
      return { ok: false, error: "Enter an estimate above zero." };
    }
    estimateMinutes = Math.max(
      1,
      Math.round(draft.estimateUnit === "hr" ? value * 60 : value),
    );
  }

  return validateTaskInput({
    title: draft.title,
    description: draft.description,
    due_date: draft.dueDate,
    due_time: draft.dueTime,
    estimate_minutes: estimateMinutes,
    agent_task: draft.agentTask,
  });
}
