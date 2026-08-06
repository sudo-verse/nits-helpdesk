import { cn } from "@/lib/utils/cn";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "bg-surface-container-high animate-pulse rounded-lg",
        className,
      )}
    />
  );
}

/** Matches the 120px stat tiles on home_dashboard. */
export function StatCardSkeleton() {
  return (
    <div className="bg-surface border-outline-variant/30 shadow-level1 flex h-[120px] flex-col justify-between rounded-card border p-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="size-5 rounded-full" />
      </div>
      <Skeleton className="h-8 w-12" />
    </div>
  );
}

/** Matches the recent-complaints rows on home_dashboard. */
export function ComplaintRowSkeleton() {
  return (
    <div className="bg-surface border-outline-variant/30 flex items-center justify-between rounded-lg border p-4">
      <div className="flex items-center gap-4">
        <Skeleton className="size-10 rounded-full" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-28" />
        </div>
      </div>
      <Skeleton className="size-5 rounded-full" />
    </div>
  );
}

/** Matches the grid cards on complaint_history. */
export function ComplaintCardSkeleton() {
  return (
    <div className="bg-surface-bright border-outline-variant/30 shadow-level1 flex flex-col gap-4 rounded-xl border p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-5 w-full" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <Skeleton className="border-surface-variant mt-auto h-4 w-48 border-t pt-4" />
    </div>
  );
}

export function ListSkeleton({
  count = 3,
  Item = ComplaintRowSkeleton,
}: {
  count?: number;
  Item?: () => React.ReactElement;
}) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: count }, (_, i) => (
        <Item key={i} />
      ))}
    </div>
  );
}
