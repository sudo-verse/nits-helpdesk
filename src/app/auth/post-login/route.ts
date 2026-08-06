import { NextResponse, type NextRequest } from "next/server";

import { homeForRole } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Single place that decides where a freshly signed-in user lands, so the OTP
 * flow, the OAuth callback and the root redirect cannot drift apart.
 *
 * Students → /dashboard, staff → /staff, admins → /admin. First-time users go
 * to /onboarding regardless of role.
 */
export async function GET(request: NextRequest) {
  const { origin } = new URL(request.url);
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, onboarded_at, is_active")
    .eq("id", user.id)
    .single();

  if (!profile) {
    // The trigger should have created this. If it is missing the account is in
    // an inconsistent state — sign out rather than loop.
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/login?error=profile_missing`);
  }

  if (!profile.is_active) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/login?error=account_disabled`);
  }

  if (!profile.onboarded_at) {
    return NextResponse.redirect(`${origin}/onboarding`);
  }

  return NextResponse.redirect(`${origin}${homeForRole(profile.role)}`);
}
