import { NextResponse, type NextRequest } from "next/server";

import { resolveLandingPath } from "@/lib/auth/session";

/**
 * Single place that decides where a freshly signed-in user lands, so the OTP
 * flow, the OAuth callback and the root redirect cannot drift apart.
 *
 * Students → /dashboard, staff → /staff, admins → /admin. First-time users go
 * to /onboarding regardless of role.
 *
 * Reached via a real browser navigation (the OAuth callback's redirect), so a
 * plain HTTP redirect here is safe. Server Actions must NOT redirect here —
 * see resolveLandingPath() for why.
 */
export async function GET(request: NextRequest) {
  const { origin } = new URL(request.url);
  const path = await resolveLandingPath();
  return NextResponse.redirect(`${origin}${path}`);
}
