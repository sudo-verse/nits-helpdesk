import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AttachmentGallery } from "@/components/complaints/attachment-gallery";
import { CommentThread, type CommentItem } from "@/components/complaints/comment-thread";
import { FeedbackForm } from "@/components/complaints/feedback-form";
import { StatusTimeline, type TimelineEntry } from "@/components/complaints/status-timeline";
import { AppShell } from "@/components/layout/app-shell";
import { AssignControl } from "@/components/admin/assign-control";
import { StatusControl } from "@/components/staff/status-control";
import { Avatar } from "@/components/ui/avatar";
import { Badge, PriorityBadge, StatusBadge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { isAdminRole, isStaffRole, requireUser } from "@/lib/auth/session";
import {
  getAttachments,
  getComments,
  getComplaintByCode,
  getFeedback,
  getStatusHistory,
} from "@/lib/repositories/complaints";
import { getUnreadCount } from "@/lib/repositories/reference";
import { createClient } from "@/lib/supabase/server";
import { formatDate, reporterLabel, toIsoOrUndefined } from "@/lib/utils/format";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  return { title: `Complaint ${code}` };
}

function InfoCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-label-sm text-outline mb-1 font-mono tracking-wider uppercase">
        {label}
      </p>
      <div className="text-title-md text-on-surface">{children}</div>
    </div>
  );
}

export default async function ComplaintDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ created?: string; upload_error?: string }>;
}) {
  const user = await requireUser();
  const { code } = await params;
  const { created, upload_error: uploadError } = await searchParams;

  const supabase = await createClient();
  const staff = isStaffRole(user.profile.role);
  const isAdmin = isAdminRole(user.profile.role);

  // Read the base table only when this user could be the reporter — that is
  // the one case v_complaints would over-redact. Everyone else gets the view.
  const owned = await getComplaintByCode(supabase, code, true);
  const complaint = owned ?? (await getComplaintByCode(supabase, code, false));

  // RLS returning nothing is indistinguishable from "does not exist", which is
  // the correct response: a 403 would confirm the complaint is real.
  if (!complaint) notFound();

  const isOwner = complaint.created_by === user.id;

  const [history, attachments, comments, feedback, unreadCount] = await Promise.all([
    getStatusHistory(supabase, complaint.id),
    getAttachments(supabase, complaint.id),
    getComments(supabase, complaint.id),
    getFeedback(supabase, complaint.id),
    getUnreadCount(),
  ]);

  // The reporter's name comes from a separate lookup, because v_complaints
  // deliberately nulls created_by on anonymous reports.
  let reporterName: string | null = null;
  if (complaint.created_by) {
    const { data } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", complaint.created_by)
      .maybeSingle();
    reporterName = data?.name ?? null;
  }

  let assigneeName: string | null = null;
  if (complaint.assigned_to) {
    const { data } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", complaint.assigned_to)
      .maybeSingle();
    assigneeName = data?.name ?? null;
  }

  const timeline: TimelineEntry[] = history.map((h) => ({
    status: h.to_status,
    createdAt: h.created_at,
    note: h.note,
    actorName: (h.actor as { name: string | null } | null)?.name ?? null,
  }));

  const evidence = attachments.filter((a) => a.kind === "evidence");
  const resolutionFiles = attachments.filter((a) => a.kind === "resolution");

  // Only admins can reassign, so only they need the staff list.
  let staffOptions: Array<{ id: string; name: string | null }> = [];
  if (isAdmin) {
    const { data } = await supabase
      .from("profiles")
      .select("id, name")
      .in("role", ["staff", "admin", "super_admin"])
      .eq("is_active", true)
      .order("name");
    staffOptions = data ?? [];
  }

  return (
    <AppShell
      role={user.profile.role}
      user={{ name: user.profile.name, avatarUrl: user.profile.avatar_url }}
      title={`Complaint ${complaint.complaint_code}`}
      showBack
      backHref="/complaints"
      unreadCount={unreadCount}
    >
      {created && (
        <div
          role="status"
          className="bg-success/10 border-success/30 text-success mb-6 flex items-start gap-2 rounded-lg border p-3"
        >
          <Icon name="check_circle" size={20} className="mt-0.5 shrink-0" />
          <p className="text-body-md">
            Your complaint has been filed as{" "}
            <span className="font-mono">{complaint.complaint_code}</span>. You will be
            notified as it progresses.
          </p>
        </div>
      )}

      {uploadError && (
        <div
          role="alert"
          className="bg-error/10 border-error/30 text-error mb-6 flex items-start gap-2 rounded-lg border p-3"
        >
          <Icon name="warning" size={20} className="mt-0.5 shrink-0" />
          <p className="text-body-md">
            The complaint was saved, but some attachments failed: {uploadError}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: details, evidence, comments */}
        <div className="flex flex-col gap-6 lg:col-span-7">
          <Card radius="xl" className="flex flex-col gap-4 p-6">
            <div className="border-surface-variant flex flex-wrap items-center justify-between gap-4 border-b pb-4">
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge status={complaint.status} />
                <PriorityBadge priority={complaint.priority} />
                {complaint.is_anonymous && (
                  <Badge tone="neutral" icon="visibility_off">Anonymous</Badge>
                )}
              </div>
              <time
                dateTime={toIsoOrUndefined(complaint.created_at)}
                className="text-label-sm text-on-surface-variant font-mono"
              >
                Reported: {formatDate(complaint.created_at)}
              </time>
            </div>

            <div>
              <h2 className="text-title-md text-on-surface mb-2 font-semibold">
                {complaint.title}
              </h2>
              <p className="text-on-surface-variant whitespace-pre-wrap">
                {complaint.description}
              </p>
            </div>

            <div className="bg-surface-container-low border-outline-variant/20 mt-2 grid grid-cols-2 gap-4 rounded-lg border p-4 md:grid-cols-4">
              <InfoCell label="Department">{complaint.department?.name ?? "—"}</InfoCell>
              <InfoCell label="Location">
                {complaint.location ?? complaint.hostel?.name ?? "—"}
              </InfoCell>
              <InfoCell label="Category">{complaint.category ?? "—"}</InfoCell>
              <InfoCell label="Assigned Staff">
                {assigneeName ? (
                  <span className="flex items-center gap-2">
                    <Avatar name={assigneeName} size={24} />
                    {assigneeName}
                  </span>
                ) : (
                  <span className="text-outline">Unassigned</span>
                )}
              </InfoCell>
              {staff && (
                <InfoCell label="Reported by">
                  {reporterLabel(reporterName, complaint.is_anonymous)}
                </InfoCell>
              )}
            </div>
          </Card>

          {evidence.length > 0 && (
            <Card radius="xl" className="p-6">
              <AttachmentGallery attachments={evidence} />
            </Card>
          )}

          {complaint.resolution_note && (
            <Card radius="xl" className="p-6">
              <CardTitle className="mb-4">
                <Icon name="task_alt" className="text-success" />
                Resolution
              </CardTitle>
              <p className="text-on-surface-variant whitespace-pre-wrap">
                {complaint.resolution_note}
              </p>
              {resolutionFiles.length > 0 && (
                <div className="mt-4">
                  <AttachmentGallery
                    attachments={resolutionFiles}
                    title="Proof of work"
                  />
                </div>
              )}
            </Card>
          )}

          <Card radius="xl" className="p-6">
            <CommentThread
              complaintId={complaint.id}
              complaintCode={complaint.complaint_code}
              comments={comments as unknown as CommentItem[]}
              currentUserId={user.id}
              canPostInternal={staff}
            />
          </Card>
        </div>

        {/* Right: timeline and feedback */}
        <div className="flex flex-col gap-6 lg:col-span-5">
          <Card radius="xl" className="p-6">
            <CardTitle className="mb-6">
              <Icon name="timeline" className="text-outline" />
              Resolution Progress
            </CardTitle>
            <StatusTimeline history={timeline} currentStatus={complaint.status} />
          </Card>

          {staff && (
            <Card radius="xl" className="p-6">
              <StatusControl
                complaintId={complaint.id}
                complaintCode={complaint.complaint_code}
                currentStatus={complaint.status}
                currentResolutionNote={complaint.resolution_note}
              />
            </Card>
          )}

          {isAdmin && (
            <Card radius="xl" className="p-6">
              <AssignControl
                complaintId={complaint.id}
                complaintCode={complaint.complaint_code}
                currentAssigneeId={complaint.assigned_to}
                staffOptions={staffOptions}
              />
            </Card>
          )}

          {isOwner && complaint.status === "closed" && (
            <Card radius="xl" className="p-6">
              <FeedbackForm
                complaintId={complaint.id}
                complaintCode={complaint.complaint_code}
                existing={feedback}
              />
            </Card>
          )}
        </div>
      </div>
    </AppShell>
  );
}
