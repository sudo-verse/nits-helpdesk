"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionState } from "@/lib/actions/auth";
import { requireUser } from "@/lib/auth/session";
import {
  ALLOWED_AVATAR_MIME_TYPES,
  MAX_AVATAR_BYTES,
  STORAGE_BUCKETS,
} from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import { fieldErrorsFrom } from "@/lib/utils/zod";

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
