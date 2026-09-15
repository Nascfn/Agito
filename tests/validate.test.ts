import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isUuid,
  validateListName,
  validateTaskInput,
} from "../src/lib/tasks/validate.ts";

function errorOf(result: { ok: boolean; error?: string }) {
  assert.equal(result.ok, false);
  return result.error;
}

describe("validateTaskInput", () => {
  it("accepts a title alone and fills the rest with defaults", () => {
    assert.deepEqual(validateTaskInput({ title: "  Pay rent  " }), {
      ok: true,
      data: {
        title: "Pay rent",
        description: null,
        due_date: null,
        due_time: null,
        estimate_minutes: null,
        agent_task: false,
      },
    });
  });

  it("requires a title within the limit", () => {
    assert.equal(errorOf(validateTaskInput({ title: "   " })), "Add a title.");
    assert.equal(validateTaskInput({ title: "x".repeat(500) }).ok, true);
    assert.equal(validateTaskInput({ title: "x".repeat(501) }).ok, false);
    assert.equal(validateTaskInput(null).ok, false);
  });

  it("turns a blank description into null", () => {
    const result = validateTaskInput({ title: "A", description: "  \n " });
    assert.equal(result.ok && result.data.description, null);
  });

  it("validates real calendar dates", () => {
    assert.equal(validateTaskInput({ title: "A", due_date: "2026-02-28" }).ok, true);
    assert.equal(validateTaskInput({ title: "A", due_date: "2028-02-29" }).ok, true);
    assert.equal(validateTaskInput({ title: "A", due_date: "2026-02-29" }).ok, false);
    assert.equal(validateTaskInput({ title: "A", due_date: "2026-13-01" }).ok, false);
    assert.equal(validateTaskInput({ title: "A", due_date: "tomorrow" }).ok, false);
  });

  it("requires a date for a time and a valid time", () => {
    assert.equal(
      errorOf(validateTaskInput({ title: "A", due_time: "09:00" })),
      "Pick a date for that time.",
    );
    assert.equal(validateTaskInput({ title: "A", due_date: "2026-09-15", due_time: "23:59" }).ok, true);
    assert.equal(validateTaskInput({ title: "A", due_date: "2026-09-15", due_time: "24:00" }).ok, false);
    assert.equal(validateTaskInput({ title: "A", due_date: "2026-09-15", due_time: "9am" }).ok, false);
  });

  it("accepts whole-minute estimates within range", () => {
    assert.equal(validateTaskInput({ title: "A", estimate_minutes: 90 }).ok, true);
    assert.equal(validateTaskInput({ title: "A", estimate_minutes: 0 }).ok, false);
    assert.equal(validateTaskInput({ title: "A", estimate_minutes: 1.5 }).ok, false);
    assert.equal(validateTaskInput({ title: "A", estimate_minutes: 100001 }).ok, false);
    assert.equal(validateTaskInput({ title: "A", estimate_minutes: "30" }).ok, false);
  });

  it("drops the estimate for agent tasks", () => {
    const result = validateTaskInput({ title: "A", agent_task: true, estimate_minutes: 30 });
    assert.equal(result.ok, true);
    assert.equal(result.ok && result.data.estimate_minutes, null);
    assert.equal(result.ok && result.data.agent_task, true);
  });

  it("rejects a non-boolean agent flag", () => {
    assert.equal(validateTaskInput({ title: "A", agent_task: "yes" }).ok, false);
  });
});

describe("isUuid", () => {
  it("accepts UUIDs only", () => {
    assert.equal(isUuid("3f2504e0-4f89-41d3-9a0c-0305e82c3301"), true);
    assert.equal(isUuid("not-a-uuid"), false);
    assert.equal(isUuid("3f2504e0-4f89-41d3-9a0c-0305e82c3301' or 1=1"), false);
    assert.equal(isUuid(42), false);
  });
});

describe("validateListName", () => {
  it("trims and limits list names", () => {
    assert.deepEqual(validateListName("  Errands "), { ok: true, data: "Errands" });
    assert.equal(validateListName("").ok, false);
    assert.equal(validateListName("x".repeat(101)).ok, false);
  });
});
