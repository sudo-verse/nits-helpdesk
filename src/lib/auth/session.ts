import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import type { UserRole } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export type SessionUser = {
  id: string;
  email: string;
  profile: Profile;
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

  return { id: user.id, email: user.email, profile };
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
