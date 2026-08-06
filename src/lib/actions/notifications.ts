"use server";

import { revalidatePath } from "next/cache";

import type { ActionState } from "@/lib/actions/auth";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

/**
 * Notification writes are limited to flipping `is_read` and deleting. RLS
 * scopes every statement to `user_id = auth.uid()`, so the extra `.eq()` here
 * is belt-and-braces rather than the boundary.
 */
export async function markNotificationRead(id: string): Promise<ActionState> {
  const user = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { status: "error", message: "Could not update that notification." };

  revalidatePath("/notifications");
  return { status: "success" };
}

export async function markAllNotificationsRead(): Promise<ActionState> {
  const user = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", user.id)
    .eq("is_read", false);

  if (error) return { status: "error", message: "Could not mark them all as read." };

  revalidatePath("/", "layout");
  return { status: "success", message: "All caught up." };
}
