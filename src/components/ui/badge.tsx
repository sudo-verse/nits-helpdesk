import type { ComponentPropsWithoutRef } from "react";

import { Icon } from "@/components/ui/icon";
import {
  PRIORITY_META,
  STATUS_META,
  TONE_CLASSES,
  type ComplaintPriority,
  type ComplaintStatus,
  type StatusTone,
} from "@/lib/constants";
import type { IconName } from "@/lib/icons";
import { cn } from "@/lib/utils/cn";

type BadgeProps = ComponentPropsWithoutRef<"span"> & {
  tone?: StatusTone;
  /** The leading 2px dot used on the status pills in complaint_history. */
  dot?: boolean;
  icon?: IconName;
  /** Adds the subtle 1px ring seen on the pills in complaint_details. */
  outlined?: boolean;
};

/**
 * Pill-shaped status tag. DESIGN.md: "semi-transparent background (10-15%
 * opacity) of the status colour with high-contrast text", fully rounded to
 * distinguish it from an interactive button.
 */
export function Badge({
  tone = "neutral",
  dot = false,
  icon,
  outlined = false,
  className,
  children,
  ...props
}: BadgeProps) {
  const t = TONE_CLASSES[tone];

  return (
    <span
      className={cn(
        "text-label-sm inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 font-mono",
        t.soft,
        outlined && `border ${t.ring}`,
        className,
      )}
      {...props}
    >
      {dot && <span className={cn("size-2 shrink-0 rounded-full", t.dot)} />}
      {icon && <Icon name={icon} size={14} />}
      {children}
    </span>
  );
}

/**
 * `pulse` animates the dot, matching the live "In Progress" pill in
 * complaint_details.
 */
export function StatusBadge({
  status,
  showDot = true,
  className,
  ...props
}: { status: ComplaintStatus; showDot?: boolean } & ComponentPropsWithoutRef<"span">) {
  const meta = STATUS_META[status];
  const isLive = status === "in_progress";

  return (
    <Badge tone={meta.tone} outlined className={className} {...props}>
      {showDot && (
        <span
          className={cn(
            "size-2 shrink-0 rounded-full",
            TONE_CLASSES[meta.tone].dot,
            isLive && "animate-pulse",
          )}
        />
      )}
      {meta.label}
    </Badge>
  );
}

export function PriorityBadge({
  priority,
  withSuffix = true,
  className,
  ...props
}: {
  priority: ComplaintPriority;
  /** Renders "High Priority" as in admin_dashboard, vs bare "High". */
  withSuffix?: boolean;
} & ComponentPropsWithoutRef<"span">) {
  const meta = PRIORITY_META[priority];

  return (
    <Badge tone={meta.tone} dot className={className} {...props}>
      {withSuffix ? `${meta.label} Priority` : meta.label}
    </Badge>
  );
}
