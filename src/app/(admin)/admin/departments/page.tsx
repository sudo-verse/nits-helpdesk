import type { Metadata } from "next";

import { DepartmentManager } from "@/components/admin/department-manager";
import { AppShell } from "@/components/layout/app-shell";
import { requireAdmin } from "@/lib/auth/session";
import { getUnreadCount } from "@/lib/repositories/reference";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Departments" };

export default async function AdminDepartmentsPage() {
  const admin = await requireAdmin();
  const supabase = await createClient();

  // Includes inactive rows, unlike the cached getDepartments() the rest of the
  // app uses — an admin needs to see and re-enable what they disabled.
  const [{ data: departments }, unreadCount] = await Promise.all([
    supabase
      .from("departments")
      .select("id, name, slug, description, icon, color_token, is_active")
      .order("name"),
    getUnreadCount(),
  ]);

  return (
    <AppShell
      role={admin.profile.role}
      user={{ name: admin.profile.name, avatarUrl: admin.profile.avatar_url }}
      title="Departments"
      unreadCount={unreadCount}
    >
      <div className="mb-6">
        <h1 className="text-headline-lg text-on-surface mb-2 font-bold">Departments</h1>
        <p className="text-body-md text-on-surface-variant">
          Departments students can file complaints against. Disabling one hides it
          from the report form without touching existing complaints.
        </p>
      </div>

      <DepartmentManager departments={departments ?? []} />
    </AppShell>
  );
}
