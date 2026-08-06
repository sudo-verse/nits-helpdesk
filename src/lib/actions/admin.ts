"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionState } from "@/lib/actions/auth";
import { requireAdmin, requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

// ---------------------------------------------------------------- users ----

const roleSchema = z.object({
  userId: z.uuid(),
  role: z.enum(["student", "staff", "admin", "super_admin"]),
  departmentId: z.uuid().optional().or(z.literal("")),
});

/**
 * Change a user's role.
 *
 * Restricted to super_admin by the profiles_guard_privileged_columns trigger —
 * a plain admin calling this gets a 42501 from Postgres, which is mapped to a
 * readable message below. The check is in the database, not here.
 */
export async function updateUserRole(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireAdmin();

  const parsed = roleSchema.safeParse({
    userId: formData.get("userId"),
    role: formData.get("role"),
    departmentId: formData.get("departmentId"),
  });

  if (!parsed.success) return { status: "error", message: "Invalid role change." };

  const { userId, role, departmentId } = parsed.data;

  if (userId === actor.id) {
    return { status: "error", message: "You cannot change your own role." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ role, ...(departmentId ? { department_id: departmentId } : {}) })
    .eq("id", userId);

  if (error) {
    if (error.code === "42501") {
      return { status: "error", message: "Only a super admin can change roles." };
    }
    return { status: "error", message: "Could not update that user." };
  }

  revalidatePath("/admin/users");
  return { status: "success", message: "User updated." };
}

export async function setUserActive(
  userId: string,
  isActive: boolean,
): Promise<ActionState> {
  const actor = await requireAdmin();

  if (userId === actor.id) {
    return { status: "error", message: "You cannot deactivate your own account." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ is_active: isActive })
    .eq("id", userId);

  if (error) return { status: "error", message: "Could not update that account." };

  revalidatePath("/admin/users");
  return { status: "success", message: isActive ? "Account enabled." : "Account disabled." };
}

// ---------------------------------------------------------- departments ----

const departmentSchema = z.object({
  id: z.uuid().optional().or(z.literal("")),
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().max(300).optional().or(z.literal("")),
  icon: z.string().trim().min(1).max(50),
  colorToken: z.enum(["primary", "secondary", "tertiary", "error", "success"]),
});

export async function upsertDepartment(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const parsed = departmentSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    description: formData.get("description"),
    icon: formData.get("icon"),
    colorToken: formData.get("colorToken"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Check the fields.",
    };
  }

  const { id, name, description, icon, colorToken } = parsed.data;
  const supabase = await createClient();

  const payload = {
    name,
    slug: slugify(name),
    description: description || null,
    icon,
    color_token: colorToken,
  };

  const { error } = id
    ? await supabase.from("departments").update(payload).eq("id", id)
    : await supabase.from("departments").insert(payload);

  if (error) {
    if (error.code === "23505") {
      return { status: "error", message: "A department with that name already exists." };
    }
    return { status: "error", message: "Could not save that department." };
  }

  revalidatePath("/admin/departments");
  revalidatePath("/", "layout");
  return { status: "success", message: id ? "Department updated." : "Department created." };
}

export async function setDepartmentActive(
  id: string,
  isActive: boolean,
): Promise<ActionState> {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("departments")
    .update({ is_active: isActive })
    .eq("id", id);

  if (error) return { status: "error", message: "Could not update that department." };

  revalidatePath("/admin/departments");
  return { status: "success" };
}

// -------------------------------------------------------- announcements ----

const announcementSchema = z.object({
  id: z.uuid().optional().or(z.literal("")),
  title: z.string().trim().min(3).max(200),
  body: z.string().trim().min(3).max(5000),
  departmentId: z.uuid().optional().or(z.literal("")),
  isPinned: z.coerce.boolean().default(false),
  isPublished: z.coerce.boolean().default(false),
});

export async function upsertAnnouncement(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireAdmin();

  const parsed = announcementSchema.safeParse({
    id: formData.get("id"),
    title: formData.get("title"),
    body: formData.get("body"),
    departmentId: formData.get("departmentId"),
    isPinned: formData.get("isPinned") === "on",
    isPublished: formData.get("isPublished") === "on",
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Check the fields.",
    };
  }

  const { id, title, body, departmentId, isPinned, isPublished } = parsed.data;
  const supabase = await createClient();

  // The notify_on_announcement trigger fans this out to every matching user
  // the moment published_at is set, so it must only be set on publish.
  const payload = {
    title,
    body,
    department_id: departmentId || null,
    is_pinned: isPinned,
    is_published: isPublished,
    published_at: isPublished ? new Date().toISOString() : null,
    author_id: user.id,
  };

  const { error } = id
    ? await supabase.from("announcements").update(payload).eq("id", id)
    : await supabase.from("announcements").insert(payload);

  if (error) {
    console.error("[upsertAnnouncement]", error.message);
    return { status: "error", message: "Could not save that announcement." };
  }

  revalidatePath("/admin/announcements");
  revalidatePath("/announcements");
  return { status: "success", message: isPublished ? "Published." : "Saved as draft." };
}

export async function deleteAnnouncement(id: string): Promise<ActionState> {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase.from("announcements").delete().eq("id", id);
  if (error) return { status: "error", message: "Could not delete that." };

  revalidatePath("/admin/announcements");
  revalidatePath("/announcements");
  return { status: "success", message: "Deleted." };
}

// ------------------------------------------------------------------ faq ----

const faqSchema = z.object({
  id: z.uuid().optional().or(z.literal("")),
  question: z.string().trim().min(5).max(300),
  answer: z.string().trim().min(5).max(5000),
  category: z.string().trim().max(60).optional().or(z.literal("")),
  displayOrder: z.coerce.number().int().min(0).max(999).default(0),
  isPublished: z.coerce.boolean().default(true),
});

export async function upsertFaq(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const parsed = faqSchema.safeParse({
    id: formData.get("id"),
    question: formData.get("question"),
    answer: formData.get("answer"),
    category: formData.get("category"),
    displayOrder: formData.get("displayOrder") ?? 0,
    isPublished: formData.get("isPublished") === "on",
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Check the fields.",
    };
  }

  const { id, question, answer, category, displayOrder, isPublished } = parsed.data;
  const supabase = await createClient();

  const payload = {
    question,
    answer,
    category: category || null,
    display_order: displayOrder,
    is_published: isPublished,
  };

  const { error } = id
    ? await supabase.from("faq").update(payload).eq("id", id)
    : await supabase.from("faq").insert(payload);

  if (error) return { status: "error", message: "Could not save that entry." };

  revalidatePath("/admin/faq");
  revalidatePath("/faq");
  return { status: "success", message: "Saved." };
}

export async function deleteFaq(id: string): Promise<ActionState> {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase.from("faq").delete().eq("id", id);
  if (error) return { status: "error", message: "Could not delete that." };

  revalidatePath("/admin/faq");
  revalidatePath("/faq");
  return { status: "success", message: "Deleted." };
}

/** Used by the admin user list to look up who exists. Admin-gated by RLS. */
export async function searchUsers(query: string) {
  await requireUser({ roles: ["admin", "super_admin"] });
  const supabase = await createClient();

  const term = query.trim().replace(/[%_,()\\]/g, "");
  let q = supabase
    .from("profiles")
    .select("id, name, email, role, is_active, department_id, roll_number")
    .order("created_at", { ascending: false })
    .limit(100);

  if (term) q = q.or(`name.ilike.%${term}%,email.ilike.%${term}%,roll_number.ilike.%${term}%`);

  const { data } = await q;
  return data ?? [];
}
