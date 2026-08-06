import { strictEqual } from "node:assert";
import { test } from "node:test";

// date-fns formats in the process's local timezone. Fixed here so the
// expected strings below don't depend on where this happens to run —
// otherwise this suite would pass in UTC-run CI and fail on an IST machine
// (or vice versa) purely from a timezone mismatch, not a real bug.
process.env.TZ = "UTC";

import {
  formatBytes,
  formatDate,
  formatDateTime,
  reporterLabel,
} from "./format.ts";

test("formatDate: formats a valid ISO date", () => {
  strictEqual(formatDate("2026-08-06T10:00:00.000Z"), "Aug 6, 2026");
});

test("formatDate: returns an em dash for null/undefined/invalid input", () => {
  strictEqual(formatDate(null), "—");
  strictEqual(formatDate(undefined), "—");
  strictEqual(formatDate("not-a-date"), "—");
});

test("formatDateTime: includes the time", () => {
  strictEqual(formatDateTime("2026-08-06T09:15:00.000Z"), "Aug 6, 09:15 AM");
});

test("formatBytes: sub-KB stays in bytes", () => {
  strictEqual(formatBytes(512), "512 B");
});

test("formatBytes: KB range", () => {
  strictEqual(formatBytes(1536), "1.5 KB");
});

test("formatBytes: MB range", () => {
  strictEqual(formatBytes(1.4 * 1024 * 1024), "1.4 MB");
});

test("reporterLabel: anonymous complaint with no name shows \"Anonymous\", not \"Unknown\"", () => {
  // v_complaints nulls created_by for everyone except the reporter, so a null
  // name on an anonymous complaint is the privacy feature working — it must
  // read as an intentional choice, not missing/broken data.
  strictEqual(reporterLabel(null, true), "Anonymous");
});

test("reporterLabel: non-anonymous complaint with a missing name shows \"Unknown\"", () => {
  strictEqual(reporterLabel(null, false), "Unknown");
});

test("reporterLabel: a real name is shown regardless of anonymity", () => {
  strictEqual(reporterLabel("Rahul Sharma", false), "Rahul Sharma");
  strictEqual(reporterLabel("Rahul Sharma", true), "Rahul Sharma");
});

test("reporterLabel: whitespace-only name is treated as missing", () => {
  strictEqual(reporterLabel("   ", false), "Unknown");
});
