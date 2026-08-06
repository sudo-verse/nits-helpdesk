import type { Metadata } from "next";

import { AppShell } from "@/components/layout/app-shell";
import { UserRow } from "@/components/admin/user-row";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchBar } from "@/components/ui/search-bar";
import { requireAdmin } from "@/lib/auth/session";
import { getDepartments, getUnreadCount } from "@/lib/repositories/reference";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Users" };

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string }>;
}) {
  const admin = await requireAdmin();
  const sp = await searchParams;
  const supabase = await createClient();

  const term = (sp.q ?? "").trim().replace(/[%_,()\\]/g, "");

  let query = supabase
    .from("profiles")
    .select("id, name, email, role, is_active, department_id, roll_number, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (term) {
    query = query.or(
      `name.ilike.%${term}%,email.ilike.%${term}%,roll_number.ilike.%${term}%`,
    );
  }
  if (["student", "staff", "admin", "super_admin"].includes(sp.role ?? "")) {
    query = query.eq("role", sp.role as "student");
  }

  const [{ data: users }, departments, unreadCount] = await Promise.all([
    query,
    getDepartments(),
    getUnreadCount(),
  ]);

  const isSuperAdmin = admin.profile.role === "super_admin";

  return (
    <AppShell
      role={admin.profile.role}
      user={{ name: admin.profile.name, avatarUrl: admin.profile.avatar_url }}
      title="Users"
      unreadCount={unreadCount}
    >
      <div className="mb-6">
        <h1 className="text-headline-lg text-on-surface mb-2 font-bold">Users</h1>
        <p className="text-body-md text-on-surface-variant">
          {isSuperAdmin
            ? "Assign roles and manage account access."
            : "Manage account access. Only a super admin can change roles."}
        </p>
      </div>

      <form method="GET" action="/admin/users" className="mb-6 max-w-xl">
        <SearchBar
          name="q"
          defaultValue={sp.q ?? ""}
          placeholder="Search by name, email or roll number…"
          aria-label="Search users"
        />
      </form>

      {!users?.length ? (
        <EmptyState icon="group" title="No users found" description="Try a different search." />
      ) : (
        <ul className="flex flex-col gap-2">
          {users.map((u) => (
            <li key={u.id}>
              <UserRow
                user={u}
                departments={departments}
                canChangeRole={isSuperAdmin}
                isSelf={u.id === admin.id}
              />
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
