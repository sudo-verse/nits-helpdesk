import { NextResponse, type NextRequest } from "next/server";

import { isSafeNextPath } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * OAuth / magic-link landing route. Exchanges the `code` for a session cookie.
 *
 * A personal Google account reaches this point having authenticated
 * successfully with Google — the rejection comes from the handle_new_user()
 * trigger, which aborts the auth.users INSERT. Supabase surfaces that as an
 * exchange failure, which is translated here into a message the student can
 * understand rather than a raw Postgres error.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const oauthError = searchParams.get("error_description") ?? searchParams.get("error");

  if (oauthError) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(normalise(oauthError))}`,
    );
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(normalise(error.message))}`,
    );
  }

  // A password-recovery link lands here through the same code-exchange
  // mechanism as OAuth. `type=recovery` is Supabase's own signal for that;
  // the `next=/reset-password` requestPasswordReset() embeds in the link is
  // a second, independent signal in case `type` doesn't survive for any
  // reason — either one alone is sufficient, and recovery always wins over
  // an ordinary `next` if somehow both were present.
  const next = searchParams.get("next");
  if (searchParams.get("type") === "recovery" || next === "/reset-password") {
    return NextResponse.redirect(`${origin}/reset-password`);
  }

  const forward = isSafeNextPath(next) ? `?next=${encodeURIComponent(next)}` : "";
  return NextResponse.redirect(`${origin}/auth/post-login${forward}`);
}

/** Collapses provider/database errors into the codes the login page renders. */
function normalise(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("nits.ac.in") || lower.includes("institute")) {
    return "domain_not_allowed";
  }
  if (lower.includes("database error") || lower.includes("unexpected_failure")) {
    // The trigger's exception surfaces as a generic signup failure.
    return "domain_not_allowed";
  }
  if (lower.includes("access_denied")) return "access_denied";
  return "signin_failed";
}
