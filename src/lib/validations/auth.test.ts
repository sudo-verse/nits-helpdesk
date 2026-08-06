import { strictEqual } from "node:assert";
import { test } from "node:test";

import {
  instituteEmailSchema,
  onboardingSchema,
  signInSchema,
  signUpSchema,
} from "./auth.ts";

test("instituteEmailSchema: accepts the bare institute domain", () => {
  strictEqual(instituteEmailSchema.safeParse("rahul@nits.ac.in").success, true);
});

test("instituteEmailSchema: accepts institute subdomains (students, department subdomains)", () => {
  strictEqual(instituteEmailSchema.safeParse("rahul@students.nits.ac.in").success, true);
  strictEqual(instituteEmailSchema.safeParse("dev1@ee.nits.ac.in").success, true);
});

test("instituteEmailSchema: rejects a personal domain", () => {
  strictEqual(instituteEmailSchema.safeParse("rahul@gmail.com").success, false);
});

test("instituteEmailSchema: rejects a lookalike domain — nits.ac.in as a subdomain of an attacker's own", () => {
  // The regex is end-anchored specifically so "nits.ac.in.attacker.com" can't
  // pass by containing the right substring — this is exactly probe 1c in
  // supabase/tests/rls_probes.sql, mirrored here so a regression is caught
  // without spinning up a database.
  strictEqual(instituteEmailSchema.safeParse("rahul@nits.ac.in.attacker.com").success, false);
});

test("instituteEmailSchema: rejects a prefix lookalike", () => {
  strictEqual(instituteEmailSchema.safeParse("rahul@notnits.ac.in").success, false);
});

test("instituteEmailSchema: lowercases and trims", () => {
  const result = instituteEmailSchema.safeParse("  Rahul@NITS.AC.IN  ");
  strictEqual(result.success, true);
  if (result.success) strictEqual(result.data, "rahul@nits.ac.in");
});

test("instituteEmailSchema: rejects malformed addresses", () => {
  strictEqual(instituteEmailSchema.safeParse("not-an-email").success, false);
  strictEqual(instituteEmailSchema.safeParse("").success, false);
});

test("signInSchema: any non-empty password is accepted (existing accounts may predate the app's own policy)", () => {
  strictEqual(
    signInSchema.safeParse({ email: "a@nits.ac.in", password: "x" }).success,
    true,
  );
  strictEqual(
    signInSchema.safeParse({ email: "a@nits.ac.in", password: "" }).success,
    false,
  );
});

test("signUpSchema: enforces the 8-character minimum", () => {
  strictEqual(
    signUpSchema.safeParse({
      email: "a@nits.ac.in",
      password: "short1",
      confirmPassword: "short1",
    }).success,
    false,
  );
  strictEqual(
    signUpSchema.safeParse({
      email: "a@nits.ac.in",
      password: "longenough1",
      confirmPassword: "longenough1",
    }).success,
    true,
  );
});

test("signUpSchema: rejects mismatched passwords and flags the confirm field", () => {
  const result = signUpSchema.safeParse({
    email: "a@nits.ac.in",
    password: "longenough1",
    confirmPassword: "different1",
  });
  strictEqual(result.success, false);
  if (!result.success) {
    strictEqual(result.error.issues[0]?.path.join("."), "confirmPassword");
  }
});

test("onboardingSchema: optional fields accept empty string (always-present-but-blank form inputs)", () => {
  const result = onboardingSchema.safeParse({
    name: "Rahul Sharma",
    rollNumber: "",
    departmentId: "",
    hostelId: "",
    phone: "",
  });
  strictEqual(result.success, true);
});

test("onboardingSchema: phone must be exactly 10 digits when provided", () => {
  strictEqual(
    onboardingSchema.safeParse({ name: "Rahul", phone: "98765" }).success,
    false,
  );
  strictEqual(
    onboardingSchema.safeParse({ name: "Rahul", phone: "9876543210" }).success,
    true,
  );
});

test("onboardingSchema: rejects a name that's too short", () => {
  strictEqual(onboardingSchema.safeParse({ name: "R" }).success, false);
});
