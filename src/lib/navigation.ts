import type { IconName } from "@/lib/icons";
import type { UserRole } from "@/lib/constants";

export type NavItem = {
  href: string;
  label: string;
  icon: IconName;
  /** Roles that see this item. Omitted = everyone. */
  roles?: readonly UserRole[];
};

/**
 * The four destinations in the Stitch bottom nav: Home, Complaints, Alerts,
 * Profile. Each role gets the same shape, pointed at its own landing page, so
 * the navigation looks identical regardless of who is signed in.
 */
export const STUDENT_NAV: readonly NavItem[] = [
  { href: "/dashboard", label: "Home", icon: "home" },
  { href: "/complaints", label: "Complaints", icon: "assignment_late" },
  { href: "/notifications", label: "Alerts", icon: "notifications" },
  { href: "/profile", label: "Profile", icon: "person" },
] as const;

export const STAFF_NAV: readonly NavItem[] = [
  { href: "/staff", label: "Home", icon: "home" },
  { href: "/staff/queue", label: "Complaints", icon: "assignment_late" },
  { href: "/notifications", label: "Alerts", icon: "notifications" },
  { href: "/profile", label: "Profile", icon: "person" },
] as const;

export const ADMIN_NAV: readonly NavItem[] = [
  { href: "/admin", label: "Home", icon: "home" },
  { href: "/admin/tasks", label: "Complaints", icon: "assignment_late" },
  { href: "/notifications", label: "Alerts", icon: "notifications" },
  { href: "/profile", label: "Profile", icon: "person" },
] as const;

/** Extra desktop-sidebar destinations that have no bottom-nav slot. */
export const ADMIN_SECONDARY_NAV: readonly NavItem[] = [
  { href: "/admin/departments", label: "Departments", icon: "domain" },
  { href: "/admin/users", label: "Users", icon: "group" },
  { href: "/admin/announcements", label: "Announcements", icon: "campaign" },
  { href: "/admin/faq", label: "FAQ", icon: "question_answer" },
  { href: "/admin/analytics", label: "Analytics", icon: "analytics" },
] as const;

export function navForRole(role: UserRole): readonly NavItem[] {
  switch (role) {
    case "staff":
      return STAFF_NAV;
    case "admin":
    case "super_admin":
      return ADMIN_NAV;
    case "student":
      return STUDENT_NAV;
  }
}

export function secondaryNavForRole(role: UserRole): readonly NavItem[] {
  return role === "admin" || role === "super_admin" ? ADMIN_SECONDARY_NAV : [];
}

/** Landing route after sign-in. */
export function homeForRole(role: UserRole): string {
  return navForRole(role)[0]?.href ?? "/dashboard";
}

/**
 * Whether a nav item should render as active.
 *
 * Prefix matching, except for the role landing pages — "/admin" is a prefix of
 * every admin route, so a plain startsWith would light up Home on every page.
 */
export function isNavItemActive(pathname: string, href: string): boolean {
  const isRoot = ["/dashboard", "/staff", "/admin"].includes(href);
  if (isRoot) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Whether `candidate` is safe to redirect a signed-in user to after login.
 *
 * `next` arrives as a URL query param, so it is attacker-controlled — this is
 * the one gate every caller trusts rather than re-implementing. Only a
 * same-origin relative path is ever honoured.
 */
export function isSafeNextPath(candidate: unknown): candidate is string {
  if (typeof candidate !== "string") return false;
  if (candidate.length === 0 || candidate.length > 512) return false;
  // Single leading slash only — rejects absolute URLs (https://evil.com),
  // protocol-relative URLs (//evil.com, which resolves against the current
  // scheme), and the backslash variant (/\evil.com) some browsers normalise
  // to // before ever reaching a URL parser.
  if (!/^\/(?!\/|\\)/.test(candidate)) return false;
  // No backslashes, and no whitespace/control characters — both show up in
  // real-world open-redirect bypass payloads.
  if (/[\s\\]/.test(candidate)) return false;
  // Defense in depth: closes off a scheme buried anywhere else in the string
  // (e.g. inside a query value some future route re-parses).
  if (candidate.includes("://")) return false;
  return true;
}
