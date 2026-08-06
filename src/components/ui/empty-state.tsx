import type { ReactNode } from "react";

import { Icon } from "@/components/ui/icon";
import type { IconName } from "@/lib/icons";
import { cn } from "@/lib/utils/cn";

/**
 * Empty and error states. The Stitch screens only ever show populated data, so
 * this fills a real gap — a dashboard with no complaints yet would otherwise
 * render as a blank page.
 */
export function EmptyState({
  icon = "inbox",
  title,
  description,
  action,
  tone = "neutral",
  className,
}: {
  icon?: IconName;
  title: string;
  description?: string;
  action?: ReactNode;
  tone?: "neutral" | "error";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-6 py-12 text-center",
        className,
      )}
    >
      <span
        className={cn(
          "flex size-14 items-center justify-center rounded-full",
          tone === "error"
            ? "bg-error/10 text-error"
            : "bg-surface-container-high text-on-surface-variant",
        )}
      >
        <Icon name={icon} size={28} />
      </span>
      <div className="flex flex-col gap-1">
        <h3 className="text-title-md text-on-surface font-semibold">{title}</h3>
        {description && (
          <p className="text-body-md text-on-surface-variant max-w-sm">
            {description}
          </p>
        )}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
