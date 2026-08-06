import type { Metadata } from "next";
import Link from "next/link";

import { AppShell } from "@/components/layout/app-shell";
import { Badge, PriorityBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip, ChipRail } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { StatCard } from "@/components/ui/stat-card";
import { requireAdmin } from "@/lib/auth/session";
import { PRIORITY_META, TONE_CLASSES } from "@/lib/constants";
import type { IconName } from "@/lib/icons";
import { getStatusCounts, listComplaints } from "@/lib/repositories/complaints";
import { getDepartments, getUnreadCount } from "@/lib/repositories/reference";
import { createClient } from "@/lib/supabase/server";
import { formatRelative, toIsoOrUndefined } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

export const metadata: Metadata = { title: "Admin overview" };

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ department?: string }>;
}) {
  const user = await requireAdmin();
  const sp = await searchParams;
  const supabase = await createClient();

  const departments = await getDepartments();
  const departmentId = departments.some((d) => d.id === sp.department)
    ? sp.department
    : undefined;

  const [counts, urgent, unassigned, unreadCount] = await Promise.all([
    getStatusCounts(supabase, { departmentId }),
    listComplaints(
      supabase,
      { departmentId, priority: "high" },
      { limit: 5, offset: 0 },
    ),
    listComplaints(supabase, { departmentId, unassignedOnly: true }, { limit: 1, offset: 0 }),
    getUnreadCount(),
  ]);

  const active =
    counts.submitted + counts.assigned + counts.under_review + counts.in_progress;

  // "Resolved today" needs a date bound the shared counter does not express.
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const { count: resolvedToday } = await supabase
    .from("v_complaints")
    .select("id", { count: "exact", head: true })
    .in("status", ["resolved", "closed"])
    .gte("resolved_at", startOfDay.toISOString());

  return (
    <AppShell
      role={user.profile.role}
      user={{ name: user.profile.name, avatarUrl: user.profile.avatar_url }}
      title="Admin"
      unreadCount={unreadCount}
    >
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-headline-lg text-on-surface font-bold">Admin Overview</h1>
          <p className="text-body-md text-on-surface-variant mt-1">
            Coordinator Dashboard
          </p>
        </div>
        <ButtonLink href="/admin/tasks" icon="assignment_late" size="sm">
          Triage queue
        </ButtonLink>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total Active" value={active} icon="assignment" tone="primary" href="/admin/tasks" />
        <StatCard label="High Priority" value={counts.total > 0 ? urgent.total : 0} icon="priority_high" tone="error" href="/admin/tasks?priority=high" />
        <StatCard label="Unassigned" value={unassigned.total} icon="person_add" tone="tertiary" href="/admin/tasks?tab=unassigned" />
        <StatCard label="Resolved Today" value={resolvedToday ?? 0} icon="check_circle" tone="success" href="/admin/tasks?tab=resolved" />
      </div>

      <ChipRail className="mb-6">
        <Link href="/admin">
          <Chip selected={!departmentId} tabIndex={-1}>All</Chip>
        </Link>
        {departments.map((d) => (
          <Link key={d.id} href={`/admin?department=${d.id}`}>
            <Chip
              selected={departmentId === d.id}
              icon={d.icon as IconName}
              tabIndex={-1}
            >
              {d.name}
            </Chip>
          </Link>
        ))}
      </ChipRail>

      <section className="flex flex-col gap-4">
        <h2 className="text-title-md text-on-surface border-outline-variant/30 border-b pb-1">
          Recent Urgent Tasks
        </h2>

        {urgent.items.length === 0 ? (
          <EmptyState
            icon="task_alt"
            title="Nothing urgent"
            description="No high-priority complaints are outstanding."
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {urgent.items.map((c) => {
              const meta = PRIORITY_META[c.priority];
              return (
                <li key={c.id}>
                  <Card
                    as={Link}
                    href={`/complaints/${c.complaint_code}`}
                    surface="container"
                    interactive
                    className="flex flex-col justify-between gap-2 p-4 md:flex-row md:items-center"
                  >
                    <div className="flex items-start gap-4">
                      <Icon
                        name={meta.icon}
                        filled
                        size={20}
                        className={cn("mt-1", TONE_CLASSES[meta.tone].text)}
                      />
                      <div>
                        <h3 className="text-title-md text-on-surface">{c.title}</h3>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <Badge tone="neutral">{c.department?.name ?? "—"}</Badge>
                          <time
                            dateTime={toIsoOrUndefined(c.created_at)}
                            className="text-outline font-mono text-[12px]"
                          >
                            {formatRelative(c.created_at)}
                          </time>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center md:justify-end">
                      <PriorityBadge priority={c.priority} />
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
