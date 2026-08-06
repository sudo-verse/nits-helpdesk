import { z } from "zod";

import { INSTITUTE_EMAIL_PATTERN } from "@/lib/constants";

/**
 * Institute-email rule, mirroring the database CHECK constraint and the
 * handle_new_user() trigger.
 *
 * This layer exists for the error message, not for security — a user who
 * bypasses it still hits the trigger, which aborts the signup transaction.
 * Never treat client-side validation as the boundary.
 */
export const instituteEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Enter your institute email address.")
  .email("That does not look like a valid email address.")
  .regex(
    INSTITUTE_EMAIL_PATTERN,
    "Use your NIT Silchar account (ending with nits.ac.in).",
  );

export const requestOtpSchema = z.object({
  email: instituteEmailSchema,
});

export const verifyOtpSchema = z.object({
  email: instituteEmailSchema,
  token: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit code from your email."),
});

export const signInSchema = z.object({
  email: instituteEmailSchema,
  password: z.string().min(1, "Enter your password."),
});

export const signUpSchema = z
  .object({
    email: instituteEmailSchema,
    // 8 is stricter than Supabase's own minimum (6) — the project setting is
    // the real floor, this is just the app's preferred policy.
    password: z
      .string()
      .min(8, "Use at least 8 characters.")
      .max(72, "That password is too long."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const onboardingSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Enter your full name.")
    .max(80, "That name is too long."),
  rollNumber: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9/-]{3,20}$/, "Roll number looks invalid.")
    .optional()
    .or(z.literal("")),
  departmentId: z.uuid("Choose your department.").optional().or(z.literal("")),
  hostelId: z.uuid("Choose your hostel.").optional().or(z.literal("")),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9]{10}$/, "Enter a 10-digit phone number.")
    .optional()
    .or(z.literal("")),
});

export type RequestOtpInput = z.infer<typeof requestOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type OnboardingInput = z.infer<typeof onboardingSchema>;
