import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import type { UserRole } from "@/lib/constants";
import { homeForRole, isSafeNextPath } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export type SessionUser = {
  id: string;
  email: string;
  profile: Profile;
  /** Whether this account can sign in with a password (vs. Google-only). */
  hasPasswordIdentity: boolean;
};

/**
 * Current user + profile, deduped per request by React `cache`.
 *
 * A layout, a page and three Server Components in the same render all call
 * this; without the cache that would be five round trips per navigation.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();

  // getUser() revalidates against the Auth server. getSession() only decodes
  // the cookie, which the client controls — never gate on it.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  return {
    id: user.id,
    email: user.email,
    profile,
    // No `email` identity means the account only ever signed in via Google —
    // there is no password to verify or change, only one to set.
    hasPasswordIdentity: user.identities?.some((i) => i.provider === "email") ?? true,
  };
});

/**
 * Gate a page on being signed in, onboarded and active.
 *
 * Middleware already redirects unauthenticated traffic; this is the second
 * layer, so a routing mistake cannot expose a page.
 */
export async function requireUser(options?: {
  roles?: readonly UserRole[];
  /** Set false on the onboarding page itself, or it redirects to itself. */
  requireOnboarded?: boolean;
}): Promise<SessionUser> {
  const { roles, requireOnboarded = true } = options ?? {};
  const user = await getSessionUser();

  if (!user) redirect("/login");

  if (!user.profile.is_active) redirect("/login?error=account_disabled");

  if (requireOnboarded && !user.profile.onboarded_at) redirect("/onboarding");

  if (roles && !roles.includes(user.profile.role)) {
    redirect("/dashboard?error=forbidden");
  }

  return user;
}

export async function requireStaff(): Promise<SessionUser> {
  return requireUser({ roles: ["staff", "admin", "super_admin"] });
}

export async function requireAdmin(): Promise<SessionUser> {
  return requireUser({ roles: ["admin", "super_admin"] });
}

export function isAdminRole(role: UserRole): boolean {
  return role === "admin" || role === "super_admin";
}

export function isStaffRole(role: UserRole): boolean {
  return role === "staff" || isAdminRole(role);
}

/**
 * Where a freshly-signed-in user belongs: /login if the session is bad,
 * /onboarding if it's their first time, otherwise `next` (if it's safe and
 * present) or their role's home page.
 *
 * Single source of truth shared by the OAuth callback chain (which redirects
 * through /auth/post-login, a Route Handler reached via a real browser
 * navigation) and the password Server Actions, which must redirect straight
 * to the resolved page — `redirect()` from a Server Action does a
 * client-side transition, and a Route Handler has no RSC representation for
 * the client router to land on, so bouncing through /auth/post-login from a
 * Server Action leaves the browser's URL out of sync with what's rendered.
 *
 * `next` is validated here, once, rather than at every call site — it can
 * only ever substitute the *final* destination, never skip the error or
 * onboarding gates above it.
 */
export async function resolveLandingPath(next?: string | null): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return "/login";

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, onboarded_at, is_active")
    .eq("id", user.id)
    .single();

  if (!profile) {
    // The trigger should have created this. If it is missing the account is
    // in an inconsistent state — sign out rather than loop.
    await supabase.auth.signOut();
    return "/login?error=profile_missing";
  }

  if (!profile.is_active) {
    await supabase.auth.signOut();
    return "/login?error=account_disabled";
  }

  if (!profile.onboarded_at) {
    // Carried through so a first-time sign-in via a shared deep link still
    // lands where it was headed once onboarding is done, not just for
    // returning users.
    return isSafeNextPath(next) ? `/onboarding?next=${encodeURIComponent(next)}` : "/onboarding";
  }

  return isSafeNextPath(next) ? next : homeForRole(profile.role);
}
