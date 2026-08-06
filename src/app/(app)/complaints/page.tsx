import type { Metadata } from "next";
import Link from "next/link";

import { ComplaintCard } from "@/components/complaints/complaint-card";
import { ComplaintFilters } from "@/components/complaints/complaint-filters";
import { AppShell } from "@/components/layout/app-shell";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { requireUser } from "@/lib/auth/session";
import type { ComplaintPriority, ComplaintStatus } from "@/lib/constants";
import type { IconName } from "@/lib/icons";
import { listMyComplaints, type ComplaintFilters as Filters } from "@/lib/repositories/complaints";
import { getDepartments, getHostels, getUnreadCount } from "@/lib/repositories/reference";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils/cn";

export const metadata: Metadata = { title: "My complaints" };

const PAGE_SIZE = 12;
const VALID_STATUSES: readonly string[] = [
  "submitted", "assigned", "under_review", "in_progress", "resolved", "closed",
];

type SearchParams = {
  q?: string;
  status?: string;
  department?: string;
  hostel?: string;
  priority?: string;
  page?: string;
};

export default async function ComplaintsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireUser();
  const sp = await searchParams;

  const [departments, hostels, unreadCount] = await Promise.all([
    getDepartments(),
    getHostels(),
    getUnreadCount(),
  ]);

  // Validate every URL parameter before it reaches a query — these are
  // attacker-controlled strings, not trusted input.
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const filters: Filters = {
    search: sp.q,
    status: VALID_STATUSES.includes(sp.status ?? "")
      ? (sp.status as ComplaintStatus)
      : undefined,
    departmentId: departments.some((d) => d.id === sp.department)
      ? sp.department
      : undefined,
    hostelId: hostels.some((h) => h.id === sp.hostel) ? sp.hostel : undefined,
    priority: ["low", "medium", "high"].includes(sp.priority ?? "")
      ? (sp.priority as ComplaintPriority)
      : undefined,
  };

  const supabase = await createClient();
  const { items, total } = await listMyComplaints(supabase, user.id, filters, {
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters = Boolean(
    sp.q || filters.status || filters.departmentId || filters.hostelId,
  );

  function pageHref(target: number) {
    const merged = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (v) merged.set(k, v);
    merged.set("page", String(target));
    return `/complaints?${merged.toString()}`;
  }

  return (
    <AppShell
      role={user.profile.role}
      user={{ name: user.profile.name, avatarUrl: user.profile.avatar_url }}
      title="Complaints"
      unreadCount={unreadCount}
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-headline-lg text-on-background hidden font-bold md:block">
          Complaints History
        </h1>
        <ButtonLink href="/complaints/new" icon="add_circle" size="sm">
          New complaint
        </ButtonLink>
      </div>

      <div className="mb-6">
        <ComplaintFilters departments={departments} hostels={hostels} />
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={hasFilters ? "search" : "inbox"}
          title={hasFilters ? "No complaints match those filters" : "No complaints yet"}
          description={
            hasFilters
              ? "Try clearing a filter or searching for something else."
              : "When you report an issue it will appear here so you can track its progress."
          }
          action={
            hasFilters ? (
              <ButtonLink href="/complaints" variant="secondary">Clear filters</ButtonLink>
            ) : (
              <ButtonLink href="/complaints/new" icon="add_circle">Report Complaint</ButtonLink>
            )
          }
        />
      ) : (
        <>
          <p className="text-body-md text-on-surface-variant mb-4">
            {total} complaint{total === 1 ? "" : "s"}
          </p>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {items.map((c) => (
              <ComplaintCard
                key={c.id}
                code={c.complaint_code}
                title={c.title}
                status={c.status}
                departmentName={c.department?.name ?? "Unassigned"}
                departmentIcon={c.department?.icon as IconName | undefined}
                createdAt={c.created_at}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <nav
              aria-label="Pagination"
              className="mt-8 flex items-center justify-center gap-2"
            >
              <Link
                href={pageHref(page - 1)}
                aria-disabled={page === 1}
                className={cn(
                  "text-body-md rounded-lg px-4 py-2 transition-colors",
                  page === 1
                    ? "text-outline pointer-events-none opacity-50"
                    : "text-primary hover:bg-surface-container-high",
                )}
              >
                Previous
              </Link>
              <span className="text-label-sm text-on-surface-variant font-mono">
                {page} / {totalPages}
              </span>
              <Link
                href={pageHref(page + 1)}
                aria-disabled={page === totalPages}
                className={cn(
                  "text-body-md rounded-lg px-4 py-2 transition-colors",
                  page === totalPages
                    ? "text-outline pointer-events-none opacity-50"
                    : "text-primary hover:bg-surface-container-high",
                )}
              >
                Next
              </Link>
            </nav>
          )}
        </>
      )}
    </AppShell>
  );
}
