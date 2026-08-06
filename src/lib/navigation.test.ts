import { deepStrictEqual, strictEqual } from "node:assert";
import { test } from "node:test";

import {
  homeForRole,
  isNavItemActive,
  isSafeNextPath,
  navForRole,
  secondaryNavForRole,
} from "./navigation.ts";

test("navForRole: each role gets its own landing page as the first item", () => {
  strictEqual(navForRole("student")[0]?.href, "/dashboard");
  strictEqual(navForRole("staff")[0]?.href, "/staff");
  strictEqual(navForRole("admin")[0]?.href, "/admin");
  strictEqual(navForRole("super_admin")[0]?.href, "/admin");
});

test("navForRole: admin and super_admin share the same nav", () => {
  deepStrictEqual(navForRole("admin"), navForRole("super_admin"));
});

test("homeForRole: matches the first item of that role's nav", () => {
  for (const role of ["student", "staff", "admin", "super_admin"] as const) {
    strictEqual(homeForRole(role), navForRole(role)[0]?.href);
  }
});

test("secondaryNavForRole: only admin/super_admin get the secondary nav", () => {
  strictEqual(secondaryNavForRole("student").length, 0);
  strictEqual(secondaryNavForRole("staff").length, 0);
  strictEqual(secondaryNavForRole("admin").length > 0, true);
  strictEqual(secondaryNavForRole("super_admin").length > 0, true);
});

test("isNavItemActive: root landing pages only match exactly, not as a prefix", () => {
  // /admin is a prefix of every admin route — a plain startsWith would light
  // up "Home" on every admin page, which is the bug this guards against.
  strictEqual(isNavItemActive("/admin", "/admin"), true);
  strictEqual(isNavItemActive("/admin/tasks", "/admin"), false);
  strictEqual(isNavItemActive("/dashboard", "/dashboard"), true);
  strictEqual(isNavItemActive("/dashboard/anything", "/dashboard"), false);
});

test("isNavItemActive: non-root items match exactly and as a path prefix", () => {
  strictEqual(isNavItemActive("/admin/tasks", "/admin/tasks"), true);
  strictEqual(isNavItemActive("/admin/tasks?tab=resolved", "/admin/tasks"), false);
  strictEqual(isNavItemActive("/admin/tasks/CMP-1", "/admin/tasks"), true);
});

test("isNavItemActive: does not match an unrelated sibling route", () => {
  strictEqual(isNavItemActive("/admin/users", "/admin/tasks"), false);
  // Prefix-of-the-string but not prefix-of-the-path — must not match.
  strictEqual(isNavItemActive("/admin/tasksomething", "/admin/tasks"), false);
});

test("isSafeNextPath: accepts realistic same-origin paths", () => {
  strictEqual(isSafeNextPath("/complaints/CMP-123"), true);
  strictEqual(isSafeNextPath("/dashboard?tab=x"), true);
  strictEqual(isSafeNextPath("/"), true);
});

test("isSafeNextPath: rejects missing or empty values", () => {
  strictEqual(isSafeNextPath(null), false);
  strictEqual(isSafeNextPath(undefined), false);
  strictEqual(isSafeNextPath(""), false);
  strictEqual(isSafeNextPath(42), false);
});

test("isSafeNextPath: rejects absolute and protocol-relative URLs", () => {
  strictEqual(isSafeNextPath("https://evil.com"), false);
  strictEqual(isSafeNextPath("http://evil.com"), false);
  // Browsers resolve a leading // against the current scheme — this is the
  // classic open-redirect bypass a naive `startsWith("/")` check misses.
  strictEqual(isSafeNextPath("//evil.com"), false);
});

test("isSafeNextPath: rejects the backslash variant some browsers normalise to //", () => {
  strictEqual(isSafeNextPath("/\\evil.com"), false);
});

test("isSafeNextPath: rejects a scheme embedded mid-string", () => {
  strictEqual(isSafeNextPath("/redirect?url=https://evil.com"), false);
});

test("isSafeNextPath: rejects whitespace/control characters and oversized input", () => {
  strictEqual(isSafeNextPath("/foo\tbar"), false);
  strictEqual(isSafeNextPath("/foo\nbar"), false);
  // "/" + 511 chars = 512 total, exactly at the limit — allowed.
  strictEqual(isSafeNextPath(`/${"a".repeat(511)}`), true);
  // "/" + 512 chars = 513 total, one over — rejected.
  strictEqual(isSafeNextPath(`/${"a".repeat(512)}`), false);
});
