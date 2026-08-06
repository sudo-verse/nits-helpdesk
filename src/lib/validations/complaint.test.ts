import { strictEqual } from "node:assert";
import { test } from "node:test";

import {
  commentSchema,
  complaintSchema,
  feedbackSchema,
  validateFile,
} from "./complaint.ts";

const VALID_UUID = "da602d93-848e-4820-aad9-7f392eed9129";

function validComplaint(overrides: Record<string, unknown> = {}) {
  return {
    title: "LAN not working in room 204",
    description: "The ethernet port has had no signal since yesterday evening.",
    departmentId: VALID_UUID,
    priority: "medium",
    ...overrides,
  };
}

test("complaintSchema: accepts a well-formed complaint", () => {
  strictEqual(complaintSchema.safeParse(validComplaint()).success, true);
});

test("complaintSchema: rejects a too-short title", () => {
  strictEqual(complaintSchema.safeParse(validComplaint({ title: "hi" })).success, false);
});

test("complaintSchema: rejects a too-short description", () => {
  strictEqual(
    complaintSchema.safeParse(validComplaint({ description: "short" })).success,
    false,
  );
});

test("complaintSchema: rejects an invalid priority", () => {
  strictEqual(
    complaintSchema.safeParse(validComplaint({ priority: "urgent" })).success,
    false,
  );
});

test("complaintSchema: requires a real department id, not an arbitrary string", () => {
  strictEqual(
    complaintSchema.safeParse(validComplaint({ departmentId: "not-a-uuid" })).success,
    false,
  );
});

test("complaintSchema: isAnonymous coerces the \"on\"/absent checkbox pattern", () => {
  const checked = complaintSchema.safeParse(validComplaint({ isAnonymous: true }));
  strictEqual(checked.success, true);
  if (checked.success) strictEqual(checked.data.isAnonymous, true);

  const defaulted = complaintSchema.safeParse(validComplaint());
  strictEqual(defaulted.success, true);
  if (defaulted.success) strictEqual(defaulted.data.isAnonymous, false);
});

test("commentSchema: rejects an empty body", () => {
  strictEqual(
    commentSchema.safeParse({ complaintId: VALID_UUID, body: "   " }).success,
    false,
  );
});

test("commentSchema: isInternal defaults false", () => {
  const result = commentSchema.safeParse({ complaintId: VALID_UUID, body: "Update sent." });
  strictEqual(result.success, true);
  if (result.success) strictEqual(result.data.isInternal, false);
});

test("feedbackSchema: rating must be 1-5", () => {
  strictEqual(
    feedbackSchema.safeParse({ complaintId: VALID_UUID, rating: 0 }).success,
    false,
  );
  strictEqual(
    feedbackSchema.safeParse({ complaintId: VALID_UUID, rating: 6 }).success,
    false,
  );
  strictEqual(
    feedbackSchema.safeParse({ complaintId: VALID_UUID, rating: 5 }).success,
    true,
  );
});

test("feedbackSchema: rating coerces a string from form data", () => {
  const result = feedbackSchema.safeParse({ complaintId: VALID_UUID, rating: "4" });
  strictEqual(result.success, true);
  if (result.success) strictEqual(result.data.rating, 4);
});

test("validateFile: accepts an allowed type under the size limit", () => {
  const file = new File(["x"], "photo.jpg", { type: "image/jpeg" });
  strictEqual(validateFile(file), null);
});

test("validateFile: rejects a disallowed MIME type — the declared type is attacker-controlled", () => {
  const file = new File(["x"], "payload.exe", { type: "application/x-msdownload" });
  strictEqual(validateFile(file) !== null, true);
});

test("validateFile: rejects a file over 10 MB", () => {
  const bigFile = new File([new Uint8Array(11 * 1024 * 1024)], "big.jpg", {
    type: "image/jpeg",
  });
  strictEqual(validateFile(bigFile) !== null, true);
});

test("validateFile: a renamed executable is still caught by MIME type, not extension", () => {
  // "photo.png.exe" — filename alone must never be trusted, only the type.
  const file = new File(["x"], "photo.png.exe", { type: "application/x-msdownload" });
  strictEqual(validateFile(file) !== null, true);
});
