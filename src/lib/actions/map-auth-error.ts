/**
 * Turns Supabase's raw messages into something a student can act on, without
 * revealing whether a given address exists.
 *
 * Kept outside auth.ts: that file is "use server", which requires every
 * top-level export to be an async Server Action — a plain string -> string
 * function can't live there and still be unit-testable.
 */
export function mapAuthError(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes("nits.ac.in") || lower.includes("institute")) {
    return "Only NIT Silchar accounts can sign in. Use your @nits.ac.in or @students.nits.ac.in address.";
  }
  if (lower.includes("expired")) {
    return "That code has expired. Request a new one.";
  }
  if (lower.includes("invalid") && lower.includes("token")) {
    return "That code is not correct. Check the email and try again.";
  }
  if (lower.includes("sending") && lower.includes("email")) {
    // The account/domain checks already passed by this point — this is
    // Supabase failing to deliver the confirmation mail itself (no SMTP
    // configured, or the built-in sender's quota is exhausted).
    return "We could not send a confirmation email right now. Try again shortly, or contact the helpdesk administrator.";
  }
  if (lower.includes("invalid login credentials")) {
    return "Incorrect email or password.";
  }
  if (lower.includes("email not confirmed")) {
    return "Confirm your email first — check your inbox for the confirmation link.";
  }
  if (
    lower.includes("already registered") ||
    lower.includes("already exists") ||
    lower.includes("user already")
  ) {
    return "An account with that email already exists. Try signing in instead.";
  }
  if (lower.includes("password") && lower.includes("least")) {
    return "Choose a longer password.";
  }
  if (lower.includes("rate") || lower.includes("too many")) {
    return "Too many attempts. Wait a few minutes and try again.";
  }
  return "Something went wrong signing you in. Try again.";
}
