import Link from "next/link";

import { StatusBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import type { ComplaintStatus } from "@/lib/constants";
import type { IconName } from "@/lib/icons";
import { formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

/**
 * The grid card from complaint_history: mono code, clamped title, status pill,
 * and a footer rule carrying department + date.
 *
 * Resolved and closed cards render at 80% opacity, as in the design.
 */
export function ComplaintCard({
  code,
  title,
  status,
  departmentName,
  departmentIcon = "domain",
  createdAt,
  className,
}: {
  code: string;
  title: string;
  status: ComplaintStatus;
  departmentName: string;
  departmentIcon?: IconName;
  createdAt: string;
  className?: string;
}) {
  const isDone = status === "resolved" || status === "closed";

  return (
    <Card
      as={Link}
      href={`/complaints/${code}`}
      surface="bright"
      radius="xl"
      interactive
      className={cn(
        "flex flex-col gap-4 p-4",
        isDone && "opacity-80 hover:opacity-100",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col">
          <span className="text-label-sm text-outline mb-1 font-mono">{code}</span>
          <h3 className="text-title-md text-on-background line-clamp-2">{title}</h3>
        </div>
        <StatusBadge status={status} />
      </div>

      <div className="text-on-surface-variant border-surface-variant mt-auto flex flex-wrap items-center gap-2 border-t pt-4 text-body-md">
        <Icon name={departmentIcon} size={16} />
        <span className="truncate">{departmentName}</span>
        <span className="text-outline">•</span>
        <Icon name="calendar_today" size={16} />
        <span>{formatDate(createdAt)}</span>
      </div>
    </Card>
  );
}
