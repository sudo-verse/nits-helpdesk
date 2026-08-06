import type { Metadata } from "next";

import { NotificationFeed, type FeedItem } from "@/components/notifications/notification-feed";
import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/lib/auth/session";
import { getUnreadCount } from "@/lib/repositories/reference";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const [{ data }, unreadCount] = await Promise.all([
    supabase
      .from("notifications")
      .select(
        `id, type, title, body, created_at, is_read,
         complaint:complaints!notifications_complaint_id_fkey ( complaint_code )`,
      )
      .order("created_at", { ascending: false })
      .limit(50),
    getUnreadCount(),
  ]);

  return (
    <AppShell
      role={user.profile.role}
      user={{ name: user.profile.name, avatarUrl: user.profile.avatar_url }}
      title="Alerts"
      unreadCount={unreadCount}
    >
      <NotificationFeed
        items={(data ?? []) as unknown as FeedItem[]}
        userId={user.id}
        unreadCount={unreadCount}
      />
    </AppShell>
  );
}
