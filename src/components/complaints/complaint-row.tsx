import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { STATUS_META, TONE_CLASSES, type ComplaintStatus } from "@/lib/constants";
import type { IconName } from "@/lib/icons";
import { formatRelative } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

/**
 * The "Recent Complaints" row from home_dashboard: tonal icon well, title,
 * "Ticket #… • 2 hrs ago" metadata, status pill (desktop only) and a chevron.
 */
export function ComplaintRow({
  code,
  title,
  status,
  icon,
  createdAt,
  className,
}: {
  code: string;
  title: string;
  status: ComplaintStatus;
  /** Department glyph — falls back to the status glyph. */
  icon?: IconName;
  createdAt: string;
  className?: string;
}) {
  const meta = STATUS_META[status];
  const tone = TONE_CLASSES[meta.tone];

  return (
    <Link
      href={`/complaints/${code}`}
      className={cn(
        "bg-surface border-outline-variant/30 hover:bg-surface-container-low group",
        "flex items-center justify-between gap-3 rounded-lg border p-4 transition-colors",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-4">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-full border",
            tone.soft,
            tone.ring,
          )}
        >
          <Icon name={icon ?? meta.icon} size={24} />
        </span>
        <div className="min-w-0">
          <h3 className="text-title-md text-on-background group-hover:text-primary truncate transition-colors">
            {title}
          </h3>
          <p className="text-on-surface-variant truncate font-mono text-[13px]">
            {code} • {formatRelative(createdAt)}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <Badge tone={meta.tone} className="hidden sm:inline-flex">
          {meta.label}
        </Badge>
        <Icon name="chevron_right" className="text-outline-variant" />
      </div>
    </Link>
  );
}
