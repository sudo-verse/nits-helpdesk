"use client";

import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";
import { toast } from "sonner";

import { NotificationItem } from "@/components/notifications/notification-item";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { markAllNotificationsRead } from "@/lib/actions/notifications";
import type { NotificationType } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";

export type FeedItem = {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  created_at: string;
  is_read: boolean;
  complaint: { complaint_code: string } | null;
};

/**
 * Realtime notification feed.
 *
 * Subscribes to inserts scoped to this user, then calls `router.refresh()` so
 * the Server Component re-queries under RLS. The payload itself is never
 * trusted to render — a broadcast row is not proof of read access.
 */
export function NotificationFeed({
  items,
  userId,
  unreadCount,
}: {
  items: FeedItem[];
  userId: string;
  unreadCount: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => router.refresh(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, router]);

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h1 className="text-headline-lg-mobile md:text-headline-lg text-on-surface font-semibold">
          Notifications
        </h1>
        {unreadCount > 0 && (
          <Button
            variant="tertiary"
            size="sm"
            isLoading={isPending}
            onClick={() =>
              startTransition(async () => {
                const result = await markAllNotificationsRead();
                if (result.status === "error") toast.error(result.message);
                else if (result.status === "success") {
                  toast.success(result.message ?? "All caught up.");
                }
              })
            }
          >
            Mark all as read
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon="notifications_off"
          title="Nothing here yet"
          description="Updates about your complaints and campus announcements will appear here."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((n) => (
            <li key={n.id}>
              <NotificationItem
                type={n.type}
                title={n.title}
                body={n.body}
                createdAt={n.created_at}
                isRead={n.is_read}
                complaintCode={n.complaint?.complaint_code ?? null}
              />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
