"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionState } from "@/lib/actions/auth";
import { requireAdmin, requireStaff } from "@/lib/auth/session";
import { ALLOWED_MIME_TYPES, MAX_UPLOAD_BYTES, STORAGE_BUCKETS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";

const statusSchema = z.object({
  complaintId: z.uuid(),
  complaintCode: z.string().min(1),
  status: z.enum([
    "submitted",
    "assigned",
    "under_review",
    "in_progress",
    "resolved",
    "closed",
  ]),
  resolutionNote: z.string().trim().max(5000).optional().or(z.literal("")),
});

/**
 * Move a complaint through the workflow.
 *
 * The legal-transition graph lives in the validate_status_transition trigger,
 * not here — this maps the resulting Postgres error into a readable message.
 * Duplicating the graph in TypeScript would guarantee the two drift apart.
 */
export async function updateComplaintStatus(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireStaff();

  const parsed = statusSchema.safeParse({
    complaintId: formData.get("complaintId"),
    complaintCode: formData.get("complaintCode"),
    status: formData.get("status"),
    // The note field only exists in the DOM for resolved/closed — absent
    // fields come back as `null`, which `.optional()` rejects (it only
    // widens to `string | undefined`).
    resolutionNote: formData.get("resolutionNote") ?? undefined,
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Invalid status change.",
    };
  }

  const { complaintId, complaintCode, status, resolutionNote } = parsed.data;

  if ((status === "resolved" || status === "closed") && !resolutionNote?.trim()) {
    return {
      status: "error",
      message: "Describe what was done before marking this resolved.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("complaints")
    .update({
      status,
      ...(resolutionNote?.trim() ? { resolution_note: resolutionNote.trim() } : {}),
    })
    .eq("id", complaintId);

  if (error) {
    if (error.message.includes("Invalid status transition")) {
      return {
        status: "error",
        message: "That status change is not allowed from the current stage.",
      };
    }
    console.error("[updateComplaintStatus]", error.message);
    return { status: "error", message: "Could not update the status." };
  }

  // Attach any proof-of-work images supplied alongside the resolution.
  const files = formData.getAll("resolutionFiles").filter((f): f is File => f instanceof File);
  const user = await requireStaff();
  for (const file of files) {
    if (file.size === 0) continue;
    if (file.size > MAX_UPLOAD_BYTES) continue;
    if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(file.type)) continue;

    const extension =
      file.type === "application/pdf" ? "pdf" : file.type === "image/png" ? "png" : "jpg";
    const path = `${complaintId}/${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKETS.attachments)
      .upload(path, file, { contentType: file.type });

    if (uploadError) continue;

    const {
      data: { publicUrl },
    } = supabase.storage.from(STORAGE_BUCKETS.attachments).getPublicUrl(path);

    await supabase.from("complaint_images").insert({
      complaint_id: complaintId,
      uploaded_by: user.id,
      storage_path: path,
      public_url: publicUrl,
      file_name: file.name.slice(0, 255),
      mime_type: file.type,
      size_bytes: file.size,
      kind: "resolution",
    });
  }

  revalidatePath(`/complaints/${complaintCode}`);
  revalidatePath(`/staff/${complaintCode}`);
  revalidatePath("/staff");
  revalidatePath("/admin");

  return { status: "success", message: "Status updated." };
}

const assignSchema = z.object({
  complaintId: z.uuid(),
  complaintCode: z.string().min(1),
  staffId: z.uuid("Choose a staff member."),
});

/**
 * Assign a complaint. Admin-only: the RLS update policy lets any servicing
 * staff member write, so the role check here is what actually restricts
 * re-assignment to coordinators.
 */
export async function assignComplaint(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const parsed = assignSchema.safeParse({
    complaintId: formData.get("complaintId"),
    complaintCode: formData.get("complaintCode"),
    staffId: formData.get("staffId"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Choose a staff member.",
    };
  }

  const { complaintId, complaintCode, staffId } = parsed.data;
  const supabase = await createClient();

  // The complaints_on_update trigger records the staff_assignments row,
  // writes the activity log and notifies both parties.
  const { data: current } = await supabase
    .from("complaints")
    .select("status")
    .eq("id", complaintId)
    .single();

  const { error } = await supabase
    .from("complaints")
    .update({
      assigned_to: staffId,
      // Advance out of 'submitted' so the timeline reflects the assignment.
      ...(current?.status === "submitted" ? { status: "assigned" as const } : {}),
    })
    .eq("id", complaintId);

  if (error) {
    console.error("[assignComplaint]", error.message);
    return { status: "error", message: "Could not assign that complaint." };
  }

  revalidatePath(`/complaints/${complaintCode}`);
  revalidatePath("/admin/tasks");
  revalidatePath("/staff");

  return { status: "success", message: "Assigned." };
}
