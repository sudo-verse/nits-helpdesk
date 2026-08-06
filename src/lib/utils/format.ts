import { format, formatDistanceToNowStrict, isValid, parseISO } from "date-fns";

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const date = typeof value === "string" ? parseISO(value) : value;
  return isValid(date) ? date : null;
}

/** "2 hrs ago", "1 day ago" — the metadata style used across the screens. */
export function formatRelative(value: string | Date | null | undefined): string {
  const date = toDate(value);
  if (!date) return "—";

  const seconds = (Date.now() - date.getTime()) / 1000;
  if (seconds < 60) return "just now";

  return `${formatDistanceToNowStrict(date, { addSuffix: false })} ago`;
}

/** "Oct 24, 2023" — the date shown on complaint cards. */
export function formatDate(value: string | Date | null | undefined): string {
  const date = toDate(value);
  return date ? format(date, "MMM d, yyyy") : "—";
}

/** "Oct 24, 09:15 AM" — timeline entries. */
export function formatDateTime(value: string | Date | null | undefined): string {
  const date = toDate(value);
  return date ? format(date, "MMM d, hh:mm a") : "—";
}

/** Full precision, for tooltips and <time dateTime>. */
export function formatFull(value: string | Date | null | undefined): string {
  const date = toDate(value);
  return date ? format(date, "PPPPp") : "—";
}

export function toIsoOrUndefined(
  value: string | Date | null | undefined,
): string | undefined {
  return toDate(value)?.toISOString();
}

/** "1.4 MB" for attachment chips. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Renders the reporter's name, honouring anonymity.
 *
 * `v_complaints` already nulls created_by for other viewers, so a null name on
 * an anonymous complaint is the expected case rather than missing data.
 */
export function reporterLabel(
  name: string | null | undefined,
  isAnonymous: boolean,
): string {
  if (isAnonymous && !name) return "Anonymous";
  return name?.trim() || "Unknown";
}
