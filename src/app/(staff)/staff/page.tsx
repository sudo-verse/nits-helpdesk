import type { Metadata } from "next";

import { AppShell } from "@/components/layout/app-shell";
import { TicketCard } from "@/components/staff/ticket-card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import { requireStaff } from "@/lib/auth/session";
import type { IconName } from "@/lib/icons";
import { getStatusCounts, listComplaints } from "@/lib/repositories/complaints";
import { getUnreadCount } from "@/lib/repositories/reference";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Staff dashboard" };

export default async function StaffDashboardPage() {
  const user = await requireStaff();
  const supabase = await createClient();

  // Scoped to this staff member. RLS also lets them see their department's
  // queue, but the landing page is deliberately "what is mine".
  const [counts, { items }, unreadCount] = await Promise.all([
    getStatusCounts(supabase, { assignedTo: user.id }),
    listComplaints(supabase, { assignedTo: user.id }, { limit: 6, offset: 0 }),
    getUnreadCount(),
  ]);

  const active = counts.assigned + counts.under_review + counts.in_progress;

  return (
    <AppShell
      role={user.profile.role}
      user={{ name: user.profile.name, avatarUrl: user.profile.avatar_url }}
      title="NITS HelpDesk"
      unreadCount={unreadCount}
    >
      <div className="mb-6">
        <h1 className="text-headline-lg-mobile md:text-headline-lg text-on-background font-bold">
          Hello, {user.profile.name?.split(" ")[0] ?? "there"}
        </h1>
        <p className="text-body-md text-on-surface-variant mt-1">
          Complaints assigned to you, and what needs attention next.
        </p>
      </div>

      <div className="mb-12 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Assigned" value={counts.total} icon="assignment_ind" tone="primary" href="/staff/queue" />
        <StatCard label="Active" value={active} icon="sync" tone="secondary" href="/staff/queue?status=in_progress" />
        <StatCard label="Resolved" value={counts.resolved} icon="check_circle" tone="success" href="/staff/queue?status=resolved" />
        <StatCard label="Closed" value={counts.closed} icon="task_alt" tone="neutral" href="/staff/queue?status=closed" />
      </div>

      <h2 className="text-title-md text-on-background mb-4 font-semibold">
        Your open complaints
      </h2>

      {items.length === 0 ? (
        <EmptyState
          icon="task_alt"
          title="Nothing assigned to you"
          description="When a coordinator assigns you a complaint it will appear here."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {items.map((c) => (
            <TicketCard
              key={c.id}
              code={c.complaint_code}
              title={c.title}
              status={c.status}
              priority={c.priority}
              departmentName={c.department?.name ?? "—"}
              departmentIcon={c.department?.icon as IconName | undefined}
              location={c.location ?? c.hostel?.name}
              createdAt={c.created_at}
              href={`/complaints/${c.complaint_code}`}
            />
          ))}
        </div>
      )}
    </AppShell>
  );
}
