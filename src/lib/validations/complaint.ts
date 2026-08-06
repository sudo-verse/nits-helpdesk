import { z } from "zod";

import { ALLOWED_MIME_TYPES, MAX_UPLOAD_BYTES } from "@/lib/constants";

/**
 * Mirrors the CHECK constraints on public.complaints, so a value rejected here
 * would also be rejected by the database. Keeping the bounds identical means
 * users get a helpful message instead of a raw constraint violation.
 */
export const complaintSchema = z.object({
  title: z
    .string()
    .trim()
    .min(5, "Give the issue a title of at least 5 characters.")
    .max(150, "Keep the title under 150 characters."),
  description: z
    .string()
    .trim()
    .min(10, "Describe the issue in at least 10 characters.")
    .max(5000, "That description is too long."),
  departmentId: z.uuid("Choose a department."),
  category: z.string().trim().max(80).optional().or(z.literal("")),
  hostelId: z.uuid().optional().or(z.literal("")),
  location: z
    .string()
    .trim()
    .max(200, "Keep the location under 200 characters.")
    .optional()
    .or(z.literal("")),
  priority: z.enum(["low", "medium", "high"]),
  isAnonymous: z.coerce.boolean().default(false),
});

export type ComplaintInput = z.infer<typeof complaintSchema>;

export const commentSchema = z.object({
  complaintId: z.uuid(),
  body: z
    .string()
    .trim()
    .min(1, "Write something first.")
    .max(2000, "Comments are limited to 2000 characters."),
  isInternal: z.coerce.boolean().default(false),
});

export const feedbackSchema = z.object({
  complaintId: z.uuid(),
  rating: z.coerce.number().int().min(1, "Choose a rating.").max(5),
  comment: z.string().trim().max(1000).optional().or(z.literal("")),
});

/**
 * File validation. The declared MIME type is attacker-controlled, so this is
 * the first of three checks — the storage bucket and a CHECK constraint on
 * complaint_images enforce the same rules server-side.
 */
export const attachmentSchema = z.object({
  name: z.string().min(1).max(255),
  size: z
    .number()
    .positive()
    .max(MAX_UPLOAD_BYTES, "Files must be 10 MB or smaller."),
  type: z.enum(ALLOWED_MIME_TYPES, "Only JPG, PNG and PDF files are allowed."),
});

export function validateFile(file: File): string | null {
  const result = attachmentSchema.safeParse({
    name: file.name,
    size: file.size,
    type: file.type,
  });
  return result.success ? null : (result.error.issues[0]?.message ?? "Invalid file.");
}
