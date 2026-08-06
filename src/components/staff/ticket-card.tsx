import Link from "next/link";

import { Badge, PriorityBadge, StatusBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import type { ComplaintPriority, ComplaintStatus } from "@/lib/constants";
import type { IconName } from "@/lib/icons";
import { formatRelative, toIsoOrUndefined } from "@/lib/utils/format";

/**
 * The ticket card from task_management: mono code, title, timestamp, priority
 * and department chips, and an action in the footer.
 */
export function TicketCard({
  code,
  title,
  status,
  priority,
  departmentName,
  departmentIcon = "domain",
  location,
  createdAt,
  href,
  action,
}: {
  code: string;
  title: string;
  status: ComplaintStatus;
  priority: ComplaintPriority;
  departmentName: string;
  departmentIcon?: IconName;
  location?: string | null;
  createdAt: string;
  href: string;
  action?: React.ReactNode;
}) {
  return (
    <Card surface="lowest" className="flex flex-col gap-4 p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-label-sm text-outline font-mono">{code}</span>
          <Link
            href={href}
            className="text-title-md text-on-surface hover:text-primary font-semibold transition-colors"
          >
            {title}
          </Link>
        </div>
        <time
          dateTime={toIsoOrUndefined(createdAt)}
          className="text-label-sm text-on-surface-variant flex shrink-0 items-center gap-1 font-mono"
        >
          <Icon name="schedule" size={16} />
          {formatRelative(createdAt)}
        </time>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <PriorityBadge priority={priority} />
        <StatusBadge status={status} />
        <Badge tone="neutral" icon={departmentIcon}>
          {departmentName}
          {location ? ` · ${location}` : ""}
        </Badge>
      </div>

      <div className="border-outline-variant/20 mt-auto flex justify-end gap-2 border-t pt-4">
        {action ?? (
          <ButtonLink href={href} size="sm" variant="secondary" trailingIcon="chevron_right">
            Open
          </ButtonLink>
        )}
      </div>
    </Card>
  );
}
