"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { ActionState } from "@/lib/actions/auth";
import { requireUser } from "@/lib/auth/session";
import { ALLOWED_MIME_TYPES, MAX_UPLOAD_BYTES, STORAGE_BUCKETS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/utils/rate-limit";
import {
  commentSchema,
  complaintSchema,
  feedbackSchema,
} from "@/lib/validations/complaint";

function fieldErrorsFrom(error: {
  issues: Array<{ path: PropertyKey[]; message: string }>;
}) {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return fieldErrors;
}

/**
 * File extension derived from the MIME type rather than the supplied filename.
 * A name like "photo.png.exe" must not decide what lands in storage.
 */
const EXTENSION_BY_MIME: Record<(typeof ALLOWED_MIME_TYPES)[number], string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "application/pdf": "pdf",
};

function isAllowedMime(type: string): type is (typeof ALLOWED_MIME_TYPES)[number] {
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(type);
}

export async function createComplaint(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = complaintSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    departmentId: formData.get("departmentId"),
    category: formData.get("category"),
    hostelId: formData.get("hostelId"),
    location: formData.get("location"),
    priority: formData.get("priority") ?? "medium",
    isAnonymous: formData.get("isAnonymous") === "on",
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  if (!(await checkRateLimit(`complaint:create:${user.id}`, 10, "1 hour"))) {
    return {
      status: "error",
      message: "You have filed a lot of complaints recently. Try again later.",
    };
  }

  const supabase = await createClient();
  const input = parsed.data;

  // `status` and `assigned_to` are deliberately not set: the RLS insert policy
  // requires status='submitted' and assigned_to=null, and the guard trigger
  // rejects a student touching either afterwards.
  const { data: complaint, error } = await supabase
    .from("complaints")
    .insert({
      title: input.title,
      description: input.description,
      department_id: input.departmentId,
      category: input.category || null,
      hostel_id: input.hostelId || null,
      location: input.location || null,
      priority: input.priority,
      is_anonymous: input.isAnonymous,
      created_by: user.id,
    })
    .select("id, complaint_code")
    .single();

  if (error || !complaint) {
    console.error("[createComplaint]", error?.message);
    return { status: "error", message: "Could not file your complaint. Try again." };
  }

  // Attachments are uploaded after the row exists, because the storage policy
  // authorises writes by complaint folder.
  const files = formData.getAll("attachments").filter((f): f is File => f instanceof File);
  const failed: string[] = [];

  for (const file of files) {
    if (file.size === 0) continue;
    const uploadError = await uploadAttachment(supabase, {
      file,
      complaintId: complaint.id,
      userId: user.id,
      kind: "evidence",
    });
    if (uploadError) failed.push(`${file.name}: ${uploadError}`);
  }

  revalidatePath("/complaints");
  revalidatePath("/dashboard");

  if (failed.length) {
    // The complaint exists; say so rather than implying nothing was saved.
    redirect(
      `/complaints/${complaint.complaint_code}?upload_error=${encodeURIComponent(
        failed.join("; "),
      )}`,
    );
  }

  redirect(`/complaints/${complaint.complaint_code}?created=1`);
}

/**
 * Uploads one file and records it. Returns an error message, or null on success.
 */
async function uploadAttachment(
  supabase: Awaited<ReturnType<typeof createClient>>,
  opts: {
    file: File;
    complaintId: string;
    userId: string;
    kind: "evidence" | "resolution" | "comment";
    commentId?: string;
  },
): Promise<string | null> {
  const { file, complaintId, userId, kind, commentId } = opts;

  // Re-validate server-side. The client already checked, but the client is not
  // a trust boundary.
  if (file.size > MAX_UPLOAD_BYTES) return "larger than 10 MB";
  if (!isAllowedMime(file.type)) return "unsupported file type";

  const extension = EXTENSION_BY_MIME[file.type];
  const path = `${complaintId}/${crypto.randomUUID()}.${extension}`;

  const { error: storageError } = await supabase.storage
    .from(STORAGE_BUCKETS.attachments)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (storageError) {
    console.error("[uploadAttachment] storage", storageError.message);
    return "upload failed";
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(STORAGE_BUCKETS.attachments).getPublicUrl(path);

  const { error: rowError } = await supabase.from("complaint_images").insert({
    complaint_id: complaintId,
    comment_id: commentId ?? null,
    uploaded_by: userId,
    storage_path: path,
    public_url: publicUrl,
    file_name: file.name.slice(0, 255),
    mime_type: file.type,
    size_bytes: file.size,
    kind,
  });

  if (rowError) {
    // Don't leave an orphaned object behind if the row insert is rejected.
    await supabase.storage.from(STORAGE_BUCKETS.attachments).remove([path]);
    console.error("[uploadAttachment] row", rowError.message);
    return "could not be recorded";
  }

  return null;
}

export async function addComment(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = commentSchema.safeParse({
    complaintId: formData.get("complaintId"),
    body: formData.get("body"),
    isInternal: formData.get("isInternal") === "on",
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Could not post that comment.",
    };
  }

  if (!(await checkRateLimit(`comment:${user.id}`, 30, "10 minutes"))) {
    return { status: "error", message: "Slow down a moment, then try again." };
  }

  const supabase = await createClient();
  const { complaintId, body, isInternal } = parsed.data;

  const { data: comment, error } = await supabase
    .from("complaint_comments")
    .insert({
      complaint_id: complaintId,
      author_id: user.id,
      body,
      // RLS rejects a student setting this; forcing false keeps the error to a
      // validation message rather than a policy violation.
      is_internal: isInternal && user.profile.role !== "student",
    })
    .select("id")
    .single();

  if (error || !comment) {
    console.error("[addComment]", error?.message);
    return { status: "error", message: "Could not post that comment." };
  }

  const files = formData.getAll("attachments").filter((f): f is File => f instanceof File);
  for (const file of files) {
    if (file.size === 0) continue;
    await uploadAttachment(supabase, {
      file,
      complaintId,
      userId: user.id,
      kind: "comment",
      commentId: comment.id,
    });
  }

  const code = formData.get("complaintCode");
  if (typeof code === "string") revalidatePath(`/complaints/${code}`);

  return { status: "success" };
}

export async function submitFeedback(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = feedbackSchema.safeParse({
    complaintId: formData.get("complaintId"),
    rating: formData.get("rating"),
    comment: formData.get("comment"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Choose a rating first.",
    };
  }

  const supabase = await createClient();
  const { complaintId, rating, comment } = parsed.data;

  // The validate_feedback trigger enforces "closed only, by the reporter"; the
  // unique constraint on complaint_id enforces "once".
  const { error } = await supabase.from("feedback").insert({
    complaint_id: complaintId,
    student_id: user.id,
    rating,
    comment: comment || null,
  });

  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes("duplicate") || error.code === "23505") {
      return { status: "error", message: "You have already rated this complaint." };
    }
    if (message.includes("closed")) {
      return {
        status: "error",
        message: "You can rate a complaint once it has been closed.",
      };
    }
    return { status: "error", message: "Could not save your feedback." };
  }

  const code = formData.get("complaintCode");
  if (typeof code === "string") revalidatePath(`/complaints/${code}`);

  return { status: "success", message: "Thanks for the feedback." };
}
