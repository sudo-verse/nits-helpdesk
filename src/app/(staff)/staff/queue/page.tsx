import type { Metadata } from "next";

import { AppShell } from "@/components/layout/app-shell";
import { TicketCard } from "@/components/staff/ticket-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs } from "@/components/ui/tabs";
import { requireStaff } from "@/lib/auth/session";
import type { ComplaintStatus } from "@/lib/constants";
import type { IconName } from "@/lib/icons";
import { listComplaints } from "@/lib/repositories/complaints";
import { getUnreadCount } from "@/lib/repositories/reference";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "My queue" };

const VALID: readonly string[] = [
  "submitted", "assigned", "under_review", "in_progress", "resolved", "closed",
];

export default async function StaffQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; scope?: string }>;
}) {
  const user = await requireStaff();
  const sp = await searchParams;
  const supabase = await createClient();

  const status = VALID.includes(sp.status ?? "")
    ? (sp.status as ComplaintStatus)
    : undefined;

  // "Department" widens to everything RLS allows a staff member to service,
  // so a colleague's absence does not block work.
  const departmentScope = sp.scope === "department";

  const [{ items }, unreadCount] = await Promise.all([
    listComplaints(
      supabase,
      {
        status,
        ...(departmentScope ? {} : { assignedTo: user.id }),
      },
      { limit: 50, offset: 0 },
    ),
    getUnreadCount(),
  ]);

  const base = departmentScope ? "/staff/queue?scope=department" : "/staff/queue";
  const q = (s?: string) =>
    `${base}${s ? `${departmentScope ? "&" : "?"}status=${s}` : ""}`;

  return (
    <AppShell
      role={user.profile.role}
      user={{ name: user.profile.name, avatarUrl: user.profile.avatar_url }}
      title="My queue"
      unreadCount={unreadCount}
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-headline-lg text-on-background font-bold">
          {departmentScope ? "Department queue" : "My queue"}
        </h1>
        <Tabs
          activeHref={departmentScope ? "/staff/queue?scope=department" : "/staff/queue"}
          items={[
            { href: "/staff/queue", label: "Assigned to me" },
            { href: "/staff/queue?scope=department", label: "My department" },
          ]}
          className="border-b-0"
        />
      </div>

      <Tabs
        activeHref={q(status)}
        className="mb-6"
        items={[
          { href: q(), label: "All" },
          { href: q("assigned"), label: "Assigned" },
          { href: q("under_review"), label: "Under review" },
          { href: q("in_progress"), label: "In progress" },
          { href: q("resolved"), label: "Resolved" },
          { href: q("closed"), label: "Closed" },
        ]}
      />

      {items.length === 0 ? (
        <EmptyState
          icon="inbox"
          title="Nothing here"
          description={
            departmentScope
              ? "No complaints in your department match this filter."
              : "Nothing is assigned to you with this status."
          }
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
