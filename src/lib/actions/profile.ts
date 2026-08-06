"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionState } from "@/lib/actions/auth";
import { mapAuthError } from "@/lib/actions/map-auth-error";
import { requireUser } from "@/lib/auth/session";
import {
  ALLOWED_AVATAR_MIME_TYPES,
  MAX_AVATAR_BYTES,
  STORAGE_BUCKETS,
} from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/utils/rate-limit";
import { fieldErrorsFrom } from "@/lib/utils/zod";
import { changePasswordSchema } from "@/lib/validations/auth";

const profileSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name.").max(80),
  rollNumber: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9/-]{3,20}$/, "Roll number looks invalid.")
    .optional()
    .or(z.literal("")),
  departmentId: z.uuid().optional().or(z.literal("")),
  hostelId: z.uuid().optional().or(z.literal("")),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9]{10}$/, "Enter a 10-digit phone number.")
    .optional()
    .or(z.literal("")),
});

export async function updateProfile(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    rollNumber: formData.get("rollNumber"),
    departmentId: formData.get("departmentId"),
    hostelId: formData.get("hostelId"),
    phone: formData.get("phone"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  const supabase = await createClient();
  const { name, rollNumber, departmentId, hostelId, phone } = parsed.data;

  // `role`, `is_active` and `email` are absent by design — the
  // profiles_guard_privileged_columns trigger rejects changes to any of them.
  const { error } = await supabase
    .from("profiles")
    .update({
      name,
      roll_number: rollNumber || null,
      department_id: departmentId || null,
      hostel_id: hostelId || null,
      phone: phone || null,
    })
    .eq("id", user.id);

  if (error) {
    console.error("[updateProfile]", error.message);
    return { status: "error", message: "Could not save your profile." };
  }

  revalidatePath("/", "layout");
  return { status: "success", message: "Profile updated." };
}

/**
 * Change password from the profile page, while already signed in.
 *
 * Re-verifies the current password first (for accounts that have one) via a
 * fresh signInWithPassword call, rather than trusting the session alone —
 * this is a campus helpdesk where shared lab/library computers are a real
 * threat model, and a session proves "someone is using this browser," not
 * "this is the account owner." Whether that check applies is re-derived from
 * requireUser()'s own result, not from which fields the client submitted — a
 * replayed request can't skip it by omitting currentPassword.
 */
export async function changePassword(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword") || undefined,
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  if (user.hasPasswordIdentity && !parsed.data.currentPassword) {
    return {
      status: "error",
      message: "Enter your current password.",
      fieldErrors: { currentPassword: ["Required."] },
    };
  }

  if (!(await checkRateLimit(`change-password:${user.id}`, 5, "15 minutes"))) {
    return {
      status: "error",
      message: "Too many attempts. Wait a few minutes and try again.",
    };
  }

  const supabase = await createClient();

  if (user.hasPasswordIdentity && parsed.data.currentPassword) {
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: parsed.data.currentPassword,
    });
    if (verifyError) {
      return {
        status: "error",
        message: "Current password is incorrect.",
        fieldErrors: { currentPassword: ["Current password is incorrect."] },
      };
    }
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.newPassword,
  });
  if (error) return { status: "error", message: mapAuthError(error.message) };

  await supabase.auth.signOut({ scope: "others" });

  return {
    status: "success",
    message: user.hasPasswordIdentity ? "Password updated." : "Password set.",
  };
}

export async function uploadAvatar(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const file = formData.get("avatar");

  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "Choose an image first." };
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return { status: "error", message: "Avatars must be 2 MB or smaller." };
  }
  if (!(ALLOWED_AVATAR_MIME_TYPES as readonly string[]).includes(file.type)) {
    return { status: "error", message: "Use a JPG or PNG image." };
  }

  const supabase = await createClient();
  const extension = file.type === "image/png" ? "png" : "jpg";
  // The storage policy requires the first path segment to be the caller's id.
  const path = `${user.id}/avatar-${Date.now()}.${extension}`;

  const { error: storageError } = await supabase.storage
    .from(STORAGE_BUCKETS.avatars)
    .upload(path, file, { contentType: file.type, upsert: true });

  if (storageError) {
    console.error("[uploadAvatar]", storageError.message);
    return { status: "error", message: "Could not upload that image." };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(STORAGE_BUCKETS.avatars).getPublicUrl(path);

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: publicUrl })
    .eq("id", user.id);

  if (error) {
    await supabase.storage.from(STORAGE_BUCKETS.avatars).remove([path]);
    return { status: "error", message: "Could not save your new photo." };
  }

  revalidatePath("/", "layout");
  return { status: "success", message: "Photo updated." };
}
