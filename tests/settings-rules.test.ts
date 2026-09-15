import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CHECK_FREQUENCIES,
  DEFAULT_SETTINGS,
  supportedTimeZones,
  validateSettings,
} from "../src/lib/settings/rules.ts";

const valid = {
  time_zone: "America/New_York",
  schedule_window_start: "09:00",
  schedule_window_end: "21:00",
  schedule_weekends: true,
  check_frequency_minutes: 60,
};

describe("supportedTimeZones", () => {
  it("includes real zones and UTC", () => {
    const zones = supportedTimeZones();
    assert.ok(zones.includes("America/New_York"));
    assert.ok(zones.includes("Europe/London"));
    assert.ok(zones.includes("UTC"));
    assert.ok(!zones.includes("Not/AZone"));
  });
});

describe("validateSettings", () => {
  it("accepts valid settings", () => {
    assert.deepEqual(validateSettings(valid), { ok: true, data: valid });
  });

  it("matches the defaults users start with", () => {
    assert.equal(validateSettings({ ...DEFAULT_SETTINGS, time_zone: "UTC" }).ok, true);
  });

  it("only accepts time zones from the list", () => {
    assert.equal(validateSettings({ ...valid, time_zone: "UTC" }).ok, true);
    assert.equal(validateSettings({ ...valid, time_zone: "Not/AZone" }).ok, false);
    assert.equal(validateSettings({ ...valid, time_zone: "" }).ok, false);
    assert.equal(validateSettings({ ...valid, time_zone: null }).ok, false);
  });

  it("accepts other names for real zones and saves the runtime's name", () => {
    // Firefox says Asia/Kolkata; Node/Chrome may say Asia/Calcutta.
    const result = validateSettings({ ...valid, time_zone: "Asia/Kolkata" });
    assert.equal(result.ok, true);
    assert.equal(
      result.ok && result.data.time_zone,
      new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kolkata" }).resolvedOptions().timeZone,
    );
    assert.equal(validateSettings({ ...valid, time_zone: "Europe/Kyiv" }).ok, true);
  });

  it("rejects offsets and malformed zone names", () => {
    for (const zone of ["+05:00", "UTC+5", "../etc", "America/", "Not/AZone"]) {
      assert.equal(validateSettings({ ...valid, time_zone: zone }).ok, false, zone);
    }
  });

  it("allows overnight and all-day windows", () => {
    assert.equal(
      validateSettings({ ...valid, schedule_window_start: "22:00", schedule_window_end: "06:00" }).ok,
      true,
    );
    assert.equal(
      validateSettings({ ...valid, schedule_window_start: "08:00", schedule_window_end: "08:00" }).ok,
      true,
    );
  });

  it("rejects malformed times", () => {
    for (const time of ["9:00", "24:00", "12:60", "noon", ""]) {
      assert.equal(validateSettings({ ...valid, schedule_window_start: time }).ok, false, time);
    }
  });

  it("requires a real boolean for weekends", () => {
    assert.equal(validateSettings({ ...valid, schedule_weekends: "true" }).ok, false);
  });

  it("only accepts the offered check frequencies", () => {
    for (const option of CHECK_FREQUENCIES) {
      assert.equal(
        validateSettings({ ...valid, check_frequency_minutes: option.minutes }).ok,
        true,
        String(option.minutes),
      );
    }
    assert.equal(validateSettings({ ...valid, check_frequency_minutes: 45 }).ok, false);
    assert.equal(validateSettings({ ...valid, check_frequency_minutes: "60" }).ok, false);
  });
});
