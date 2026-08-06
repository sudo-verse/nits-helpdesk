import type { Metadata } from "next";

import { AppShell } from "@/components/layout/app-shell";
import { QuickAssign } from "@/components/admin/quick-assign";
import { TicketCard } from "@/components/staff/ticket-card";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchBar } from "@/components/ui/search-bar";
import { Tabs } from "@/components/ui/tabs";
import { requireAdmin } from "@/lib/auth/session";
import type { ComplaintPriority } from "@/lib/constants";
import type { IconName } from "@/lib/icons";
import { listComplaints, type ComplaintFilters } from "@/lib/repositories/complaints";
import { getUnreadCount } from "@/lib/repositories/reference";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Task management" };

type Tab = "unassigned" | "active" | "resolved" | "all";

/** Tab → repository filter. Mirrors the tabs in task_management. */
const TAB_FILTERS: Record<Tab, ComplaintFilters> = {
  unassigned: { unassignedOnly: true },
  active: { status: "in_progress" },
  resolved: { status: "resolved" },
  all: {},
};

export default async function AdminTasksPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string; priority?: string }>;
}) {
  const user = await requireAdmin();
  const sp = await searchParams;
  const supabase = await createClient();

  const tab: Tab = (["unassigned", "active", "resolved", "all"] as const).includes(
    sp.tab as Tab,
  )
    ? (sp.tab as Tab)
    : "unassigned";

  const priority = ["low", "medium", "high"].includes(sp.priority ?? "")
    ? (sp.priority as ComplaintPriority)
    : undefined;

  const [{ items }, unassignedCount, { data: staffOptions }, unreadCount] =
    await Promise.all([
      listComplaints(
        supabase,
        { ...TAB_FILTERS[tab], search: sp.q, priority },
        { limit: 50, offset: 0 },
      ),
      listComplaints(supabase, { unassignedOnly: true }, { limit: 1, offset: 0 }).then(
        (r) => r.total,
      ),
      supabase
        .from("profiles")
        .select("id, name")
        .in("role", ["staff", "admin", "super_admin"])
        .eq("is_active", true)
        .order("name"),
      getUnreadCount(),
    ]);

  const href = (t: Tab) => {
    const params = new URLSearchParams();
    if (t !== "unassigned") params.set("tab", t);
    if (sp.q) params.set("q", sp.q);
    if (priority) params.set("priority", priority);
    const qs = params.toString();
    return `/admin/tasks${qs ? `?${qs}` : ""}`;
  };

  return (
    <AppShell
      role={user.profile.role}
      user={{ name: user.profile.name, avatarUrl: user.profile.avatar_url }}
      title="Task Management"
      unreadCount={unreadCount}
    >
      <div className="mb-6 flex flex-col gap-4">
        <div>
          <h1 className="text-headline-lg text-on-surface font-bold">Task Management</h1>
          <p className="text-on-surface-variant mt-2">
            Manage and assign incoming department complaints.
          </p>
        </div>

        {/* GET form so search survives without JavaScript. */}
        <form method="GET" action="/admin/tasks" className="flex w-full max-w-2xl gap-2">
          {tab !== "unassigned" && <input type="hidden" name="tab" value={tab} />}
          <SearchBar
            name="q"
            defaultValue={sp.q ?? ""}
            placeholder="Search tickets, departments, or keywords…"
            containerClassName="flex-grow"
            aria-label="Search tickets"
          />
        </form>
      </div>

      <Tabs
        activeHref={href(tab)}
        className="mb-6"
        items={[
          { href: href("unassigned"), label: "Unassigned", count: unassignedCount },
          { href: href("active"), label: "Active" },
          { href: href("resolved"), label: "Resolved" },
          { href: href("all"), label: "All" },
        ]}
      />

      {items.length === 0 ? (
        <EmptyState
          icon="task_alt"
          title="Nothing in this queue"
          description={
            tab === "unassigned"
              ? "Every complaint has an owner. Nice."
              : "No complaints match this filter."
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
              action={
                <QuickAssign
                  complaintId={c.id}
                  complaintCode={c.complaint_code}
                  currentAssigneeId={c.assigned_to}
                  staffOptions={staffOptions ?? []}
                />
              }
            />
          ))}
        </div>
      )}
    </AppShell>
  );
}
