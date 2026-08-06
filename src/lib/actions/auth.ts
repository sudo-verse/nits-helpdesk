"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/utils/rate-limit";
import {
  onboardingSchema,
  requestOtpSchema,
  verifyOtpSchema,
} from "@/lib/validations/auth";

export type ActionState =
  | { status: "idle" }
  | { status: "error"; message: string; fieldErrors?: Record<string, string[]> }
  | { status: "success"; message?: string };

/**
 * Send a 6-digit OTP to an institute address.
 *
 * `shouldCreateUser: true` lets a first-time student sign in without a separate
 * signup flow. A non-institute address is caught here for the error message and
 * again by the database trigger, which is the actual boundary.
 */
export async function requestOtp(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = requestOtpSchema.safeParse({ email: formData.get("email") });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Enter a valid institute email.",
      fieldErrors: { email: parsed.error.issues.map((i) => i.message) },
    };
  }

  const { email } = parsed.data;

  // Per-address limit stops someone spamming another student's inbox; the
  // per-IP limit stops enumeration across many addresses.
  const ip =
    (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const [emailOk, ipOk] = await Promise.all([
    checkRateLimit(`otp:email:${email}`, 3, "5 minutes"),
    checkRateLimit(`otp:ip:${ip}`, 10, "15 minutes"),
  ]);

  if (!emailOk || !ipOk) {
    return {
      status: "error",
      message: "Too many code requests. Wait a few minutes and try again.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });

  if (error) {
    return { status: "error", message: mapAuthError(error.message) };
  }

  redirect(`/verify?email=${encodeURIComponent(email)}`);
}

export async function verifyOtp(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = verifyOtpSchema.safeParse({
    email: formData.get("email"),
    token: formData.get("token"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Enter the 6-digit code.",
    };
  }

  const { email, token } = parsed.data;

  if (!(await checkRateLimit(`otp:verify:${email}`, 8, "10 minutes"))) {
    return {
      status: "error",
      message: "Too many attempts. Request a new code in a few minutes.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });

  if (error) {
    return { status: "error", message: mapAuthError(error.message) };
  }

  // Where to land is decided by /auth/post-login, which reads the profile.
  redirect("/auth/post-login");
}

export async function signInWithGoogle(): Promise<ActionState> {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      queryParams: {
        // Nudges Google's account chooser toward institute accounts. A
        // convenience only — `hd` can be stripped from the request, so the
        // real restriction remains the handle_new_user() database trigger.
        hd: "nits.ac.in",
        prompt: "select_account",
      },
    },
  });

  if (error) return { status: "error", message: mapAuthError(error.message) };
  if (data.url) redirect(data.url);

  return { status: "error", message: "Could not start Google sign-in." };
}

export async function completeOnboarding(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = onboardingSchema.safeParse({
    name: formData.get("name"),
    rollNumber: formData.get("rollNumber"),
    departmentId: formData.get("departmentId"),
    hostelId: formData.get("hostelId"),
    phone: formData.get("phone"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      (fieldErrors[key] ??= []).push(issue.message);
    }
    return { status: "error", message: "Check the highlighted fields.", fieldErrors };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { name, rollNumber, departmentId, hostelId, phone } = parsed.data;

  // `role` is deliberately absent: the guard trigger rejects any attempt to
  // set it here, and it must never be client-supplied.
  const { error } = await supabase
    .from("profiles")
    .update({
      name,
      roll_number: rollNumber || null,
      department_id: departmentId || null,
      hostel_id: hostelId || null,
      phone: phone || null,
      onboarded_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    return { status: "error", message: "Could not save your profile. Try again." };
  }

  revalidatePath("/", "layout");
  redirect("/auth/post-login");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

/**
 * Turns Supabase's raw messages into something a student can act on, without
 * revealing whether a given address exists.
 */
function mapAuthError(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes("nits.ac.in") || lower.includes("institute")) {
    return "Only NIT Silchar accounts can sign in. Use your @nits.ac.in or @students.nits.ac.in address.";
  }
  if (lower.includes("expired")) {
    return "That code has expired. Request a new one.";
  }
  if (lower.includes("invalid") && lower.includes("token")) {
    return "That code is not correct. Check the email and try again.";
  }
  if (lower.includes("rate") || lower.includes("too many")) {
    return "Too many attempts. Wait a few minutes and try again.";
  }
  return "Something went wrong signing you in. Try again.";
}
