import { Icon } from "@/components/ui/icon";
import {
  STATUS_META,
  STATUS_ORDER,
  type ComplaintStatus,
} from "@/lib/constants";
import { formatDateTime, toIsoOrUndefined } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

export type TimelineEntry = {
  status: ComplaintStatus;
  createdAt: string;
  note?: string | null;
  actorName?: string | null;
};

/**
 * The "Resolution Progress" timeline from complaint_details.
 *
 * Every stage in the lifecycle is rendered, not just the ones reached, so the
 * student can see what is still ahead. Completed stages get a filled primary
 * node with a check; the current stage gets a ring with a dot; future stages
 * stay outlined in surface-variant.
 */
export function StatusTimeline({
  history,
  currentStatus,
  className,
}: {
  history: readonly TimelineEntry[];
  currentStatus: ComplaintStatus;
  className?: string;
}) {
  const latestByStatus = new Map<ComplaintStatus, TimelineEntry>();
  for (const entry of history) {
    latestByStatus.set(entry.status, entry);
  }

  const currentStep = STATUS_META[currentStatus].step;

  // The vertical progress bar spans from the first node to the current one.
  const reachedCount = STATUS_ORDER.filter(
    (s) => STATUS_META[s].step <= currentStep,
  ).length;
  const progressPercent =
    STATUS_ORDER.length > 1
      ? ((reachedCount - 1) / (STATUS_ORDER.length - 1)) * 100
      : 0;

  return (
    <ol className={cn("relative pl-6", className)}>
      {/* Track */}
      <div
        aria-hidden="true"
        className="bg-surface-variant absolute top-2 bottom-6 left-[11px] w-0.5 rounded-full"
      />
      {/* Progress overlay */}
      <div
        aria-hidden="true"
        className="bg-primary absolute top-2 left-[11px] w-0.5 rounded-full transition-[height] duration-500"
        style={{ height: `calc(${progressPercent}% - 0.5rem)` }}
      />

      {STATUS_ORDER.map((status, index) => {
        const meta = STATUS_META[status];
        const entry = latestByStatus.get(status);
        const isCurrent = status === currentStatus;
        const isDone = meta.step < currentStep;
        const isFuture = meta.step > currentStep;
        const isLast = index === STATUS_ORDER.length - 1;

        return (
          <li key={status} className={cn("relative pl-6", !isLast && "mb-8")}>
            <span
              aria-hidden="true"
              className={cn(
                "absolute top-0 -left-6 z-10 flex size-6 items-center justify-center rounded-full",
                isDone && "bg-primary border-surface border-2 shadow-sm",
                isCurrent && "bg-surface border-primary border-2 shadow-sm",
                isFuture && "bg-surface border-surface-variant border-2",
              )}
            >
              {isDone && (
                <Icon name="check" filled size={14} className="text-on-primary" />
              )}
              {isCurrent && <span className="bg-primary size-2 rounded-full" />}
            </span>

            <p
              className={cn(
                "text-title-md font-medium",
                isCurrent && "text-primary",
                isDone && "text-on-surface",
                isFuture && "text-outline",
              )}
            >
              {meta.label}
            </p>

            {entry && (
              <p className="text-on-surface-variant text-sm">
                <time dateTime={toIsoOrUndefined(entry.createdAt)}>
                  {formatDateTime(entry.createdAt)}
                </time>
                {entry.actorName && <> · {entry.actorName}</>}
                {entry.note && <> — {entry.note}</>}
              </p>
            )}

            {isCurrent && !entry && (
              <p className="text-on-surface-variant text-sm">In progress</p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
