import { NextResponse } from "next/server";

import { getSessionUser, isAdminRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

/**
 * CSV export of every complaint the caller may read.
 *
 * Reads through v_complaints, so an anonymous reporter stays redacted even in
 * an export — an admin downloading a spreadsheet must not be a way around the
 * anonymity guarantee.
 */
export async function GET() {
  const user = await getSessionUser();

  if (!user || !isAdminRole(user.profile.role)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("v_complaints")
    .select(
      `complaint_code, title, status, priority, category, location, is_anonymous,
       created_at, resolved_at, closed_at, resolution_note,
       department:departments!complaints_department_id_fkey ( name ),
       hostel:hostels!complaints_hostel_id_fkey ( name )`,
    )
    .order("created_at", { ascending: false })
    .limit(10000);

  if (error) {
    console.error("[export]", error.message);
    return new NextResponse("Export failed", { status: 500 });
  }

  const headers = [
    "Complaint ID",
    "Title",
    "Department",
    "Category",
    "Hostel",
    "Location",
    "Priority",
    "Status",
    "Anonymous",
    "Created",
    "Resolved",
    "Closed",
    "Resolution",
  ];

  const rows = (data ?? []).map((c) => [
    c.complaint_code,
    c.title,
    (c.department as { name: string } | null)?.name ?? "",
    c.category ?? "",
    (c.hostel as { name: string } | null)?.name ?? "",
    c.location ?? "",
    c.priority,
    c.status,
    c.is_anonymous ? "Yes" : "No",
    c.created_at ?? "",
    c.resolved_at ?? "",
    c.closed_at ?? "",
    c.resolution_note ?? "",
  ]);

  const csv = [headers, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\r\n");

  const filename = `nits-helpdesk-complaints-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(`﻿${csv}`, {
    headers: {
      // The BOM makes Excel open UTF-8 correctly instead of mangling accents.
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

/**
 * Quotes a CSV field, and neutralises formula injection.
 *
 * A title beginning `=`, `+`, `-` or `@` is executed as a formula when the CSV
 * is opened in Excel or Sheets — a student could file a complaint titled
 * `=HYPERLINK(...)` and attack whoever opens the export. Prefixing with a
 * single quote renders it as text.
 */
function escapeCsv(value: unknown): string {
  let str = String(value ?? "");
  if (/^[=+\-@\t\r]/.test(str)) str = `'${str}`;
  return `"${str.replace(/"/g, '""')}"`;
}
