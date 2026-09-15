import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatDue,
  formatEstimate,
  formatTime,
  localDateKey,
} from "../src/lib/format.ts";

describe("localDateKey", () => {
  it("formats the local calendar date with zero padding", () => {
    assert.equal(localDateKey(new Date(2026, 0, 5)), "2026-01-05");
    assert.equal(localDateKey(new Date(2026, 11, 31, 23, 59)), "2026-12-31");
  });
});

describe("formatEstimate", () => {
  it("uses minutes under an hour", () => {
    assert.equal(formatEstimate(1), "1m");
    assert.equal(formatEstimate(30), "30m");
  });

  it("uses hours and leftover minutes", () => {
    assert.equal(formatEstimate(60), "1h");
    assert.equal(formatEstimate(90), "1h 30m");
    assert.equal(formatEstimate(125), "2h 5m");
  });
});

describe("formatTime", () => {
  it("drops :00 and uses am/pm", () => {
    assert.equal(formatTime("15:00:00"), "3pm");
    assert.equal(formatTime("09:30"), "9:30am");
    assert.equal(formatTime("12:05"), "12:05pm");
  });

  it("shows midnight as 12am", () => {
    assert.equal(formatTime("00:00"), "12am");
  });
});

describe("formatDue", () => {
  // 2026-09-15 is a Tuesday.
  const today = "2026-09-15";

  it("uses an absolute date before the viewer's date is known", () => {
    assert.deepEqual(formatDue("2026-10-03", null, null), { label: "Oct 3", overdue: false });
    assert.deepEqual(formatDue("2026-10-03", "15:00:00", null), {
      label: "Oct 3 3pm",
      overdue: false,
    });
  });

  it("uses relative words near today", () => {
    assert.deepEqual(formatDue("2026-09-15", null, today), { label: "Today", overdue: false });
    assert.deepEqual(formatDue("2026-09-16", "15:00:00", today), {
      label: "Tomorrow 3pm",
      overdue: false,
    });
    assert.deepEqual(formatDue("2026-09-14", null, today), { label: "Yesterday", overdue: true });
  });

  it("uses the weekday within the next week, then the date", () => {
    assert.deepEqual(formatDue("2026-09-18", null, today), { label: "Fri", overdue: false });
    assert.deepEqual(formatDue("2026-09-25", null, today), { label: "Sep 25", overdue: false });
    assert.deepEqual(formatDue("2026-09-01", null, today), { label: "Sep 1", overdue: true });
  });

  it("handles month and year boundaries and daylight saving changes", () => {
    assert.equal(formatDue("2027-01-01", null, "2026-12-31").label, "Tomorrow");
    assert.equal(formatDue("2026-03-09", null, "2026-03-08").label, "Tomorrow");
    assert.equal(formatDue("2026-11-02", null, "2026-11-01").label, "Tomorrow");
  });
});
