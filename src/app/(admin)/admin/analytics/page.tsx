import type { Metadata } from "next";

import { AppShell } from "@/components/layout/app-shell";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { StatCard } from "@/components/ui/stat-card";
import { requireAdmin } from "@/lib/auth/session";
import { STATUS_META, STATUS_ORDER, TONE_CLASSES } from "@/lib/constants";
import { getUnreadCount } from "@/lib/repositories/reference";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils/cn";

export const metadata: Metadata = { title: "Analytics" };

function hours(ms: number) {
  return ms / (1000 * 60 * 60);
}

export default async function AnalyticsPage() {
  const user = await requireAdmin();
  const supabase = await createClient();

  const [{ data: rows }, { data: ratings }, unreadCount] = await Promise.all([
    supabase
      .from("v_complaints")
      .select("status, priority, department_id, created_at, resolved_at"),
    supabase.from("feedback").select("rating"),
    getUnreadCount(),
  ]);

  const { data: departments } = await supabase
    .from("departments")
    .select("id, name, icon")
    .eq("is_active", true);

  const complaints = rows ?? [];
  const total = complaints.length;

  // Mean time to resolution across everything that actually reached a
  // resolved/closed state.
  const resolvedDurations = complaints
    .filter((c) => c.resolved_at && c.created_at)
    .map((c) => new Date(c.resolved_at!).getTime() - new Date(c.created_at!).getTime())
    .filter((ms) => ms >= 0);

  const avgHours = resolvedDurations.length
    ? hours(resolvedDurations.reduce((a, b) => a + b, 0) / resolvedDurations.length)
    : null;

  const resolvedCount = complaints.filter(
    (c) => c.status === "resolved" || c.status === "closed",
  ).length;
  const resolutionRate = total ? Math.round((resolvedCount / total) * 100) : 0;

  const avgRating = ratings?.length
    ? (ratings.reduce((a, r) => a + r.rating, 0) / ratings.length).toFixed(1)
    : null;

  // Per-status and per-department tallies.
  const byStatus = new Map<string, number>();
  const byDepartment = new Map<string, number>();
  for (const c of complaints) {
    byStatus.set(c.status!, (byStatus.get(c.status!) ?? 0) + 1);
    if (c.department_id) {
      byDepartment.set(c.department_id, (byDepartment.get(c.department_id) ?? 0) + 1);
    }
  }

  const departmentRows = (departments ?? [])
    .map((d) => ({ ...d, count: byDepartment.get(d.id) ?? 0 }))
    .sort((a, b) => b.count - a.count);

  const maxDepartmentCount = Math.max(1, ...departmentRows.map((d) => d.count));

  return (
    <AppShell
      role={user.profile.role}
      user={{ name: user.profile.name, avatarUrl: user.profile.avatar_url }}
      title="Analytics"
      unreadCount={unreadCount}
    >
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-headline-lg text-on-surface font-bold">Analytics</h1>
          <p className="text-body-md text-on-surface-variant mt-1">
            Across all {total} complaint{total === 1 ? "" : "s"}.
          </p>
        </div>
        <ButtonLink href="/api/export/complaints" variant="secondary" icon="file_download" size="sm">
          Export CSV
        </ButtonLink>
      </div>

      {total === 0 ? (
        <EmptyState
          icon="analytics"
          title="No data yet"
          description="Figures appear here once complaints start coming in."
        />
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Total" value={total} icon="folder_open" tone="primary" />
            <StatCard label="Resolution rate" value={`${resolutionRate}%`} icon="percent" tone="success" />
            <StatCard
              label="Avg. resolution"
              value={avgHours === null ? "—" : avgHours < 24 ? `${avgHours.toFixed(1)}h` : `${(avgHours / 24).toFixed(1)}d`}
              icon="timer"
              tone="secondary"
            />
            <StatCard label="Avg. rating" value={avgRating ?? "—"} icon="star" tone="tertiary" />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card radius="xl" className="p-6">
              <CardTitle className="mb-4">
                <Icon name="pending" className="text-outline" />
                By status
              </CardTitle>
              <ul className="flex flex-col gap-3">
                {STATUS_ORDER.map((s) => {
                  const count = byStatus.get(s) ?? 0;
                  const pct = total ? (count / total) * 100 : 0;
                  return (
                    <li key={s} className="flex items-center gap-3">
                      <span className="text-body-md text-on-surface-variant w-28 shrink-0">
                        {STATUS_META[s].label}
                      </span>
                      <div className="bg-surface-container-high h-2 flex-1 overflow-hidden rounded-full">
                        <div
                          className={cn("h-full rounded-full", TONE_CLASSES[STATUS_META[s].tone].dot)}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-label-sm text-on-surface w-10 shrink-0 text-right font-mono">
                        {count}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </Card>

            <Card radius="xl" className="p-6">
              <CardTitle className="mb-4">
                <Icon name="domain" className="text-outline" />
                By department
              </CardTitle>
              <ul className="flex flex-col gap-3">
                {departmentRows.slice(0, 8).map((d) => (
                  <li key={d.id} className="flex items-center gap-3">
                    <span className="text-body-md text-on-surface-variant w-32 shrink-0 truncate">
                      {d.name}
                    </span>
                    <div className="bg-surface-container-high h-2 flex-1 overflow-hidden rounded-full">
                      <div
                        className="bg-primary h-full rounded-full"
                        style={{ width: `${(d.count / maxDepartmentCount) * 100}%` }}
                      />
                    </div>
                    <span className="text-label-sm text-on-surface w-10 shrink-0 text-right font-mono">
                      {d.count}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </>
      )}
    </AppShell>
  );
}
