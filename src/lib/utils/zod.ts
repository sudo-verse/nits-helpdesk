import type { z } from "zod";

/** Groups a failed safeParse's issues by field, for rendering under each input. */
export function fieldErrorsFrom(
  error: z.ZodError,
): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return fieldErrors;
}
