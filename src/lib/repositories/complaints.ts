import type { SupabaseClient } from "@supabase/supabase-js";

import type { ComplaintPriority, ComplaintStatus } from "@/lib/constants";
import type { Database } from "@/types/database.types";

export type Client = SupabaseClient<Database>;

/**
 * Columns joined onto a complaint for list and detail views.
 *
 * Reads go through `v_complaints`, never the base table, so an anonymous
 * reporter is redacted at the database rather than in application code. The
 * one exception is a student reading their own complaints — see the note on
 * listMyComplaints.
 */
const COMPLAINT_SELECT = `
  id, complaint_code, title, description, category, location,
  priority, status, is_anonymous, created_by, assigned_to,
  resolution_note, resolved_at, closed_at, created_at, updated_at,
  department:departments!complaints_department_id_fkey ( id, name, slug, icon, color_token ),
  hostel:hostels!complaints_hostel_id_fkey ( id, name )
` as const;

export type ComplaintListItem = {
  id: string;
  complaint_code: string;
  title: string;
  description: string;
  category: string | null;
  location: string | null;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  is_anonymous: boolean;
  created_by: string | null;
  assigned_to: string | null;
  resolution_note: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
  department: {
    id: string;
    name: string;
    slug: string;
    icon: string;
    color_token: string;
  } | null;
  hostel: { id: string; name: string } | null;
};

export type ComplaintFilters = {
  /** A single status, several (e.g. "resolved" + "closed" for the admin queue), or "all". */
  status?: ComplaintStatus | ComplaintStatus[] | "all";
  departmentId?: string;
  hostelId?: string;
  priority?: ComplaintPriority;
  search?: string;
  assignedTo?: string;
  unassignedOnly?: boolean;
  from?: string;
  to?: string;
};

export type Page = { limit: number; offset: number };

/** The subset of the Postgrest builder these filters need. */
export type Filterable<T> = {
  eq(column: string, value: string): T;
  in(column: string, values: string[]): T;
  is(column: string, value: null): T;
  gte(column: string, value: string): T;
  lte(column: string, value: string): T;
  or(filters: string): T;
};

export function applyFilters<T extends Filterable<T>>(
  query: T,
  filters: ComplaintFilters,
): T {
  let q = query;

  if (filters.status && filters.status !== "all") {
    q = Array.isArray(filters.status)
      ? q.in("status", filters.status)
      : q.eq("status", filters.status);
  }
  if (filters.departmentId) q = q.eq("department_id", filters.departmentId);
  if (filters.hostelId) q = q.eq("hostel_id", filters.hostelId);
  if (filters.priority) q = q.eq("priority", filters.priority);
  if (filters.assignedTo) q = q.eq("assigned_to", filters.assignedTo);
  if (filters.unassignedOnly) q = q.is("assigned_to", null);
  if (filters.from) q = q.gte("created_at", filters.from);
  if (filters.to) q = q.lte("created_at", filters.to);

  if (filters.search?.trim()) {
    // PostgREST's `or` uses commas and parentheses as syntax, so a term
    // containing them would alter the filter expression rather than be
    // searched for. Strip them along with the LIKE wildcards.
    const term = filters.search.trim().replace(/[%_,()\\]/g, "");
    if (term) {
      q = q.or(
        `title.ilike.%${term}%,description.ilike.%${term}%,complaint_code.ilike.%${term}%`,
      );
    }
  }

  return q;
}

/**
 * A student's own complaints.
 *
 * Reads the base table rather than the view: the reporter must still see their
 * own identity on their own anonymous reports, which is exactly the case
 * v_complaints redacts.
 */
export async function listMyComplaints(
  supabase: Client,
  userId: string,
  filters: ComplaintFilters = {},
  page: Page = { limit: 20, offset: 0 },
) {
  let query = supabase
    .from("complaints")
    .select(COMPLAINT_SELECT, { count: "exact" })
    .eq("created_by", userId);

  query = applyFilters(query, filters);

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(page.offset, page.offset + page.limit - 1);

  if (error) throw error;
  return { items: (data ?? []) as unknown as ComplaintListItem[], total: count ?? 0 };
}

/**
 * Complaints visible to staff or admins. Always via the anonymity view.
 */
export async function listComplaints(
  supabase: Client,
  filters: ComplaintFilters = {},
  page: Page = { limit: 20, offset: 0 },
) {
  let query = supabase
    .from("v_complaints")
    .select(COMPLAINT_SELECT, { count: "exact" });

  query = applyFilters(query, filters);

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(page.offset, page.offset + page.limit - 1);

  if (error) throw error;
  return { items: (data ?? []) as unknown as ComplaintListItem[], total: count ?? 0 };
}

/**
 * One complaint by its human-readable code.
 *
 * `isOwnerView` selects the base table so a student still sees themselves on
 * their own anonymous report; every other caller gets the redacted view.
 * Returns null when RLS hides the row, which the page renders as a 404 — a
 * "forbidden" would confirm the complaint exists.
 */
export async function getComplaintByCode(
  supabase: Client,
  code: string,
  isOwnerView: boolean,
) {
  // Branched rather than passing a union to .from() — the generated types
  // resolve the row shape from the literal relation name, so a ternary makes
  // every subsequent column reference `never`.
  const { data, error } = isOwnerView
    ? await supabase
        .from("complaints")
        .select(COMPLAINT_SELECT)
        .eq("complaint_code", code)
        .maybeSingle()
    : await supabase
        .from("v_complaints")
        .select(COMPLAINT_SELECT)
        .eq("complaint_code", code)
        .maybeSingle();

  if (error) throw error;
  return (data ?? null) as unknown as ComplaintListItem | null;
}

export async function getStatusHistory(supabase: Client, complaintId: string) {
  const { data, error } = await supabase
    .from("complaint_status_history")
    .select(
      `id, from_status, to_status, note, created_at,
       actor:profiles!complaint_status_history_changed_by_fkey ( id, name )`,
    )
    .eq("complaint_id", complaintId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function getAttachments(supabase: Client, complaintId: string) {
  const { data, error } = await supabase
    .from("complaint_images")
    .select("id, public_url, file_name, mime_type, size_bytes, kind, comment_id, created_at")
    .eq("complaint_id", complaintId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function getComments(supabase: Client, complaintId: string) {
  const { data, error } = await supabase
    .from("complaint_comments")
    .select(
      `id, body, is_internal, created_at, author_id,
       author:profiles!complaint_comments_author_id_fkey ( id, name, avatar_url, role )`,
    )
    .eq("complaint_id", complaintId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function getFeedback(supabase: Client, complaintId: string) {
  const { data, error } = await supabase
    .from("feedback")
    .select("id, rating, comment, created_at")
    .eq("complaint_id", complaintId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export type StatusCounts = Record<ComplaintStatus, number> & { total: number };

const EMPTY_COUNTS: StatusCounts = {
  submitted: 0,
  assigned: 0,
  under_review: 0,
  in_progress: 0,
  resolved: 0,
  closed: 0,
  total: 0,
};

/**
 * Status tallies for the dashboard stat tiles.
 *
 * Selects only the status column and aggregates in JS. At campus scale that is
 * a handful of rows per student and avoids six separate count queries; if a
 * single user ever accumulates thousands of complaints this should become a
 * database-side `group by`.
 */
export async function getStatusCounts(
  supabase: Client,
  opts: { userId?: string; assignedTo?: string; departmentId?: string } = {},
): Promise<StatusCounts> {
  // Branched for the same reason as getComplaintByCode — a union relation name
  // collapses the inferred row type to `never`.
  const build = <T extends Filterable<T>>(q: T): T => {
    let next = q;
    if (opts.userId) next = next.eq("created_by", opts.userId);
    if (opts.assignedTo) next = next.eq("assigned_to", opts.assignedTo);
    if (opts.departmentId) next = next.eq("department_id", opts.departmentId);
    return next;
  };

  const { data, error } = opts.userId
    ? await build(supabase.from("complaints").select("status"))
    : await build(supabase.from("v_complaints").select("status"));

  if (error) throw error;

  const counts: StatusCounts = { ...EMPTY_COUNTS };
  for (const row of data ?? []) {
    const status = row.status as ComplaintStatus | null;
    if (status) counts[status] += 1;
    counts.total += 1;
  }
  return counts;
}
