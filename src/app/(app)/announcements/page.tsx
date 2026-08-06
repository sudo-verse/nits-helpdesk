import type { Metadata } from "next";

import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { requireUser } from "@/lib/auth/session";
import { getUnreadCount } from "@/lib/repositories/reference";
import { createClient } from "@/lib/supabase/server";
import { formatRelative, toIsoOrUndefined } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Announcements" };

export default async function AnnouncementsPage() {
  const user = await requireUser();
  const supabase = await createClient();

  // The RLS policy already filters to published, in-window rows; the ordering
  // here just floats pinned items.
  const [{ data: announcements }, unreadCount] = await Promise.all([
    supabase
      .from("announcements")
      .select(
        `id, title, body, is_pinned, published_at, created_at,
         department:departments!announcements_department_id_fkey ( name )`,
      )
      .order("is_pinned", { ascending: false })
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(50),
    getUnreadCount(),
  ]);

  return (
    <AppShell
      role={user.profile.role}
      user={{ name: user.profile.name, avatarUrl: user.profile.avatar_url }}
      title="Announcements"
      showBack
      backHref="/profile"
      unreadCount={unreadCount}
    >
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="text-headline-lg text-on-background mb-6 font-bold">
          Announcements
        </h1>

        {!announcements?.length ? (
          <EmptyState
            icon="campaign"
            title="No announcements"
            description="Campus-wide notices from the administration will appear here."
          />
        ) : (
          <ul className="flex flex-col gap-4">
            {announcements.map((a) => {
              const department = (a.department as { name: string } | null)?.name;
              return (
                <li key={a.id}>
                  <Card surface="lowest" radius="xl" className="flex flex-col gap-3 p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h2 className="text-title-md text-on-surface flex items-center gap-2 font-semibold">
                        {a.is_pinned && (
                          <Icon name="flag" filled size={18} className="text-error" />
                        )}
                        {a.title}
                      </h2>
                      <time
                        dateTime={toIsoOrUndefined(a.published_at ?? a.created_at)}
                        className="text-label-sm text-outline font-mono"
                      >
                        {formatRelative(a.published_at ?? a.created_at)}
                      </time>
                    </div>

                    {department && <Badge tone="neutral" icon="domain">{department}</Badge>}

                    <p className="text-body-md text-on-surface-variant whitespace-pre-wrap">
                      {a.body}
                    </p>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
