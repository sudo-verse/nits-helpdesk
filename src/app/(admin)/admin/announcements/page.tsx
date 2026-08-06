import type { Metadata } from "next";

import { AnnouncementManager, type Announcement } from "@/components/admin/content-manager";
import { AppShell } from "@/components/layout/app-shell";
import { requireAdmin } from "@/lib/auth/session";
import { getDepartments, getUnreadCount } from "@/lib/repositories/reference";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Announcements" };

export default async function AdminAnnouncementsPage() {
  const admin = await requireAdmin();
  const supabase = await createClient();

  // The admin branch of the RLS policy returns drafts too.
  const [{ data }, departments, unreadCount] = await Promise.all([
    supabase
      .from("announcements")
      .select("id, title, body, department_id, is_pinned, is_published, published_at, created_at")
      .order("created_at", { ascending: false })
      .limit(100),
    getDepartments(),
    getUnreadCount(),
  ]);

  return (
    <AppShell
      role={admin.profile.role}
      user={{ name: admin.profile.name, avatarUrl: admin.profile.avatar_url }}
      title="Announcements"
      unreadCount={unreadCount}
    >
      <div className="mb-6">
        <h1 className="text-headline-lg text-on-surface mb-2 font-bold">Announcements</h1>
        <p className="text-body-md text-on-surface-variant">
          Campus notices. Publishing sends a notification to everyone it targets.
        </p>
      </div>

      <AnnouncementManager
        announcements={(data ?? []) as Announcement[]}
        departments={departments}
      />
    </AppShell>
  );
}
