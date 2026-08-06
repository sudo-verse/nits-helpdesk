"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { mapAuthError } from "@/lib/actions/map-auth-error";
import { resolveLandingPath } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { isSafeNextPath } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/utils/rate-limit";
import { onboardingSchema, signInSchema, signUpSchema } from "@/lib/validations/auth";

/** FormData carries `next` as a plain string or omits the key — never an array. */
function readNext(formData: FormData): string | null {
  const value = formData.get("next");
  return typeof value === "string" ? value : null;
}

export type ActionState =
  | { status: "idle" }
  | { status: "error"; message: string; fieldErrors?: Record<string, string[]> }
  | { status: "success"; message?: string };

/**
 * Create an account with an institute email and password.
 *
 * The institute-domain check here is for the error message; the real
 * boundary is the handle_new_user() trigger, which aborts the auth.users
 * INSERT the same way it does for Google sign-ups.
 */
export async function signUpWithPassword(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = signUpSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Check the highlighted fields.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  const { email, password } = parsed.data;

  const ip =
    (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const [emailOk, ipOk] = await Promise.all([
    checkRateLimit(`signup:email:${email}`, 3, "15 minutes"),
    checkRateLimit(`signup:ip:${ip}`, 10, "15 minutes"),
  ]);

  if (!emailOk || !ipOk) {
    return {
      status: "error",
      message: "Too many attempts. Wait a few minutes and try again.",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${env.NEXT_PUBLIC_SITE_URL}/auth/callback` },
  });

  if (error) return { status: "error", message: mapAuthError(error.message) };

  // A project with "Confirm email" on returns a user but no session — the
  // account exists but cannot sign in until the link is clicked.
  if (!data.session) {
    return {
      status: "success",
      message: "Check your email to confirm your account before signing in.",
    };
  }

  redirect(await resolveLandingPath(readNext(formData)));
}

/** Sign in with an institute email and password. */
export async function signInWithPassword(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Enter your email and password.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  const { email, password } = parsed.data;

  if (!(await checkRateLimit(`signin:${email}`, 8, "10 minutes"))) {
    return {
      status: "error",
      message: "Too many attempts. Wait a few minutes and try again.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { status: "error", message: mapAuthError(error.message) };

  redirect(await resolveLandingPath(readNext(formData)));
}

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

export async function signInWithGoogle(next?: string): Promise<ActionState> {
  const supabase = await createClient();

  // Embedding `next` in redirectTo is the only way it survives the trip out
  // to Google and back — nothing else about this request round-trips.
  const redirectTo = new URL("/auth/callback", env.NEXT_PUBLIC_SITE_URL);
  if (isSafeNextPath(next)) redirectTo.searchParams.set("next", next);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: redirectTo.toString(),
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
    return {
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
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
  redirect(await resolveLandingPath(readNext(formData)));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
