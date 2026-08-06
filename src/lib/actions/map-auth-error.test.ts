import { strictEqual } from "node:assert";
import { test } from "node:test";

import { mapAuthError } from "./map-auth-error.ts";

const INSTITUTE_ONLY =
  "Only NIT Silchar accounts can sign in. Use your @nits.ac.in or @students.nits.ac.in address.";

test("mapAuthError: institute-domain trigger rejection", () => {
  strictEqual(
    mapAuthError(
      "Only NIT Silchar institute accounts (@nits.ac.in or @students.nits.ac.in) may sign in.",
    ),
    INSTITUTE_ONLY,
  );
});

test("mapAuthError: OTP expired", () => {
  strictEqual(mapAuthError("Token has expired"), "That code has expired. Request a new one.");
});

test("mapAuthError: OTP invalid", () => {
  strictEqual(
    mapAuthError("Invalid token"),
    "That code is not correct. Check the email and try again.",
  );
});

test("mapAuthError: confirmation email delivery failure is distinguished from domain rejection", () => {
  // Regression: this used to fall through to the institute-domain message
  // because both errors could carry "unexpected_failure" as their code —
  // must be disambiguated by message text, not error code.
  strictEqual(
    mapAuthError("Error sending confirmation email"),
    "We could not send a confirmation email right now. Try again shortly, or contact the helpdesk administrator.",
  );
});

test("mapAuthError: wrong password does not leak which part was wrong", () => {
  strictEqual(mapAuthError("Invalid login credentials"), "Incorrect email or password.");
});

test("mapAuthError: unconfirmed email sign-in attempt", () => {
  strictEqual(
    mapAuthError("Email not confirmed"),
    "Confirm your email first — check your inbox for the confirmation link.",
  );
});

test("mapAuthError: duplicate signup", () => {
  strictEqual(
    mapAuthError("User already registered"),
    "An account with that email already exists. Try signing in instead.",
  );
});

test("mapAuthError: password too short", () => {
  strictEqual(mapAuthError("Password should be at least 6 characters"), "Choose a longer password.");
});

test("mapAuthError: rate limited", () => {
  strictEqual(
    mapAuthError("Email rate limit exceeded"),
    "Too many attempts. Wait a few minutes and try again.",
  );
});

test("mapAuthError: unrecognised message falls back to a generic one, not the raw Supabase text", () => {
  strictEqual(
    mapAuthError("some internal Supabase implementation detail"),
    "Something went wrong signing you in. Try again.",
  );
});
