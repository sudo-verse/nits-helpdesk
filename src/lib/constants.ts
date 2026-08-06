import type { IconName } from "@/lib/icons";
import type { Database } from "@/types/database.types";

export type ComplaintStatus = Database["public"]["Enums"]["complaint_status"];
export type ComplaintPriority = Database["public"]["Enums"]["complaint_priority"];
export type UserRole = Database["public"]["Enums"]["user_role"];
export type NotificationType = Database["public"]["Enums"]["notification_type"];

/**
 * Presentation for each complaint status.
 *
 * Colours are read off the rendered Stitch screens: Pending/Submitted uses
 * `error`, In Progress uses `secondary`, Resolved uses `primary-container`
 * (home_dashboard) — with `success` reserved for the closed terminal state so
 * the two are visually distinguishable.
 */
export const STATUS_META: Record<
  ComplaintStatus,
  { label: string; icon: IconName; tone: StatusTone; step: number }
> = {
  submitted: { label: "Submitted", icon: "hourglass_empty", tone: "error", step: 1 },
  assigned: { label: "Assigned", icon: "person_add", tone: "tertiary", step: 2 },
  under_review: { label: "Under Review", icon: "visibility", tone: "tertiary", step: 3 },
  in_progress: { label: "In Progress", icon: "sync", tone: "secondary", step: 4 },
  resolved: { label: "Resolved", icon: "check_circle", tone: "success", step: 5 },
  closed: { label: "Closed", icon: "task_alt", tone: "neutral", step: 6 },
};

/** The full lifecycle in order — drives the timeline component. */
export const STATUS_ORDER: readonly ComplaintStatus[] = [
  "submitted",
  "assigned",
  "under_review",
  "in_progress",
  "resolved",
  "closed",
] as const;

/**
 * Icons mirror admin_dashboard/code.html, which marks High-priority rows with
 * a filled `error` glyph and Medium with `warning`.
 */
export const PRIORITY_META: Record<
  ComplaintPriority,
  { label: string; tone: StatusTone; icon: IconName }
> = {
  low: { label: "Low", tone: "secondary", icon: "arrow_downward" },
  medium: { label: "Medium", tone: "tertiary", icon: "warning" },
  high: { label: "High", tone: "error", icon: "error" },
};

export const ROLE_META: Record<UserRole, { label: string; icon: IconName }> = {
  student: { label: "Student", icon: "school" },
  staff: { label: "Staff", icon: "engineering" },
  admin: { label: "Admin", icon: "admin_panel_settings" },
  super_admin: { label: "Super Admin", icon: "verified" },
};

export const NOTIFICATION_META: Record<
  NotificationType,
  { icon: IconName; tone: StatusTone }
> = {
  complaint_created: { icon: "assignment_late", tone: "primary" },
  assignment: { icon: "assignment_ind", tone: "primary" },
  comment: { icon: "chat_bubble_outline", tone: "neutral" },
  status_update: { icon: "update", tone: "secondary" },
  resolution: { icon: "assignment_turned_in", tone: "success" },
  announcement: { icon: "campaign", tone: "error" },
};

/** Semantic colour name shared by badges, chips and icon wells. */
export type StatusTone =
  | "primary"
  | "secondary"
  | "tertiary"
  | "error"
  | "success"
  | "neutral";

/**
 * Tailwind classes per tone. Written out rather than interpolated — Tailwind
 * scans source statically and would never emit `bg-${tone}/10`.
 */
export const TONE_CLASSES: Record<
  StatusTone,
  { soft: string; solid: string; text: string; dot: string; ring: string }
> = {
  primary: {
    soft: "bg-primary/10 text-primary",
    solid: "bg-primary text-on-primary",
    text: "text-primary",
    dot: "bg-primary",
    ring: "border-primary/30",
  },
  secondary: {
    soft: "bg-secondary/10 text-secondary",
    solid: "bg-secondary text-on-secondary",
    text: "text-secondary",
    dot: "bg-secondary",
    ring: "border-secondary/30",
  },
  tertiary: {
    soft: "bg-tertiary/10 text-tertiary dark:text-tertiary-fixed-dim",
    solid: "bg-tertiary-container text-on-tertiary-container",
    text: "text-tertiary dark:text-tertiary-fixed-dim",
    dot: "bg-tertiary dark:bg-tertiary-fixed-dim",
    ring: "border-tertiary/30",
  },
  error: {
    soft: "bg-error/10 text-error",
    solid: "bg-error text-on-error",
    text: "text-error",
    dot: "bg-error",
    ring: "border-error/30",
  },
  success: {
    soft: "bg-success/10 text-success",
    solid: "bg-success text-on-success",
    text: "text-success",
    dot: "bg-success",
    ring: "border-success/30",
  },
  neutral: {
    soft: "bg-surface-container-high text-on-surface-variant",
    solid: "bg-surface-container-highest text-on-surface",
    text: "text-on-surface-variant",
    dot: "bg-outline",
    ring: "border-outline-variant/30",
  },
};

/** Upload limits. Mirrored by the storage bucket config and a CHECK constraint. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "application/pdf",
] as const;
export const ALLOWED_AVATAR_MIME_TYPES = ["image/jpeg", "image/png"] as const;

export const INSTITUTE_EMAIL_PATTERN =
  /^[A-Za-z0-9._%+-]+@([A-Za-z0-9-]+\.)*nits\.ac\.in$/;

export const STORAGE_BUCKETS = {
  attachments: "complaint-attachments",
  avatars: "avatars",
} as const;
