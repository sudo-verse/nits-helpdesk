import { NextResponse, type NextRequest } from "next/server";

import { resolveLandingPath } from "@/lib/auth/session";

/**
 * Single place that decides where a freshly signed-in user lands, so the
 * OAuth callback and the root redirect cannot drift apart.
 *
 * Students → /dashboard, staff → /staff, admins → /admin. First-time users go
 * to /onboarding regardless of role. A `next` param (from a deep link that
 * required signing in first) wins over all of those once the account is
 * active and onboarded — see resolveLandingPath() for the exact ordering.
 *
 * Reached via a real browser navigation (the OAuth callback's redirect), so a
 * plain HTTP redirect here is safe. Server Actions must NOT redirect here —
 * see resolveLandingPath() for why.
 */
export async function GET(request: NextRequest) {
  const { origin, searchParams } = new URL(request.url);
  const path = await resolveLandingPath(searchParams.get("next"));
  return NextResponse.redirect(`${origin}${path}`);
}
