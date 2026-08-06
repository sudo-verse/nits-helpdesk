import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { ComplaintRow } from "@/components/complaints/complaint-row";
import { AppShell } from "@/components/layout/app-shell";
import { ButtonLink } from "@/components/ui/button";
import { Chip, ChipRail } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { ListSkeleton, StatCardSkeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import { requireUser } from "@/lib/auth/session";
import type { IconName } from "@/lib/icons";
import { getStatusCounts, listMyComplaints } from "@/lib/repositories/complaints";
import { getDepartments, getUnreadCount } from "@/lib/repositories/reference";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Dashboard" };

async function Stats({ countsPromise }: { countsPromise: ReturnType<typeof getStatusCounts> }) {
  const counts = await countsPromise;

  // "Pending" groups everything not yet actively worked, matching the design's
  // four-tile summary rather than one tile per database status.
  const pending = counts.submitted + counts.assigned + counts.under_review;

  return (
    <div className="mb-12 grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard label="Total" value={counts.total} icon="folder_open" tone="primary" href="/complaints" />
      <StatCard label="Pending" value={pending} icon="hourglass_empty" tone="error" href="/complaints?status=submitted" />
      <StatCard label="In Progress" value={counts.in_progress} icon="sync" tone="secondary" href="/complaints?status=in_progress" />
      <StatCard label="Resolved" value={counts.resolved + counts.closed} icon="check_circle" tone="success" href="/complaints?status=resolved" />
    </div>
  );
}

async function RecentComplaints({
  itemsPromise,
}: {
  itemsPromise: ReturnType<typeof listMyComplaints>;
}) {
  const { items } = await itemsPromise;

  if (!items.length) {
    return (
      <EmptyState
        icon="inbox"
        title="No complaints yet"
        description="When you report an issue it will appear here so you can track its progress."
        action={<ButtonLink href="/complaints/new" icon="add_circle">Report Complaint</ButtonLink>}
      />
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map((c) => (
        <ComplaintRow
          key={c.id}
          code={c.complaint_code}
          title={c.title}
          status={c.status}
          icon={c.department?.icon as IconName | undefined}
          createdAt={c.created_at}
        />
      ))}
    </div>
  );
}

export default async function DashboardPage() {
  const user = await requireUser();
  const supabase = await createClient();

  // Fired together rather than split between an eager Promise.all and later
  // Suspense-triggered fetches — all four are independent once we have the
  // user id, and starting them in one batch collapses what would otherwise be
  // two sequential network round trips into one.
  const statsPromise = getStatusCounts(supabase, { userId: user.id });
  const recentPromise = listMyComplaints(supabase, user.id, {}, { limit: 5, offset: 0 });
  const [departments, unreadCount] = await Promise.all([
    getDepartments(),
    getUnreadCount(),
  ]);

  const firstName = user.profile.name?.split(" ")[0] ?? "there";

  return (
    <AppShell
      role={user.profile.role}
      user={{ name: user.profile.name, avatarUrl: user.profile.avatar_url }}
      title="NITS HelpDesk"
      unreadCount={unreadCount}
    >
      <div className="mb-6">
        <h1 className="text-headline-lg-mobile md:text-headline-lg text-on-background font-bold">
          Hello, {firstName} 👋
        </h1>
        <p className="text-body-md text-on-surface-variant mt-1">
          Here is an overview of your active tickets and campus updates.
        </p>
      </div>

      <div className="mb-12 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <ButtonLink
          href="/complaints/new"
          icon="add_circle"
          className="w-full justify-center sm:w-auto"
        >
          Report Complaint
        </ButtonLink>

        <ChipRail className="w-full sm:w-auto">
          {departments.slice(0, 6).map((d) => (
            <Link key={d.id} href={`/complaints?department=${d.id}`}>
              <Chip icon={d.icon as IconName} tabIndex={-1}>
                {d.name}
              </Chip>
            </Link>
          ))}
        </ChipRail>
      </div>

      {/* Streamed independently so a slow count query never blocks the list. */}
      <Suspense
        fallback={
          <div className="mb-12 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => <StatCardSkeleton key={i} />)}
          </div>
        }
      >
        <Stats countsPromise={statsPromise} />
      </Suspense>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-title-md text-on-background font-semibold">
            Recent Complaints
          </h2>
          <Link
            href="/complaints"
            className="text-body-md text-primary hover:underline underline-offset-4"
          >
            View all
          </Link>
        </div>
        <Suspense fallback={<ListSkeleton count={3} />}>
          <RecentComplaints itemsPromise={recentPromise} />
        </Suspense>
      </section>
    </AppShell>
  );
}
